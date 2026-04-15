/**
 * Activity Logs routes  (read-only audit trail)
 * GET /api/activity-logs
 * GET /api/activity-logs/resource/:type/:id
 * GET /api/activity-logs/user/:userId  (admin only)
 */
import { Router } from 'express';
import sql from '../db/index.js';
import authenticate from '../middleware/authenticate.js';
import { authorize } from '../middleware/rbac.js';
import { successResponse } from '../utils/response.js';

const router = Router();
router.use(authenticate);
router.use(authorize('admin', 'instructor'));

/* GET /activity-logs */
router.get('/', async (req, res, next) => {
    try {
        const limit  = Math.min(parseInt(req.query.limit  ?? '50'), 200);
        const offset = parseInt(req.query.offset ?? '0');
        const logs = await sql`
            SELECT al.*, p.full_name AS actor_name
            FROM activity_logs al
            LEFT JOIN profiles p ON p.id = al.actor_id
            ORDER BY al.created_at DESC
            LIMIT ${limit} OFFSET ${offset}
        `;
        return successResponse(res, 'Activity logs retrieved successfully.', logs);
    } catch (err) { next(err); }
});

/* GET /activity-logs/resource/:type/:id */
router.get('/resource/:type/:id', async (req, res, next) => {
    try {
        const logs = await sql`
            SELECT al.*, p.full_name AS actor_name
            FROM activity_logs al
            LEFT JOIN profiles p ON p.id = al.actor_id
            WHERE al.resource_type = ${req.params.type} AND al.resource_id = ${req.params.id}::uuid
            ORDER BY al.created_at DESC
            LIMIT 100
        `;
        return successResponse(res, 'Activity logs retrieved successfully.', logs);
    } catch (err) { next(err); }
});

/* GET /activity-logs/user/:userId  (admin only) */
router.get('/user/:userId', authorize('admin'), async (req, res, next) => {
    try {
        const logs = await sql`
            SELECT al.*, p.full_name AS actor_name
            FROM activity_logs al
            LEFT JOIN profiles p ON p.id = al.actor_id
            WHERE al.actor_id = ${req.params.userId}::uuid
            ORDER BY al.created_at DESC
            LIMIT 100
        `;
        return successResponse(res, 'User activity logs retrieved successfully.', logs);
    } catch (err) { next(err); }
});

export default router;

