/*
  # Add auth_user_id column to users table

  1. Changes
    - Add `auth_user_id` column (uuid, nullable) to users table
    - This column will store the auth.users UUID when a user creates their password
    - The main `id` column remains the permanent user identifier
    - No foreign key constraint to allow flexibility

  2. Migration Strategy
    - Column is nullable to support existing users who haven't authenticated yet
    - When a user creates their password, auth_user_id will be populated
    - The authenticated flag indicates if the user has completed auth setup

  3. Impact
    - No data loss - all existing user records remain intact
    - All relationships (participations, waitlist, etc.) continue to work
    - Enables separation between user identity (id) and auth identity (auth_user_id)
*/

-- Add auth_user_id column to users table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'auth_user_id'
  ) THEN
    ALTER TABLE users ADD COLUMN auth_user_id uuid;
  END IF;
END $$;

-- Create index for fast lookup by auth_user_id
CREATE INDEX IF NOT EXISTS idx_users_auth_user_id ON users(auth_user_id);

-- Add comment to document the column purpose
COMMENT ON COLUMN users.auth_user_id IS 'References auth.users.id when user creates password. NULL until user authenticates for the first time.';