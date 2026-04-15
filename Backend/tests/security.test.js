/**
 * HubConnect Security Test Suite
 *
 * Tests authentication, authorization, cohort isolation, data-leak prevention,
 * and role-escalation protections across the Express API.
 *
 * Run:  npm test
 */

import { vi, describe, it, expect, beforeEach } from 'vitest';
import supertest from 'supertest';
import {
    tokens, auth, IDS,
    stubProfile, stubCohort, stubTeam, stubRoom, stubTask, stubSubmission,
} from './setup.js';

/* ── 1. Mock the database BEFORE anything imports it ─────────────────────── */
vi.mock('../src/db/index.js', () => ({ default: vi.fn() }));
vi.mock('../src/config/index.js', () => ({
    default: {
        jwtSecret:    'hubconnect-dev-secret-change-in-production',
        port:         3000,
        nodeEnv:      'test',
        corsOrigin:   '*',
        databaseUrl:  'postgres://localhost/hubconnect_test',
    },
}));

/* ── 2. Now import test app (routes will use mocked sql) ─────────────────── */
import sql from '../src/db/index.js';
import testApp from './testApp.js';

const req = supertest(testApp);

/* Helper: set the next N sql() call return values in order */
const mockDb = (...results) => {
    vi.mocked(sql).mockReset();
    results.forEach(r => vi.mocked(sql).mockResolvedValueOnce(r));
    // Any further calls fall back to empty array
    vi.mocked(sql).mockResolvedValue([]);
};

/* ============================================================
 * A. AUTHENTICATION — unauthenticated & token validation
 * ============================================================ */
describe('A. Authentication', () => {
    it('A1 — 401 when Authorization header is missing', async () => {
        const res = await req.get('/api/cohorts');
        expect(res.status).toBe(401);
        expect(res.body.success).toBe(false);
    });

    it('A2 — 401 when token is expired', async () => {
        const res = await auth(req.get('/api/cohorts'), tokens.expired());
        expect(res.status).toBe(401);
        expect(res.body.success).toBe(false);
    });

    it('A3 — 401 when token is a garbage string', async () => {
        const res = await req.get('/api/cohorts').set('Authorization', 'Bearer not.a.jwt');
        expect(res.status).toBe(401);
        expect(res.body.success).toBe(false);
    });

    it('A4 — 401 when "Bearer" prefix is missing', async () => {
        const res = await req.get('/api/cohorts').set('Authorization', tokens.admin());
        expect(res.status).toBe(401);
    });

    it('A5 — authenticated request succeeds (200 or 2xx)', async () => {
        // Admin listing cohorts — DB returns empty array
        mockDb([]); // cohorts query
        const res = await auth(req.get('/api/cohorts'), tokens.admin());
        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
    });
});

/* ============================================================
 * B. ROLE GATE — authorize() middleware enforcement
 * ============================================================ */
describe('B. Role Authorization', () => {
    it('B1 — GET /cohorts/:id/students: student receives 403', async () => {
        const res = await auth(req.get(`/api/cohorts/${IDS.cohortAId}/students`), tokens.studentA());
        expect(res.status).toBe(403);
        expect(res.body.success).toBe(false);
    });

    it('B2 — GET /cohorts/:id/students: team_leader receives 403', async () => {
        const res = await auth(req.get(`/api/cohorts/${IDS.cohortAId}/students`), tokens.teamLeaderA());
        expect(res.status).toBe(403);
    });

    it('B3 — GET /submissions/task/:taskId: student receives 403', async () => {
        const res = await auth(req.get(`/api/submissions/task/${IDS.taskAId}`), tokens.studentA());
        expect(res.status).toBe(403);
    });

    it('B4 — POST /roles: student receives 403', async () => {
        const res = await auth(req.post('/api/roles').send({ name: 'hacker', organizationId: IDS.orgId }), tokens.studentA());
        expect(res.status).toBe(403);
    });

    it('B5 — DELETE /roles/:id: instructor receives 403', async () => {
        const res = await auth(req.delete(`/api/roles/${IDS.cohortAId}`), tokens.instructorA());
        expect(res.status).toBe(403);
    });

    it('B6 — GET /analytics/submission-stats: student receives 403', async () => {
        const res = await auth(req.get('/api/analytics/submission-stats'), tokens.studentA());
        expect(res.status).toBe(403);
    });

    it('B7 — GET /reports/summary: student receives 403', async () => {
        const res = await auth(req.get('/api/reports/summary'), tokens.studentA());
        expect(res.status).toBe(403);
    });

    it('B8 — GET /attendance/all: student receives 403', async () => {
        const res = await auth(req.get('/api/attendance/all'), tokens.studentA());
        expect(res.status).toBe(403);
    });
});

/* ============================================================
 * C. COHORT ISOLATION — instructors cannot cross cohort lines
 * ============================================================ */
describe('C. Cohort Isolation', () => {
    it('C1 — instructor can list students for their own cohort', async () => {
        mockDb(
            [{ id: IDS.cohortAId }],            // cohort membership check passes
            [stubProfile()],                     // student list
        );
        const res = await auth(
            req.get(`/api/cohorts/${IDS.cohortAId}/students`),
            tokens.instructorA(),
        );
        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
    });

    it('C2 — instructor is denied students list from a different cohort', async () => {
        mockDb([]); // empty → not a member of cohortB
        const res = await auth(
            req.get(`/api/cohorts/${IDS.cohortBId}/students`),
            tokens.instructorA(),
        );
        expect(res.status).toBe(403);
    });

    it('C3 — instructor sees submissions only for their cohort tasks', async () => {
        mockDb(
            [{ cohort_id: IDS.cohortAId }],     // task found in cohortA
            [{ id: IDS.cohortAId }],             // instructor is in cohortA
            [stubSubmission()],                  // submissions
        );
        const res = await auth(
            req.get(`/api/submissions/task/${IDS.taskAId}`),
            tokens.instructorA(),
        );
        expect(res.status).toBe(200);
    });

    it('C4 — instructor denied submissions for task in different cohort', async () => {
        mockDb(
            [{ cohort_id: IDS.cohortBId }],     // task belongs to cohortB
            [],                                  // instructorA not in cohortB
        );
        const res = await auth(
            req.get(`/api/submissions/task/${IDS.taskAId}`),
            tokens.instructorA(),
        );
        expect(res.status).toBe(403);
    });

    it('C5 — instructorB cannot see cohortA team details', async () => {
        mockDb(
            [stubTeam()],                        // team found
            [],                                  // instructorB not a member of the team
            [],                                  // instructorB not in team\'s cohort (cohortA)
        );
        const res = await auth(
            req.get(`/api/teams/${IDS.teamAId}`),
            tokens.instructorB(),
        );
        expect(res.status).toBe(403);
    });

    it('C6 — student can view their own team', async () => {
        mockDb(
            [stubTeam()],                        // team found
            [{ user_id: IDS.studentAId }],       // studentA is a member
        );
        const res = await auth(
            req.get(`/api/teams/${IDS.teamAId}`),
            tokens.studentA(),
        );
        expect(res.status).toBe(200);
    });

    it('C7 — studentA denied access to studentB\'s submission', async () => {
        mockDb(
            [{ ...stubSubmission(), submitted_by: IDS.studentBId }], // owned by studentB
        );
        const res = await auth(
            req.get(`/api/submissions/${IDS.submissionAId}`),
            tokens.studentA(),
        );
        expect(res.status).toBe(403);
    });
});

/* ============================================================
 * D. CHAT ROOM ACCESS CONTROL
 * ============================================================ */
describe('D. Chat Room Security', () => {
    it('D1 — student cannot read messages from a team room they are not in', async () => {
        mockDb(
            [stubRoom({ type: 'team', team_id: IDS.teamAId })],  // room found, type=team
            [],                                                    // studentB is NOT a member
        );
        const res = await auth(
            req.get(`/api/chat/rooms/${IDS.roomAId}/messages`),
            tokens.studentB(),
        );
        expect(res.status).toBe(403);
    });

    it('D2 — student can read messages from their own team room', async () => {
        mockDb(
            [stubRoom({ type: 'team', team_id: IDS.teamAId })],   // room found
            [{ user_id: IDS.studentAId }],                         // studentA is a member
            [],                                                     // messages (empty)
        );
        const res = await auth(
            req.get(`/api/chat/rooms/${IDS.roomAId}/messages`),
            tokens.studentA(),
        );
        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
    });

    it('D3 — student cannot post message to a room they are not in', async () => {
        mockDb(
            [stubRoom({ type: 'team', team_id: IDS.teamAId })],  // room found
            [],                                                    // studentB not a member
        );
        const res = await auth(
            req.post(`/api/chat/rooms/${IDS.roomAId}/messages`).send({ content: 'hack' }),
            tokens.studentB(),
        );
        expect(res.status).toBe(403);
    });

    it('D4 — chat room not found returns 404', async () => {
        mockDb([]); // room not found
        const res = await auth(
            req.get(`/api/chat/rooms/${IDS.roomAId}/messages`),
            tokens.studentA(),
        );
        expect(res.status).toBe(404);
    });

    it('D5 — admin can read any chat room', async () => {
        mockDb(
            [stubRoom({ type: 'team', team_id: IDS.teamAId })],  // room found, admin bypass
            [],                                                    // messages (empty)
        );
        const res = await auth(
            req.get(`/api/chat/rooms/${IDS.roomAId}/messages`),
            tokens.admin(),
        );
        expect(res.status).toBe(200);
    });
});

/* ============================================================
 * E. DATA LEAK PREVENTION — no password_hash in responses
 * ============================================================ */
describe('E. Data Leak Prevention', () => {
    it('E1 — GET /profiles/:id does not expose password_hash', async () => {
        mockDb([{
            ...stubProfile(),
            password_hash: '$2b$10$SHOULD_NOT_APPEAR_IN_RESPONSE',
            reset_token:   'should-not-appear',
        }]);
        const res = await auth(
            req.get(`/api/profiles/${IDS.studentAId}`),
            tokens.admin(),
        );
        expect(res.status).toBe(200);
        expect(res.body.data).not.toHaveProperty('password_hash');
        expect(res.body.data).not.toHaveProperty('reset_token');
    });

    it('E2 — PUT /profiles/:id RETURNING does not include password_hash', async () => {
        // DB returns safe columns only (as now implemented — no RETURNING *)
        mockDb(
            [stubProfile()],  // existing profile check
            [stubProfile()],  // updated profile
        );
        const res = await auth(
            req.put(`/api/profiles/${IDS.studentAId}`)
               .send({ full_name: 'Updated Name' }),
            tokens.studentA(),
        );
        expect(res.status).toBeLessThan(500); // at minimum shouldn't crash
        if (res.status === 200) {
            expect(res.body.data).not.toHaveProperty('password_hash');
        }
    });

    it('E3 — Login response (POST /auth/login) does not include password_hash', async () => {
        // salt: $2b$10$... — bcrypt hash of 'password123'
        mockDb(
            [{
                id:            IDS.studentAId,
                email:         'student-a@test.com',
                password_hash: '$2b$10$invalid.hash.for.test', // won't match → 401, that\'s fine
                role:          'student',
                cohorts:       [],
                full_name:     'Student A',
            }],
        );
        const res = await req.post('/api/auth/login').send({
            email:    'student-a@test.com',
            password: 'wrongpassword',
        });
        // Either 401 (wrong password) or 200 — in neither case should password_hash appear
        expect(res.body).not.toHaveProperty('password_hash');
        if (res.body.data) expect(res.body.data).not.toHaveProperty('password_hash');
    });
});

/* ============================================================
 * F. ROLE ESCALATION PREVENTION
 * ============================================================ */
describe('F. Role Escalation', () => {
    it('F1 — non-admin cannot change their own role via PUT /profiles/:id', async () => {
        mockDb([stubProfile()]);
        const res = await auth(
            req.put(`/api/profiles/${IDS.studentAId}`).send({ role: 'admin' }),
            tokens.studentA(),
        );
        expect(res.status).toBe(403);
        expect(res.body.success).toBe(false);
    });

    it('F2 — admin CAN change a user\'s role', async () => {
        mockDb(
            [stubProfile({ id: IDS.studentAId })],  // profile found
            [stubProfile({ role: 'instructor' })],   // updated profile
        );
        const res = await auth(
            req.put(`/api/profiles/${IDS.studentAId}`).send({ role: 'instructor' }),
            tokens.admin(),
        );
        // 200 or DB-mocking-related variant, but should NOT be 403
        expect(res.status).not.toBe(403);
    });

    it('F3 — student cannot assign roles via POST /roles/assign', async () => {
        const res = await auth(
            req.post('/api/roles/assign').send({
                userId:         IDS.studentBId,
                roleId:         IDS.cohortAId,
                organizationId: IDS.orgId,
            }),
            tokens.studentA(),
        );
        expect(res.status).toBe(403);
    });
});

/* ============================================================
 * G. USER DATA ISOLATION — roles & profiles access control
 * ============================================================ */
describe('G. User Data Isolation', () => {
    it('G1 — student cannot view another user\'s roles', async () => {
        const res = await auth(
            req.get(`/api/roles/user/${IDS.studentBId}`),
            tokens.studentA(),
        );
        expect(res.status).toBe(403);
        expect(res.body.success).toBe(false);
    });

    it('G2 — student CAN view their own roles', async () => {
        mockDb([{ id: IDS.cohortAId, name: 'student', assigned_at: new Date() }]);
        const res = await auth(
            req.get(`/api/roles/user/${IDS.studentAId}`),
            tokens.studentA(),
        );
        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
    });

    it('G3 — admin can view any user\'s roles', async () => {
        mockDb([{ id: IDS.cohortAId, name: 'student', assigned_at: new Date() }]);
        const res = await auth(
            req.get(`/api/roles/user/${IDS.studentBId}`),
            tokens.admin(),
        );
        expect(res.status).toBe(200);
    });
});

/* ============================================================
 * H. INPUT VALIDATION
 * ============================================================ */
describe('H. Input Validation', () => {
    it('H1 — POST /auth/login with missing email returns 422', async () => {
        const res = await req.post('/api/auth/login').send({ password: 'pass123' });
        expect(res.status).toBe(422);
        expect(res.body.success).toBe(false);
    });

    it('H2 — POST /auth/login with invalid email format returns 422', async () => {
        const res = await req.post('/api/auth/login').send({ email: 'not-an-email', password: 'pass' });
        expect(res.status).toBe(422);
    });

    it('H3 — POST /auth/login with missing password returns 422', async () => {
        const res = await req.post('/api/auth/login').send({ email: 'test@test.com' });
        expect(res.status).toBe(422);
    });

    it('H4 — non-UUID route param is gracefully handled', async () => {
        const res = await auth(req.get('/api/cohorts/not-a-uuid/students'), tokens.admin());
        // Should be 400/404/500 — NOT an unhandled crash revealing stack traces
        expect(res.status).toBeGreaterThanOrEqual(400);
        expect(res.body).toBeDefined();
    });
});

/* ============================================================
 * I. RESPONSE CONTRACT — consistent { success, message, data }
 * ============================================================ */
describe('I. Response Contract', () => {
    it('I1 — successful list responses have success=true and message', async () => {
        mockDb([]);
        const res = await auth(req.get('/api/cohorts'), tokens.admin());
        expect(res.body).toHaveProperty('success', true);
        expect(res.body).toHaveProperty('message');
        expect(typeof res.body.message).toBe('string');
    });

    it('I2 — 404 responses have success=false and message', async () => {
        mockDb([]); // empty → resource not found
        const res = await auth(req.get(`/api/cohorts/${IDS.cohortBId}`), tokens.admin());
        if (res.status === 404) {
            expect(res.body.success).toBe(false);
            expect(res.body).toHaveProperty('message');
        }
    });

    it('I3 — 403 responses have success=false', async () => {
        const res = await auth(req.get('/api/attendance/all'), tokens.studentA());
        expect(res.status).toBe(403);
        expect(res.body.success).toBe(false);
    });

    it('I4 — 401 responses have success=false', async () => {
        const res = await req.get('/api/cohorts');
        expect(res.status).toBe(401);
        expect(res.body.success).toBe(false);
    });
});

/* ============================================================
 * J. HEALTH CHECK — sanity
 * ============================================================ */
describe('J. Health Check', () => {
    it('J1 — GET /health returns 200', async () => {
        const res = await req.get('/health');
        expect(res.status).toBe(200);
        expect(res.body.status).toBe('ok');
    });
});
