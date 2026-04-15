/**
 * Teams routes — cohort-isolated
 *
 * GET    /api/teams                         ?cohortId=   ?courseId=
 * GET    /api/teams/:id
 * GET    /api/teams/:id/members
 * POST   /api/teams
 * PUT    /api/teams/:id
 * DELETE /api/teams/:id
 * POST   /api/teams/:id/members
 * DELETE /api/teams/:id/members/:userId
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

/* GET /teams — cohort + course filtered */
router.get(
    '/',
    [
        query('cohortId').optional().isUUID(),
        query('courseId').optional().isUUID(),
    ],
    validate,
    async (req, res, next) => {
        try {
            const { isAdmin, cohortIds } = cohortFilter(req.user);
            const qCohort = req.query.cohortId ?? null;
            const qCourse = req.query.courseId ?? null;

            // Instructors are restricted to their own cohorts
            const allowedCohorts = isAdmin
                ? qCohort ? [qCohort] : null          // null = no cohort filter
                : qCohort
                    ? cohortIds.includes(qCohort) ? [qCohort] : []
                    : cohortIds;

            if (allowedCohorts !== null && !allowedCohorts.length) {
                return successResponse(res, 'Teams retrieved successfully.', []);
            }

            let teams;
            if (allowedCohorts === null && !qCourse) {
                // Admin, no filters
                teams = await sql`
                    SELECT t.*, c.name AS course_name, co.name AS cohort_name,
                           p.full_name AS leader_name,
                           COUNT(tm.id)::int AS member_count
                    FROM teams t
                    LEFT JOIN courses  c  ON c.id  = t.course_id
                    LEFT JOIN cohorts  co ON co.id = t.cohort_id
                    LEFT JOIN profiles p  ON p.id  = t.team_leader_id
                    LEFT JOIN team_members tm ON tm.team_id = t.id
                    GROUP BY t.id, c.name, co.name, p.full_name
                    ORDER BY t.created_at DESC`;
            } else {
                teams = await sql`
                    SELECT t.*, c.name AS course_name, co.name AS cohort_name,
                           p.full_name AS leader_name,
                           COUNT(tm.id)::int AS member_count
                    FROM teams t
                    LEFT JOIN courses  c  ON c.id  = t.course_id
                    LEFT JOIN cohorts  co ON co.id = t.cohort_id
                    LEFT JOIN profiles p  ON p.id  = t.team_leader_id
                    LEFT JOIN team_members tm ON tm.team_id = t.id
                    WHERE (${allowedCohorts === null} OR t.cohort_id = ANY(${allowedCohorts ?? []}::uuid[]))
                      AND (${!qCourse} OR t.course_id = ${qCourse})
                    GROUP BY t.id, c.name, co.name, p.full_name
                    ORDER BY t.created_at DESC`;
            }
            return successResponse(res, 'Teams retrieved successfully.', teams);
        } catch (err) { next(err); }
    }
);

/* GET /teams/:id — admin sees any; non-admin must belong to the team's cohort or be an instructor of it */
router.get('/:id', async (req, res, next) => {
    try {
        const [team] = await sql`
            SELECT t.*, c.name AS course_name, p.full_name AS leader_name
            FROM teams t
            LEFT JOIN courses c ON c.id = t.course_id
            LEFT JOIN profiles p ON p.id = t.team_leader_id
            WHERE t.id = ${req.params.id}
        `;
        if (!team) return errorResponse(res, 'Team not found.', 404);

        const { role, id: userId } = req.user;
        if (role !== 'admin') {
            const { cohortIds } = cohortFilter(req.user);
            const [membership] = await sql`SELECT id FROM team_members WHERE team_id = ${req.params.id} AND user_id = ${userId}`;
            const inCohort = team.cohort_id && (cohortIds ?? []).includes(team.cohort_id);
            if (!membership && !inCohort) return errorResponse(res, 'Access denied to this team.', 403);
        }
        return successResponse(res, 'Team retrieved successfully.', team);
    } catch (err) { next(err); }
});

/* GET /teams/:id/members — same access rules as GET /:id */
router.get('/:id/members', async (req, res, next) => {
    try {
        const [team] = await sql`SELECT cohort_id FROM teams WHERE id = ${req.params.id}`;
        if (!team) return errorResponse(res, 'Team not found.', 404);

        const { role, id: userId } = req.user;
        if (role !== 'admin') {
            const { cohortIds } = cohortFilter(req.user);
            const [membership] = await sql`SELECT id FROM team_members WHERE team_id = ${req.params.id} AND user_id = ${userId}`;
            const inCohort = team.cohort_id && (cohortIds ?? []).includes(team.cohort_id);
            if (!membership && !inCohort) return errorResponse(res, 'Access denied to this team.', 403);
        }

        const members = await sql`
            SELECT tm.*, p.full_name, p.avatar_url, p.email, p.role
            FROM team_members tm
            LEFT JOIN profiles p ON p.id = tm.user_id
            WHERE tm.team_id = ${req.params.id}
            ORDER BY p.full_name
        `;
        return successResponse(res, 'Team members retrieved successfully.', members);
    } catch (err) { next(err); }
});

/* POST /teams — admin/instructor; validate cohort membership + no cross-cohort */
router.post(
    '/',
    authorize('admin', 'instructor'),
    [
        body('name').trim().notEmpty(),
        body('courseId').isUUID(),
        body('cohortId').isUUID(),
        body('organizationId').isUUID(),
    ],
    validate,
    async (req, res, next) => {
        try {
            const { name, description, courseId, cohortId, organizationId, teamLeaderId, maxMembers } = req.body;

            // Instructor must belong to the target cohort
            if (req.user.role === 'instructor') {
                if (!(req.user.cohorts ?? []).includes(cohortId)) {
                    return errorResponse(res, 'You do not belong to this cohort.', 403);
                }
            }

            // Validate courseId belongs to this cohort
            const [cc] = await sql`
                SELECT id FROM cohort_courses WHERE cohort_id = ${cohortId} AND course_id = ${courseId}`;
            if (!cc) {
                return errorResponse(res, 'This course is not assigned to the specified cohort.', 400);
            }

            const [team] = await sql`
                INSERT INTO teams (organization_id, course_id, cohort_id, name, description,
                                   team_leader_id, max_members, created_by)
                VALUES (${organizationId}, ${courseId}, ${cohortId}, ${name}, ${description ?? null},
                        ${teamLeaderId ?? null}, ${maxMembers ?? 10}, ${req.user.id})
                RETURNING *`;
            return successResponse(res, 'Team created successfully.', team, 201);
        } catch (err) { next(err); }
    }
);

/* PUT /teams/:id — instructor must belong to the same cohort */
router.put(
    '/:id',
    authorize('admin', 'instructor'),
    [body('name').optional().trim().notEmpty()],
    validate,
    async (req, res, next) => {
        try {
            // Fetch team first to enforce cohort isolation for instructors
            const [existing] = await sql`SELECT cohort_id FROM teams WHERE id = ${req.params.id}`;
            if (!existing) return errorResponse(res, 'Team not found.', 404);
            if (req.user.role === 'instructor' && !(req.user.cohorts ?? []).includes(existing.cohort_id)) {
                return errorResponse(res, 'Access denied. You are not an instructor of this team\'s cohort.', 403);
            }

            const { name, description, teamLeaderId, maxMembers } = req.body;
            const [team] = await sql`
                UPDATE teams
                SET name           = COALESCE(${name           ?? null}, name),
                    description    = COALESCE(${description    ?? null}, description),
                    team_leader_id = COALESCE(${teamLeaderId   ?? null}::uuid, team_leader_id),
                    max_members    = COALESCE(${maxMembers      ?? null}::int, max_members),
                    updated_at     = CURRENT_TIMESTAMP
                WHERE id = ${req.params.id}
                RETURNING *
            `;
            if (!team) return errorResponse(res, 'Team not found.', 404);
            return successResponse(res, 'Team updated successfully.', team);
        } catch (err) { next(err); }
    }
);

/* DELETE /teams/:id */
router.delete('/:id', authorize('admin', 'instructor'), async (req, res, next) => {
    try {
        await sql`DELETE FROM team_members WHERE team_id = ${req.params.id}`;
        const result = await sql`DELETE FROM teams WHERE id = ${req.params.id} RETURNING id`;
        if (!result.length) return errorResponse(res, 'Team not found.', 404);
        return successResponse(res, 'Team deleted successfully.');
    } catch (err) { next(err); }
});

/* POST /teams/:id/members — validate same cohort */
router.post(
    '/:id/members',
    authorize('admin', 'instructor'),
    [body('userId').isUUID()],
    validate,
    async (req, res, next) => {
        try {
            const [team] = await sql`SELECT * FROM teams WHERE id = ${req.params.id}`;
            if (!team) return errorResponse(res, 'Team not found.', 404);

            // Instructor cohort check
            if (req.user.role === 'instructor' && !(req.user.cohorts ?? []).includes(team.cohort_id)) {
                return errorResponse(res, 'Access denied to this team.', 403);
            }

            // Validate the student belongs to the same cohort
            if (team.cohort_id) {
                const [inCohort] = await sql`
                    SELECT id FROM user_cohorts
                    WHERE user_id = ${req.body.userId} AND cohort_id = ${team.cohort_id}`;
                if (!inCohort) {
                    return errorResponse(res, 'Student does not belong to this cohort. Cross-cohort assignment is not allowed.', 400);
                }
            }

            // Check not already in another team in the same course
            if (team.course_id) {
                const [existing] = await sql`
                    SELECT tm.id, t.name AS team_name
                    FROM team_members tm
                    JOIN teams t ON t.id = tm.team_id
                    WHERE tm.user_id = ${req.body.userId}
                      AND t.course_id = ${team.course_id}
                      AND tm.team_id != ${req.params.id}`;
                if (existing) {
                    return errorResponse(res, `Student is already in team "${existing.team_name}" for this course.`, 409);
                }
            }

            const [member] = await sql`
                INSERT INTO team_members (organization_id, team_id, user_id)
                VALUES (${team.organization_id}, ${req.params.id}, ${req.body.userId})
                ON CONFLICT (team_id, user_id) DO NOTHING RETURNING *`;
            return successResponse(res, 'Team member added successfully.', member, 201);
        } catch (err) { next(err); }
    }
);

/* DELETE /teams/:id/members/:userId */
router.delete('/:id/members/:userId', authorize('admin', 'instructor'), async (req, res, next) => {
    try {
        await sql`DELETE FROM team_members WHERE team_id = ${req.params.id} AND user_id = ${req.params.userId}`;
        return successResponse(res, 'Member removed from team successfully.');
    } catch (err) { next(err); }
});

export default router;
