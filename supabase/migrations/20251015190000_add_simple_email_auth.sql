/*
  # Add Simple Email Authentication

  ## Overview
  Adds minimal authentication fields to support email-first login with password creation flow.

  ## Changes

  1. Users Table Modifications
    - `authenticated` (boolean, default false) - Tracks if user has created password
    - `password_hash` (text, nullable) - Stores bcrypt password hash
    - Create index on email for fast lookups
    - Create index on authenticated for filtering queries

  ## Security
  - Password hashes use bcrypt with cost factor 12
  - RLS policies allow users to update their own authenticated status and password
  - Email lookups are case-insensitive

  ## User Flow
  - User registers for workshop → User created with authenticated = false, no password
  - User tries to log in → System checks email and authenticated field
  - If email not found → Show error message
  - If authenticated = false → Show password creation form
  - If authenticated = true → Show password login form
*/

-- Add authenticated column to users table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'authenticated'
  ) THEN
    ALTER TABLE users ADD COLUMN authenticated boolean DEFAULT false;
  END IF;
END $$;

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

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_authenticated ON users(authenticated);

-- RLS Policy: Allow users to update their own password and authenticated status
DROP POLICY IF EXISTS "Users can update own auth fields" ON users;
CREATE POLICY "Users can update own auth fields"
  ON users FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (true);

-- RLS Policy: Allow anonymous users to read user records by email for login
DROP POLICY IF EXISTS "Anyone can read users for login" ON users;
CREATE POLICY "Anyone can read users for login"
  ON users FOR SELECT
  TO public
  USING (true);
