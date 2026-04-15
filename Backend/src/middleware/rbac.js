/**
 * Role-based access control & cohort isolation middleware.
 *
 * authorize(...roles)
 *   Classic role gate. Usage:
 *     router.get('/admin-only', authenticate, authorize('admin'), handler)
 *
 * checkCohortAccess(getCohortId)
 *   Ensures the authenticated user belongs to the cohort referenced by a
 *   resource.  Admins are always granted access.
 *   `getCohortId` is a sync or async function that receives (req) and returns
 *   the cohortId string that protects the resource.
 *
 *   Usage (inline):
 *     router.get('/:id', authenticate, checkCohortAccess(async (req) => {
 *         const [task] = await sql`SELECT cohort_id FROM tasks WHERE id = ${req.params.id}`;
 *         return task?.cohort_id;
 *     }), handler)
 *
 * cohortFilter(req)  (helper, not middleware)
 *   Returns a { cohortIds, isAdmin } object for building SQL WHERE clauses.
 */

// ── Role gate ────────────────────────────────────────────────────────────────
export const authorize = (...allowedRoles) => (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({ success: false, message: 'Not authenticated.' });
    }
    if (!allowedRoles.includes(req.user.role)) {
        return res.status(403).json({
            success: false,
            message: `Access denied. Required role: ${allowedRoles.join(' or ')}.`,
        });
    }
    next();
};

// ── Cohort access guard ──────────────────────────────────────────────────────
/**
 * @param {(req: import('express').Request) => Promise<string|null>} getCohortId
 */
export const checkCohortAccess = (getCohortId) => async (req, res, next) => {
    try {
        if (!req.user) {
            return res.status(401).json({ success: false, message: 'Not authenticated.' });
        }
        // Admins bypass cohort isolation
        if (req.user.role === 'admin') return next();

        const resourceCohortId = await getCohortId(req);
        if (!resourceCohortId) return next(); // resource has no cohort → no restriction

        const userCohorts = req.user.cohorts ?? [];
        if (!userCohorts.includes(resourceCohortId)) {
            return res.status(403).json({
                success: false,
                message: 'Access denied. You do not belong to this cohort.',
            });
        }
        next();
    } catch (err) {
        next(err);
    }
};

// ── Query helper ─────────────────────────────────────────────────────────────
/**
 * Returns the cohort IDs the caller is allowed to see.
 * Admins get null (meaning "all").
 * @param {object} user  req.user
 * @returns {{ isAdmin: boolean, cohortIds: string[]|null }}
 */
export const cohortFilter = (user) => ({
    isAdmin: user.role === 'admin',
    cohortIds: user.role === 'admin' ? null : (user.cohorts ?? []),
});
