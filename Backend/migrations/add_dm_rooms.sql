-- Migration: Add DM (direct message) room support
-- Adds 'dm' as a valid room_type for private 1-on-1 messaging

-- 1. Drop ALL possible check constraint names that restrict room_type/scope
ALTER TABLE chat_rooms DROP CONSTRAINT IF EXISTS valid_room_type;
ALTER TABLE chat_rooms DROP CONSTRAINT IF EXISTS valid_room_scope;
ALTER TABLE chat_rooms DROP CONSTRAINT IF EXISTS room_context;
ALTER TABLE chat_rooms DROP CONSTRAINT IF EXISTS chat_rooms_room_type_check;

-- 2. Recreate room_type constraint with 'cohort' and 'dm' included
ALTER TABLE chat_rooms ADD CONSTRAINT valid_room_type
    CHECK (room_type IN ('general', 'course', 'team', 'cohort', 'dm'));

-- 3. Recreate room_scope constraint with 'cohort' and 'dm' cases
ALTER TABLE chat_rooms ADD CONSTRAINT valid_room_scope CHECK (
    (room_type = 'general' AND course_id IS NULL AND team_id IS NULL) OR
    (room_type = 'course'  AND course_id IS NOT NULL AND team_id IS NULL) OR
    (room_type = 'team'    AND course_id IS NOT NULL AND team_id IS NOT NULL) OR
    (room_type = 'cohort'  AND cohort_id IS NOT NULL) OR
    (room_type = 'dm' AND course_id IS NULL AND team_id IS NULL)
);

-- 4. Add dm_participant_ids column to identify the two users in a DM
ALTER TABLE chat_rooms ADD COLUMN IF NOT EXISTS dm_participant_ids UUID[] DEFAULT NULL;

-- 3. Create unique index to prevent duplicate DM rooms between same two users
CREATE UNIQUE INDEX IF NOT EXISTS idx_chat_rooms_dm_participants
    ON chat_rooms (dm_participant_ids)
    WHERE room_type = 'dm';

-- 4. Index for fast DM lookup by participant
CREATE INDEX IF NOT EXISTS idx_chat_rooms_dm_lookup
    ON chat_rooms USING GIN (dm_participant_ids)
    WHERE room_type = 'dm';
