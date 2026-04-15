-- ============================================================
-- HubConnect — RBAC & Cohort Isolation Migration
-- Addresses:
--   1.  Cohort-based filtering (RBAC fix)
--   2.  Course decoupling (global templates + cohort_courses)
--   3.  Task multi-assignment (cohort / teams[] / students[] / mixed)
--   4.  Submission grading columns
--   5.  Team chat scoping
--   6.  Performance indexes
-- Run once against your local or Supabase PostgreSQL instance.
-- ============================================================

BEGIN;

-- ──────────────────────────────────────────────────────────
-- 1. ENUMS
-- ──────────────────────────────────────────────────────────
DO $$ BEGIN
    CREATE TYPE assignment_type AS ENUM ('individual','team','mixed','cohort');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ──────────────────────────────────────────────────────────
-- 2. TEAMS — add cohort_id
-- ──────────────────────────────────────────────────────────
ALTER TABLE teams
    ADD COLUMN IF NOT EXISTS cohort_id UUID REFERENCES cohorts(id) ON DELETE SET NULL;

-- Back-fill cohort_id from the course's current cohort_id
UPDATE teams t
SET cohort_id = c.cohort_id
FROM courses c
WHERE c.id = t.course_id
  AND t.cohort_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_teams_cohort_id ON teams(cohort_id);

-- ──────────────────────────────────────────────────────────
-- 3. COURSES — decouple from cohorts
--    courses become global templates;
--    cohort_courses is the M:N junction
-- ──────────────────────────────────────────────────────────

-- Junction table: which cohorts are assigned which courses
CREATE TABLE IF NOT EXISTS cohort_courses (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    cohort_id       UUID NOT NULL REFERENCES cohorts(id) ON DELETE CASCADE,
    course_id       UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    assigned_at     TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    assigned_by     UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    UNIQUE(cohort_id, course_id)
);

CREATE INDEX IF NOT EXISTS idx_cohort_courses_cohort   ON cohort_courses(cohort_id);
CREATE INDEX IF NOT EXISTS idx_cohort_courses_course   ON cohort_courses(course_id);

-- Migrate existing course→cohort relationships into the junction
INSERT INTO cohort_courses (organization_id, cohort_id, course_id)
SELECT organization_id, cohort_id, id
FROM courses
WHERE cohort_id IS NOT NULL
ON CONFLICT (cohort_id, course_id) DO NOTHING;

-- Make cohort_id on courses optional (it becomes a legacy column)
-- New code uses cohort_courses instead.
ALTER TABLE courses ALTER COLUMN cohort_id DROP NOT NULL;

-- ──────────────────────────────────────────────────────────
-- 4. TASKS — cohort scoping + multi-assignment
-- ──────────────────────────────────────────────────────────
ALTER TABLE tasks
    ADD COLUMN IF NOT EXISTS cohort_id       UUID REFERENCES cohorts(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS assignment_type assignment_type NOT NULL DEFAULT 'individual';

-- Back-fill cohort_id via the course-to-cohort link
UPDATE tasks t
SET cohort_id = c.cohort_id
FROM courses c
WHERE c.id = t.course_id
  AND t.cohort_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_tasks_cohort_id         ON tasks(cohort_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assignment_type   ON tasks(assignment_type);

-- task_assignments already exists (individual student assignments)
-- Add index on it
CREATE INDEX IF NOT EXISTS idx_task_assignments_task   ON task_assignments(task_id);
CREATE INDEX IF NOT EXISTS idx_task_assignments_user   ON task_assignments(user_id);

-- New: team-level task assignments
CREATE TABLE IF NOT EXISTS task_team_assignments (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    task_id         UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    team_id         UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    assigned_at     TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    assigned_by     UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    UNIQUE(task_id, team_id)
);

CREATE INDEX IF NOT EXISTS idx_task_team_assignments_task ON task_team_assignments(task_id);
CREATE INDEX IF NOT EXISTS idx_task_team_assignments_team ON task_team_assignments(team_id);

-- ──────────────────────────────────────────────────────────
-- 5. SUBMISSIONS — grading columns
-- ──────────────────────────────────────────────────────────
ALTER TABLE submissions
    ADD COLUMN IF NOT EXISTS grade       NUMERIC(5,2),
    ADD COLUMN IF NOT EXISTS feedback    TEXT,
    ADD COLUMN IF NOT EXISTS assessed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS assessed_at TIMESTAMP WITH TIME ZONE;

-- ──────────────────────────────────────────────────────────
-- 6. CHAT ROOMS — add cohort_id for scoping
-- ──────────────────────────────────────────────────────────
ALTER TABLE chat_rooms
    ADD COLUMN IF NOT EXISTS cohort_id UUID REFERENCES cohorts(id) ON DELETE SET NULL;

-- Extend room_type to support 'dm'
ALTER TABLE chat_rooms
    DROP CONSTRAINT IF EXISTS chat_rooms_room_type_check;
ALTER TABLE chat_rooms
    ADD CONSTRAINT chat_rooms_room_type_check
        CHECK (room_type IN ('general','course','team','cohort','dm'));

CREATE INDEX IF NOT EXISTS idx_chat_rooms_cohort_id ON chat_rooms(cohort_id);
CREATE INDEX IF NOT EXISTS idx_chat_rooms_team_id   ON chat_rooms(team_id);

-- ──────────────────────────────────────────────────────────
-- 7. PERFORMANCE INDEXES
-- ──────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_user_cohorts_cohort  ON user_cohorts(cohort_id);
CREATE INDEX IF NOT EXISTS idx_user_cohorts_user    ON user_cohorts(user_id);
CREATE INDEX IF NOT EXISTS idx_submissions_team_id  ON submissions(team_id);

COMMIT;
