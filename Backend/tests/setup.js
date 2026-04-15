/**
 * Shared test helpers — JWT generation, mock data factories.
 *
 * Import this at the top of each test file or configure via vitest `setupFiles`.
 */
import jwt from 'jsonwebtoken';

/** Must match the jwtSecret fallback used at login time */
export const TEST_JWT_SECRET = 'hubconnect-dev-secret-change-in-production';

/* Fixed UUIDs for predictable test data */
export const IDS = {
    adminId:       'a0000000-0000-0000-0000-000000000001',
    instructorAId: 'a0000000-0000-0000-0000-000000000002',
    instructorBId: 'a0000000-0000-0000-0000-000000000003',
    studentAId:    'a0000000-0000-0000-0000-000000000004',
    studentBId:    'a0000000-0000-0000-0000-000000000005',
    cohortAId:     'c0000000-0000-0000-0000-000000000001',
    cohortBId:     'c0000000-0000-0000-0000-000000000002',
    orgId:         'b0000000-0000-0000-0000-000000000001',
    teamAId:       'd0000000-0000-0000-0000-000000000001',
    taskAId:       'e0000000-0000-0000-0000-000000000001',
    roomAId:       'f0000000-0000-0000-0000-000000000001',
    submissionAId: '90000000-0000-0000-0000-000000000001',
};

/**
 * Sign a JWT with the dev secret.
 * @param {object} payload
 * @param {string} [expiresIn='1h']
 * @returns {string}
 */
export const signToken = (payload, expiresIn = '1h') =>
    jwt.sign(payload, TEST_JWT_SECRET, { expiresIn });

/* Role-specific token factories */
export const tokens = {
    admin: () => signToken({
        id:             IDS.adminId,
        email:          'admin@test.com',
        role:           'admin',
        cohorts:        [],
        organizationId: IDS.orgId,
    }),

    instructorA: () => signToken({
        id:             IDS.instructorAId,
        email:          'instructor-a@test.com',
        role:           'instructor',
        cohorts:        [IDS.cohortAId],
        organizationId: IDS.orgId,
    }),

    instructorB: () => signToken({
        id:             IDS.instructorBId,
        email:          'instructor-b@test.com',
        role:           'instructor',
        cohorts:        [IDS.cohortBId],
        organizationId: IDS.orgId,
    }),

    studentA: () => signToken({
        id:             IDS.studentAId,
        email:          'student-a@test.com',
        role:           'student',
        cohorts:        [IDS.cohortAId],
        organizationId: IDS.orgId,
    }),

    studentB: () => signToken({
        id:             IDS.studentBId,
        email:          'student-b@test.com',
        role:           'student',
        cohorts:        [IDS.cohortBId],
        organizationId: IDS.orgId,
    }),

    teamLeaderA: () => signToken({
        id:             IDS.studentAId,
        email:          'leader-a@test.com',
        role:           'team_leader',
        cohorts:        [IDS.cohortAId],
        organizationId: IDS.orgId,
    }),

    expired: () => signToken({
        id:   IDS.studentAId,
        role: 'student',
    }, '-1s'),          // already expired
};

/**
 * Attach a Bearer token to a supertest request.
 * @param {object} req  supertest request
 * @param {string} tok  JWT string
 */
export const auth = (req, tok) => req.set('Authorization', `Bearer ${tok}`);

/* ── Common DB row stubs ──────────────────────────────────────────────────── */

export const stubProfile = (overrides = {}) => ({
    id:           IDS.studentAId,
    email:        'student-a@test.com',
    full_name:    'Student A',
    role:         'student',
    avatar_url:   null,
    phone_number: null,
    bio:          null,
    theme_preference:      'light',
    notifications_enabled: true,
    created_at:   new Date().toISOString(),
    updated_at:   new Date().toISOString(),
    ...overrides,
});

export const stubCohort = (overrides = {}) => ({
    id:          IDS.cohortAId,
    name:        'Cohort A',
    description: 'Test cohort',
    created_at:  new Date().toISOString(),
    ...overrides,
});

export const stubTeam = (overrides = {}) => ({
    id:        IDS.teamAId,
    cohort_id: IDS.cohortAId,
    name:      'Team Alpha',
    created_at: new Date().toISOString(),
    ...overrides,
});

export const stubRoom = (overrides = {}) => ({
    id:        IDS.roomAId,
    room_type: 'team',
    team_id:   IDS.teamAId,
    name:      'team-room',
    ...overrides,
});

export const stubTask = (overrides = {}) => ({
    id:        IDS.taskAId,
    cohort_id: IDS.cohortAId,
    title:     'Test Task',
    due_date:  new Date(Date.now() + 86400000).toISOString(),
    status:    'pending',
    deleted_at: null,
    ...overrides,
});

export const stubSubmission = (overrides = {}) => ({
    id:           IDS.submissionAId,
    task_id:      IDS.taskAId,
    submitted_by: IDS.studentAId,
    team_id:      IDS.teamAId,
    status:       'submitted',
    submitted_at: new Date().toISOString(),
    ...overrides,
});
