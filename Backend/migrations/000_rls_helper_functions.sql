-- ============================================================
-- HubConnect — RLS Helper Functions
-- Run this FIRST before any migration that references:
--   current_user_id(), current_user_role(), is_admin(),
--   is_instructor(), or current_cohort_ids()
--
-- All functions are SECURITY DEFINER so they can query tables
-- with RLS enabled using the calling user's auth.uid().
-- ============================================================

-- Returns the authenticated user's UUID (Supabase auth.uid())
CREATE OR REPLACE FUNCTION current_user_id()
RETURNS UUID
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
    SELECT auth.uid();
$$;

-- Returns the authenticated user's role string from profiles
CREATE OR REPLACE FUNCTION current_user_role()
RETURNS TEXT
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
    SELECT role FROM profiles WHERE id = auth.uid();
$$;

-- Returns true if the current user has role 'admin'
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM profiles
        WHERE id   = auth.uid()
          AND role = 'admin'
          AND deleted_at IS NULL
    );
$$;

-- Returns true if the current user has role 'instructor'
CREATE OR REPLACE FUNCTION is_instructor()
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM profiles
        WHERE id   = auth.uid()
          AND role = 'instructor'
          AND deleted_at IS NULL
    );
$$;

-- Returns an array of cohort UUIDs the current user belongs to
CREATE OR REPLACE FUNCTION current_cohort_ids()
RETURNS UUID[]
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
    SELECT COALESCE(
        ARRAY(
            SELECT cohort_id
            FROM user_cohorts
            WHERE user_id    = auth.uid()
              AND deleted_at IS NULL
        ),
        '{}'::uuid[]
    );
$$;

-- Returns true if the current user is a member of a given team
CREATE OR REPLACE FUNCTION is_team_member(p_team_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM team_members
        WHERE team_id    = p_team_id
          AND user_id    = auth.uid()
          AND deleted_at IS NULL
    );
$$;
