/**
 * Profiles routes — cohort-scoped
 * GET    /api/profiles             (admin only — all)
 * GET    /api/profiles/students     (admin = all; instructor = cohort-scoped + pagination)
 * GET    /api/profiles/instructors  (admin only)
 * GET    /api/profiles/:id
 * PUT    /api/profiles/:id
 */
import { Router } from 'express';
import { body, query } from 'express-validator';
import sql from '../db/index.js';
import authenticate from '../middleware/authenticate.js';
import { authorize, cohortFilter } from '../middleware/rbac.js';
import { validate } from '../middleware/validate.js';
import { successResponse, errorResponse, paginatedResponse } from '../utils/response.js';

/** Strip sensitive fields from a profile row before sending to client */
const sanitizeProfile = (p) => {
    if (!p) return null;
    const { password_hash, reset_token, reset_token_expires_at, ...safe } = p;
    return safe;
};

const router = Router();
router.use(authenticate);

/* GET /profiles — all users (admin only) */
router.get('/', authorize('admin'), async (_req, res, next) => {
    try {
        const users = await sql`
            SELECT id, email, role, full_name, avatar_url, phone_number, bio
            FROM profiles ORDER BY full_name`;
        return successResponse(res, 'Profiles retrieved successfully.', users);
    } catch (err) { next(err); }
});

/* GET /profiles/students — paginated; instructor is cohort-scoped */
router.get(
    '/students',
    authorize('admin', 'instructor'),
    [
        query('cohortId').optional().isUUID(),
        query('page').optional().isInt({ min: 1 }),
        query('limit').optional().isInt({ min: 1, max: 100 }),
        query('search').optional().isString(),
    ],
    validate,
    async (req, res, next) => {
        try {
            const { isAdmin, cohortIds } = cohortFilter(req.user);
            const page   = Math.max(1, parseInt(req.query.page  ?? '1',  10));
            const limit  = Math.min(100, parseInt(req.query.limit ?? '20', 10));
            const offset = (page - 1) * limit;
            const search = req.query.search ?? '';
            const qCohort = req.query.cohortId ?? null;

            // Determine which cohorts to restrict to
            let filterCohorts = null; // null = no restriction (admin)
            if (!isAdmin) {
                filterCohorts = qCohort
                    ? cohortIds.includes(qCohort) ? [qCohort] : []
                    : cohortIds;
                if (!filterCohorts.length) return paginatedResponse(res, 'Students retrieved successfully.', [], { total: 0, page, limit, pages: 0 });
            } else if (qCohort) {
                filterCohorts = [qCohort];
            }

            const [{ total }] = await sql`
                SELECT COUNT(DISTINCT p.id)::int AS total
                FROM profiles p
                LEFT JOIN user_cohorts uc ON uc.user_id = p.id
                WHERE p.role = 'student'
                  AND (${filterCohorts === null} OR uc.cohort_id = ANY(${filterCohorts ?? []}::uuid[]))
                  AND (${!search} OR p.full_name ILIKE ${'%' + search + '%'} OR p.email ILIKE ${'%' + search + '%'})`;

            const students = await sql`
                SELECT DISTINCT ON (p.id)
                    p.id, p.email, p.role, p.full_name, p.avatar_url,
                    uc.cohort_id,
                    c.name  AS cohort_name,
                    tm.team_id,
                    t.name  AS team_name
                FROM profiles p
                LEFT JOIN user_cohorts uc ON uc.user_id = p.id
                LEFT JOIN cohorts c       ON c.id = uc.cohort_id
                LEFT JOIN team_members tm ON tm.user_id = p.id
                LEFT JOIN teams t         ON t.id = tm.team_id
                WHERE p.role = 'student'
                  AND (${filterCohorts === null} OR uc.cohort_id = ANY(${filterCohorts ?? []}::uuid[]))
                  AND (${!search} OR p.full_name ILIKE ${'%' + search + '%'} OR p.email ILIKE ${'%' + search + '%'})
                ORDER BY p.id, p.full_name
                LIMIT ${limit} OFFSET ${offset}`;

            return paginatedResponse(res, 'Students retrieved successfully.', students, { total, page, limit, pages: Math.ceil(total / limit) });
        } catch (err) { next(err); }
    }
);

/* GET /profiles/instructors */
router.get('/instructors', authorize('admin'), async (_req, res, next) => {
    try {
        const instructors = await sql`
            SELECT p.id, p.email, p.role, p.full_name, p.avatar_url, p.bio, p.phone_number,
                   (
                       SELECT json_agg(json_build_object('cohort_id', uc.cohort_id, 'cohort_name', c.name))
                       FROM user_cohorts uc
                       JOIN cohorts c ON c.id = uc.cohort_id
                       WHERE uc.user_id = p.id AND uc.role = 'instructor'
                   ) AS cohorts
            FROM profiles p
            WHERE p.role = 'instructor'
            ORDER BY p.full_name
        `;
        return successResponse(res, 'Instructors retrieved successfully.', instructors);
    } catch (err) { next(err); }
});

/* GET /profiles/:id — own profile, or instructor (cohort-scoped), or admin */
router.get('/:id', async (req, res, next) => {
    try {
        const { role, id: userId } = req.user;
        const targetId = req.params.id;

        // Students can only view their own profile
        if (role === 'student' && targetId !== userId) {
            return errorResponse(res, 'Access denied.', 403);
        }

        // Instructors can view profiles in their cohorts plus their own
        if (role === 'instructor' && targetId !== userId) {
            const { cohortIds } = cohortFilter(req.user);
            if (cohortIds.length > 0) {
                const [inCohort] = await sql`
                    SELECT id FROM user_cohorts
                    WHERE user_id    = ${targetId}
                      AND cohort_id  = ANY(${cohortIds}::uuid[])
                    LIMIT 1`;
                if (!inCohort) return errorResponse(res, 'Access denied. User is not in your cohort.', 403);
            } else {
                return errorResponse(res, 'Access denied.', 403);
            }
        }
        // Admin: unrestricted

        const [user] = await sql`
            SELECT id, email, role, full_name, avatar_url, phone_number, bio
            FROM profiles
            WHERE id = ${targetId}
        `;
        if (!user) return errorResponse(res, 'Profile not found.', 404);
        return successResponse(res, 'Profile retrieved successfully.', sanitizeProfile(user));
    } catch (err) { next(err); }
});

/* PUT /profiles/:id — own profile updates or admin; role changes admin-only */
router.put(
    '/:id',
    [
        body('full_name').optional().trim(),
        body('phone_number').optional().trim(),
        body('bio').optional().trim(),
        body('avatar_url').optional().trim(),
        body('email').optional().isEmail(),
        body('role').optional().isIn(['admin', 'instructor', 'student']),
    ],
    validate,
    async (req, res, next) => {
        try {
            if (req.user.id !== req.params.id && req.user.role !== 'admin') {
                return errorResponse(res, 'Forbidden.', 403);
            }

            const { full_name, phone_number, bio, avatar_url, email } = req.body;

            // Role change is admin-only
            let roleUpdate = null;
            if (req.body.role !== undefined) {
                if (req.user.role !== 'admin') {
                    return errorResponse(res, 'Only admins may change a user\'s role.', 403);
                }
                roleUpdate = req.body.role;
            }

            const [profile] = await sql`
                UPDATE profiles
                SET full_name    = COALESCE(${full_name    ?? null}, full_name),
                    phone_number = COALESCE(${phone_number ?? null}, phone_number),
                    bio          = COALESCE(${bio          ?? null}, bio),
                    avatar_url   = COALESCE(${avatar_url   ?? null}, avatar_url),
                    email        = COALESCE(${email        ?? null}, email),
                    role         = COALESCE(${roleUpdate   ?? null}, role),
                    updated_at   = CURRENT_TIMESTAMP
                WHERE id = ${req.params.id}
                RETURNING id, email, role, full_name, avatar_url, phone_number, bio, theme_preference, notifications_enabled, created_at, updated_at
            `;
            if (!profile) return errorResponse(res, 'Profile not found.', 404);
            return successResponse(res, 'Profile updated successfully.', profile);
        } catch (err) { next(err); }
    }
);

export default router;
