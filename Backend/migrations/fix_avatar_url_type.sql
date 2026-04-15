-- Change avatar_url from VARCHAR(500) to TEXT to support base64 data URLs
ALTER TABLE profiles ALTER COLUMN avatar_url TYPE TEXT;
