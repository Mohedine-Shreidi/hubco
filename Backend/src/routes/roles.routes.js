/**
 * Roles routes
 * GET  /api/roles
 * POST /api/roles           (admin)
 * PUT  /api/roles/:id       (admin)
 * DELETE /api/roles/:id     (admin)
 * GET  /api/roles/user/:userId
 * POST /api/roles/assign    (admin)
 */
import { Router } from 'express';
import { body } from 'express-validator';
import sql from '../db/index.js';
import authenticate from '../middleware/authenticate.js';
import { authorize } from '../middleware/rbac.js';
import { validate } from '../middleware/validate.js';
import { successResponse, errorResponse } from '../utils/response.js';

const router = Router();
router.use(authenticate);

router.get('/', async (_req, res, next) => {
    try {
        const roles = await sql`SELECT * FROM roles ORDER BY name`;
        return successResponse(res, 'Roles retrieved successfully.', roles);
    } catch (err) { next(err); }
});

router.post(
    '/',
    authorize('admin'),
    [body('name').trim().notEmpty(), body('organizationId').isUUID()],
    validate,
    async (req, res, next) => {
        try {
            const { name, organizationId } = req.body;
            const [role] = await sql`
                INSERT INTO roles (organization_id, name)
                VALUES (${organizationId}, ${name})
                ON CONFLICT (organization_id, name) DO NOTHING
                RETURNING *
            `;
            if (!role) return errorResponse(res, 'Role already exists.', 409);
            return successResponse(res, 'Role created successfully.', role, 201);
        } catch (err) { next(err); }
    }
);

router.put('/:id', authorize('admin'), [body('name').trim().notEmpty()], validate, async (req, res, next) => {
    try {
        const [role] = await sql`UPDATE roles SET name = ${req.body.name} WHERE id = ${req.params.id} AND is_system_role = false RETURNING *`;
        if (!role) return errorResponse(res, 'Role not found or is a system role.', 404);
        return successResponse(res, 'Role updated successfully.', role);
    } catch (err) { next(err); }
});

router.delete('/:id', authorize('admin'), async (req, res, next) => {
    try {
        const result = await sql`DELETE FROM roles WHERE id = ${req.params.id} AND is_system_role = false RETURNING id`;
        if (!result.length) return errorResponse(res, 'Role not found or is a system role.', 404);
        return successResponse(res, 'Role deleted successfully.');
    } catch (err) { next(err); }
});

/* GET /roles/user/:userId — admin can view any user; non-admin can only view their own roles */
router.get('/user/:userId', async (req, res, next) => {
    try {
        if (req.user.role !== 'admin' && req.user.id !== req.params.userId) {
            return errorResponse(res, 'Access denied.', 403);
        }
        const roles = await sql`
            SELECT r.*, ur.assigned_at
            FROM user_roles ur
            JOIN roles r ON r.id = ur.role_id
            WHERE ur.user_id = ${req.params.userId}
        `;
        return successResponse(res, 'User roles retrieved successfully.', roles);
    } catch (err) { next(err); }
});

router.post(
    '/assign',
    authorize('admin'),
    [body('userId').isUUID(), body('roleId').isUUID(), body('organizationId').isUUID()],
    validate,
    async (req, res, next) => {
        try {
            const { userId, roleId, organizationId } = req.body;

            // Update profiles.role to match the role name for quick JWT reads
            const [role] = await sql`SELECT name FROM roles WHERE id = ${roleId}`;
            if (!role) return errorResponse(res, 'Role not found.', 404);
            await sql`UPDATE profiles SET role = ${role.name} WHERE id = ${userId}`;

            const [assignment] = await sql`
                INSERT INTO user_roles (organization_id, user_id, role_id)
                VALUES (${organizationId}, ${userId}, ${roleId})
                ON CONFLICT (organization_id, user_id, role_id) DO NOTHING
                RETURNING *
            `;
            return successResponse(res, 'Role assigned successfully.', assignment, 201);
        } catch (err) { next(err); }
    }
);

export default router;
