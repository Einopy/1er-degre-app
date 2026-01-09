/*
  # Add Authenticated Field to Users Table

  ## Overview
  Adds an `authenticated` boolean field to track whether users have completed their 
  initial password setup. This enables a clean onboarding flow where anonymous workshop 
  registrants can later create accounts.

  ## Changes Made

  1. New Column
    - `authenticated` (boolean, default false)
      - Tracks whether user has completed password setup
      - False: User exists but needs to create password (onboarding flow)
      - True: User has active authentication and can log in directly

  2. Data Migration
    - Set authenticated = true for joel.frade@gmail.com (for testing)
    - All other existing users remain false to follow onboarding flow

  3. Performance
    - Add index on authenticated field for efficient queries

  ## User Flow
  - Anonymous registers for workshop → User created with authenticated = false
  - User tries to log in → System checks authenticated field
  - If false → Redirect to registration to create password
  - After password creation → Set authenticated = true
  - Future logins → Direct password entry
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

-- Set authenticated to true for joel.frade@gmail.com for testing
UPDATE users
SET authenticated = true
WHERE email = 'joel.frade@gmail.com';

-- Create index on authenticated field for efficient queries
CREATE INDEX IF NOT EXISTS idx_users_authenticated ON users(authenticated);

-- Log the migration result
DO $$
DECLARE
  updated_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO updated_count
  FROM users
  WHERE authenticated = true;
  
  RAISE NOTICE 'Migration completed: % users marked as authenticated', updated_count;
END $$;
