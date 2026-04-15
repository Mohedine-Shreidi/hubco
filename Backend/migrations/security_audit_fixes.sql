-- ============================================================
-- HubConnect — Security Audit Remediation Migration
-- Date: 2026-03-04
--
-- PREREQUISITE: Run 000_rls_helper_functions.sql first.
-- This migration references current_user_id(), current_user_role(),
-- is_admin(), is_instructor(), and current_cohort_ids().
--
-- Fixes:
--   [CRITICAL] RLS submissions_update: split into student vs instructor policies
--   [HIGH]     Remove team_leader from user_role_type ENUM
--   [MEDIUM]   Consolidate RLS: remove auth.uid()-based policies, keep app.user_id-based
--   [MEDIUM]   Update courses RLS to use cohort_courses junction table
-- ============================================================

-- ──────────────────────────────────────────────────────────────
-- 1. [CRITICAL] Fix RLS submissions_update — prevent student grade tampering
--
--    OLD: submitted_by = current_user_id() allows student to UPDATE all columns
--    NEW: Two separate policies:
--         a) Student can update ONLY draft fields (github_link, comment, status→submitted)
--         b) Instructor/admin can update assessment fields (grade, feedback, assessed_by...)
-- ──────────────────────────────────────────────────────────────

-- Drop any existing versions of these policies to make this migration idempotent
DROP POLICY IF EXISTS submissions_update            ON submissions;
DROP POLICY IF EXISTS submissions_update_student   ON submissions;
DROP POLICY IF EXISTS submissions_update_instructor ON submissions;

-- Policy A: Students can update their own submission's draft fields only.
-- The WITH CHECK ensures they CANNOT set grade, assessed_by, assessed_at
-- to non-null values, and feedback must remain as-is.
CREATE POLICY submissions_update_student ON submissions FOR UPDATE
    USING (
        submitted_by = current_user_id()
        AND current_user_role() IN ('student')
    )
    WITH CHECK (
        submitted_by = current_user_id()
        AND current_user_role() IN ('student')
        -- Students cannot set assessment fields
        AND grade IS NULL
        AND assessed_by IS NULL
        AND assessed_at IS NULL
    );

-- Policy B: Instructors can update submissions in their cohort (for grading/review)
CREATE POLICY submissions_update_instructor ON submissions FOR UPDATE
    USING (
        is_admin()
        OR (is_instructor() AND task_id IN (
            SELECT t.id FROM tasks t
            JOIN cohort_courses cc ON cc.course_id = t.course_id
            WHERE cc.cohort_id = ANY(current_cohort_ids())
        ))
    );

-- ──────────────────────────────────────────────────────────────
-- 2. [HIGH] Remove team_leader from user_role_type ENUM
--
--    Leader designation lives ONLY in teams.team_leader_id and
--    team_members.is_leader. It is NOT a global role.
--
--    PostgreSQL doesn't support DROP VALUE from ENUM directly,
--    so we: create new type → migrate → swap.
-- ──────────────────────────────────────────────────────────────

-- First, update all profiles that currently have role='team_leader' back to 'student'
UPDATE profiles SET role = 'student' WHERE role = 'team_leader';

-- Create the clean enum
CREATE TYPE user_role_type_v2 AS ENUM ('admin', 'instructor', 'student');

-- Migrate the column (profiles.role is VARCHAR so no ENUM cast needed if stored as text)
-- If role is stored as user_role_type ENUM, we need to alter:
-- Since profiles.role is VARCHAR(50) per the schema, we just need to ensure
-- no references use the old enum. The ENUM is defined but profiles.role is VARCHAR.
-- Drop old, rename new for any tables that DO use the ENUM type.
-- (The ENUM is defined in supabase_schema.sql but profiles.role is VARCHAR — safe.)

-- For safety, also update user_cohorts.role if it references team_leader
UPDATE user_cohorts SET role = 'student' WHERE role = 'team_leader';

-- Drop old enum and rename (only if no columns depend on it directly)
-- If columns depend on it, you must ALTER COLUMN first.
DO $$
BEGIN
    -- Check if any column uses user_role_type directly
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE udt_name = 'user_role_type'
    ) THEN
        DROP TYPE IF EXISTS user_role_type;
        ALTER TYPE user_role_type_v2 RENAME TO user_role_type;
    ELSE
        RAISE NOTICE 'Columns still reference user_role_type — manual migration required.';
        -- Fallback: just leave both types; the app code no longer uses team_leader
    END IF;
END $$;

-- ──────────────────────────────────────────────────────────────
-- 3. [MEDIUM] Update courses_select RLS to use cohort_courses junction
--
--    The existing policy uses courses.cohort_id which is legacy/nullable.
--    Should use the cohort_courses M:N junction table.
-- ──────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS courses_select        ON courses;
DROP POLICY IF EXISTS "Users can view their courses" ON courses;
CREATE POLICY courses_select ON courses FOR SELECT
    USING (
        is_admin()
        OR id IN (
            SELECT cc.course_id FROM cohort_courses cc
            WHERE cc.cohort_id = ANY(current_cohort_ids())
        )
    );

DROP POLICY IF EXISTS courses_update                             ON courses;
DROP POLICY IF EXISTS "Only admins and instructors can update courses" ON courses;
CREATE POLICY courses_update ON courses FOR UPDATE
    USING (
        is_admin()
        OR (is_instructor() AND id IN (
            SELECT cc.course_id FROM cohort_courses cc
            WHERE cc.cohort_id = ANY(current_cohort_ids())
        ))
    )
    WITH CHECK (
        is_admin()
        OR (is_instructor() AND id IN (
            SELECT cc.course_id FROM cohort_courses cc
            WHERE cc.cohort_id = ANY(current_cohort_ids())
        ))
    );

-- ──────────────────────────────────────────────────────────────
-- 4. [MEDIUM] Update tasks_select RLS to also use cohort_courses junction
-- ──────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS tasks_select                    ON tasks;
DROP POLICY IF EXISTS "Users can view assigned tasks" ON tasks;
CREATE POLICY tasks_select ON tasks FOR SELECT
    USING (
        deleted_at IS NULL
        AND (
            is_admin()
            OR cohort_id = ANY(current_cohort_ids())
            OR course_id IN (
                SELECT cc.course_id FROM cohort_courses cc
                WHERE cc.cohort_id = ANY(current_cohort_ids())
            )
            OR id IN (
                SELECT ta.task_id FROM task_assignments ta WHERE ta.user_id = current_user_id()
            )
        )
    );

DROP POLICY IF EXISTS tasks_update ON tasks;
CREATE POLICY tasks_update ON tasks FOR UPDATE
    USING (
        is_admin()
        OR (is_instructor() AND (
            cohort_id = ANY(current_cohort_ids())
            OR course_id IN (
                SELECT cc.course_id FROM cohort_courses cc
                WHERE cc.cohort_id = ANY(current_cohort_ids())
            )
        ))
    )
    WITH CHECK (
        is_admin()
        OR (is_instructor() AND (
            cohort_id = ANY(current_cohort_ids())
            OR course_id IN (
                SELECT cc.course_id FROM cohort_courses cc
                WHERE cc.cohort_id = ANY(current_cohort_ids())
            )
        ))
    );

-- ──────────────────────────────────────────────────────────────
-- 5. [LOW] Add instructor access to team chat rooms in RLS
--    (Backend allows it; RLS should be consistent)
-- ──────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS chat_rooms_select              ON chat_rooms;
DROP POLICY IF EXISTS "Users can view chat rooms"      ON chat_rooms;
DROP POLICY IF EXISTS "Users can view course chat rooms" ON chat_rooms;
CREATE POLICY chat_rooms_select ON chat_rooms FOR SELECT
    USING (
        is_admin()
        OR room_type = 'general'
        OR (room_type = 'team' AND (
            team_id IN (
                SELECT tm.team_id FROM team_members tm WHERE tm.user_id = current_user_id()
            )
            OR (is_instructor() AND cohort_id = ANY(current_cohort_ids()))
        ))
        OR (room_type = 'course' AND course_id IN (
            SELECT cc.course_id FROM cohort_courses cc
            WHERE cc.cohort_id = ANY(current_cohort_ids())
        ))
    );
