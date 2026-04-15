-- ============================================================
-- HubConnect Platform Enhancement Migration
-- Adds constraints, indexes, and columns for the refactor
-- ============================================================

-- 1. Add unique constraint: (user_id, course_id) for team membership
--    A student cannot be in two teams within the same course.
CREATE UNIQUE INDEX IF NOT EXISTS idx_team_members_user_course
    ON team_members (user_id, (
        SELECT course_id FROM teams WHERE teams.id = team_members.team_id
    ));

-- Alternative approach: add course_id to team_members for direct constraint
ALTER TABLE team_members ADD COLUMN IF NOT EXISTS course_id UUID REFERENCES courses(id) ON DELETE CASCADE;

-- Backfill course_id from teams table
UPDATE team_members tm
SET course_id = t.course_id
FROM teams t
WHERE tm.team_id = t.id AND tm.course_id IS NULL;

-- Create the actual unique constraint for (user_id, course_id)
DO $$ BEGIN
    ALTER TABLE team_members ADD CONSTRAINT uq_team_members_user_course UNIQUE (user_id, course_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2. Add is_leader flag to team_members for per-team leadership
ALTER TABLE team_members ADD COLUMN IF NOT EXISTS is_leader BOOLEAN DEFAULT false;

-- Backfill is_leader from teams.team_leader_id
UPDATE team_members tm
SET is_leader = true
FROM teams t
WHERE tm.team_id = t.id AND tm.user_id = t.team_leader_id;

-- 3. Add profile image columns if not exist (avatar_url already exists in profiles)
-- Already in schema: avatar_url VARCHAR(500) on profiles

-- 4. Add resource_type and resource_id to notifications for click routing
-- These columns already exist in init.sql but ensure they're present
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS resource_type VARCHAR(100);
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS resource_id UUID;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS link VARCHAR(500);

-- 5. Indexes for performance
CREATE INDEX IF NOT EXISTS idx_team_members_course_id ON team_members(course_id);
CREATE INDEX IF NOT EXISTS idx_team_members_user_id ON team_members(user_id);
CREATE INDEX IF NOT EXISTS idx_teams_course_id ON teams(course_id);
CREATE INDEX IF NOT EXISTS idx_user_cohorts_cohort_id ON user_cohorts(cohort_id);
CREATE INDEX IF NOT EXISTS idx_user_cohorts_user_id ON user_cohorts(user_id);
CREATE INDEX IF NOT EXISTS idx_courses_cohort_id ON courses(cohort_id);

-- 6. Trigger to enforce single leader per team
CREATE OR REPLACE FUNCTION enforce_single_team_leader()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.is_leader = true THEN
        UPDATE team_members SET is_leader = false
        WHERE team_id = NEW.team_id AND id != NEW.id AND is_leader = true;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_enforce_single_leader ON team_members;
CREATE TRIGGER trg_enforce_single_leader
    BEFORE INSERT OR UPDATE ON team_members
    FOR EACH ROW EXECUTE FUNCTION enforce_single_team_leader();

-- 7. Trigger to auto-populate course_id on team_members insert
CREATE OR REPLACE FUNCTION auto_fill_team_member_course_id()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.course_id IS NULL THEN
        SELECT course_id INTO NEW.course_id FROM teams WHERE id = NEW.team_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_auto_fill_course_id ON team_members;
CREATE TRIGGER trg_auto_fill_course_id
    BEFORE INSERT ON team_members
    FOR EACH ROW EXECUTE FUNCTION auto_fill_team_member_course_id();
