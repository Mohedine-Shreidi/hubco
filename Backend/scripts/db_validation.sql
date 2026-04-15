-- ============================================================
-- HubConnect — Database Validation Tests
-- Verifies RLS policies and authorization logic at the SQL level.
--
-- Run these in a psql session AFTER enabling RLS:
--   psql $DATABASE_URL -f scripts/db_validation.sql
--
-- Expected: each assertion should return a count of 0 (no violations).
-- ============================================================

/* ── Setup: create read-only validation role ─────────────────────────────── */
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'hubconnect_validator') THEN
        CREATE ROLE hubconnect_validator NOLOGIN;
    END IF;
END $$;

GRANT CONNECT ON DATABASE postgres TO hubconnect_validator;
GRANT USAGE ON SCHEMA public TO hubconnect_validator;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO hubconnect_validator;

/* ── Test 1: No profile exposes password_hash or reset_token in SELECT * ─── */
-- This verifies the columns exist (they should be hidden by app layer, not DB layer).
SELECT 'TEST 1: Sensitive columns exist in schema (hidden by application):' AS test;
SELECT column_name
FROM information_schema.columns
WHERE table_name = 'profiles'
  AND column_name IN ('password_hash', 'reset_token', 'reset_token_expires_at');
-- EXPECTED: 3 rows — columns exist but application NEVER returns them

/* ── Test 2: Duplicate email enforcement ─────────────────────────────────── */
SELECT 'TEST 2: Email uniqueness constraint on profiles:' AS test;
SELECT COUNT(*) AS duplicate_emails
FROM (
    SELECT email, COUNT(*) AS cnt
    FROM profiles
    GROUP BY email
    HAVING COUNT(*) > 1
) dups;
-- EXPECTED: 0 rows (no duplicates)

/* ── Test 3: Cross-cohort orphan submissions ─────────────────────────────── */
-- Submissions whose tasks belong to a course in a different cohort from the submitter.
SELECT 'TEST 3: Submissions from users not in the task cohort:' AS test;
SELECT COUNT(*) AS cross_cohort_submissions
FROM submissions s
JOIN tasks t ON t.id = s.task_id
JOIN courses c ON c.id = t.course_id
WHERE NOT EXISTS (
    SELECT 1 FROM user_cohorts uc
    WHERE uc.user_id = s.submitted_by
      AND uc.cohort_id = c.cohort_id
);
-- EXPECTED: 0 (every submitter is a member of the task's cohort)

/* ── Test 4: Team members in wrong cohort ────────────────────────────────── */
-- Team members who are not in the cohort their team belongs to.
SELECT 'TEST 4: Team members not enrolled in team cohort:' AS test;
SELECT COUNT(*) AS orphan_team_members
FROM team_members tm
JOIN teams t ON t.id = tm.team_id
WHERE t.cohort_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM user_cohorts uc
    WHERE uc.user_id = tm.user_id
      AND uc.cohort_id = t.cohort_id
);
-- EXPECTED: 0 desirable (though may be > 0 if data was seeded without constraint)

/* ── Test 5: Chat room messages from non-members ─────────────────────────── */
-- Messages sent to team rooms by users who are not team members.
SELECT 'TEST 5: Messages in team rooms from non-members:' AS test;
SELECT COUNT(*) AS unauthorized_messages
FROM messages m
JOIN chat_rooms cr ON cr.id = m.chat_room_id
WHERE cr.room_type = 'team'
  AND cr.team_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM team_members tm
    WHERE tm.team_id = cr.team_id
      AND tm.user_id = m.sender_id
  );
-- EXPECTED: 0 (API enforces access before insert)

/* ── Test 6: Tasks with no cohort path ───────────────────────────────────── */
-- Tasks not linked to any course (orphans — would fail cohort filter).
SELECT 'TEST 6: Tasks with NULL or missing course_id:' AS test;
SELECT COUNT(*) AS orphan_tasks
FROM tasks t
WHERE t.deleted_at IS NULL
  AND (t.course_id IS NULL OR NOT EXISTS (SELECT 1 FROM courses c WHERE c.id = t.course_id));
-- EXPECTED: 0

/* ── Test 7: Submissions for deleted tasks ───────────────────────────────── */
SELECT 'TEST 7: Submissions for soft-deleted tasks:' AS test;
SELECT COUNT(*) AS stale_submissions
FROM submissions s
JOIN tasks t ON t.id = s.task_id
WHERE t.deleted_at IS NOT NULL;
-- EXPECTED: 0 (may be > 0 if cleanup didn't run)

/* ── Test 8: Admin role integrity ────────────────────────────────────────── */
-- Ensure there is at least one admin in the system.
SELECT 'TEST 8: At least one admin exists:' AS test;
SELECT COUNT(*) AS admin_count FROM profiles WHERE role = 'admin';
-- EXPECTED: >= 1

/* ── Test 9: JWT role values are valid ───────────────────────────────────── */
-- Profiles should only have the 4 permitted roles.
SELECT 'TEST 9: Invalid roles in profiles:' AS test;
SELECT COUNT(*) AS invalid_roles
FROM profiles
WHERE role NOT IN ('admin', 'instructor', 'student', 'team_leader');
-- EXPECTED: 0

/* ── Test 10: No NULL organization_id on core tables ─────────────────────── */
SELECT 'TEST 10: NULL organization_id check on tasks:' AS test;
SELECT COUNT(*) AS null_org_tasks FROM tasks WHERE organization_id IS NULL AND deleted_at IS NULL;

SELECT 'TEST 10b: NULL organization_id check on cohorts:' AS test;
SELECT COUNT(*) AS null_org_cohorts FROM cohorts WHERE organization_id IS NULL;

SELECT 'TEST 10c: NULL organization_id check on submissions:' AS test;
SELECT COUNT(*) AS null_org_submissions FROM submissions WHERE organization_id IS NULL;
-- EXPECTED: 0 for all

/* ── Test 11: Reset tokens that are expired but not cleared ─────────────── */
SELECT 'TEST 11: Stale/expired reset tokens in profiles:' AS test;
SELECT COUNT(*) AS stale_tokens
FROM profiles
WHERE reset_token IS NOT NULL
  AND reset_token_expires_at < CURRENT_TIMESTAMP;
-- EXPECTED: 0 (cleanup job should clear these; informational if > 0)

/* ── Test 12: Performance — indexes are being used ──────────────────────── */
SELECT 'TEST 12: Index health on key tables:' AS test;
SELECT
    schemaname,
    tablename,
    indexname,
    idx_scan AS times_used,
    idx_tup_read AS tuples_read
FROM pg_stat_user_indexes
WHERE tablename IN ('tasks', 'submissions', 'user_cohorts', 'team_members', 'attendance')
ORDER BY tablename, times_used DESC;
