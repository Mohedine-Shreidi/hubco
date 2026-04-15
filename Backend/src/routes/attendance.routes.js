/**
 * Attendance routes
 * POST /api/attendance/check-in
 * POST /api/attendance/check-out
 * GET  /api/attendance/today       (own record)
 * GET  /api/attendance?date=       (own history by date)
 * GET  /api/attendance/history     (own last 30 days)
 * GET  /api/attendance/all         (admin/instructor — all students)
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

/* ── POST /attendance/check-in ─────────────────────────────────────────────── */
router.post(
    '/check-in',
    [body('date').optional().isISO8601()],
    validate,
    async (req, res, next) => {
        try {
            const date = req.body.date ? new Date(req.body.date) : new Date();
            const dateStr = date.toISOString().slice(0, 10);

            const [existing] = await sql`
                SELECT id, check_in_time FROM attendance
                WHERE user_id = ${req.user.id} AND date = ${dateStr}
            `;
            if (existing) {
                return errorResponse(res, 'Already checked in today.', 409);
            }

            // Resolve organization for this user
            const [orgRow] = await sql`
                SELECT organization_id FROM organization_users WHERE user_id = ${req.user.id} LIMIT 1
            `;
            const orgId = orgRow?.organization_id ?? req.user.organizationId;
            if (!orgId) return errorResponse(res, 'User has no organization.', 400);

            const notes = req.body.notes || null;
            const [record] = await sql`
                INSERT INTO attendance (organization_id, user_id, date, check_in_time, status, notes)
                VALUES (${orgId}, ${req.user.id}, ${dateStr}, NOW(), 'present', ${notes})
                RETURNING *
            `;
            return successResponse(res, 'Checked in successfully.', record, 201);
        } catch (err) { next(err); }
    }
);

/* ── POST /attendance/check-out ────────────────────────────────────────────── */
router.post('/check-out', async (req, res, next) => {
    try {
        const dateStr = new Date().toISOString().slice(0, 10);
        const notes = req.body.notes || null;
        const [record] = await sql`
            UPDATE attendance
            SET check_out_time = NOW()${notes ? sql`, notes = ${notes}` : sql``}
            WHERE user_id = ${req.user.id} AND date = ${dateStr} AND check_out_time IS NULL
            RETURNING *
        `;
        if (!record) return errorResponse(res, 'No active check-in found for today.', 404);
        return successResponse(res, 'Checked out successfully.', record);
    } catch (err) { next(err); }
});

/* ── GET /attendance/today ─────────────────────────────────────────────────── */
router.get('/today', async (req, res, next) => {
    try {
        const dateStr = new Date().toISOString().slice(0, 10);
        const [record] = await sql`
            SELECT * FROM attendance
            WHERE user_id = ${req.user.id} AND date = ${dateStr}
        `;
        return successResponse(res, 'Today\'s attendance retrieved successfully.', record ?? null);
    } catch (err) { next(err); }
});

/* ── GET /attendance/history ───────────────────────────────────────────────── */
router.get('/history', async (req, res, next) => {
    try {
        const records = await sql`
            SELECT * FROM attendance
            WHERE user_id = ${req.user.id}
            ORDER BY date DESC
            LIMIT 30
        `;
        return successResponse(res, 'Attendance history retrieved successfully.', records);
    } catch (err) { next(err); }
});

/* ── GET /attendance/all  (admin/instructor — cohort-scoped) ───────────────── */
router.get(
    '/all',
    authorize('admin', 'instructor'),
    async (req, res, next) => {
        try {
            const { date } = req.query;
            const { isAdmin, cohortIds } = cohortFilter(req.user);
            let rows;
            if (isAdmin) {
                rows = date
                    ? await sql`
                        SELECT a.*, p.full_name, p.avatar_url
                        FROM attendance a
                        JOIN profiles p ON p.id = a.user_id
                        WHERE a.date = ${date}
                        ORDER BY p.full_name
                      `
                    : await sql`
                        SELECT a.*, p.full_name, p.avatar_url
                        FROM attendance a
                        JOIN profiles p ON p.id = a.user_id
                        ORDER BY a.date DESC, p.full_name
                        LIMIT 200
                      `;
            } else {
                rows = date
                    ? await sql`
                        SELECT a.*, p.full_name, p.avatar_url
                        FROM attendance a
                        JOIN profiles p ON p.id = a.user_id
                        JOIN user_cohorts uc ON uc.user_id = a.user_id
                          AND uc.cohort_id = ANY(${cohortIds ?? []}::uuid[])
                        WHERE a.date = ${date}
                        ORDER BY p.full_name
                      `
                    : await sql`
                        SELECT DISTINCT ON (a.id) a.*, p.full_name, p.avatar_url
                        FROM attendance a
                        JOIN profiles p ON p.id = a.user_id
                        JOIN user_cohorts uc ON uc.user_id = a.user_id
                          AND uc.cohort_id = ANY(${cohortIds ?? []}::uuid[])
                        ORDER BY a.id, a.date DESC, p.full_name
                        LIMIT 200
                      `;
            }
            return successResponse(res, 'Attendance records retrieved successfully.', rows);
        } catch (err) { next(err); }
    }
);

/* ── GET /attendance?date=YYYY-MM-DD ──────────────────────────────────────── */
router.get('/', async (req, res, next) => {
    try {
        const { date } = req.query;
        const records = date
            ? await sql`SELECT * FROM attendance WHERE user_id = ${req.user.id} AND date = ${date}`
            : await sql`SELECT * FROM attendance WHERE user_id = ${req.user.id} ORDER BY date DESC LIMIT 30`;
        return successResponse(res, 'Attendance records retrieved successfully.', records);
    } catch (err) { next(err); }
});

export default router;
