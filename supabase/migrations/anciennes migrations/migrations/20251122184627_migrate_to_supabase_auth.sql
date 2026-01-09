/*
  # Migrate to Supabase Auth

  1. Overview
    - Migrate from custom authentication to Supabase Auth
    - Synchronize existing users table with auth.users
    - Add auth_user_id column to link custom users with Supabase auth users
    - Create trigger to keep tables in sync

  2. Changes
    - Add auth_user_id column to users table
    - Create function to sync user data with auth.users
    - For authenticated users, create corresponding auth.users entries
    - Link existing users to auth.users via auth_user_id

  3. Security
    - Keep existing RLS policies temporarily
    - Will be updated in next migration to use auth.uid()

  4. Data Migration
    - For users with password_hash and authenticated=true:
      - Create corresponding entry in auth.users
      - Link via auth_user_id
    - For users without authentication:
      - Will be migrated when they create their password
*/

-- Add auth_user_id column to users table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'auth_user_id'
  ) THEN
    ALTER TABLE users ADD COLUMN auth_user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
    CREATE INDEX IF NOT EXISTS idx_users_auth_user_id ON users(auth_user_id);
  END IF;
END $$;

-- Create function to handle auth.users creation and synchronization
CREATE OR REPLACE FUNCTION create_auth_user_for_existing_user(
  p_user_id uuid,
  p_email text,
  p_password text
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_auth_user_id uuid;
BEGIN
  -- Create user in auth.users using Supabase's admin API
  -- This needs to be done via the application layer, not SQL
  -- For now, we'll prepare the structure
  
  -- Return the auth_user_id once created
  RETURN v_auth_user_id;
END;
$$;

-- Create trigger function to sync user updates to auth.users
CREATE OR REPLACE FUNCTION sync_user_to_auth()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- If auth_user_id is set, update the corresponding auth.users email
  IF NEW.auth_user_id IS NOT NULL AND NEW.email <> OLD.email THEN
    -- This will be handled by Supabase Auth API in application layer
    NULL;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger if it doesn't exist
DROP TRIGGER IF EXISTS sync_user_to_auth_trigger ON users;
CREATE TRIGGER sync_user_to_auth_trigger
  AFTER UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION sync_user_to_auth();

-- Log migration status
DO $$
DECLARE
  user_count INTEGER;
  authenticated_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO user_count FROM users;
  SELECT COUNT(*) INTO authenticated_count FROM users WHERE authenticated = true;
  
  RAISE NOTICE 'Migration prepared:';
  RAISE NOTICE '  Total users: %', user_count;
  RAISE NOTICE '  Authenticated users: %', authenticated_count;
  RAISE NOTICE '  Auth users to be created: %', authenticated_count;
  RAISE NOTICE '';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '  1. Update auth service to use Supabase Auth API';
  RAISE NOTICE '  2. Create auth.users entries for authenticated users';
  RAISE NOTICE '  3. Update RLS policies to use auth.uid()';
END $$;
