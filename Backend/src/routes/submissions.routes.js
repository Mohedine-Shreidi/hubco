/**
 * Submissions routes — refactored + security-hardened
 *
 * GET    /api/submissions                       — cohort-scoped list
 * GET    /api/submissions/task/:taskId          — all subs for a task (admin/instructor)
 * GET    /api/submissions/check/:taskId         — has current user submitted?
 * GET    /api/submissions/:id                   — single
 * POST   /api/submissions                       — submit
 * PUT    /api/submissions/:id/review            — accept/reject/request-revision (instructor/admin)
 * PATCH  /api/submissions/:id/assess            — add grade + feedback
 *
 * NOTE: tasks has no direct cohort_id — cohort is resolved via tasks.course_id → courses.cohort_id
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

/* ── GET /submissions — cohort-scoped for instructor; own for student ──────── */
router.get('/', async (req, res, next) => {
    try {
        const { role, id: userId } = req.user;
        const { isAdmin, cohortIds } = cohortFilter(req.user);
        let submissions;

        if (isAdmin) {
            submissions = await sql`
                SELECT s.*, t.title AS task_title, c.cohort_id,
                       p.full_name AS submitted_by_name, tm.name AS team_name
                FROM submissions s
                JOIN tasks t ON t.id = s.task_id
                JOIN courses c ON c.id = t.course_id
                LEFT JOIN profiles p ON p.id = s.submitted_by
                LEFT JOIN teams tm ON tm.id = s.team_id
                ORDER BY s.submitted_at DESC
            `;
        } else if (role === 'instructor') {
            if (!cohortIds.length) return successResponse(res, 'Submissions retrieved successfully.', []);
            submissions = await sql`
                SELECT s.*, t.title AS task_title, c.cohort_id,
                       p.full_name AS submitted_by_name, tm.name AS team_name
                FROM submissions s
                JOIN tasks t ON t.id = s.task_id
                JOIN courses c ON c.id = t.course_id AND c.cohort_id = ANY(${cohortIds}::uuid[])
                LEFT JOIN profiles p ON p.id = s.submitted_by
                LEFT JOIN teams tm ON tm.id = s.team_id
                ORDER BY s.submitted_at DESC
            `;
        } else {
            // student — own submissions only
            submissions = await sql`
                SELECT s.*, t.title AS task_title, tm.name AS team_name
                FROM submissions s
                JOIN tasks t ON t.id = s.task_id
                LEFT JOIN teams tm ON tm.id = s.team_id
                WHERE s.submitted_by = ${userId}
                ORDER BY s.submitted_at DESC
            `;
        }
        return successResponse(res, 'Submissions retrieved successfully.', submissions);
    } catch (err) { next(err); }
});

/* ── GET /submissions/check/:taskId — has the current user/team submitted? ── */
router.get('/check/:taskId', async (req, res, next) => {
    try {
        const [teamMember] = await sql`SELECT team_id FROM team_members WHERE user_id = ${req.user.id} LIMIT 1`;
        const [submission] = await sql`
            SELECT * FROM submissions
            WHERE task_id = ${req.params.taskId}
              AND (submitted_by = ${req.user.id} OR team_id = ${teamMember?.team_id ?? null})
            LIMIT 1
        `;
        return successResponse(res, 'Submission check completed.', submission ?? null);
    } catch (err) { next(err); }
});

/* ── GET /submissions/task/:taskId — instructor must own the task's cohort ─── */
router.get('/task/:taskId', authorize('admin', 'instructor'), async (req, res, next) => {
    try {
        if (req.user.role === 'instructor') {
            const [task] = await sql`
                SELECT c.cohort_id FROM tasks t
                JOIN courses c ON c.id = t.course_id
                WHERE t.id = ${req.params.taskId} AND t.deleted_at IS NULL
            `;
            if (!task) return errorResponse(res, 'Task not found.', 404);
            if (!(req.user.cohorts ?? []).includes(task.cohort_id)) {
                return errorResponse(res, 'Access denied. You are not an instructor of this task\'s cohort.', 403);
            }
        }
        const submissions = await sql`
            SELECT s.*, p.full_name AS submitted_by_name, tm.name AS team_name
            FROM submissions s
            LEFT JOIN profiles p ON p.id = s.submitted_by
            LEFT JOIN teams tm ON tm.id = s.team_id
            WHERE s.task_id = ${req.params.taskId}
            ORDER BY s.submitted_at DESC
        `;
        return successResponse(res, 'Submissions retrieved successfully.', submissions);
    } catch (err) { next(err); }
});

/* ── GET /submissions/:id — student (own only), instructor (cohort), admin ── */
router.get('/:id', async (req, res, next) => {
    try {
        const [submission] = await sql`
            SELECT s.*, t.title AS task_title, c.cohort_id, p.full_name AS submitted_by_name
            FROM submissions s
            JOIN tasks t ON t.id = s.task_id
            JOIN courses c ON c.id = t.course_id
            LEFT JOIN profiles p ON p.id = s.submitted_by
            WHERE s.id = ${req.params.id}
        `;
        if (!submission) return errorResponse(res, 'Submission not found.', 404);

        const { role, id: userId } = req.user;
        if (role === 'student' && submission.submitted_by !== userId) {
            return errorResponse(res, 'Access denied to this submission.', 403);
        }
        if (role === 'instructor' && !(req.user.cohorts ?? []).includes(submission.cohort_id)) {
            return errorResponse(res, 'Access denied to this submission.', 403);
        }

        return successResponse(res, 'Submission retrieved successfully.', submission);
    } catch (err) { next(err); }
});

/* ── POST /submissions — legacy submit endpoint ─────────────────────────────── */
router.post(
    '/',
    authorize('student'),
    [
        body('taskId').isUUID(),
        body('organizationId').isUUID(),
        body('githubLink').optional().isURL(),
    ],
    validate,
    async (req, res, next) => {
        try {
            const { taskId, organizationId, githubLink, comment } = req.body;
            const { id: userId } = req.user;

            const [task] = await sql`SELECT * FROM tasks WHERE id = ${taskId} AND deleted_at IS NULL`;
            if (!task) return errorResponse(res, 'Task not found.', 404);

            if (task.due_date && new Date(task.due_date) < new Date()) {
                return errorResponse(res, 'Submission deadline has passed.', 400);
            }

            const [teamRow] = await sql`
                SELECT tta.team_id FROM task_team_assignments tta
                JOIN team_members mbr ON mbr.team_id = tta.team_id
                WHERE tta.task_id = ${taskId} AND mbr.user_id = ${userId} LIMIT 1
            `;
            const teamId = teamRow?.team_id ?? null;

            const [existing] = await sql`
                SELECT id FROM submissions WHERE task_id = ${taskId} AND submitted_by = ${userId}
            `;
            if (existing) return errorResponse(res, 'Task already submitted.', 409);

            const [submission] = await sql`
                INSERT INTO submissions (organization_id, task_id, team_id, submitted_by, status, github_link, comment)
                VALUES (${organizationId}, ${taskId}, ${teamId}, ${userId}, 'submitted',
                        ${githubLink ?? null}, ${comment ?? null})
                RETURNING *
            `;

            await sql`
                UPDATE tasks
                SET status = CASE WHEN status IN ('pending','in_progress') THEN 'submitted'::task_status ELSE status END,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = ${taskId}
            `;

            return successResponse(res, 'Submission uploaded successfully.', submission, 201);
        } catch (err) { next(err); }
    }
);

/* ── PUT /submissions/:id/review — accept/reject/request-revision ─────────── */
router.put(
    '/:id/review',
    authorize('admin', 'instructor'),
    [body('status').isIn(['accepted', 'rejected', 'revision_requested'])],
    validate,
    async (req, res, next) => {
        try {
            const { status, reviewComment } = req.body;

            if (req.user.role === 'instructor') {
                const [sub] = await sql`
                    SELECT c.cohort_id FROM submissions s
                    JOIN tasks t ON t.id = s.task_id
                    JOIN courses c ON c.id = t.course_id
                    WHERE s.id = ${req.params.id}
                `;
                if (!sub || !(req.user.cohorts ?? []).includes(sub.cohort_id)) {
                    return errorResponse(res, 'Access denied to this submission.', 403);
                }
            }

            const [submission] = await sql`
                UPDATE submissions
                SET status         = ${status}::submission_status,
                    reviewed_by    = ${req.user.id},
                    reviewed_at    = CURRENT_TIMESTAMP,
                    review_comment = ${reviewComment ?? null},
                    updated_at     = CURRENT_TIMESTAMP
                WHERE id = ${req.params.id} RETURNING *
            `;
            if (!submission) return errorResponse(res, 'Submission not found.', 404);

            const taskStatus = status === 'accepted' ? 'accepted' : status === 'rejected' ? 'rejected' : 'in_progress';
            await sql`
                UPDATE tasks SET status = ${taskStatus}::task_status, updated_at = CURRENT_TIMESTAMP
                WHERE id = ${submission.task_id}
            `;

            return successResponse(res, 'Submission reviewed successfully.', submission);
        } catch (err) { next(err); }
    }
);

/* ── PATCH /submissions/:id/assess — numeric grade + written feedback ──────── */
router.patch(
    '/:id/assess',
    authorize('admin', 'instructor'),
    [
        body('grade').isFloat({ min: 0, max: 100 }).withMessage('Grade must be 0–100'),
        body('feedback').optional().isString(),
    ],
    validate,
    async (req, res, next) => {
        try {
            const [row] = await sql`
                SELECT s.*, c.cohort_id FROM submissions s
                JOIN tasks t ON t.id = s.task_id
                JOIN courses c ON c.id = t.course_id
                WHERE s.id = ${req.params.id}
            `;
            if (!row) return errorResponse(res, 'Submission not found.', 404);

            if (req.user.role === 'instructor' && !(req.user.cohorts ?? []).includes(row.cohort_id)) {
                return errorResponse(res, 'You are not an instructor of this cohort.', 403);
            }

            const { grade, feedback } = req.body;
            const [updated] = await sql`
                UPDATE submissions
                SET grade       = ${grade},
                    feedback    = ${feedback ?? null},
                    assessed_by = ${req.user.id},
                    assessed_at = CURRENT_TIMESTAMP,
                    updated_at  = CURRENT_TIMESTAMP
                WHERE id = ${req.params.id} RETURNING *
            `;

            return successResponse(res, 'Grade recorded successfully.', updated);
        } catch (err) { next(err); }
    }
);

export default router;
