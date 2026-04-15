/**
 * Cohorts routes
 * GET    /api/cohorts
 * GET    /api/cohorts/:id
 * POST   /api/cohorts                   (admin)
 * PUT    /api/cohorts/:id               (admin)
 * DELETE /api/cohorts/:id               (admin)
 * POST   /api/cohorts/:id/instructor    (admin)
 * DELETE /api/cohorts/:id/instructor/:uId (admin)
 */
import { Router } from 'express';
import { body } from 'express-validator';
import sql from '../db/index.js';
import authenticate from '../middleware/authenticate.js';
import { authorize, cohortFilter } from '../middleware/rbac.js';
import { validate } from '../middleware/validate.js';
import { successResponse, errorResponse, paginatedResponse } from '../utils/response.js';

const router = Router();
router.use(authenticate);

/* GET /cohorts — admin sees all; instructor/student restricted to own cohorts */
router.get('/', async (req, res, next) => {
    try {
        const { isAdmin, cohortIds } = cohortFilter(req.user);
        let cohorts;
        if (isAdmin) {
            cohorts = await sql`
                SELECT c.*, o.name AS organization_name,
                    (SELECT COUNT(*) FROM user_cohorts uc WHERE uc.cohort_id = c.id AND uc.role = 'student')::int AS student_count,
                    (SELECT COUNT(*) FROM user_cohorts uc WHERE uc.cohort_id = c.id AND uc.role = 'instructor')::int AS instructor_count
                FROM cohorts c
                LEFT JOIN organizations o ON o.id = c.organization_id
                ORDER BY c.start_date DESC
            `;
        } else {
            if (!cohortIds?.length) return successResponse(res, 'Cohorts retrieved successfully.', []);
            cohorts = await sql`
                SELECT c.*, o.name AS organization_name,
                    (SELECT COUNT(*) FROM user_cohorts uc WHERE uc.cohort_id = c.id AND uc.role = 'student')::int AS student_count,
                    (SELECT COUNT(*) FROM user_cohorts uc WHERE uc.cohort_id = c.id AND uc.role = 'instructor')::int AS instructor_count
                FROM cohorts c
                LEFT JOIN organizations o ON o.id = c.organization_id
                WHERE c.id = ANY(${cohortIds}::uuid[])
                ORDER BY c.start_date DESC
            `;
        }
        return successResponse(res, 'Cohorts retrieved successfully.', cohorts);
    } catch (err) { next(err); }
});

/* GET /cohorts/:id — admin sees any; non-admin must belong to the cohort */
router.get('/:id', async (req, res, next) => {
    try {
        const { isAdmin, cohortIds } = cohortFilter(req.user);
        if (!isAdmin && !(cohortIds ?? []).includes(req.params.id)) {
            return errorResponse(res, 'Access denied to this cohort.', 403);
        }
        const [cohort] = await sql`
            SELECT c.*, (
                SELECT json_agg(json_build_object('id', p.id, 'email', p.email, 'role', p.role, 'full_name', p.full_name, 'avatar_url', p.avatar_url))
                FROM user_cohorts uc
                JOIN profiles p ON p.id = uc.user_id
                WHERE uc.cohort_id = c.id
            ) AS members,
            (
                SELECT json_agg(json_build_object('id', cr.id, 'name', cr.name, 'status', cr.status))
                FROM cohort_courses cc
                JOIN courses cr ON cr.id = cc.course_id
                WHERE cc.cohort_id = c.id
            ) AS courses
            FROM cohorts c WHERE c.id = ${req.params.id}
        `;
        if (!cohort) return errorResponse(res, 'Cohort not found.', 404);
        return successResponse(res, 'Cohort retrieved successfully.', cohort);
    } catch (err) { next(err); }
});

/* POST /cohorts */
router.post(
    '/',
    authorize('admin'),
    [
        body('name').trim().notEmpty(),
        body('startDate').isISO8601(),
        body('endDate').isISO8601(),
        body('organizationId').isUUID(),
    ],
    validate,
    async (req, res, next) => {
        try {
            const { name, code, startDate, endDate, organizationId, academicYear } = req.body;
            const [cohort] = await sql`
                INSERT INTO cohorts (organization_id, name, code, start_date, end_date, academic_year)
                VALUES (${organizationId}, ${name}, ${code ?? null}, ${startDate}, ${endDate}, ${academicYear ?? null})
                RETURNING *
            `;
            return successResponse(res, 'Cohort created successfully.', cohort, 201);
        } catch (err) { next(err); }
    }
);

/* PUT /cohorts/:id */
router.put(
    '/:id',
    authorize('admin'),
    [body('name').optional().trim().notEmpty()],
    validate,
    async (req, res, next) => {
        try {
            const { name, code, startDate, endDate, isActive, academicYear } = req.body;
            const [cohort] = await sql`
                UPDATE cohorts
                SET name          = COALESCE(${name ?? null}, name),
                    code          = COALESCE(${code ?? null}, code),
                    start_date    = COALESCE(${startDate ?? null}::date, start_date),
                    end_date      = COALESCE(${endDate ?? null}::date, end_date),
                    is_active     = COALESCE(${isActive ?? null}::boolean, is_active),
                    academic_year = COALESCE(${academicYear ?? null}, academic_year),
                    updated_at    = CURRENT_TIMESTAMP
                WHERE id = ${req.params.id}
                RETURNING *
            `;
            if (!cohort) return errorResponse(res, 'Cohort not found.', 404);
            return successResponse(res, 'Cohort updated successfully.', cohort);
        } catch (err) { next(err); }
    }
);

/* DELETE /cohorts/:id */
router.delete('/:id', authorize('admin'), async (req, res, next) => {
    try {
        const result = await sql`DELETE FROM cohorts WHERE id = ${req.params.id} RETURNING id`;
        if (!result.length) return errorResponse(res, 'Cohort not found.', 404);
        return successResponse(res, 'Cohort deleted successfully.');
    } catch (err) { next(err); }
});

/* POST /cohorts/:id/instructor — assign instructor */
router.post(
    '/:id/instructor',
    authorize('admin'),
    [body('instructorId').isUUID()],
    validate,
    async (req, res, next) => {
        try {
            const { instructorId } = req.body;
            const [cohort] = await sql`SELECT organization_id FROM cohorts WHERE id = ${req.params.id}`;
            if (!cohort) return errorResponse(res, 'Cohort not found.', 404);
            const [assignment] = await sql`
                INSERT INTO user_cohorts (organization_id, user_id, cohort_id, role)
                VALUES (${cohort.organization_id}, ${instructorId}, ${req.params.id}, 'instructor')
                ON CONFLICT (organization_id, user_id, cohort_id) DO UPDATE SET role = 'instructor'
                RETURNING *
            `;
            return successResponse(res, 'Instructor assigned to cohort successfully.', assignment, 201);
        } catch (err) { next(err); }
    }
);

/* DELETE /cohorts/:id/instructor/:userId */
router.delete('/:id/instructor/:userId', authorize('admin'), async (req, res, next) => {
    try {
        const removed = await sql`
            DELETE FROM user_cohorts
            WHERE cohort_id = ${req.params.id} AND user_id = ${req.params.userId} AND role = 'instructor'
            RETURNING id
        `;
        if (!removed.length) return errorResponse(res, 'Instructor assignment not found.', 404);
        return successResponse(res, 'Instructor removed from cohort successfully.');
    } catch (err) { next(err); }
});

/* POST /cohorts/:id/courses — add a course to cohort */
router.post(
    '/:id/courses',
    authorize('admin'),
    [body('courseId').isUUID()],
    validate,
    async (req, res, next) => {
        try {
            const { courseId } = req.body;
            const [cohort] = await sql`SELECT organization_id FROM cohorts WHERE id = ${req.params.id}`;
            if (!cohort) return errorResponse(res, 'Cohort not found.', 404);
            const [row] = await sql`
                INSERT INTO cohort_courses (organization_id, cohort_id, course_id)
                VALUES (${cohort.organization_id}, ${req.params.id}, ${courseId})
                ON CONFLICT DO NOTHING
                RETURNING *
            `;
            return successResponse(res, 'Course added to cohort successfully.', row ?? {}, 201);
        } catch (err) { next(err); }
    }
);

/* DELETE /cohorts/:id/courses/:courseId — remove a course from cohort */
router.delete('/:id/courses/:courseId', authorize('admin'), async (req, res, next) => {
    try {
        const removed = await sql`
            DELETE FROM cohort_courses
            WHERE cohort_id = ${req.params.id} AND course_id = ${req.params.courseId}
            RETURNING *
        `;
        if (!removed.length) return errorResponse(res, 'Course not found in cohort.', 404);
        return successResponse(res, 'Course removed from cohort successfully.');
    } catch (err) { next(err); }
});

/* ── Student management ────────────────────────────────────────────────── */

/* GET /cohorts/:id/students — paginated, filterable; admin or cohort-member instructor only */
router.get('/:id/students', authorize('admin', 'instructor'), async (req, res, next) => {
    // Instructor can only query their own cohorts
    if (req.user.role === 'instructor' && !(req.user.cohorts ?? []).includes(req.params.id)) {
        const earlyRes = errorResponse(res, 'Access denied to this cohort.', 403);
        return earlyRes;
    }
    try {
        const page = Math.max(1, parseInt(req.query.page ?? '1', 10));
        const limit = Math.min(100, parseInt(req.query.limit ?? '20', 10));
        const offset = (page - 1) * limit;
        const search = req.query.search ?? '';

        const [{ total }] = await sql`
            SELECT COUNT(*)::int AS total FROM user_cohorts uc
            JOIN profiles p ON p.id = uc.user_id
            WHERE uc.cohort_id = ${req.params.id}
              AND uc.role = 'student'
              AND (${!search} OR p.full_name ILIKE ${'%' + search + '%'} OR p.email ILIKE ${'%' + search + '%'})`;

        const students = await sql`
            SELECT p.id, p.email, p.full_name, p.avatar_url, p.role, uc.joined_at
            FROM user_cohorts uc
            JOIN profiles p ON p.id = uc.user_id
            WHERE uc.cohort_id = ${req.params.id}
              AND uc.role = 'student'
              AND (${!search} OR p.full_name ILIKE ${'%' + search + '%'} OR p.email ILIKE ${'%' + search + '%'})
            ORDER BY p.full_name
            LIMIT ${limit} OFFSET ${offset}`;

        return paginatedResponse(res, 'Students retrieved successfully.', students, { total, page, limit, pages: Math.ceil(total / limit) });
    } catch (err) { next(err); }
});

/* POST /cohorts/:id/students — add one student */
router.post(
    '/:id/students',
    authorize('admin'),
    [body('studentId').isUUID()],
    validate,
    async (req, res, next) => {
        try {
            const [cohort] = await sql`SELECT organization_id FROM cohorts WHERE id = ${req.params.id}`;
            if (!cohort) return errorResponse(res, 'Cohort not found.', 404);

            const [assignment] = await sql`
                INSERT INTO user_cohorts (organization_id, user_id, cohort_id, role)
                VALUES (${cohort.organization_id}, ${req.body.studentId}, ${req.params.id}, 'student')
                ON CONFLICT (organization_id, user_id, cohort_id) DO UPDATE SET role = 'student'
                RETURNING *`;
            return successResponse(res, 'Student assigned to cohort successfully.', assignment, 201);
        } catch (err) { next(err); }
    }
);

/* POST /cohorts/:id/students/bulk — bulk assign students */
router.post(
    '/:id/students/bulk',
    authorize('admin'),
    [body('studentIds').isArray({ min: 1 }), body('studentIds.*').isUUID()],
    validate,
    async (req, res, next) => {
        try {
            const [cohort] = await sql`SELECT organization_id FROM cohorts WHERE id = ${req.params.id}`;
            if (!cohort) return errorResponse(res, 'Cohort not found.', 404);

            await sql`
                INSERT INTO user_cohorts (organization_id, user_id, cohort_id, role)
                SELECT ${cohort.organization_id}, unnest(${req.body.studentIds}::uuid[]), ${req.params.id}, 'student'
                ON CONFLICT (organization_id, user_id, cohort_id) DO UPDATE SET role = 'student'`;

            return successResponse(res, `${req.body.studentIds.length} students assigned to cohort successfully.`);
        } catch (err) { next(err); }
    }
);

/* DELETE /cohorts/:id/students/:userId */
router.delete('/:id/students/:userId', authorize('admin'), async (req, res, next) => {
    try {
        const removed = await sql`
            DELETE FROM user_cohorts
            WHERE cohort_id = ${req.params.id} AND user_id = ${req.params.userId} AND role = 'student'
            RETURNING id`;
        if (!removed.length) return errorResponse(res, 'Student assignment not found.', 404);
        return successResponse(res, 'Student removed from cohort successfully.');
    } catch (err) { next(err); }
});

export default router;
