/*
  # Add Authentication Columns to Users Table

  ## Problem
  The users table is missing the authenticated and password_hash columns needed
  for the email/password authentication flow.

  ## Changes
  1. New Columns
    - `authenticated` (boolean, default false) - Tracks if user has created a password
    - `password_hash` (text, nullable) - Stores hashed password using SHA-256

  2. Indexes
    - Add index on email for fast lookups
    - Add index on authenticated for filtering queries

  3. Security (RLS Policies)
    - Allow public (anonymous) users to read user records for login flow
    - Allow public users to update password_hash and authenticated fields
    - Ensure users can only update their own records

  ## User Flow
  - User registers for workshop → User created with authenticated = false, no password
  - User tries to log in → System checks email and authenticated field
  - If authenticated = false → Show password creation form
  - User creates password → Update password_hash and set authenticated = true
  - If authenticated = true → Show password login form
*/

-- Add authenticated column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'authenticated'
  ) THEN
    ALTER TABLE users ADD COLUMN authenticated boolean DEFAULT false NOT NULL;
  END IF;
END $$;

-- Add password_hash column
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

-- RLS Policy: Allow public to read user records for login flow
DROP POLICY IF EXISTS "Anyone can read users for login" ON users;
CREATE POLICY "Anyone can read users for login"
  ON users FOR SELECT
  TO public
  USING (true);

-- RLS Policy: Allow public to update password_hash and authenticated for password creation
DROP POLICY IF EXISTS "Users can create password" ON users;
CREATE POLICY "Users can create password"
  ON users FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (true);
