/**
 * Courses routes — global template model
 *
 * Courses are now GLOBAL TEMPLATES not tied to a single cohort.
 * cohort_courses is the M:N junction that assigns courses to cohorts.
 *
 * GET    /api/courses                          — all courses (filterable by cohortId)
 * GET    /api/courses/:id                      — course + teams + cohorts assigned
 * POST   /api/courses                          — create global template (admin)
 * PUT    /api/courses/:id                      — update template (admin/instructor)
 * PATCH  /api/courses/:id/finish               — mark completed
 * POST   /api/courses/:id/assign-cohort        — assign course to a cohort (admin)
 * DELETE /api/courses/:id/assign-cohort/:cId   — remove from cohort (admin)
 * POST   /api/courses/:id/teams                — create team inside course+cohort
 * DELETE /api/courses/:id/teams/:teamId
 * POST   /api/courses/:id/teams/:teamId/leader
 * POST   /api/courses/:id/teams/:teamId/members
 * DELETE /api/courses/:id/teams/:teamId/members/:userId
 * GET    /api/courses/:id/tasks
 */
import { Router } from 'express';
import { body } from 'express-validator';
import sql from '../db/index.js';
import authenticate from '../middleware/authenticate.js';
import { authorize, cohortFilter } from '../middleware/rbac.js';
import { validate } from '../middleware/validate.js';
import { successResponse, errorResponse } from '../utils/response.js';

const router = Router();
router.use(authenticate);

/* ── Helper: verify the caller has cohort access to a given course ────────── */
const checkCourseAccess = async (req, courseId) => {
    if (req.user.role === 'admin') return true;
    const { cohortIds } = cohortFilter(req.user);
    if (!cohortIds || !cohortIds.length) return false;
    const [cc] = await sql`
        SELECT id FROM cohort_courses
        WHERE course_id = ${courseId} AND cohort_id = ANY(${cohortIds}::uuid[])
        LIMIT 1`;
    return !!cc;
};

/* GET /courses — optionally filter by cohortId */
router.get('/', async (req, res, next) => {
    try {
        const { role, id: userId } = req.user;
        const { isAdmin, cohortIds } = cohortFilter(req.user);
        const filterCohort = req.query.cohortId ?? null;

        let courses;
        if (isAdmin) {
            courses = filterCohort
                ? await sql`
                    SELECT c.*, (SELECT COUNT(*) FROM teams t WHERE t.course_id = c.id) AS team_count,
                           json_agg(DISTINCT jsonb_build_object('cohort_id', cc.cohort_id, 'cohort_name', co.name))
                               FILTER (WHERE cc.cohort_id IS NOT NULL) AS assigned_cohorts
                    FROM courses c
                    JOIN cohort_courses cc ON cc.course_id = c.id AND cc.cohort_id = ${filterCohort}
                    JOIN cohorts co ON co.id = cc.cohort_id
                    GROUP BY c.id ORDER BY c.created_at DESC`
                : await sql`
                    SELECT c.*, (SELECT COUNT(*) FROM teams t WHERE t.course_id = c.id) AS team_count,
                           json_agg(DISTINCT jsonb_build_object('cohort_id', cc.cohort_id, 'cohort_name', co.name))
                               FILTER (WHERE cc.cohort_id IS NOT NULL) AS assigned_cohorts
                    FROM courses c
                    LEFT JOIN cohort_courses cc ON cc.course_id = c.id
                    LEFT JOIN cohorts co ON co.id = cc.cohort_id
                    GROUP BY c.id ORDER BY c.created_at DESC`;
        } else if (role === 'instructor') {
            const allowed = filterCohort
                ? cohortIds.includes(filterCohort) ? [filterCohort] : []
                : cohortIds;
            if (!allowed.length) return successResponse(res, 'Courses retrieved successfully.', []);
            courses = await sql`
                SELECT DISTINCT c.*,
                       (SELECT COUNT(*) FROM teams t WHERE t.course_id = c.id AND t.cohort_id = ANY(${allowed}::uuid[])) AS team_count
                FROM courses c
                JOIN cohort_courses cc ON cc.course_id = c.id AND cc.cohort_id = ANY(${allowed}::uuid[])
                ORDER BY c.created_at DESC`;
        } else {
            // student — courses via team membership in their cohort
            courses = await sql`
                SELECT DISTINCT c.*
                FROM courses c
                JOIN teams t ON t.course_id = c.id
                JOIN team_members tm ON tm.team_id = t.id AND tm.user_id = ${userId}
                ORDER BY c.created_at DESC`;
        }
        return successResponse(res, 'Courses retrieved successfully.', courses);
    } catch (err) { next(err); }
});

/* GET /courses/:id */
router.get('/:id', async (req, res, next) => {
    try {
        const [course] = await sql`SELECT * FROM courses WHERE id = ${req.params.id}`;
        if (!course) return errorResponse(res, 'Course not found.', 404);

        // Cohort access check — non-admin must belong to a cohort this course is assigned to
        if (!(await checkCourseAccess(req, req.params.id))) {
            return errorResponse(res, 'Access denied. You do not belong to a cohort for this course.', 403);
        }

        // For non-admin users, only show teams in their cohorts
        const { cohortIds } = cohortFilter(req.user);
        const teams = req.user.role === 'admin'
            ? await sql`
                SELECT t.*,
                       p.full_name AS leader_name,
                       (
                           SELECT json_agg(json_build_object('id', pr.id, 'email', pr.email, 'full_name', pr.full_name, 'role', tm2.role))
                           FROM team_members tm2
                           JOIN profiles pr ON pr.id = tm2.user_id
                           WHERE tm2.team_id = t.id
                       ) AS members
                FROM teams t
                LEFT JOIN profiles p ON p.id = t.team_leader_id
                WHERE t.course_id = ${req.params.id}
                ORDER BY t.created_at`
            : await sql`
                SELECT t.*,
                       p.full_name AS leader_name,
                       (
                           SELECT json_agg(json_build_object('id', pr.id, 'email', pr.email, 'full_name', pr.full_name, 'role', tm2.role))
                           FROM team_members tm2
                           JOIN profiles pr ON pr.id = tm2.user_id
                           WHERE tm2.team_id = t.id
                       ) AS members
                FROM teams t
                LEFT JOIN profiles p ON p.id = t.team_leader_id
                WHERE t.course_id = ${req.params.id}
                  AND t.cohort_id = ANY(${cohortIds}::uuid[])
                ORDER BY t.created_at`;

        return successResponse(res, 'Course retrieved successfully.', { ...course, teams });
    } catch (err) { next(err); }
});

/* POST /courses */
router.post(
    '/',
    authorize('admin', 'instructor'),
    [
        body('name').trim().notEmpty(),
        body('cohortId').optional({ nullable: true }).isUUID(),
        body('organizationId').optional({ nullable: true }).isUUID(),
    ],
    validate,
    async (req, res, next) => {
        try {
            const { name, description, cohortId, organizationId, endDate } = req.body;
            // Fall back to the instructor's own org if not provided
            const orgId = organizationId ?? req.user.organizationId;
            const [course] = await sql`
                INSERT INTO courses (organization_id, name, description, end_date, created_by)
                VALUES (${orgId}, ${name}, ${description ?? null}, ${endDate ?? null}, ${req.user.id})
                RETURNING *
            `;
            // Auto-assign to cohort_courses if cohortId was provided
            if (cohortId) {
                await sql`
                    INSERT INTO cohort_courses (organization_id, cohort_id, course_id, assigned_by)
                    VALUES (${orgId}, ${cohortId}, ${course.id}, ${req.user.id})
                    ON CONFLICT (cohort_id, course_id) DO NOTHING`;
            }
            return successResponse(res, 'Course created successfully.', course, 201);
        } catch (err) { next(err); }
    }
);

/* POST /courses/:id/assign-cohort — assign this course to a cohort */
router.post(
    '/:id/assign-cohort',
    authorize('admin'),
    [body('cohortId').isUUID()],
    validate,
    async (req, res, next) => {
        try {
            const [course] = await sql`SELECT organization_id FROM courses WHERE id = ${req.params.id}`;
            if (!course) return errorResponse(res, 'Course not found.', 404);
            const [cc] = await sql`
                INSERT INTO cohort_courses (organization_id, cohort_id, course_id, assigned_by)
                VALUES (${course.organization_id}, ${req.body.cohortId}, ${req.params.id}, ${req.user.id})
                ON CONFLICT (cohort_id, course_id) DO NOTHING RETURNING *`;
            return successResponse(res, 'Course assigned to cohort successfully.', cc ?? { note: 'Already assigned.' }, 201);
        } catch (err) { next(err); }
    }
);

/* DELETE /courses/:id/assign-cohort/:cohortId */
router.delete('/:id/assign-cohort/:cohortId', authorize('admin'), async (req, res, next) => {
    try {
        await sql`
            DELETE FROM cohort_courses
            WHERE course_id = ${req.params.id} AND cohort_id = ${req.params.cohortId}`;
        return successResponse(res, 'Course removed from cohort successfully.');
    } catch (err) { next(err); }
});

/* DELETE /courses/:id */
router.delete('/:id', authorize('admin', 'instructor'), async (req, res, next) => {
    try {
        // Check access for instructors
        if (!(await checkCourseAccess(req, req.params.id))) {
            return errorResponse(res, 'Access denied to this course.', 403);
        }
        const [course] = await sql`DELETE FROM courses WHERE id = ${req.params.id} RETURNING id`;
        if (!course) return errorResponse(res, 'Course not found.', 404);
        return successResponse(res, 'Course deleted successfully.');
    } catch (err) { next(err); }
});

/* PUT /courses/:id */
router.put(
    '/:id',
    authorize('admin', 'instructor'),
    [body('name').optional().trim().notEmpty()],
    validate,
    async (req, res, next) => {
        try {
            const { name, description, endDate, status } = req.body;
            const [course] = await sql`
                UPDATE courses
                SET name        = COALESCE(${name ?? null}, name),
                    description = COALESCE(${description ?? null}, description),
                    end_date    = COALESCE(${endDate ?? null}::date, end_date),
                    status      = COALESCE(${status ?? null}::course_status, status),
                    updated_at  = CURRENT_TIMESTAMP
                WHERE id = ${req.params.id}
                RETURNING *
            `;
            if (!course) return errorResponse(res, 'Course not found.', 404);
            return successResponse(res, 'Course updated successfully.', course);
        } catch (err) { next(err); }
    }
);

/* PATCH /courses/:id/finish */
router.patch('/:id/finish', authorize('admin', 'instructor'), async (req, res, next) => {
    try {
        const [course] = await sql`
            UPDATE courses SET status = 'completed', updated_at = CURRENT_TIMESTAMP
            WHERE id = ${req.params.id} RETURNING *
        `;
        if (!course) return errorResponse(res, 'Course not found.', 404);
        return successResponse(res, 'Course marked as completed.', course);
    } catch (err) { next(err); }
});

/* POST /courses/:id/teams */
router.post(
    '/:id/teams',
    authorize('admin', 'instructor'),
    [body('name').trim().notEmpty(), body('cohortId').isUUID()],
    validate,
    async (req, res, next) => {
        try {
            const [course] = await sql`SELECT organization_id FROM courses WHERE id = ${req.params.id}`;
            if (!course) return errorResponse(res, 'Course not found.', 404);

            const { name, description, maxMembers, cohortId } = req.body;

            // Cohort access check for instructor
            if (req.user.role === 'instructor' && !(req.user.cohorts ?? []).includes(cohortId)) {
                return errorResponse(res, 'You do not belong to this cohort.', 403);
            }

            // Validate course is assigned to this cohort
            const [cc] = await sql`
                SELECT id FROM cohort_courses WHERE cohort_id = ${cohortId} AND course_id = ${req.params.id}`;
            if (!cc) return errorResponse(res, 'This course is not assigned to the specified cohort.', 400);

            const [team] = await sql`
                INSERT INTO teams (organization_id, course_id, cohort_id, name, description, max_members, created_by)
                VALUES (${course.organization_id}, ${req.params.id}, ${cohortId}, ${name}, ${description ?? null}, ${maxMembers ?? 10}, ${req.user.id})
                RETURNING *
            `;
            return successResponse(res, 'Team created successfully.', team, 201);
        } catch (err) { next(err); }
    }
);

/* DELETE /courses/:id/teams/:teamId */
router.delete('/:id/teams/:teamId', authorize('admin', 'instructor'), async (req, res, next) => {
    try {
        if (!(await checkCourseAccess(req, req.params.id))) {
            return errorResponse(res, 'Access denied to this course.', 403);
        }
        await sql`DELETE FROM team_members WHERE team_id = ${req.params.teamId}`;
        await sql`DELETE FROM teams WHERE id = ${req.params.teamId} AND course_id = ${req.params.id}`;
        return successResponse(res, 'Team removed from course.');
    } catch (err) { next(err); }
});

/* POST /courses/:id/teams/:teamId/leader */
router.post(
    '/:id/teams/:teamId/leader',
    authorize('admin', 'instructor'),
    [body('studentId').optional().isUUID(), body('userId').optional().isUUID()],
    validate,
    async (req, res, next) => {
        try {
            const leaderId = req.body.studentId || req.body.userId;
            if (!leaderId) return errorResponse(res, 'studentId or userId is required.', 400);

            // Cohort access check
            const [team] = await sql`SELECT cohort_id FROM teams WHERE id = ${req.params.teamId} AND course_id = ${req.params.id}`;
            if (!team) return errorResponse(res, 'Team not found.', 404);
            if (req.user.role === 'instructor' && !(req.user.cohorts ?? []).includes(team.cohort_id)) {
                return errorResponse(res, 'Access denied. You are not an instructor of this team\'s cohort.', 403);
            }

            // Ensure the user is a member of the team
            const [membership] = await sql`
                SELECT id FROM team_members WHERE team_id = ${req.params.teamId} AND user_id = ${leaderId}
            `;
            if (!membership) return errorResponse(res, 'User must be a member of the team to be assigned as leader.', 400);

            // Update team leader
            await sql`
                UPDATE teams SET team_leader_id = ${leaderId}, updated_at = CURRENT_TIMESTAMP
                WHERE id = ${req.params.teamId} AND course_id = ${req.params.id}
            `;

            // Update is_leader flags in team_members
            await sql`UPDATE team_members SET is_leader = false WHERE team_id = ${req.params.teamId}`;
            await sql`UPDATE team_members SET is_leader = true WHERE team_id = ${req.params.teamId} AND user_id = ${leaderId}`;

            // Note: team_leader is NOT a global role — leadership is contextual (teams.team_leader_id + team_members.is_leader)

            return successResponse(res, 'Team leader assigned.');
        } catch (err) { next(err); }
    }
);

/* POST /courses/:id/teams/:teamId/members */
router.post(
    '/:id/teams/:teamId/members',
    authorize('admin', 'instructor'),
    [body('studentId').optional().isUUID(), body('userId').optional().isUUID()],
    validate,
    async (req, res, next) => {
        try {
            const studentId = req.body.studentId || req.body.userId;
            if (!studentId) return errorResponse(res, 'studentId or userId is required.', 400);

            const [team] = await sql`SELECT organization_id, course_id, cohort_id FROM teams WHERE id = ${req.params.teamId}`;
            if (!team) return errorResponse(res, 'Team not found.', 404);

            // Cohort access check for instructor
            if (req.user.role === 'instructor' && !(req.user.cohorts ?? []).includes(team.cohort_id)) {
                return errorResponse(res, 'Access denied to this team.', 403);
            }

            // Validate the student belongs to the same cohort as the team
            if (team.cohort_id) {
                const [inCohort] = await sql`
                    SELECT id FROM user_cohorts WHERE user_id = ${studentId} AND cohort_id = ${team.cohort_id}`;
                if (!inCohort) {
                    return errorResponse(res, 'Student does not belong to this cohort. Cross-cohort assignment is not allowed.', 400);
                }
            }

            // Check if student is already in another team for the same course
            const [existing] = await sql`
                SELECT tm.id, t.name AS team_name
                FROM team_members tm
                JOIN teams t ON t.id = tm.team_id
                WHERE tm.user_id = ${studentId} AND t.course_id = ${team.course_id} AND tm.team_id != ${req.params.teamId}
            `;
            if (existing) {
                return errorResponse(res, `Student is already in team "${existing.team_name}" for this course.`, 409);
            }

            const [member] = await sql`
                INSERT INTO team_members (organization_id, team_id, user_id, course_id)
                VALUES (${team.organization_id}, ${req.params.teamId}, ${studentId}, ${team.course_id})
                ON CONFLICT (team_id, user_id) DO NOTHING
                RETURNING *
            `;
            return successResponse(res, 'Team member added successfully.', member, 201);
        } catch (err) { next(err); }
    }
);

/* DELETE /courses/:id/teams/:teamId/members/:userId */
router.delete('/:id/teams/:teamId/members/:userId', authorize('admin', 'instructor'), async (req, res, next) => {
    try {
        if (!(await checkCourseAccess(req, req.params.id))) {
            return errorResponse(res, 'Access denied to this course.', 403);
        }
        await sql`DELETE FROM team_members WHERE team_id = ${req.params.teamId} AND user_id = ${req.params.userId}`;
        return successResponse(res, 'Member removed from team.');
    } catch (err) { next(err); }
});

/* GET /courses/:id/tasks */
router.get('/:id/tasks', async (req, res, next) => {
    try {
        // Cohort access check
        if (!(await checkCourseAccess(req, req.params.id))) {
            return errorResponse(res, 'Access denied to this course.', 403);
        }

        const { cohortIds } = cohortFilter(req.user);
        const tasks = req.user.role === 'admin'
            ? await sql`
                SELECT t.*, p.full_name AS assignee_name, tm.name AS team_name
                FROM tasks t
                LEFT JOIN profiles p ON p.id = t.assignee_id
                LEFT JOIN teams tm ON tm.id = t.team_id
                WHERE t.course_id = ${req.params.id} AND t.deleted_at IS NULL
                ORDER BY t.created_at DESC`
            : await sql`
                SELECT t.*, p.full_name AS assignee_name, tm.name AS team_name
                FROM tasks t
                LEFT JOIN profiles p ON p.id = t.assignee_id
                LEFT JOIN teams tm ON tm.id = t.team_id
                WHERE t.course_id = ${req.params.id} AND t.deleted_at IS NULL
                  AND t.cohort_id = ANY(${cohortIds}::uuid[])
                ORDER BY t.created_at DESC`;

        return successResponse(res, 'Tasks retrieved successfully.', tasks);
    } catch (err) { next(err); }
});

/* POST /courses/:id/tasks */
router.post(
    '/:id/tasks',
    authorize('admin', 'instructor'),
    [body('title').trim().notEmpty(), body('dueDate').isISO8601()],
    validate,
    async (req, res, next) => {
        try {
            // Cohort access check
            if (!(await checkCourseAccess(req, req.params.id))) {
                return errorResponse(res, 'Access denied to this course.', 403);
            }
            const [course] = await sql`SELECT organization_id FROM courses WHERE id = ${req.params.id}`;
            if (!course) return errorResponse(res, 'Course not found.', 404);
            const { title, description, priority, dueDate, teamId, assigneeId } = req.body;
            const [task] = await sql`
                INSERT INTO tasks (organization_id, course_id, team_id, title, description, priority, due_date, assignee_id, created_by)
                VALUES (${course.organization_id}, ${req.params.id}, ${teamId ?? null}, ${title},
                        ${description ?? null}, ${priority ?? 'medium'}, ${dueDate}, ${assigneeId ?? null}, ${req.user.id})
                RETURNING *
            `;
            return successResponse(res, 'Task created successfully.', task, 201);
        } catch (err) { next(err); }
    }
);

/* PUT /courses/:id/tasks/:taskId */
router.put(
    '/:id/tasks/:taskId',
    authorize('admin', 'instructor'),
    [body('title').optional().trim().notEmpty()],
    validate,
    async (req, res, next) => {
        try {
            // Cohort access check
            if (!(await checkCourseAccess(req, req.params.id))) {
                return errorResponse(res, 'Access denied to this course.', 403);
            }
            const { title, description, priority, status, dueDate } = req.body;
            const [task] = await sql`
                UPDATE tasks
                SET title       = COALESCE(${title ?? null}, title),
                    description = COALESCE(${description ?? null}, description),
                    priority    = COALESCE(${priority ?? null}::task_priority, priority),
                    status      = COALESCE(${status ?? null}::task_status, status),
                    due_date    = COALESCE(${dueDate ?? null}::date, due_date),
                    updated_at  = CURRENT_TIMESTAMP
                WHERE id = ${req.params.taskId} AND course_id = ${req.params.id}
                RETURNING *
            `;
            if (!task) return errorResponse(res, 'Task not found.', 404);
            return successResponse(res, 'Task updated successfully.', task);
        } catch (err) { next(err); }
    }
);

export default router;
