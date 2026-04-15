/**
 * Auth routes
 * POST   /api/auth/register
 * POST   /api/auth/login
 * GET    /api/auth/me          (protected)
 * POST   /api/auth/logout      (protected)
 * PUT    /api/auth/profile     (protected)
 * PUT    /api/auth/password    (protected)
 * POST   /api/auth/forgot-password
 * POST   /api/auth/verify-reset
 * POST   /api/auth/reset-password
 *
 * Credentials (password_hash, role, reset_token) are stored in
 * the `profiles` table — fully under our control on both local
 * PostgreSQL and Supabase cloud.
 */
import { Router } from 'express';
import { body } from 'express-validator';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

import sql from '../db/index.js';
import config from '../config/index.js';
import authenticate from '../middleware/authenticate.js';
import { validate } from '../middleware/validate.js';
import { generateUniqueEmail } from '../helpers/generateEmail.js';
import { successResponse, errorResponse } from '../utils/response.js';

const router = Router();

/* ── Helpers ──────────────────────────────────────────────── */
const signToken = (payload) =>
    jwt.sign(payload, config.jwtSecret, { expiresIn: config.jwtExpiresIn });

/**
 * Build the JWT payload + frontend-safe user object from a profiles row.
 * `extra.cohorts` should be an array of cohort UUIDs the user belongs to.
 */
const buildUserPayload = (profile, extra = {}) => ({
    id: profile.id,
    email: profile.email,
    role: profile.role,
    name: profile.full_name || profile.email.split('@')[0],
    avatarUrl: profile.avatar_url || null,
    phone: profile.phone_number || null,
    bio: profile.bio || null,
    teamId: extra.teamId ?? null,
    organizationId: extra.organizationId ?? null,
    cohorts: extra.cohorts ?? [],
});

/** Fetch all cohort IDs for a given user */
const getUserCohorts = async (userId) => {
    const rows = await sql`SELECT cohort_id FROM user_cohorts WHERE user_id = ${userId}`;
    return rows.map((r) => r.cohort_id);
};

/**
 * Create a row in auth.users.
 * Local  → minimal (id, email) insert into our custom auth schema.
 * Supabase → attempts a Supabase-compatible insert; falls back to minimal.
 * @param {string} id
 * @param {string} email
 * @param {object} [txSql] – optional transaction sql object
 */
const createAuthUser = async (id, email, txSql = null) => {
    const q = txSql || sql;
    if (config.isSupabase) {
        try {
            await q`
                INSERT INTO auth.users
                    (id, aud, role, email, encrypted_password,
                     email_confirmed_at, created_at, updated_at,
                     raw_app_meta_data, raw_user_meta_data, is_super_admin)
                VALUES
                    (${id}, 'authenticated', 'authenticated', ${email}, '',
                     NOW(), NOW(), NOW(),
                     ${'{"provider":"email","providers":["email"]}'}::jsonb,
                     '{}'::jsonb, false)
            `;
        } catch {
            // Supabase schema version differs — try bare minimum
            await q`INSERT INTO auth.users (id, email, created_at, updated_at) VALUES (${id}, ${email}, NOW(), NOW())`;
        }
    } else {
        // Remove any orphaned auth.users row with the same email
        // (no matching profile = safe to clean up)
        await q`
            DELETE FROM auth.users a
            WHERE a.email = ${email}
              AND NOT EXISTS (SELECT 1 FROM profiles p WHERE p.id = a.id)
        `;
        await q`INSERT INTO auth.users (id, email) VALUES (${id}, ${email})`;
    }
};

/* ── POST /register ───────────────────────────────────────── */
router.post(
    '/register',
    [
        body('email').optional().isEmail().normalizeEmail(),
        body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
        body('name').trim().notEmpty().withMessage('Name is required'),
        body('role').optional().isIn(['admin', 'instructor', 'student']),
    ],
    validate,
    async (req, res, next) => {
        try {
            const { password, name, role = 'student' } = req.body;
            let { email } = req.body;

            // Hash password outside the transaction (CPU-intensive)
            const passwordHash = await bcrypt.hash(password, config.bcryptRounds);

            // Wrap everything in a SERIALIZABLE transaction to prevent
            // race-conditions on email uniqueness.
            const result = await sql.begin('isolation level serializable', async (txSql) => {
                // If no email was provided, auto-generate from the name
                if (!email) {
                    email = await generateUniqueEmail(name, txSql);
                } else {
                    // Manual email — check for duplicates inside the tx
                    const existing = await txSql`SELECT id FROM profiles WHERE email = ${email} LIMIT 1`;
                    if (existing.length > 0) {
                        const err = new Error('Email already registered.');
                        err.status = 409;
                        throw err;
                    }
                }

                const newId = crypto.randomUUID();

                // Create the auth.users row (FK target for profiles)
                await createAuthUser(newId, email, txSql);

                // Create profile with credentials stored here
                const [profile] = await txSql`
                    INSERT INTO profiles (id, email, full_name, role, password_hash)
                    VALUES (${newId}, ${email}, ${name}, ${role}, ${passwordHash})
                    RETURNING *
                `;

                // Attach to default org if one exists
                let orgId = null;
                const [defaultOrg] = await txSql`SELECT id FROM organizations LIMIT 1`;
                if (defaultOrg) {
                    orgId = defaultOrg.id;
                    await txSql`
                        INSERT INTO organization_users (organization_id, user_id)
                        VALUES (${orgId}, ${newId})
                        ON CONFLICT DO NOTHING
                    `;
                }

                // Assign to cohort if provided
                const { cohortId } = req.body;
                if (cohortId && orgId) {
                    await txSql`
                        INSERT INTO user_cohorts (organization_id, user_id, cohort_id, role)
                        VALUES (${orgId}, ${newId}, ${cohortId}, ${role})
                        ON CONFLICT (organization_id, user_id, cohort_id) DO NOTHING
                    `;
                }

                return { profile, orgId };
            });

            const cohorts = await getUserCohorts(result.profile.id);
            const userPayload = buildUserPayload(result.profile, { organizationId: result.orgId, cohorts });
            const token = signToken(userPayload);

            return successResponse(res, 'Registration successful.', { user: userPayload, token }, 201);
        } catch (err) {
            // Handle our custom 409 from inside the transaction
            if (err.status === 409) {
                return errorResponse(res, err.message, 409);
            }
            // Retry on serialization failure (concurrent insert race)
            if (err.code === '40001') {
                return errorResponse(res, 'Concurrent registration conflict. Please try again.', 409);
            }
            next(err);
        }
    }
);

/* ── POST /login ──────────────────────────────────────────── */
router.post(
    '/login',
    [
        body('email').isEmail().normalizeEmail(),
        body('password').notEmpty().withMessage('Password is required'),
    ],
    validate,
    async (req, res, next) => {
        try {
            const { email, password } = req.body;

            // All credentials live in profiles
            const [profile] = await sql`
                SELECT * FROM profiles WHERE email = ${email} LIMIT 1
            `;

            if (!profile) {
                return errorResponse(res, 'Invalid email or password.', 401);
            }
            if (!profile.password_hash) {
                return errorResponse(res, 'Account has no password set. Use SSO or reset your password.', 401);
            }

            const valid = await bcrypt.compare(password, profile.password_hash);
            if (!valid) {
                return errorResponse(res, 'Invalid email or password.', 401);
            }

            // Resolve team, org & cohorts in parallel
            const [[teamMember], [orgUser], cohorts] = await Promise.all([
                sql`SELECT team_id FROM team_members WHERE user_id = ${profile.id} LIMIT 1`,
                sql`SELECT organization_id FROM organization_users WHERE user_id = ${profile.id} LIMIT 1`,
                getUserCohorts(profile.id),
            ]);

            const userPayload = buildUserPayload(profile, {
                teamId: teamMember?.team_id || null,
                organizationId: orgUser?.organization_id || null,
                cohorts,
            });
            const token = signToken(userPayload);

            return successResponse(res, 'Login successful.', { user: userPayload, token });
        } catch (err) {
            next(err);
        }
    }
);

/* ── GET /me ──────────────────────────────────────────────── */
router.get('/me', authenticate, async (req, res, next) => {
    try {
        const [profile] = await sql`SELECT * FROM profiles WHERE id = ${req.user.id} LIMIT 1`;
        if (!profile) return errorResponse(res, 'User not found.', 404);

        const [[teamMember], [orgUser], cohorts] = await Promise.all([
            sql`SELECT team_id FROM team_members WHERE user_id = ${profile.id} LIMIT 1`,
            sql`SELECT organization_id FROM organization_users WHERE user_id = ${profile.id} LIMIT 1`,
            getUserCohorts(profile.id),
        ]);

        const userPayload = buildUserPayload(profile, {
            teamId: teamMember?.team_id || null,
            organizationId: orgUser?.organization_id || null,
            cohorts,
        });

        return successResponse(res, 'Profile retrieved successfully.', { user: userPayload });
    } catch (err) {
        next(err);
    }
});

/* ── POST /logout ─────────────────────────────────────────── */
router.post('/logout', authenticate, (_req, res) => {
    // Stateless JWT — client discards the token
    successResponse(res, 'Logged out successfully.');
});

/* ── PUT /profile ─────────────────────────────────────────── */
router.put(
    '/profile',
    authenticate,
    [
        body('name').optional().trim().notEmpty(),
        body('phone').optional().trim(),
        body('bio').optional().trim(),
        body('avatarUrl').optional().trim().custom((val) => {
            if (val && val.length > 5_000_000) throw new Error('Avatar image is too large (max 5 MB).');
            return true;
        }),
    ],
    validate,
    async (req, res, next) => {
        try {
            const { name, phone, bio, avatarUrl } = req.body;
            const [profile] = await sql`
                UPDATE profiles
                SET full_name    = COALESCE(${name ?? null}, full_name),
                    phone_number = COALESCE(${phone ?? null}, phone_number),
                    bio          = COALESCE(${bio ?? null}, bio),
                    avatar_url   = COALESCE(${avatarUrl ?? null}, avatar_url),
                    updated_at   = CURRENT_TIMESTAMP
                WHERE id = ${req.user.id}
                RETURNING *
            `;
            return successResponse(res, 'Profile updated successfully.', { user: buildUserPayload(profile) });
        } catch (err) {
            next(err);
        }
    }
);

/* ── PUT /password ────────────────────────────────────────── */
router.put(
    '/password',
    authenticate,
    [
        body('currentPassword').notEmpty(),
        body('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters'),
    ],
    validate,
    async (req, res, next) => {
        try {
            const { currentPassword, newPassword } = req.body;
            const [profile] = await sql`SELECT password_hash FROM profiles WHERE id = ${req.user.id}`;

            const valid = await bcrypt.compare(currentPassword, profile?.password_hash ?? '');
            if (!valid) return errorResponse(res, 'Current password is incorrect.', 400);

            const hash = await bcrypt.hash(newPassword, config.bcryptRounds);
            await sql`UPDATE profiles SET password_hash = ${hash}, updated_at = CURRENT_TIMESTAMP WHERE id = ${req.user.id}`;

            return successResponse(res, 'Password updated successfully.');
        } catch (err) {
            next(err);
        }
    }
);

/* ── POST /forgot-password ────────────────────────────────── */
router.post(
    '/forgot-password',
    [body('email').isEmail().normalizeEmail()],
    validate,
    async (req, res, next) => {
        try {
            const [profile] = await sql`SELECT id FROM profiles WHERE email = ${req.body.email} LIMIT 1`;
            if (profile) {
                const resetToken = crypto.randomBytes(32).toString('hex');
                const resetExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
                await sql`
                    UPDATE profiles
                    SET reset_token = ${resetToken}, reset_token_expires_at = ${resetExpires.toISOString()}
                    WHERE id = ${profile.id}
                `;
                // In production: email the reset link. Log for dev only.
                if (config.nodeEnv !== 'production') {
                    console.info(`[Reset token for ${req.body.email}]: ${resetToken}`);
                }
            }
            // Always return success to prevent email enumeration
            return successResponse(res, 'If that email exists, a reset link has been sent.');
        } catch (err) {
            next(err);
        }
    }
);

/* ── POST /verify-reset ───────────────────────────────────── */
router.post(
    '/verify-reset',
    [body('email').isEmail().normalizeEmail(), body('token').notEmpty()],
    validate,
    async (req, res) => {
        const [profile] = await sql`
            SELECT id FROM profiles
            WHERE email = ${req.body.email}
              AND reset_token = ${req.body.token}
              AND reset_token_expires_at > NOW()
            LIMIT 1
        `.catch(() => []);
        if (!profile) return errorResponse(res, 'Reset token is invalid or expired.', 400);
        return successResponse(res, 'Reset token is valid.', { valid: true });
    }
);

/* ── POST /reset-password ─────────────────────────────────── */
router.post(
    '/reset-password',
    [
        body('email').isEmail().normalizeEmail(),
        body('token').notEmpty(),
        body('password').isLength({ min: 6 }),
    ],
    validate,
    async (req, res, next) => {
        try {
            const { email, token, password } = req.body;
            const [profile] = await sql`
                SELECT id FROM profiles
                WHERE email = ${email}
                  AND reset_token = ${token}
                  AND reset_token_expires_at > NOW()
                LIMIT 1
            `;
            if (!profile) return errorResponse(res, 'Reset token is invalid or expired.', 400);

            const hash = await bcrypt.hash(password, config.bcryptRounds);
            await sql`
                UPDATE profiles
                SET password_hash = ${hash}, reset_token = NULL, reset_token_expires_at = NULL,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = ${profile.id}
            `;
            return successResponse(res, 'Password reset successfully.');
        } catch (err) {
            next(err);
        }
    }
);

export default router;
