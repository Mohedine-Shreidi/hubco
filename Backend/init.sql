-- ============================================================
-- HubConnect — Standalone PostgreSQL Schema
-- For local development without Supabase.
-- Run:  psql -U postgres -d hubconnect -f init.sql
-- ============================================================

-- Create a minimal auth schema that mirrors Supabase's structure
CREATE SCHEMA IF NOT EXISTS auth;

CREATE TABLE IF NOT EXISTS auth.users (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email       VARCHAR(255) NOT NULL UNIQUE,
    created_at  TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- ENUM TYPES (idempotent)
-- ============================================================
DO $$ BEGIN
    CREATE TYPE course_status      AS ENUM ('active','archived','completed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
    CREATE TYPE task_status        AS ENUM ('pending','in_progress','submitted','accepted','rejected');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
    CREATE TYPE task_priority      AS ENUM ('low','medium','high');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
    CREATE TYPE submission_status  AS ENUM ('pending','submitted','accepted','rejected','revision_requested');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
    CREATE TYPE notification_type  AS ENUM ('task_assigned','task_submitted','task_accepted','task_rejected','team_member_added','course_created','comment_added','message_received');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
    CREATE TYPE notification_status AS ENUM ('unread','read','archived');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================================
-- ORGANIZATIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS organizations (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        VARCHAR(255) NOT NULL,
    slug        VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    logo_url    VARCHAR(500),
    created_at  TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- PROFILES
-- ============================================================
CREATE TABLE IF NOT EXISTS profiles (
    id               UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email            VARCHAR(255) NOT NULL UNIQUE,
    full_name        VARCHAR(255),
    avatar_url       VARCHAR(500),
    phone_number     VARCHAR(20),
    bio              TEXT,
    role             VARCHAR(50)  NOT NULL DEFAULT 'student',
    password_hash    VARCHAR(255),
    reset_token      TEXT,
    reset_token_expires_at TIMESTAMP WITH TIME ZONE,
    theme_preference VARCHAR(50)  DEFAULT 'light',
    notifications_enabled BOOLEAN DEFAULT true,
    created_at       TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at       TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- ORGANIZATION USERS
-- ============================================================
CREATE TABLE IF NOT EXISTS organization_users (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    joined_at       TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(organization_id, user_id)
);

-- ============================================================
-- ROLES
-- ============================================================
CREATE TABLE IF NOT EXISTS roles (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name            VARCHAR(100) NOT NULL,
    is_system_role  BOOLEAN DEFAULT false,
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(organization_id, name)
);

CREATE TABLE IF NOT EXISTS user_roles (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role_id         UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    assigned_at     TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(organization_id, user_id, role_id)
);

-- ============================================================
-- COHORTS
-- ============================================================
CREATE TABLE IF NOT EXISTS cohorts (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name            VARCHAR(255) NOT NULL,
    code            VARCHAR(50),
    start_date      DATE NOT NULL,
    end_date        DATE NOT NULL,
    is_active       BOOLEAN DEFAULT true,
    academic_year   VARCHAR(50),
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT valid_dates CHECK (start_date < end_date)
);

CREATE TABLE IF NOT EXISTS user_cohorts (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    cohort_id       UUID NOT NULL REFERENCES cohorts(id) ON DELETE CASCADE,
    role            VARCHAR(50) DEFAULT 'student',
    joined_at       TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(organization_id, user_id, cohort_id)
);

-- ============================================================
-- COURSES
-- ============================================================
CREATE TABLE IF NOT EXISTS courses (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    cohort_id       UUID NOT NULL REFERENCES cohorts(id) ON DELETE CASCADE,
    name            VARCHAR(255) NOT NULL,
    description     TEXT,
    status          course_status DEFAULT 'active',
    start_date      DATE DEFAULT CURRENT_DATE,
    end_date        DATE,
    created_by      UUID NOT NULL REFERENCES auth.users(id),
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- TEAMS
-- ============================================================
CREATE TABLE IF NOT EXISTS teams (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    course_id       UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    name            VARCHAR(255) NOT NULL,
    description     TEXT,
    team_leader_id  UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    max_members     INT DEFAULT 10,
    created_by      UUID NOT NULL REFERENCES auth.users(id),
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(course_id, name)
);

CREATE TABLE IF NOT EXISTS team_members (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    team_id         UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role            VARCHAR(50) DEFAULT 'student',
    joined_at       TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(team_id, user_id)
);

-- ============================================================
-- TASKS
-- ============================================================
CREATE TABLE IF NOT EXISTS tasks (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    course_id       UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    team_id         UUID REFERENCES teams(id) ON DELETE SET NULL,
    title           VARCHAR(300) NOT NULL,
    description     TEXT,
    status          task_status DEFAULT 'pending',
    priority        task_priority DEFAULT 'medium',
    due_date        DATE NOT NULL,
    github_repo_url VARCHAR(500),
    assignee_id     UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_by      UUID NOT NULL REFERENCES auth.users(id),
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at      TIMESTAMP WITH TIME ZONE,
    CONSTRAINT task_title_not_empty CHECK (length(title) > 0)
);

CREATE TABLE IF NOT EXISTS task_assignments (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    task_id         UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    assigned_at     TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    assigned_by     UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    UNIQUE(task_id, user_id)
);

-- ============================================================
-- SUBMISSIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS submissions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    task_id         UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    team_id         UUID REFERENCES teams(id) ON DELETE SET NULL,
    submitted_by    UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
    status          submission_status DEFAULT 'pending',
    github_link     VARCHAR(500),
    comment         TEXT,
    submitted_at    TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    reviewed_by     UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    reviewed_at     TIMESTAMP WITH TIME ZONE,
    review_comment  TEXT,
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(task_id, team_id, submitted_by)
);

-- ============================================================
-- CHAT ROOMS & MESSAGES
-- ============================================================
CREATE TABLE IF NOT EXISTS chat_rooms (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    room_name       VARCHAR(255) NOT NULL,
    room_type       VARCHAR(50)  NOT NULL
                        CHECK (room_type IN ('general','course','team')),
    course_id       UUID REFERENCES courses(id) ON DELETE SET NULL,
    team_id         UUID REFERENCES teams(id) ON DELETE SET NULL,
    created_by      UUID NOT NULL REFERENCES auth.users(id),
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS messages (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    chat_room_id UUID NOT NULL REFERENCES chat_rooms(id) ON DELETE CASCADE,
    sender_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
    content      TEXT NOT NULL,
    edited_at    TIMESTAMP WITH TIME ZONE,
    deleted_at   TIMESTAMP WITH TIME ZONE,
    created_at   TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT content_not_empty CHECK (length(content) > 0)
);

-- ============================================================
-- NOTIFICATIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS notifications (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id   UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    recipient_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    actor_id          UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    notification_type notification_type NOT NULL,
    status            notification_status DEFAULT 'unread',
    title             VARCHAR(255) NOT NULL,
    message           TEXT,
    resource_type     VARCHAR(100),
    resource_id       UUID,
    link              VARCHAR(500),
    read_at           TIMESTAMP WITH TIME ZONE,
    created_at        TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- ACTIVITY LOGS (Audit Trail)
-- ============================================================
CREATE TABLE IF NOT EXISTS activity_logs (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    actor_id        UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    action          VARCHAR(50) NOT NULL,
    resource_type   VARCHAR(100) NOT NULL,
    resource_id     UUID NOT NULL,
    resource_data   JSONB,
    changes         JSONB,
    ip_address      TEXT,
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- ATTENDANCE (Check-in / Check-out)
-- ============================================================
CREATE TABLE IF NOT EXISTS attendance (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    date            DATE NOT NULL DEFAULT CURRENT_DATE,
    check_in_time   TIMESTAMP WITH TIME ZONE,
    check_out_time  TIMESTAMP WITH TIME ZONE,
    status          VARCHAR(50) DEFAULT 'present',
    notes           TEXT,
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, date)
);

-- ============================================================
-- FILES (Metadata — actual blobs stored in S3/Supabase Storage)
-- ============================================================
CREATE TABLE IF NOT EXISTS files (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    bucket_id       VARCHAR(100) NOT NULL DEFAULT 'default',
    file_path       VARCHAR(1000) NOT NULL,
    file_name       VARCHAR(500) NOT NULL,
    file_size       BIGINT,
    mime_type       VARCHAR(100),
    storage_url     VARCHAR(1000),
    uploaded_by     UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
    resource_type   VARCHAR(100),
    resource_id     UUID,
    is_public       BOOLEAN DEFAULT false,
    file_metadata   JSONB DEFAULT '{}'::jsonb,
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at      TIMESTAMP WITH TIME ZONE,
    UNIQUE(bucket_id, file_path)
);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_profiles_email          ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_tasks_course_id         ON tasks(course_id);
CREATE INDEX IF NOT EXISTS idx_tasks_team_id           ON tasks(team_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status            ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date          ON tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_submissions_task_id     ON submissions(task_id);
CREATE INDEX IF NOT EXISTS idx_submissions_submitted_by ON submissions(submitted_by);
CREATE INDEX IF NOT EXISTS idx_messages_room_created   ON messages(chat_room_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON notifications(recipient_id, status);
CREATE INDEX IF NOT EXISTS idx_attendance_user_date    ON attendance(user_id, date);
CREATE INDEX IF NOT EXISTS idx_activity_logs_resource  ON activity_logs(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_files_uploaded_by       ON files(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_files_resource          ON files(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_files_org               ON files(organization_id);
