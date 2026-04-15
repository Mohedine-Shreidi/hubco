-- ============================================================
-- Migration: Add attendance table
-- Run this in your Supabase SQL Editor if the attendance
-- table is missing from your database.
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

CREATE INDEX IF NOT EXISTS idx_attendance_user_date    ON attendance(user_id, date);
CREATE INDEX IF NOT EXISTS idx_attendance_org_date     ON attendance(organization_id, date);

-- Trigger to keep updated_at current
CREATE OR REPLACE FUNCTION update_attendance_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_attendance_updated_at ON attendance;
CREATE TRIGGER update_attendance_updated_at
    BEFORE UPDATE ON attendance
    FOR EACH ROW EXECUTE FUNCTION update_attendance_updated_at();
