-- ============================================================
-- HubConnect — Missing Index Recommendations
-- Performance audit: adds missing indexes identified during
-- the security & performance review.
--
-- Run:  psql $DATABASE_URL -f scripts/indexes.sql
-- Safe: all use CREATE INDEX IF NOT EXISTS (no duplicate errors).
-- ============================================================

/* ─────────────────────────────────────────────────────────────
   1. COHORT ISOLATION — primary lookup paths
   ───────────────────────────────────────────────────────────── */

-- user_cohorts: used heavily for role-scoped queries
CREATE INDEX IF NOT EXISTS idx_user_cohorts_user_id
    ON user_cohorts(user_id);

CREATE INDEX IF NOT EXISTS idx_user_cohorts_cohort_id
    ON user_cohorts(cohort_id);

CREATE INDEX IF NOT EXISTS idx_user_cohorts_cohort_role
    ON user_cohorts(cohort_id, role);

-- courses: cohort_id lookup for instructor scoping
CREATE INDEX IF NOT EXISTS idx_courses_cohort_id
    ON courses(cohort_id);

CREATE INDEX IF NOT EXISTS idx_courses_org_cohort
    ON courses(organization_id, cohort_id);

-- teams: cohort_id used after migration (rbac_cohort_isolation.sql)
CREATE INDEX IF NOT EXISTS idx_teams_cohort_id
    ON teams(cohort_id);

/* ─────────────────────────────────────────────────────────────
   2. TASKS — high-frequency filter columns
   ───────────────────────────────────────────────────────────── */

-- Soft-delete filtering — every task query adds WHERE deleted_at IS NULL
CREATE INDEX IF NOT EXISTS idx_tasks_active
    ON tasks(course_id)
    WHERE deleted_at IS NULL;

-- Status transitions for submission pipeline
CREATE INDEX IF NOT EXISTS idx_tasks_status_due
    ON tasks(status, due_date)
    WHERE deleted_at IS NULL;

-- Per-team task listing (common in dashboard)
CREATE INDEX IF NOT EXISTS idx_tasks_team_id_active
    ON tasks(team_id)
    WHERE deleted_at IS NULL AND team_id IS NOT NULL;

/* ─────────────────────────────────────────────────────────────
   3. SUBMISSIONS — submission pipeline lookups
   ───────────────────────────────────────────────────────────── */

-- Status + submitted_at for review queues
CREATE INDEX IF NOT EXISTS idx_submissions_status
    ON submissions(status);

CREATE INDEX IF NOT EXISTS idx_submissions_team_id
    ON submissions(team_id)
    WHERE team_id IS NOT NULL;

-- Deadline check: taskId + submitter combo (duplicate detection)
CREATE INDEX IF NOT EXISTS idx_submissions_task_submitter
    ON submissions(task_id, submitted_by);

/* ─────────────────────────────────────────────────────────────
   4. CHAT — real-time message retrieval
   ───────────────────────────────────────────────────────────── */

-- Room type + reference id lookups
CREATE INDEX IF NOT EXISTS idx_chat_rooms_team_id
    ON chat_rooms(team_id)
    WHERE team_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_chat_rooms_course_id
    ON chat_rooms(course_id)
    WHERE course_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_chat_rooms_type
    ON chat_rooms(room_type);

-- Messages paginated by room — most common chat query
CREATE INDEX IF NOT EXISTS idx_messages_room_created
    ON messages(chat_room_id, created_at DESC)
    WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_messages_sender
    ON messages(sender_id);

/* ─────────────────────────────────────────────────────────────
   5. TEAM MEMBERS — access checks in chat + team routes
   ───────────────────────────────────────────────────────────── */

CREATE INDEX IF NOT EXISTS idx_team_members_user_id
    ON team_members(user_id);

CREATE INDEX IF NOT EXISTS idx_team_members_team_user
    ON team_members(team_id, user_id);

/* ─────────────────────────────────────────────────────────────
   6. ATTENDANCE — dashboard and reporting queries
   ───────────────────────────────────────────────────────────── */

-- Date range scanning for range reports
CREATE INDEX IF NOT EXISTS idx_attendance_date
    ON attendance(date DESC);

-- Org-wide attendance summary
CREATE INDEX IF NOT EXISTS idx_attendance_org_date
    ON attendance(organization_id, date);

/* ─────────────────────────────────────────────────────────────
   7. NOTIFICATIONS — recipient inbox
   ───────────────────────────────────────────────────────────── */

-- Unread inbox — most common notification query
CREATE INDEX IF NOT EXISTS idx_notifications_recipient_unread
    ON notifications(recipient_id, created_at DESC)
    WHERE status = 'unread';

/* ─────────────────────────────────────────────────────────────
   8. ACTIVITY LOGS — audit trail
   ───────────────────────────────────────────────────────────── */

-- Audit search: who did what to which resource
CREATE INDEX IF NOT EXISTS idx_activity_logs_actor
    ON activity_logs(actor_id);

CREATE INDEX IF NOT EXISTS idx_activity_logs_resource_type_id
    ON activity_logs(resource_type, resource_id);

CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at
    ON activity_logs(created_at DESC);

/* ─────────────────────────────────────────────────────────────
   9. FILES — metadata lookups
   ───────────────────────────────────────────────────────────── */

CREATE INDEX IF NOT EXISTS idx_files_resource_type_id
    ON files(resource_type, resource_id)
    WHERE deleted_at IS NULL AND resource_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_files_uploaded_by
    ON files(uploaded_by)
    WHERE deleted_at IS NULL;

/* ─────────────────────────────────────────────────────────────
   10. TASK ASSIGNMENTS
   ───────────────────────────────────────────────────────────── */

CREATE INDEX IF NOT EXISTS idx_task_assignments_user_id
    ON task_assignments(user_id);

/* ─────────────────────────────────────────────────────────────
   VERIFICATION — list all newly created indexes
   ───────────────────────────────────────────────────────────── */
SELECT
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND indexname LIKE 'idx_%'
ORDER BY tablename, indexname;
