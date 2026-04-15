-- Migration: Ensure unique constraint on profiles.email
-- The init.sql already defines email as UNIQUE, but this migration
-- guarantees it for databases created before this constraint was added.
-- Also converts the plain index to a UNIQUE index.

-- Drop the old non-unique index if it exists
DROP INDEX IF EXISTS idx_profiles_email;

-- Add a unique index (idempotent: IF NOT EXISTS)
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_email_unique ON profiles(email);

-- Ensure the column is NOT NULL (idempotent)
ALTER TABLE profiles ALTER COLUMN email SET NOT NULL;
