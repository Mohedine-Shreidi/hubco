-- ============================================
-- HubConnect Database Schema for Supabase
-- Production-Grade Architecture
-- ============================================

-- ============================================
-- 1. ENUM TYPES
-- ============================================

CREATE TYPE user_role_type AS ENUM ('admin', 'instructor', 'student');
CREATE TYPE course_status AS ENUM ('active', 'archived', 'completed');
CREATE TYPE task_status AS ENUM ('pending', 'in_progress', 'submitted', 'accepted', 'rejected');
CREATE TYPE task_priority AS ENUM ('low', 'medium', 'high');
CREATE TYPE submission_status AS ENUM ('pending', 'submitted', 'accepted', 'rejected', 'revision_requested');
CREATE TYPE notification_type AS ENUM ('task_assigned', 'task_submitted', 'task_accepted', 'task_rejected', 'team_member_added', 'course_created', 'comment_added', 'message_received');
CREATE TYPE notification_status AS ENUM ('unread', 'read', 'archived');
CREATE TYPE activity_action AS ENUM ('create', 'update', 'delete', 'restore', 'submit', 'accept', 'reject');

-- ============================================
-- 2. ORGANIZATIONS (Multi-Tenancy)
-- ============================================

CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    website VARCHAR(255),
    logo_url VARCHAR(500),
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    deleted_at TIMESTAMP WITH TIME ZONE,
    
    CONSTRAINT org_slug_valid CHECK (slug ~ '^[a-z0-9-]{3,}$')
);

CREATE INDEX idx_organizations_slug ON organizations(slug);
CREATE INDEX idx_organizations_created_at ON organizations(created_at DESC);

-- ============================================
-- 3. PROFILES (Link to Supabase Auth)
-- ============================================

CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL UNIQUE,
    full_name VARCHAR(255),
    avatar_url VARCHAR(500),
    phone_number VARCHAR(20),
    bio TEXT,
    role VARCHAR(50) NOT NULL DEFAULT 'student',
    password_hash VARCHAR(255),
    reset_token TEXT,
    reset_token_expires_at TIMESTAMP WITH TIME ZONE,
    theme_preference VARCHAR(50) DEFAULT 'light',
    notifications_enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_profiles_email ON profiles(email);

-- ============================================
-- 4. ORGANIZATION USERS (Many-to-Many)
-- ============================================

CREATE TABLE organization_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    invited_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    invitation_accepted_at TIMESTAMP WITH TIME ZONE,
    invitation_token VARCHAR(255) UNIQUE,
    invitation_expires_at TIMESTAMP WITH TIME ZONE,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    deleted_at TIMESTAMP WITH TIME ZONE,
    
    UNIQUE(organization_id, user_id)
);

CREATE INDEX idx_organization_users_org_id ON organization_users(organization_id);
CREATE INDEX idx_organization_users_user_id ON organization_users(user_id);
CREATE INDEX idx_organization_users_invited_token ON organization_users(invitation_token) WHERE invitation_token IS NOT NULL;

-- ============================================
-- 5. ROLES & PERMISSIONS (RBAC)
-- ============================================

CREATE TABLE roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    is_system_role BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    deleted_at TIMESTAMP WITH TIME ZONE,
    
    UNIQUE(organization_id, name)
);

CREATE INDEX idx_roles_organization_id ON roles(organization_id);

CREATE TABLE permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    resource VARCHAR(100) NOT NULL,
    action VARCHAR(50) NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(resource, action)
);

CREATE TABLE role_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(role_id, permission_id)
);

CREATE INDEX idx_role_permissions_role_id ON role_permissions(role_id);
CREATE INDEX idx_role_permissions_permission_id ON role_permissions(permission_id);

CREATE TABLE user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    assigned_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    deleted_at TIMESTAMP WITH TIME ZONE,
    
    UNIQUE(organization_id, user_id, role_id)
);

CREATE INDEX idx_user_roles_org_user ON user_roles(organization_id, user_id);
CREATE INDEX idx_user_roles_role_id ON user_roles(role_id);

-- ============================================
-- 6. COHORTS
-- ============================================

CREATE TABLE cohorts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    is_active BOOLEAN DEFAULT true,
    academic_year VARCHAR(50),
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    deleted_at TIMESTAMP WITH TIME ZONE,
    
    CONSTRAINT valid_dates CHECK (start_date < end_date)
);

CREATE INDEX idx_cohorts_org_id ON cohorts(organization_id);
CREATE INDEX idx_cohorts_is_active ON cohorts(is_active);
CREATE INDEX idx_cohorts_date_range ON cohorts(start_date, end_date);

CREATE TABLE user_cohorts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    cohort_id UUID NOT NULL REFERENCES cohorts(id) ON DELETE CASCADE,
    role VARCHAR(50) DEFAULT 'student',
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    deleted_at TIMESTAMP WITH TIME ZONE,
    
    UNIQUE(organization_id, user_id, cohort_id)
);

CREATE INDEX idx_user_cohorts_org_user ON user_cohorts(organization_id, user_id);
CREATE INDEX idx_user_cohorts_cohort_id ON user_cohorts(cohort_id);

-- ============================================
-- 7. COURSES
-- ============================================

CREATE TABLE courses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    cohort_id UUID REFERENCES cohorts(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    status course_status DEFAULT 'active',
    start_date DATE DEFAULT CURRENT_DATE,
    end_date DATE,
    max_team_leaders INT DEFAULT 5,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    deleted_at TIMESTAMP WITH TIME ZONE,
    
    CONSTRAINT valid_course_dates CHECK (COALESCE(end_date, CURRENT_DATE) >= start_date)
);

CREATE INDEX idx_courses_org_id ON courses(organization_id);
CREATE INDEX idx_courses_cohort_id ON courses(cohort_id);
CREATE INDEX idx_courses_status ON courses(status);
CREATE INDEX idx_courses_created_at ON courses(created_at DESC);
CREATE INDEX idx_courses_org_status ON courses(organization_id, status);

-- ============================================
-- 7b. COHORT_COURSES (M:N junction — global course templates)
-- ============================================

CREATE TABLE cohort_courses (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    cohort_id       UUID NOT NULL REFERENCES cohorts(id) ON DELETE CASCADE,
    course_id       UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    assigned_at     TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    assigned_by     UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    UNIQUE(cohort_id, course_id)
);

CREATE INDEX idx_cohort_courses_cohort  ON cohort_courses(cohort_id);
CREATE INDEX idx_cohort_courses_course  ON cohort_courses(course_id);
CREATE INDEX idx_cohort_courses_org_id  ON cohort_courses(organization_id);

-- Migrate any existing course→cohort relationships into the junction
INSERT INTO cohort_courses (organization_id, cohort_id, course_id)
SELECT organization_id, cohort_id, id
FROM courses
WHERE cohort_id IS NOT NULL
ON CONFLICT (cohort_id, course_id) DO NOTHING;

-- ============================================
-- 8. TEAMS
-- ============================================

CREATE TABLE teams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    cohort_id UUID REFERENCES cohorts(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    team_leader_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    assigned_at TIMESTAMP WITH TIME ZONE,
    max_members INT DEFAULT 10,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    deleted_at TIMESTAMP WITH TIME ZONE,
    
    UNIQUE(course_id, name)
);

CREATE INDEX idx_teams_org_id ON teams(organization_id);
CREATE INDEX idx_teams_course_id ON teams(course_id);
CREATE INDEX idx_teams_team_leader_id ON teams(team_leader_id);
CREATE INDEX idx_teams_org_course ON teams(organization_id, course_id);
CREATE INDEX idx_teams_cohort_id ON teams(cohort_id);

CREATE TABLE team_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role VARCHAR(50) DEFAULT 'student',
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    deleted_at TIMESTAMP WITH TIME ZONE,
    
    UNIQUE(team_id, user_id)
);

CREATE INDEX idx_team_members_org_id ON team_members(organization_id);
CREATE INDEX idx_team_members_team_id ON team_members(team_id);
CREATE INDEX idx_team_members_user_id ON team_members(user_id);
CREATE INDEX idx_team_members_role ON team_members(role);

-- ============================================
-- 9. TASKS
-- ============================================

CREATE TABLE tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    team_id UUID REFERENCES teams(id) ON DELETE SET NULL,
    title VARCHAR(300) NOT NULL,
    description TEXT,
    status task_status DEFAULT 'pending',
    priority task_priority DEFAULT 'medium',
    due_date DATE NOT NULL,
    github_repo_url VARCHAR(500),
    assignee_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    cohort_id UUID REFERENCES cohorts(id) ON DELETE SET NULL,
    assignment_type VARCHAR(50) NOT NULL DEFAULT 'individual',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    deleted_at TIMESTAMP WITH TIME ZONE,
    metadata JSONB DEFAULT '{}'::jsonb,
    
    CONSTRAINT task_title_not_empty CHECK (length(title) > 0)
);

CREATE INDEX idx_tasks_org_id ON tasks(organization_id);
CREATE INDEX idx_tasks_course_id ON tasks(course_id);
CREATE INDEX idx_tasks_team_id ON tasks(team_id);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_assignee_id ON tasks(assignee_id);
CREATE INDEX idx_tasks_due_date ON tasks(due_date);
CREATE INDEX idx_tasks_org_course ON tasks(organization_id, course_id);
CREATE INDEX idx_tasks_cohort_id ON tasks(cohort_id);
CREATE INDEX idx_tasks_assignment_type ON tasks(assignment_type);
CREATE INDEX idx_tasks_course_status ON tasks(course_id, status);

CREATE TABLE task_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    assigned_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    deleted_at TIMESTAMP WITH TIME ZONE,
    
    UNIQUE(task_id, user_id)
);

CREATE INDEX idx_task_assignments_task_id ON task_assignments(task_id);
CREATE INDEX idx_task_assignments_user_id ON task_assignments(user_id);
CREATE INDEX idx_task_assignments_org_id ON task_assignments(organization_id);

-- ============================================
-- 9b. TASK_TEAM_ASSIGNMENTS (team-level task assignment)
-- ============================================

CREATE TABLE task_team_assignments (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    task_id         UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    team_id         UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    assigned_at     TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    assigned_by     UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    UNIQUE(task_id, team_id)
);

CREATE INDEX idx_task_team_assignments_task ON task_team_assignments(task_id);
CREATE INDEX idx_task_team_assignments_team ON task_team_assignments(team_id);
CREATE INDEX idx_task_team_assignments_org  ON task_team_assignments(organization_id);

-- ============================================
-- 10. SUBMISSIONS
-- ============================================

CREATE TABLE submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    team_id UUID REFERENCES teams(id) ON DELETE SET NULL,
    submitted_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
    status submission_status DEFAULT 'pending',
    github_link VARCHAR(500),
    comment TEXT,
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMP WITH TIME ZONE,
    review_comment TEXT,
    grade NUMERIC(5,2),
    feedback TEXT,
    assessed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    assessed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    deleted_at TIMESTAMP WITH TIME ZONE,
    metadata JSONB DEFAULT '{}'::jsonb,
    
    UNIQUE(task_id, team_id, submitted_by)
);

CREATE INDEX idx_submissions_org_id ON submissions(organization_id);
CREATE INDEX idx_submissions_task_id ON submissions(task_id);
CREATE INDEX idx_submissions_team_id ON submissions(team_id);
CREATE INDEX idx_submissions_submitted_by ON submissions(submitted_by);
CREATE INDEX idx_submissions_status ON submissions(status);
CREATE INDEX idx_submissions_submitted_at ON submissions(submitted_at DESC);

CREATE TABLE submission_files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    submission_id UUID NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
    file_id UUID NOT NULL REFERENCES storage.objects(id) ON DELETE CASCADE,
    file_name VARCHAR(500) NOT NULL,
    file_size BIGINT,
    mime_type VARCHAR(100),
    upload_path VARCHAR(500),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_submission_files_submission_id ON submission_files(submission_id);
CREATE INDEX idx_submission_files_org_id ON submission_files(organization_id);

-- ============================================
-- 11. CHAT & MESSAGES
-- ============================================

CREATE TABLE chat_rooms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    room_name VARCHAR(255) NOT NULL,
    room_type VARCHAR(50) NOT NULL,
    course_id UUID REFERENCES courses(id) ON DELETE SET NULL,
    team_id UUID REFERENCES teams(id) ON DELETE SET NULL,
    cohort_id UUID REFERENCES cohorts(id) ON DELETE SET NULL,
    dm_participant_ids UUID[] DEFAULT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    deleted_at TIMESTAMP WITH TIME ZONE,
    
    CONSTRAINT valid_room_type CHECK (room_type IN ('general', 'course', 'team', 'cohort', 'dm')),
    CONSTRAINT room_context CHECK (
        (room_type = 'general' AND course_id IS NULL AND team_id IS NULL) OR
        (room_type = 'course'  AND course_id IS NOT NULL AND team_id IS NULL) OR
        (room_type = 'team'    AND course_id IS NOT NULL AND team_id IS NOT NULL) OR
        (room_type = 'cohort'  AND cohort_id IS NOT NULL) OR
        (room_type = 'dm')
    )
);

CREATE INDEX idx_chat_rooms_org_id ON chat_rooms(organization_id);
CREATE INDEX idx_chat_rooms_course_id ON chat_rooms(course_id);
CREATE INDEX idx_chat_rooms_team_id ON chat_rooms(team_id);
CREATE INDEX idx_chat_rooms_room_type ON chat_rooms(room_type);
CREATE INDEX idx_chat_rooms_cohort_id ON chat_rooms(cohort_id);
CREATE UNIQUE INDEX idx_chat_rooms_dm_participants ON chat_rooms (dm_participant_ids) WHERE room_type = 'dm';
CREATE INDEX idx_chat_rooms_dm_lookup ON chat_rooms USING GIN (dm_participant_ids) WHERE room_type = 'dm';

CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    chat_room_id UUID NOT NULL REFERENCES chat_rooms(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
    content TEXT NOT NULL,
    editing_history JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    edited_at TIMESTAMP WITH TIME ZONE,
    deleted_at TIMESTAMP WITH TIME ZONE,
    
    CONSTRAINT content_not_empty CHECK (length(content) > 0)
);

CREATE INDEX idx_messages_org_id ON messages(organization_id);
CREATE INDEX idx_messages_chat_room_id ON messages(chat_room_id);
CREATE INDEX idx_messages_sender_id ON messages(sender_id);
CREATE INDEX idx_messages_created_at ON messages(created_at DESC);
CREATE INDEX idx_messages_room_created ON messages(chat_room_id, created_at DESC);

-- ============================================
-- 12. NOTIFICATIONS
-- ============================================

CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    recipient_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    notification_type notification_type NOT NULL,
    status notification_status DEFAULT 'unread',
    title VARCHAR(255) NOT NULL,
    message TEXT,
    resource_type VARCHAR(100),
    resource_id UUID,
    link VARCHAR(500),
    read_at TIMESTAMP WITH TIME ZONE,
    archived_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    deleted_at TIMESTAMP WITH TIME ZONE,
    metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX idx_notifications_recipient_id ON notifications(recipient_id);
CREATE INDEX idx_notifications_org_recipient ON notifications(organization_id, recipient_id);
CREATE INDEX idx_notifications_status ON notifications(status);
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX idx_notifications_resource ON notifications(resource_type, resource_id);

CREATE TABLE notification_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    notification_type notification_type NOT NULL,
    enabled BOOLEAN DEFAULT true,
    email_enabled BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(organization_id, user_id, notification_type)
);

-- ============================================
-- 13. ACTIVITY LOGS (Audit Trail)
-- ============================================

CREATE TABLE activity_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    action activity_action NOT NULL,
    resource_type VARCHAR(100) NOT NULL,
    resource_id UUID NOT NULL,
    resource_data JSONB,
    changes JSONB,
    country VARCHAR(100),
    ip_address INET,
    user_agent TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
COMMENT ON COLUMN activity_logs.changes IS $$JSON object showing before/after field values:{"field_name": {"old": value, "new": value}}$$;

CREATE INDEX idx_activity_logs_org_id ON activity_logs(organization_id);
CREATE INDEX idx_activity_logs_actor_id ON activity_logs(actor_id);
CREATE INDEX idx_activity_logs_resource ON activity_logs(resource_type, resource_id);
CREATE INDEX idx_activity_logs_created_at ON activity_logs(created_at DESC);
CREATE INDEX idx_activity_logs_org_actor_created ON activity_logs(organization_id, actor_id, created_at DESC);

-- ============================================
-- 14. FILE MANAGEMENT
-- ============================================

CREATE TABLE files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    bucket_id VARCHAR(100) NOT NULL,
    file_path VARCHAR(1000) NOT NULL,
    file_name VARCHAR(500) NOT NULL,
    file_size BIGINT,
    mime_type VARCHAR(100),
    storage_url VARCHAR(1000),
    uploaded_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
    resource_type VARCHAR(100),
    resource_id UUID,
    is_public BOOLEAN DEFAULT false,
    file_metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE,
    
    UNIQUE(bucket_id, file_path)
);

CREATE INDEX idx_files_org_id ON files(organization_id);
CREATE INDEX idx_files_uploaded_by ON files(uploaded_by);
CREATE INDEX idx_files_resource ON files(resource_type, resource_id);
CREATE INDEX idx_files_bucket_path ON files(bucket_id, file_path);

-- ============================================
-- 15. ANALYTICS & SNAPSHOTS
-- ============================================

CREATE TABLE task_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    snapshot_date DATE DEFAULT CURRENT_DATE,
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    total_tasks INT DEFAULT 0,
    completed_tasks INT DEFAULT 0,
    submitted_tasks INT DEFAULT 0,
    pending_tasks INT DEFAULT 0,
    on_time_submissions INT DEFAULT 0,
    late_submissions INT DEFAULT 0,
    team_performance JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(organization_id, course_id, snapshot_date)
);

CREATE INDEX idx_task_analytics_org_id ON task_analytics(organization_id);
CREATE INDEX idx_task_analytics_course_id ON task_analytics(course_id);
CREATE INDEX idx_task_analytics_snapshot_date ON task_analytics(snapshot_date DESC);

-- ============================================
-- TRIGGERS & FUNCTIONS
-- ============================================

-- Function: Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function: Auto-update updated_by
CREATE OR REPLACE FUNCTION update_updated_by()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_by = auth.uid();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function: Set created_by on insert (only if not explicitly provided)
CREATE OR REPLACE FUNCTION set_created_by()
RETURNS TRIGGER AS $$
BEGIN
    NEW.created_by = COALESCE(NEW.created_by, auth.uid());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function: Log activity
CREATE OR REPLACE FUNCTION log_activity()
RETURNS TRIGGER AS $$
DECLARE
    v_changes JSONB := '{}'::jsonb;
    v_old_record JSONB;
    v_new_record JSONB;
    v_key TEXT;
BEGIN
    -- Convert records to JSONB
    v_old_record := to_jsonb(OLD);
    v_new_record := to_jsonb(NEW);
    
    -- Build changes object
    FOR v_key IN SELECT jsonb_object_keys(v_new_record) LOOP
        IF COALESCE(v_old_record ->> v_key, '') != COALESCE(v_new_record ->> v_key, '') THEN
            v_changes := v_changes || jsonb_build_object(
                v_key, 
                jsonb_build_object('old', v_old_record ->> v_key, 'new', v_new_record ->> v_key)
            );
        END IF;
    END LOOP;
    
    INSERT INTO activity_logs (
        organization_id,
        actor_id,
        action,
        resource_type,
        resource_id,
        resource_data,
        changes
    ) VALUES (
        NEW.organization_id,
        auth.uid(),
        TG_ARGV[0]::activity_action,
        TG_ARGV[1],
        NEW.id,
        v_new_record,
        v_changes
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply update_updated_at trigger to all tables with updated_at
CREATE TRIGGER update_organizations_updated_at BEFORE UPDATE ON organizations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_organization_users_updated_at BEFORE UPDATE ON organization_users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_roles_updated_at BEFORE UPDATE ON roles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_roles_updated_at BEFORE UPDATE ON user_roles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_cohorts_updated_at BEFORE UPDATE ON cohorts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_cohorts_updated_at BEFORE UPDATE ON user_cohorts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_courses_updated_at BEFORE UPDATE ON courses
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_teams_updated_at BEFORE UPDATE ON teams
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_team_members_updated_at BEFORE UPDATE ON team_members
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON tasks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_task_assignments_updated_at BEFORE UPDATE ON task_assignments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_submissions_updated_at BEFORE UPDATE ON submissions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_submission_files_updated_at BEFORE UPDATE ON submission_files
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_chat_rooms_updated_at BEFORE UPDATE ON chat_rooms
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_messages_updated_at BEFORE UPDATE ON messages
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_notifications_updated_at BEFORE UPDATE ON notifications
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_files_updated_at BEFORE UPDATE ON files
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Apply created_by trigger to all tables
CREATE TRIGGER set_organizations_created_by BEFORE INSERT ON organizations
    FOR EACH ROW EXECUTE FUNCTION set_created_by();

CREATE TRIGGER set_organization_users_created_by BEFORE INSERT ON organization_users
    FOR EACH ROW EXECUTE FUNCTION set_created_by();

CREATE TRIGGER set_roles_created_by BEFORE INSERT ON roles
    FOR EACH ROW EXECUTE FUNCTION set_created_by();

CREATE TRIGGER set_user_roles_created_by BEFORE INSERT ON user_roles
    FOR EACH ROW EXECUTE FUNCTION set_created_by();

CREATE TRIGGER set_cohorts_created_by BEFORE INSERT ON cohorts
    FOR EACH ROW EXECUTE FUNCTION set_created_by();

CREATE TRIGGER set_user_cohorts_created_by BEFORE INSERT ON user_cohorts
    FOR EACH ROW EXECUTE FUNCTION set_created_by();

CREATE TRIGGER set_courses_created_by BEFORE INSERT ON courses
    FOR EACH ROW EXECUTE FUNCTION set_created_by();

CREATE TRIGGER set_teams_created_by BEFORE INSERT ON teams
    FOR EACH ROW EXECUTE FUNCTION set_created_by();

CREATE TRIGGER set_team_members_created_by BEFORE INSERT ON team_members
    FOR EACH ROW EXECUTE FUNCTION set_created_by();

CREATE TRIGGER set_tasks_created_by BEFORE INSERT ON tasks
    FOR EACH ROW EXECUTE FUNCTION set_created_by();

CREATE TRIGGER set_task_assignments_created_by BEFORE INSERT ON task_assignments
    FOR EACH ROW EXECUTE FUNCTION set_created_by();

CREATE TRIGGER set_submissions_created_by BEFORE INSERT ON submissions
    FOR EACH ROW EXECUTE FUNCTION set_created_by();

CREATE TRIGGER set_submission_files_created_by BEFORE INSERT ON submission_files
    FOR EACH ROW EXECUTE FUNCTION set_created_by();

CREATE TRIGGER set_chat_rooms_created_by BEFORE INSERT ON chat_rooms
    FOR EACH ROW EXECUTE FUNCTION set_created_by();

-- messages uses sender_id instead of created_by — no trigger needed

CREATE TRIGGER set_notifications_created_by BEFORE INSERT ON notifications
    FOR EACH ROW EXECUTE FUNCTION set_created_by();

CREATE TRIGGER set_files_created_by BEFORE INSERT ON files
    FOR EACH ROW EXECUTE FUNCTION set_created_by();

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- ============================================
-- RLS HELPER FUNCTIONS
-- These are used inside RLS policies below.
-- All are SECURITY DEFINER so they can read RLS-protected tables.
-- ============================================

CREATE OR REPLACE FUNCTION current_user_id()
RETURNS UUID
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
    SELECT auth.uid();
$$;

CREATE OR REPLACE FUNCTION current_user_role()
RETURNS TEXT
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
    SELECT role FROM profiles WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid() AND role = 'admin' AND deleted_at IS NULL
    );
$$;

CREATE OR REPLACE FUNCTION is_instructor()
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid() AND role = 'instructor' AND deleted_at IS NULL
    );
$$;

CREATE OR REPLACE FUNCTION current_cohort_ids()
RETURNS UUID[]
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
    SELECT COALESCE(
        ARRAY(SELECT cohort_id FROM user_cohorts WHERE user_id = auth.uid() AND deleted_at IS NULL),
        '{}'::uuid[]
    );
$$;

-- Enable RLS on all tables
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE cohorts ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_cohorts ENABLE ROW LEVEL SECURITY;
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE submission_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE files ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_analytics ENABLE ROW LEVEL SECURITY;

-- ============================================
-- POLICIES: PROFILES
-- ============================================

-- Users can read their own profile
CREATE POLICY "Users can read their own profile" ON profiles
    FOR SELECT USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update their own profile" ON profiles
    FOR UPDATE USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- Admins can read all profiles in their organization
CREATE POLICY "Org admins can read all profiles" ON profiles
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM user_roles
            WHERE user_roles.user_id = auth.uid()
            AND user_roles.role_id IN (
                SELECT id FROM roles WHERE name = 'admin'
            )
        )
    );

-- Instructors can read profiles of students/instructors in their cohorts
CREATE POLICY "Instructors can read cohort profiles" ON profiles
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM user_cohorts uc_viewer
            JOIN user_cohorts uc_target ON uc_target.cohort_id = uc_viewer.cohort_id
            WHERE uc_viewer.user_id = auth.uid()
              AND uc_target.user_id = profiles.id
              AND uc_viewer.deleted_at IS NULL
              AND uc_target.deleted_at IS NULL
        )
        AND EXISTS (
            SELECT 1 FROM profiles viewer
            WHERE viewer.id = auth.uid() AND viewer.role = 'instructor'
        )
    );

-- ============================================
-- POLICIES: ORGANIZATION_USERS
-- ============================================

-- Users can see organizations they belong to
CREATE POLICY "Users can view their membership" ON organization_users
    FOR SELECT USING (
        user_id = auth.uid()
        OR
        EXISTS (
            SELECT 1 FROM user_roles
            WHERE user_roles.organization_id = organization_users.organization_id
            AND user_roles.user_id = auth.uid()
            AND user_roles.role_id IN (
                SELECT id FROM roles WHERE name IN ('admin', 'instructor')
            )
        )
    );

-- Admins can manage organization users
CREATE POLICY "Admins can manage organization users" ON organization_users
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_roles
            WHERE user_roles.organization_id = organization_users.organization_id
            AND user_roles.user_id = auth.uid()
            AND user_roles.role_id IN (
                SELECT id FROM roles WHERE name = 'admin'
            )
        )
    );

-- ============================================
-- POLICIES: COURSES
-- ============================================

-- Users can view courses they belong to
CREATE POLICY "Users can view their courses" ON courses
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM organization_users
            WHERE organization_users.organization_id = courses.organization_id
            AND organization_users.user_id = auth.uid()
        )
    );

-- Team leaders can view their courses
CREATE POLICY "Team leaders can view assigned courses" ON courses
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM teams
            WHERE teams.course_id = courses.id
            AND teams.team_leader_id = auth.uid()
        )
    );

-- Only admins and instructors can create courses
CREATE POLICY "Only admins and instructors can create courses" ON courses
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM user_roles
            WHERE user_roles.organization_id = courses.organization_id
            AND user_roles.user_id = auth.uid()
            AND user_roles.role_id IN (
                SELECT id FROM roles WHERE name IN ('admin', 'instructor')
            )
        )
    );

-- Only admins and instructors can update/delete courses
CREATE POLICY "Only admins and instructors can update courses" ON courses
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM user_roles
            WHERE user_roles.organization_id = courses.organization_id
            AND user_roles.user_id = auth.uid()
            AND user_roles.role_id IN (
                SELECT id FROM roles WHERE name IN ('admin', 'instructor')
            )
        )
    );

-- ============================================
-- POLICIES: TEAMS
-- ============================================

-- Users can view teams in their courses
CREATE POLICY "Users can view teams in their courses" ON teams
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM organization_users
            WHERE organization_users.organization_id = teams.organization_id
            AND organization_users.user_id = auth.uid()
        )
    );

-- Only team members can view team details
CREATE POLICY "Team members can view their team" ON teams
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM team_members
            WHERE team_members.team_id = teams.id
            AND team_members.user_id = auth.uid()
        )
    );

-- ============================================
-- POLICIES: TEAM_MEMBERS
-- ============================================

-- Users can view team members in their teams
CREATE POLICY "Users can view their team members" ON team_members
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM team_members member
            WHERE member.team_id = team_members.team_id
            AND member.user_id = auth.uid()
        )
    );

-- Team leaders can manage team members
CREATE POLICY "Team leaders can manage team members" ON team_members
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM teams
            WHERE teams.id = team_members.team_id
            AND teams.team_leader_id = auth.uid()
        )
    );

-- ============================================
-- POLICIES: TASKS
-- ============================================

-- Users can view tasks assigned to them or their team
CREATE POLICY "Users can view assigned tasks" ON tasks
    FOR SELECT USING (
        assignee_id = auth.uid()
        OR
        EXISTS (
            SELECT 1 FROM team_members
            WHERE team_members.team_id = tasks.team_id
            AND team_members.user_id = auth.uid()
        )
        OR
        EXISTS (
            SELECT 1 FROM task_assignments
            WHERE task_assignments.task_id = tasks.id
            AND task_assignments.user_id = auth.uid()
        )
        OR
        EXISTS (
            SELECT 1 FROM user_roles
            WHERE user_roles.organization_id = tasks.organization_id
            AND user_roles.user_id = auth.uid()
            AND user_roles.role_id IN (
                SELECT id FROM roles WHERE name IN ('admin', 'instructor')
            )
        )
    );

-- Only instructors and admins can create tasks
CREATE POLICY "Only instructors and admins can create tasks" ON tasks
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM user_roles
            WHERE user_roles.organization_id = tasks.organization_id
            AND user_roles.user_id = auth.uid()
            AND user_roles.role_id IN (
                SELECT id FROM roles WHERE name IN ('admin', 'instructor')
            )
        )
    );

-- Team leaders can create tasks in their course
CREATE POLICY "Team leaders can create tasks in their course" ON tasks
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM teams
            WHERE teams.course_id = tasks.course_id
            AND teams.team_leader_id = auth.uid()
        )
    );

-- ============================================
-- POLICIES: SUBMISSIONS
-- ============================================

-- Users can view their own submissions
CREATE POLICY "Users can view their submissions" ON submissions
    FOR SELECT USING (
        submitted_by = auth.uid()
        OR
        EXISTS (
            SELECT 1 FROM user_roles
            WHERE user_roles.organization_id = submissions.organization_id
            AND user_roles.user_id = auth.uid()
            AND user_roles.role_id IN (
                SELECT id FROM roles WHERE name IN ('admin', 'instructor')
            )
        )
    );

-- Users can submit tasks assigned to them
CREATE POLICY "Users can submit their tasks" ON submissions
    FOR INSERT WITH CHECK (
        submitted_by = auth.uid()
        OR
        EXISTS (
            SELECT 1 FROM teams
            WHERE teams.id = submissions.team_id
            AND teams.team_leader_id = auth.uid()
        )
    );

-- ============================================
-- POLICIES: CHAT_ROOMS
-- ============================================

-- Users can view chat rooms in their organization
CREATE POLICY "Users can view chat rooms" ON chat_rooms
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM organization_users
            WHERE organization_users.organization_id = chat_rooms.organization_id
            AND organization_users.user_id = auth.uid()
        )
    );

-- Users can only view course chat if in course
CREATE POLICY "Users can view course chat rooms" ON chat_rooms
    FOR SELECT USING (
        room_type = 'general'
        OR (
            room_type = 'course'
            AND EXISTS (
                SELECT 1 FROM organization_users
                WHERE organization_users.organization_id = chat_rooms.organization_id
                AND organization_users.user_id = auth.uid()
            )
        )
        OR (
            room_type = 'team'
            AND EXISTS (
                SELECT 1 FROM team_members
                WHERE team_members.team_id = chat_rooms.team_id
                AND team_members.user_id = auth.uid()
            )
        )
    );

-- ============================================
-- POLICIES: MESSAGES
-- ============================================

-- Users can view messages from accessible chat rooms
CREATE POLICY "Users can view messages in accessible rooms" ON messages
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM chat_rooms
            WHERE chat_rooms.id = messages.chat_room_id
            AND (
                -- General rooms: any authenticated user
                chat_rooms.room_type = 'general'
                -- DM rooms: only participants
                OR (
                    chat_rooms.room_type = 'dm'
                    AND auth.uid() = ANY(chat_rooms.dm_participant_ids)
                )
                -- Cohort rooms: user belongs to the cohort
                OR (
                    chat_rooms.room_type = 'cohort'
                    AND chat_rooms.cohort_id IN (
                        SELECT cohort_id FROM user_cohorts
                        WHERE user_id = auth.uid() AND deleted_at IS NULL
                    )
                )
                -- Team rooms: must be a team member OR instructor of that cohort
                OR (
                    chat_rooms.room_type IN ('team', 'course')
                    AND (
                        EXISTS (
                            SELECT 1 FROM team_members
                            WHERE team_members.team_id = chat_rooms.team_id
                            AND team_members.user_id = auth.uid()
                        )
                        OR (
                            is_admin()
                        )
                        OR (
                            is_instructor()
                            AND chat_rooms.cohort_id IN (
                                SELECT cohort_id FROM user_cohorts
                                WHERE user_id = auth.uid() AND deleted_at IS NULL
                            )
                        )
                    )
                )
            )
        )
    );

-- Users can create messages in accessible rooms
CREATE POLICY "Users can create messages in accessible rooms" ON messages
    FOR INSERT WITH CHECK (
        sender_id = auth.uid()
        AND EXISTS (
            SELECT 1 FROM chat_rooms
            WHERE chat_rooms.id = messages.chat_room_id
            AND messages.organization_id = chat_rooms.organization_id
        )
    );

-- Users can edit their own messages
CREATE POLICY "Users can edit their own messages" ON messages
    FOR UPDATE USING (sender_id = auth.uid())
    WITH CHECK (sender_id = auth.uid());

-- ============================================
-- POLICIES: NOTIFICATIONS
-- ============================================

-- Users can view their own notifications
CREATE POLICY "Users can view their notifications" ON notifications
    FOR SELECT USING (recipient_id = auth.uid());

-- Users can update their own notifications
CREATE POLICY "Users can update their notifications" ON notifications
    FOR UPDATE USING (recipient_id = auth.uid())
    WITH CHECK (recipient_id = auth.uid());

-- ============================================
-- POLICIES: FILES
-- ============================================

-- Users can view files they uploaded
CREATE POLICY "Users can view their uploaded files" ON files
    FOR SELECT USING (
        uploaded_by = auth.uid()
        OR
        EXISTS (
            SELECT 1 FROM user_roles
            WHERE user_roles.organization_id = files.organization_id
            AND user_roles.user_id = auth.uid()
            AND user_roles.role_id IN (
                SELECT id FROM roles WHERE name IN ('admin', 'instructor')
            )
        )
    );

-- Users can upload files
CREATE POLICY "Users can upload files" ON files
    FOR INSERT WITH CHECK (uploaded_by = auth.uid());

-- ============================================
-- POLICIES: ACTIVITY_LOGS (read-only)
-- ============================================

-- Admins can view activity logs in their organization
CREATE POLICY "Admins can view activity logs" ON activity_logs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM user_roles
            WHERE user_roles.organization_id = activity_logs.organization_id
            AND user_roles.user_id = auth.uid()
            AND user_roles.role_id IN (
                SELECT id FROM roles WHERE name = 'admin'
            )
        )
    );

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Function: Check if user is admin in organization
CREATE OR REPLACE FUNCTION is_org_admin(org_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM user_roles
        WHERE user_roles.organization_id = org_id
        AND user_roles.user_id = auth.uid()
        AND user_roles.role_id IN (
            SELECT id FROM roles WHERE organization_id = org_id AND name = 'admin'
        )
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Check if user is team leader in course
CREATE OR REPLACE FUNCTION is_team_leader_in_course(p_course_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM teams
        WHERE teams.course_id = p_course_id
        AND teams.team_leader_id = auth.uid()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Get user's organizations
CREATE OR REPLACE FUNCTION get_user_organizations()
RETURNS TABLE(organization_id UUID, organization_name VARCHAR) AS $$
BEGIN
    RETURN QUERY
    SELECT ou.organization_id, o.name
    FROM organization_users ou
    JOIN organizations o ON o.id = ou.organization_id
    WHERE ou.user_id = auth.uid()
    AND ou.deleted_at IS NULL
    AND o.deleted_at IS NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Check user has permission
CREATE OR REPLACE FUNCTION has_permission(org_id UUID, resource_name VARCHAR, action_name VARCHAR)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM user_roles
        JOIN role_permissions ON role_permissions.role_id = user_roles.role_id
        JOIN permissions ON permissions.id = role_permissions.permission_id
        WHERE user_roles.organization_id = org_id
        AND user_roles.user_id = auth.uid()
        AND permissions.resource = resource_name
        AND permissions.action = action_name
        AND user_roles.deleted_at IS NULL
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
