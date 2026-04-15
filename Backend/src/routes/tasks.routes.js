/**
 * Tasks routes — fully refactored for cohort isolation + multi-assignment
 *
 * GET    /api/tasks                 — cohort-scoped list
 * GET    /api/tasks/my              — tasks assigned to me / my team
 * GET    /api/tasks/:id             — single task with full assignments
 * POST   /api/tasks                 — create (admin / instructor in cohort)
 * PUT    /api/tasks/:id             — update assignments + fields
 * DELETE /api/tasks/:id             — soft delete
 * POST   /api/tasks/:id/submit      — submit (student / team member)
 */
import { Router } from 'express';
import { body, query } from 'express-validator';
import sql from '../db/index.js';
import authenticate from '../middleware/authenticate.js';
import { authorize, checkCohortAccess, cohortFilter } from '../middleware/rbac.js';
import { validate } from '../middleware/validate.js';
import { successResponse, errorResponse } from '../utils/response.js';

const router = Router();
router.use(authenticate);

/* ── helpers ──────────────────────────────────────────────────────────── */

/** Return task with its student + team assignments joined */
const enrichTask = async (taskId) => {
    const [task] = await sql`
        SELECT t.*,
               co.name  AS cohort_name,
               c.name   AS course_name,
               cr.full_name AS created_by_name
        FROM tasks t
        LEFT JOIN cohorts  co ON co.id = t.cohort_id
        LEFT JOIN courses  c  ON c.id  = t.course_id
        LEFT JOIN profiles cr ON cr.id = t.created_by
        WHERE t.id = ${taskId} AND t.deleted_at IS NULL
    `;
    if (!task) return null;

    const [assignedStudents, assignedTeams] = await Promise.all([
        sql`
            SELECT ta.user_id, p.full_name, p.avatar_url
            FROM task_assignments ta
            JOIN profiles p ON p.id = ta.user_id
            WHERE ta.task_id = ${taskId}
        `,
        sql`
            SELECT tta.team_id, tm.name AS team_name
            FROM task_team_assignments tta
            JOIN teams tm ON tm.id = tta.team_id
            WHERE tta.task_id = ${taskId}
        `,
    ]);

    return { ...task, assignedStudents, assignedTeams };
};

/* ── GET /tasks ─────────────────────────────────────────────────────────── */
router.get('/', [query('cohortId').optional().isUUID()], validate, async (req, res, next) => {
    try {
        const { isAdmin, cohortIds } = cohortFilter(req.user);
        const filterCohortId = req.query.cohortId ?? null;

        let tasks;
        if (isAdmin) {
            tasks = filterCohortId
                ? await sql`
                    SELECT t.*, co.name AS cohort_name, c.name AS course_name
                    FROM tasks t
                    LEFT JOIN cohorts co ON co.id = t.cohort_id
                    LEFT JOIN courses c  ON c.id  = t.course_id
                    WHERE t.deleted_at IS NULL AND t.cohort_id = ${filterCohortId}
                    ORDER BY t.created_at DESC`
                : await sql`
                    SELECT t.*, co.name AS cohort_name, c.name AS course_name
                    FROM tasks t
                    LEFT JOIN cohorts co ON co.id = t.cohort_id
                    LEFT JOIN courses c  ON c.id  = t.course_id
                    WHERE t.deleted_at IS NULL
                    ORDER BY t.created_at DESC`;
        } else {
            // Instructor — filtered to their cohorts
            const allowed = filterCohortId
                ? cohortIds.includes(filterCohortId) ? [filterCohortId] : []
                : cohortIds;
            if (!allowed.length) return successResponse(res, 'Tasks retrieved successfully.', []);
            tasks = await sql`
                SELECT t.*, co.name AS cohort_name, c.name AS course_name
                FROM tasks t
                LEFT JOIN cohorts co ON co.id = t.cohort_id
                LEFT JOIN courses c  ON c.id  = t.course_id
                WHERE t.deleted_at IS NULL AND t.cohort_id = ANY(${allowed}::uuid[])
                ORDER BY t.created_at DESC`;
        }
        return successResponse(res, 'Tasks retrieved successfully.', tasks);
    } catch (err) { next(err); }
});

/* ── GET /tasks/my ──────────────────────────────────────────────────────── */
router.get('/my', async (req, res, next) => {
    try {
        const { id: userId, role } = req.user;
        const { cohortIds } = cohortFilter(req.user);

        if (role === 'admin') {
            const tasks = await sql`
                SELECT t.*, co.name AS cohort_name, c.name AS course_name
                FROM tasks t
                LEFT JOIN cohorts co ON co.id = t.cohort_id
                LEFT JOIN courses c  ON c.id  = t.course_id
                WHERE t.deleted_at IS NULL ORDER BY t.due_date ASC`;
            return successResponse(res, 'Tasks retrieved successfully.', tasks);
        }

        if (role === 'instructor') {
            if (!cohortIds.length) return successResponse(res, 'Tasks retrieved successfully.', []);
            const tasks = await sql`
                SELECT t.*, co.name AS cohort_name, c.name AS course_name
                FROM tasks t
                LEFT JOIN cohorts co ON co.id = t.cohort_id
                LEFT JOIN courses c  ON c.id  = t.course_id
                WHERE t.deleted_at IS NULL AND t.cohort_id = ANY(${cohortIds}::uuid[])
                ORDER BY t.due_date ASC`;
            return successResponse(res, 'Tasks retrieved successfully.', tasks);
        }

        // student: direct assignment OR team assignment OR cohort-wide
        const tasks = await sql`
            SELECT DISTINCT ON (t.id) t.*, co.name AS cohort_name, c.name AS course_name
            FROM tasks t
            LEFT JOIN cohorts co ON co.id = t.cohort_id
            LEFT JOIN courses c  ON c.id  = t.course_id
            LEFT JOIN task_assignments       ta  ON ta.task_id  = t.id AND ta.user_id  = ${userId}
            LEFT JOIN team_members           mbr ON mbr.user_id = ${userId}
            LEFT JOIN task_team_assignments  tta ON tta.task_id = t.id AND tta.team_id = mbr.team_id
            WHERE t.deleted_at IS NULL
              AND (
                  ta.user_id  IS NOT NULL
               OR tta.team_id IS NOT NULL
               OR (t.assignment_type = 'cohort' AND t.cohort_id = ANY(${cohortIds}::uuid[]))
              )
            ORDER BY t.id, t.due_date ASC`;
        return successResponse(res, 'Tasks retrieved successfully.', tasks);
    } catch (err) { next(err); }
});

/* ── GET /tasks/:id ─────────────────────────────────────────────────────── */
router.get(
    '/:id',
    checkCohortAccess(async (req) => {
        const [t] = await sql`SELECT cohort_id FROM tasks WHERE id = ${req.params.id} AND deleted_at IS NULL`;
        return t?.cohort_id;
    }),
    async (req, res, next) => {
        try {
            const task = await enrichTask(req.params.id);
            if (!task) return errorResponse(res, 'Task not found.', 404);
            return successResponse(res, 'Task retrieved successfully.', task);
        } catch (err) { next(err); }
    }
);

/* ── POST /tasks ─────────────────────────────────────────────────────────── */
router.post(
    '/',
    authorize('admin', 'instructor'),
    [
        body('title').trim().notEmpty(),
        body('courseId').isUUID(),
        body('cohortId').optional({ nullable: true }).isUUID(),
        body('organizationId').optional({ nullable: true }).isUUID(),
        body('dueDate').optional({ nullable: true }).isISO8601().toDate(),
        body('priority').optional().isIn(['low', 'medium', 'high']),
        body('assignmentType').optional().isIn(['individual', 'team', 'mixed', 'cohort']),
        body('assignedStudents').optional().isArray(),
        body('assignedStudents.*').optional().isUUID(),
        body('assignedTeams').optional().isArray(),
        body('assignedTeams.*').optional().isUUID(),
    ],
    validate,
    async (req, res, next) => {
        try {
            let {
                title, description,
                courseId, cohortId, organizationId,
                dueDate, priority = 'medium',
                githubRepoUrl,
                assignmentType = 'individual',
                assignedStudents = [],
                assignedTeams = [],
            } = req.body;

            // Derive organizationId from JWT if not provided
            organizationId = organizationId ?? req.user.organizationId;

            // Derive cohortId from the course's primary cohort assignment if not provided
            if (!cohortId) {
                const [cc] = await sql`
                    SELECT cohort_id FROM cohort_courses WHERE course_id = ${courseId} LIMIT 1`;
                cohortId = cc?.cohort_id ?? null;
            }

            // Default due_date to 30 days from now when not provided
            const effectiveDueDate = dueDate ?? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

            // ── Cross-cohort validation ─────────────────────────────────────
            // Verify all assignedStudents belong to the task's cohort
            if (cohortId && assignedStudents.length > 0) {
                const validStudents = await sql`
                    SELECT user_id FROM user_cohorts
                    WHERE cohort_id = ${cohortId} AND user_id = ANY(${assignedStudents}::uuid[])`;
                const validIds = new Set(validStudents.map(r => r.user_id));
                const invalid = assignedStudents.filter(id => !validIds.has(id));
                if (invalid.length > 0) {
                    return errorResponse(res, `The following students do not belong to this cohort: ${invalid.join(', ')}`, 400);
                }
            }

            // Verify all assignedTeams belong to the task's cohort
            if (cohortId && assignedTeams.length > 0) {
                const validTeams = await sql`
                    SELECT id FROM teams
                    WHERE cohort_id = ${cohortId} AND id = ANY(${assignedTeams}::uuid[])`;
                const validIds = new Set(validTeams.map(r => r.id));
                const invalid = assignedTeams.filter(id => !validIds.has(id));
                if (invalid.length > 0) {
                    return errorResponse(res, `The following teams do not belong to this cohort: ${invalid.join(', ')}`, 400);
                }
            }

            const [task] = await sql`
                INSERT INTO tasks
                    (organization_id, course_id, cohort_id, title, description,
                     priority, due_date, github_repo_url, assignment_type, created_by)
                VALUES
                    (${organizationId}, ${courseId}, ${cohortId}, ${title},
                     ${description ?? null}, ${priority}, ${effectiveDueDate},
                     ${githubRepoUrl ?? null}, ${assignmentType}::assignment_type, ${req.user.id})
                RETURNING *
            `;

            // Individual / mixed student assignments
            if (assignedStudents.length > 0) {
                await sql`
                    INSERT INTO task_assignments (organization_id, task_id, user_id, assigned_by)
                    SELECT ${organizationId}, ${task.id}, unnest(${assignedStudents}::uuid[]), ${req.user.id}
                    ON CONFLICT (task_id, user_id) DO NOTHING`;
            }

            // Team assignments
            if (assignedTeams.length > 0) {
                await sql`
                    INSERT INTO task_team_assignments (organization_id, task_id, team_id, assigned_by)
                    SELECT ${organizationId}, ${task.id}, unnest(${assignedTeams}::uuid[]), ${req.user.id}
                    ON CONFLICT (task_id, team_id) DO NOTHING`;
            }

            // Cohort-wide: auto-assign every student in the cohort
            if (assignmentType === 'cohort') {
                await sql`
                    INSERT INTO task_assignments (organization_id, task_id, user_id, assigned_by)
                    SELECT ${organizationId}, ${task.id}, uc.user_id, ${req.user.id}
                    FROM user_cohorts uc
                    WHERE uc.cohort_id = ${cohortId} AND uc.role = 'student'
                    ON CONFLICT (task_id, user_id) DO NOTHING`;
            }

            const enriched = await enrichTask(task.id);
            return successResponse(res, 'Task created successfully.', enriched, 201);
        } catch (err) { next(err); }
    }
);

/* ── PUT /tasks/:id ──────────────────────────────────────────────────────── */
router.put(
    '/:id',
    authorize('admin', 'instructor'),
    checkCohortAccess(async (req) => {
        const [t] = await sql`SELECT cohort_id FROM tasks WHERE id = ${req.params.id} AND deleted_at IS NULL`;
        return t?.cohort_id;
    }),
    [
        body('title').optional().trim().notEmpty(),
        body('priority').optional().isIn(['low', 'medium', 'high']),
        body('status').optional().isIn(['pending', 'in_progress', 'submitted', 'accepted', 'rejected']),
        body('assignedStudents').optional().isArray(),
        body('assignedStudents.*').optional().isUUID(),
        body('assignedTeams').optional().isArray(),
        body('assignedTeams.*').optional().isUUID(),
    ],
    validate,
    async (req, res, next) => {
        try {
            const { title, description, priority, status, dueDate, githubRepoUrl,
                    assignedStudents, assignedTeams } = req.body;

            const [task] = await sql`
                UPDATE tasks
                SET title           = COALESCE(${title          ?? null}, title),
                    description     = COALESCE(${description    ?? null}, description),
                    priority        = COALESCE(${priority       ?? null}::task_priority, priority),
                    status          = COALESCE(${status         ?? null}::task_status, status),
                    due_date        = COALESCE(${dueDate        ?? null}::date, due_date),
                    github_repo_url = COALESCE(${githubRepoUrl  ?? null}, github_repo_url),
                    updated_at      = CURRENT_TIMESTAMP
                WHERE id = ${req.params.id} AND deleted_at IS NULL RETURNING *`;
            if (!task) return errorResponse(res, 'Task not found.', 404);

            // ── Cross-cohort validation on updated assignments ──────────────
            if (task.cohort_id && Array.isArray(assignedStudents) && assignedStudents.length > 0) {
                const validStudents = await sql`
                    SELECT user_id FROM user_cohorts
                    WHERE cohort_id = ${task.cohort_id} AND user_id = ANY(${assignedStudents}::uuid[])`;
                const validIds = new Set(validStudents.map(r => r.user_id));
                const invalid = assignedStudents.filter(id => !validIds.has(id));
                if (invalid.length > 0) {
                    return errorResponse(res, `The following students do not belong to this cohort: ${invalid.join(', ')}`, 400);
                }
            }
            if (task.cohort_id && Array.isArray(assignedTeams) && assignedTeams.length > 0) {
                const validTeams = await sql`
                    SELECT id FROM teams
                    WHERE cohort_id = ${task.cohort_id} AND id = ANY(${assignedTeams}::uuid[])`;
                const validIds = new Set(validTeams.map(r => r.id));
                const invalid = assignedTeams.filter(id => !validIds.has(id));
                if (invalid.length > 0) {
                    return errorResponse(res, `The following teams do not belong to this cohort: ${invalid.join(', ')}`, 400);
                }
            }

            if (Array.isArray(assignedStudents)) {
                await sql`DELETE FROM task_assignments WHERE task_id = ${task.id}`;
                if (assignedStudents.length > 0) {
                    await sql`
                        INSERT INTO task_assignments (organization_id, task_id, user_id, assigned_by)
                        SELECT ${task.organization_id}, ${task.id}, unnest(${assignedStudents}::uuid[]), ${req.user.id}
                        ON CONFLICT (task_id, user_id) DO NOTHING`;
                }
            }

            if (Array.isArray(assignedTeams)) {
                await sql`DELETE FROM task_team_assignments WHERE task_id = ${task.id}`;
                if (assignedTeams.length > 0) {
                    await sql`
                        INSERT INTO task_team_assignments (organization_id, task_id, team_id, assigned_by)
                        SELECT ${task.organization_id}, ${task.id}, unnest(${assignedTeams}::uuid[]), ${req.user.id}
                        ON CONFLICT (task_id, team_id) DO NOTHING`;
                }
            }

            return successResponse(res, 'Task updated successfully.', await enrichTask(task.id));
        } catch (err) { next(err); }
    }
);

/* ── DELETE /tasks/:id ───────────────────────────────────────────────────── */
router.delete(
    '/:id',
    authorize('admin', 'instructor'),
    checkCohortAccess(async (req) => {
        const [t] = await sql`SELECT cohort_id FROM tasks WHERE id = ${req.params.id} AND deleted_at IS NULL`;
        return t?.cohort_id;
    }),
    async (req, res, next) => {
        try {
            const [task] = await sql`
                UPDATE tasks SET deleted_at = CURRENT_TIMESTAMP
                WHERE id = ${req.params.id} AND deleted_at IS NULL RETURNING id`;
            if (!task) return errorResponse(res, 'Task not found.', 404);
            return successResponse(res, 'Task deleted successfully.');
        } catch (err) { next(err); }
    }
);

/* ── POST /tasks/:id/submit ──────────────────────────────────────────────── */
router.post(
    '/:id/submit',
    authorize('student'),
    [
        body('githubLink').optional().isURL().withMessage('githubLink must be a valid URL'),
        body('comment').optional().isString(),
    ],
    validate,
    async (req, res, next) => {
        try {
            const { id: userId } = req.user;
            const taskId = req.params.id;

            const [task] = await sql`SELECT * FROM tasks WHERE id = ${taskId} AND deleted_at IS NULL`;
            if (!task) return errorResponse(res, 'Task not found.', 404);

            // Deadline check
            if (task.due_date && new Date(task.due_date) < new Date()) {
                return errorResponse(res, 'Submission deadline has passed.', 400);
            }

            // Is user assigned? (direct, team, or cohort-wide)
            const [direct] = await sql`
                SELECT id FROM task_assignments WHERE task_id = ${taskId} AND user_id = ${userId}`;

            const [viaTeam] = await sql`
                SELECT tta.team_id FROM task_team_assignments tta
                JOIN team_members mbr ON mbr.team_id = tta.team_id
                WHERE tta.task_id = ${taskId} AND mbr.user_id = ${userId} LIMIT 1`;

            const cohortWide =
                task.assignment_type === 'cohort' &&
                (req.user.cohorts ?? []).includes(task.cohort_id);

            if (!direct && !viaTeam && !cohortWide) {
                return errorResponse(res, 'You are not assigned to this task.', 403);
            }

            // Duplicate check per student
            const [dupe] = await sql`
                SELECT id FROM submissions WHERE task_id = ${taskId} AND submitted_by = ${userId}`;
            if (dupe) return errorResponse(res, 'Already submitted.', 409);

            const teamId = viaTeam?.team_id ?? null;
            const { githubLink, comment } = req.body;

            const [submission] = await sql`
                INSERT INTO submissions (organization_id, task_id, team_id, submitted_by, status, github_link, comment)
                VALUES (${task.organization_id}, ${taskId}, ${teamId}, ${userId}, 'submitted',
                        ${githubLink ?? null}, ${comment ?? null})
                RETURNING *`;

            // Advance task status to submitted if not yet reviewed
            await sql`
                UPDATE tasks
                SET status = CASE WHEN status IN ('pending','in_progress') THEN 'submitted'::task_status ELSE status END,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = ${taskId}`;

            return successResponse(res, 'Submission uploaded successfully.', submission, 201);
        } catch (err) { next(err); }
    }
);

export default router;
