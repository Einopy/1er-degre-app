/*
  # Add Password Hash and Session Management

  ## Overview
  Adds password_hash and last_login_at columns to users table for custom authentication.
  Creates sessions table for server-side session management with secure token storage.

  ## Changes

  1. Users Table Modifications
    - `password_hash` (text, nullable) - Stores bcrypt password hash
    - `last_login_at` (timestamptz, nullable) - Tracks last successful login time
    - Create index on LOWER(email) for case-insensitive email lookups

  2. Sessions Table
    - `id` (uuid, primary key) - Unique session identifier
    - `user_id` (uuid, required) - References users.id
    - `token_hash` (text, required, unique) - SHA-256 hash of session token
    - `created_at` (timestamptz, required) - Session creation time
    - `last_accessed_at` (timestamptz, required) - Last activity timestamp
    - `expires_at` (timestamptz, required) - Absolute expiration time
    - `ip_address` (text, nullable) - Client IP for security logging
    - `user_agent` (text, nullable) - Client user agent for security logging

  3. Security
    - Enable RLS on sessions table
    - Sessions automatically expire after 24 hours (absolute)
    - Sessions expire after 30 minutes of inactivity (idle timeout handled by app)
    - Index on token_hash for fast session lookup
    - Index on expires_at for efficient cleanup
    - Index on user_id for user session management

  ## Notes
  - password_hash stores bcrypt hashes with cost factor 12
  - Session tokens are 32+ bytes of cryptographic randomness
  - token_hash is SHA-256(token) for secure storage
  - Email normalization: LOWER(TRIM(NORMALIZE(email, NFC)))
*/

-- Add password_hash column to users table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'password_hash'
  ) THEN
    ALTER TABLE users ADD COLUMN password_hash text;
  END IF;
END $$;

-- Add last_login_at column to users table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'last_login_at'
  ) THEN
    ALTER TABLE users ADD COLUMN last_login_at timestamptz;
  END IF;
END $$;

-- Create index on LOWER(email) for case-insensitive unique lookups
CREATE INDEX IF NOT EXISTS idx_users_email_lower ON users(LOWER(email));

-- Create sessions table for server-side session management
CREATE TABLE IF NOT EXISTS sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_accessed_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '24 hours'),
  ip_address text,
  user_agent text
);

-- Enable RLS on sessions table
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can view their own sessions
CREATE POLICY "Users can view own sessions"
  ON sessions FOR SELECT
  TO authenticated
  USING (user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid()));

-- RLS Policy: Users can delete their own sessions (logout)
CREATE POLICY "Users can delete own sessions"
  ON sessions FOR DELETE
  TO authenticated
  USING (user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid()));

-- Create indexes for sessions table
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_token_hash ON sessions(token_hash);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_sessions_created_at ON sessions(created_at);

-- Create function to cleanup expired sessions
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS void AS $$
BEGIN
  DELETE FROM sessions WHERE expires_at < now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comment to document the cleanup function
COMMENT ON FUNCTION cleanup_expired_sessions IS 'Removes expired sessions from the sessions table. Should be called periodically via cron or edge function.';
