/*
  # Cleanup Authentication System

  ## Overview
  Removes all authentication-related database objects as requested.

  ## Changes
  1. Drop sessions table completely
  2. Remove password_hash and last_login_at columns from users table
  3. Remove authenticated column from users table
  4. Remove auth_user_id column from users table
  5. Clean up related indexes and policies
*/

-- Drop all policies that depend on authenticated column
DROP POLICY IF EXISTS "Users can delete old unauthenticated records during migration" ON users;
DROP POLICY IF EXISTS "Allow anonymous signup for unauthenticated users" ON users;
DROP POLICY IF EXISTS "Authenticated users can view own profile" ON users;
DROP POLICY IF EXISTS "Authenticated users can view participations" ON participations;

-- Drop sessions table
DROP TABLE IF EXISTS sessions CASCADE;

-- Remove authentication-related columns from users table
ALTER TABLE users DROP COLUMN IF EXISTS password_hash CASCADE;
ALTER TABLE users DROP COLUMN IF EXISTS last_login_at CASCADE;
ALTER TABLE users DROP COLUMN IF EXISTS authenticated CASCADE;
ALTER TABLE users DROP COLUMN IF EXISTS auth_user_id CASCADE;

-- Drop authentication-related indexes
DROP INDEX IF EXISTS idx_users_authenticated;
DROP INDEX IF EXISTS idx_users_auth_user_id;
DROP INDEX IF EXISTS idx_users_email_lower;

-- Drop cleanup function if it exists
DROP FUNCTION IF EXISTS cleanup_expired_sessions();

-- Recreate simple email index
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
