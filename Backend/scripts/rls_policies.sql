-- ============================================================
-- HubConnect — Row Level Security (RLS) Policies
-- Target: Supabase PostgreSQL
--
-- Architecture:
--   • The application uses custom JWT auth (not Supabase Auth).
--   • RLS policies here use JWT claims set via:
--       SET LOCAL app.user_id   = '<uuid>';
--       SET LOCAL app.user_role = 'admin|instructor|student|team_leader';
--       SET LOCAL app.cohort_ids = '{"uuid1","uuid2"}';
--     These must be set in a transaction wrapper function OR via
--     a Supabase "custom claims" approach.
--
-- Usage:  psql $DATABASE_URL -f scripts/rls_policies.sql
-- ============================================================

/* ── Helper: current user context from local settings ────────────────────── */
CREATE OR REPLACE FUNCTION current_user_id()
RETURNS uuid LANGUAGE sql STABLE AS $$
    SELECT NULLIF(current_setting('app.user_id', true), '')::uuid;
$$;

CREATE OR REPLACE FUNCTION current_user_role()
RETURNS text LANGUAGE sql STABLE AS $$
    SELECT NULLIF(current_setting('app.user_role', true), '');
$$;

CREATE OR REPLACE FUNCTION current_cohort_ids()
RETURNS uuid[] LANGUAGE sql STABLE AS $$
    SELECT COALESCE(
        string_to_array(current_setting('app.cohort_ids', true), ',')::uuid[],
        ARRAY[]::uuid[]
    );
$$;

CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean LANGUAGE sql STABLE AS $$
    SELECT current_user_role() = 'admin';
$$;

CREATE OR REPLACE FUNCTION is_instructor()
RETURNS boolean LANGUAGE sql STABLE AS $$
    SELECT current_user_role() = 'instructor';
$$;

/* ══════════════════════════════════════════════════════════════
   1. PROFILES
   ══════════════════════════════════════════════════════════════ */
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Everyone can see their own profile; admin sees all; instructors see their cohort's students
DROP POLICY IF EXISTS profiles_select ON profiles;
CREATE POLICY profiles_select ON profiles FOR SELECT
    USING (
        is_admin()
        OR id = current_user_id()
        OR (
            is_instructor()
            AND id IN (
                SELECT uc.user_id FROM user_cohorts uc
                WHERE uc.cohort_id = ANY(current_cohort_ids())
            )
        )
    );

-- Only authenticated user can update their own profile (admin can update anyone)
DROP POLICY IF EXISTS profiles_update ON profiles;
CREATE POLICY profiles_update ON profiles FOR UPDATE
    USING (id = current_user_id() OR is_admin())
    WITH CHECK (id = current_user_id() OR is_admin());

-- Only admin can insert/delete profiles (registration is admin-only in this system)
DROP POLICY IF EXISTS profiles_insert ON profiles;
CREATE POLICY profiles_insert ON profiles FOR INSERT
    WITH CHECK (is_admin());

DROP POLICY IF EXISTS profiles_delete ON profiles;
CREATE POLICY profiles_delete ON profiles FOR DELETE
    USING (is_admin());

/* ══════════════════════════════════════════════════════════════
   2. COHORTS
   ══════════════════════════════════════════════════════════════ */
ALTER TABLE cohorts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS cohorts_select ON cohorts;
CREATE POLICY cohorts_select ON cohorts FOR SELECT
    USING (
        is_admin()
        OR id = ANY(current_cohort_ids())
    );

DROP POLICY IF EXISTS cohorts_insert ON cohorts;
CREATE POLICY cohorts_insert ON cohorts FOR INSERT WITH CHECK (is_admin());

DROP POLICY IF EXISTS cohorts_update ON cohorts;
CREATE POLICY cohorts_update ON cohorts FOR UPDATE
    USING (is_admin()) WITH CHECK (is_admin());

DROP POLICY IF EXISTS cohorts_delete ON cohorts;
CREATE POLICY cohorts_delete ON cohorts FOR DELETE USING (is_admin());

/* ══════════════════════════════════════════════════════════════
   3. USER_COHORTS
   ══════════════════════════════════════════════════════════════ */
ALTER TABLE user_cohorts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS user_cohorts_select ON user_cohorts;
CREATE POLICY user_cohorts_select ON user_cohorts FOR SELECT
    USING (
        is_admin()
        OR user_id = current_user_id()
        OR (is_instructor() AND cohort_id = ANY(current_cohort_ids()))
    );

DROP POLICY IF EXISTS user_cohorts_insert ON user_cohorts;
CREATE POLICY user_cohorts_insert ON user_cohorts FOR INSERT
    WITH CHECK (is_admin() OR is_instructor());

DROP POLICY IF EXISTS user_cohorts_delete ON user_cohorts;
CREATE POLICY user_cohorts_delete ON user_cohorts FOR DELETE
    USING (is_admin() OR is_instructor());

/* ══════════════════════════════════════════════════════════════
   4. COURSES
   ══════════════════════════════════════════════════════════════ */
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS courses_select ON courses;
CREATE POLICY courses_select ON courses FOR SELECT
    USING (
        is_admin()
        OR cohort_id = ANY(current_cohort_ids())
    );

DROP POLICY IF EXISTS courses_insert ON courses;
CREATE POLICY courses_insert ON courses FOR INSERT
    WITH CHECK (is_admin() OR is_instructor());

DROP POLICY IF EXISTS courses_update ON courses;
CREATE POLICY courses_update ON courses FOR UPDATE
    USING (is_admin() OR (is_instructor() AND cohort_id = ANY(current_cohort_ids())))
    WITH CHECK (is_admin() OR (is_instructor() AND cohort_id = ANY(current_cohort_ids())));

DROP POLICY IF EXISTS courses_delete ON courses;
CREATE POLICY courses_delete ON courses FOR DELETE
    USING (is_admin());

/* ══════════════════════════════════════════════════════════════
   5. TEAMS
   ══════════════════════════════════════════════════════════════ */
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS teams_select ON teams;
CREATE POLICY teams_select ON teams FOR SELECT
    USING (
        is_admin()
        OR (is_instructor() AND cohort_id = ANY(current_cohort_ids()))
        OR id IN (
            SELECT tm.team_id FROM team_members tm WHERE tm.user_id = current_user_id()
        )
    );

DROP POLICY IF EXISTS teams_insert ON teams;
CREATE POLICY teams_insert ON teams FOR INSERT
    WITH CHECK (is_admin() OR is_instructor());

DROP POLICY IF EXISTS teams_update ON teams;
CREATE POLICY teams_update ON teams FOR UPDATE
    USING (is_admin() OR (is_instructor() AND cohort_id = ANY(current_cohort_ids())))
    WITH CHECK (is_admin() OR (is_instructor() AND cohort_id = ANY(current_cohort_ids())));

DROP POLICY IF EXISTS teams_delete ON teams;
CREATE POLICY teams_delete ON teams FOR DELETE
    USING (is_admin() OR (is_instructor() AND cohort_id = ANY(current_cohort_ids())));

/* ══════════════════════════════════════════════════════════════
   6. TEAM_MEMBERS
   ══════════════════════════════════════════════════════════════ */
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS team_members_select ON team_members;
CREATE POLICY team_members_select ON team_members FOR SELECT
    USING (
        is_admin()
        OR user_id = current_user_id()
        OR team_id IN (
            SELECT t.id FROM teams t WHERE t.cohort_id = ANY(current_cohort_ids())
        )
    );

DROP POLICY IF EXISTS team_members_insert ON team_members;
CREATE POLICY team_members_insert ON team_members FOR INSERT
    WITH CHECK (is_admin() OR is_instructor());

DROP POLICY IF EXISTS team_members_delete ON team_members;
CREATE POLICY team_members_delete ON team_members FOR DELETE
    USING (is_admin() OR is_instructor() OR user_id = current_user_id());

/* ══════════════════════════════════════════════════════════════
   7. TASKS
   ══════════════════════════════════════════════════════════════ */
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tasks_select ON tasks;
CREATE POLICY tasks_select ON tasks FOR SELECT
    USING (
        deleted_at IS NULL
        AND (
            is_admin()
            OR course_id IN (
                SELECT c.id FROM courses c WHERE c.cohort_id = ANY(current_cohort_ids())
            )
            OR id IN (
                SELECT ta.task_id FROM task_assignments ta WHERE ta.user_id = current_user_id()
            )
        )
    );

DROP POLICY IF EXISTS tasks_insert ON tasks;
CREATE POLICY tasks_insert ON tasks FOR INSERT
    WITH CHECK (is_admin() OR is_instructor());

DROP POLICY IF EXISTS tasks_update ON tasks;
CREATE POLICY tasks_update ON tasks FOR UPDATE
    USING (
        is_admin()
        OR (is_instructor() AND course_id IN (
            SELECT c.id FROM courses c WHERE c.cohort_id = ANY(current_cohort_ids())
        ))
    )
    WITH CHECK (
        is_admin()
        OR (is_instructor() AND course_id IN (
            SELECT c.id FROM courses c WHERE c.cohort_id = ANY(current_cohort_ids())
        ))
    );

DROP POLICY IF EXISTS tasks_delete ON tasks;
CREATE POLICY tasks_delete ON tasks FOR DELETE
    USING (is_admin() OR is_instructor());

/* ══════════════════════════════════════════════════════════════
   8. TASK_ASSIGNMENTS
   ══════════════════════════════════════════════════════════════ */
ALTER TABLE task_assignments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS task_assignments_select ON task_assignments;
CREATE POLICY task_assignments_select ON task_assignments FOR SELECT
    USING (
        is_admin()
        OR user_id = current_user_id()
        OR is_instructor()
    );

DROP POLICY IF EXISTS task_assignments_insert ON task_assignments;
CREATE POLICY task_assignments_insert ON task_assignments FOR INSERT
    WITH CHECK (is_admin() OR is_instructor());

DROP POLICY IF EXISTS task_assignments_delete ON task_assignments;
CREATE POLICY task_assignments_delete ON task_assignments FOR DELETE
    USING (is_admin() OR is_instructor());

/* ══════════════════════════════════════════════════════════════
   9. SUBMISSIONS
   ══════════════════════════════════════════════════════════════ */
ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS submissions_select ON submissions;
CREATE POLICY submissions_select ON submissions FOR SELECT
    USING (
        is_admin()
        OR submitted_by = current_user_id()
        OR team_id IN (
            SELECT tm.team_id FROM team_members tm WHERE tm.user_id = current_user_id()
        )
        OR (is_instructor() AND task_id IN (
            SELECT t.id FROM tasks t
            JOIN courses c ON c.id = t.course_id
            WHERE c.cohort_id = ANY(current_cohort_ids())
        ))
    );

DROP POLICY IF EXISTS submissions_insert ON submissions;
CREATE POLICY submissions_insert ON submissions FOR INSERT
    WITH CHECK (submitted_by = current_user_id());

DROP POLICY IF EXISTS submissions_update ON submissions;
CREATE POLICY submissions_update ON submissions FOR UPDATE
    USING (
        is_admin()
        OR submitted_by = current_user_id()  -- student updating own draft
        OR (is_instructor() AND task_id IN (  -- instructor reviewing
            SELECT t.id FROM tasks t
            JOIN courses c ON c.id = t.course_id
            WHERE c.cohort_id = ANY(current_cohort_ids())
        ))
    );

/* ══════════════════════════════════════════════════════════════
   10. CHAT_ROOMS
   ══════════════════════════════════════════════════════════════ */
ALTER TABLE chat_rooms ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS chat_rooms_select ON chat_rooms;
CREATE POLICY chat_rooms_select ON chat_rooms FOR SELECT
    USING (
        is_admin()
        OR room_type = 'general'
        OR (room_type = 'team' AND team_id IN (
            SELECT tm.team_id FROM team_members tm WHERE tm.user_id = current_user_id()
        ))
        OR (room_type = 'course' AND course_id IN (
            SELECT c.id FROM courses c WHERE c.cohort_id = ANY(current_cohort_ids())
        ))
    );

DROP POLICY IF EXISTS chat_rooms_insert ON chat_rooms;
CREATE POLICY chat_rooms_insert ON chat_rooms FOR INSERT
    WITH CHECK (is_admin() OR is_instructor());

DROP POLICY IF EXISTS chat_rooms_delete ON chat_rooms;
CREATE POLICY chat_rooms_delete ON chat_rooms FOR DELETE
    USING (is_admin() OR created_by = current_user_id());

/* ══════════════════════════════════════════════════════════════
   11. MESSAGES
   ══════════════════════════════════════════════════════════════ */
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS messages_select ON messages;
CREATE POLICY messages_select ON messages FOR SELECT
    USING (
        deleted_at IS NULL
        AND (
            is_admin()
            OR chat_room_id IN (
                SELECT cr.id FROM chat_rooms cr
                WHERE cr.room_type = 'general'
                   OR (cr.room_type = 'team' AND cr.team_id IN (
                        SELECT tm.team_id FROM team_members tm WHERE tm.user_id = current_user_id()
                   ))
                   OR (cr.room_type = 'course' AND cr.course_id IN (
                        SELECT c.id FROM courses c WHERE c.cohort_id = ANY(current_cohort_ids())
                   ))
            )
        )
    );

DROP POLICY IF EXISTS messages_insert ON messages;
CREATE POLICY messages_insert ON messages FOR INSERT
    WITH CHECK (sender_id = current_user_id());

DROP POLICY IF EXISTS messages_update ON messages;
CREATE POLICY messages_update ON messages FOR UPDATE
    USING (sender_id = current_user_id() OR is_admin())
    WITH CHECK (sender_id = current_user_id() OR is_admin());

/* ══════════════════════════════════════════════════════════════
   12. NOTIFICATIONS
   ══════════════════════════════════════════════════════════════ */
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS notifications_select ON notifications;
CREATE POLICY notifications_select ON notifications FOR SELECT
    USING (recipient_id = current_user_id() OR is_admin());

DROP POLICY IF EXISTS notifications_update ON notifications;
CREATE POLICY notifications_update ON notifications FOR UPDATE
    USING (recipient_id = current_user_id())
    WITH CHECK (recipient_id = current_user_id());

DROP POLICY IF EXISTS notifications_insert ON notifications;
CREATE POLICY notifications_insert ON notifications FOR INSERT
    WITH CHECK (is_admin() OR is_instructor() OR actor_id = current_user_id());

/* ══════════════════════════════════════════════════════════════
   13. ATTENDANCE
   ══════════════════════════════════════════════════════════════ */
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS attendance_select ON attendance;
CREATE POLICY attendance_select ON attendance FOR SELECT
    USING (
        is_admin()
        OR user_id = current_user_id()
        OR (is_instructor() AND user_id IN (
            SELECT uc.user_id FROM user_cohorts uc
            WHERE uc.cohort_id = ANY(current_cohort_ids())
        ))
    );

DROP POLICY IF EXISTS attendance_insert ON attendance;
CREATE POLICY attendance_insert ON attendance FOR INSERT
    WITH CHECK (user_id = current_user_id() OR is_admin());

DROP POLICY IF EXISTS attendance_update ON attendance;
CREATE POLICY attendance_update ON attendance FOR UPDATE
    USING (user_id = current_user_id() OR is_admin())
    WITH CHECK (user_id = current_user_id() OR is_admin());

/* ══════════════════════════════════════════════════════════════
   14. FILES
   ══════════════════════════════════════════════════════════════ */
ALTER TABLE files ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS files_select ON files;
CREATE POLICY files_select ON files FOR SELECT
    USING (
        deleted_at IS NULL
        AND (
            is_admin()
            OR is_public = true
            OR uploaded_by = current_user_id()
            OR (is_instructor() AND resource_id IN (
                SELECT t.id FROM tasks t
                JOIN courses c ON c.id = t.course_id
                WHERE c.cohort_id = ANY(current_cohort_ids())
            ))
        )
    );

DROP POLICY IF EXISTS files_insert ON files;
CREATE POLICY files_insert ON files FOR INSERT
    WITH CHECK (uploaded_by = current_user_id());

DROP POLICY IF EXISTS files_delete ON files;
CREATE POLICY files_delete ON files FOR DELETE
    USING (uploaded_by = current_user_id() OR is_admin());

/* ══════════════════════════════════════════════════════════════
   15. ACTIVITY_LOGS (Read-only for auditors; insert by system)
   ══════════════════════════════════════════════════════════════ */
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS activity_logs_select ON activity_logs;
CREATE POLICY activity_logs_select ON activity_logs FOR SELECT
    USING (is_admin());

DROP POLICY IF EXISTS activity_logs_insert ON activity_logs;
CREATE POLICY activity_logs_insert ON activity_logs FOR INSERT
    WITH CHECK (true);  -- system-level inserts bypass RLS via service role key
