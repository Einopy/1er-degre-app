/*
  # Create User Role Levels System

  ## Overview
  Refactors the role system to separate system roles from workshop permissions.
  Introduces user_role_levels table for granular role management per client/family.

  ## Changes
  1. Add is_super_admin boolean to users table
  2. Create user_role_levels table
  3. Roles array will only contain system roles (admin, etc.)
  4. Workshop permissions moved to user_role_levels (relational)

  ## New Table
  `user_role_levels` - Links users to specific role levels
    - One row = one user + one specific role level (e.g., FDFP public)
    - FK to users and role_levels
    - Enables multi-client, multi-family role management

  ## Security
  - RLS enabled on user_role_levels
  - Users can view their own role levels
  - Admins can manage role levels for their client
*/

-- =====================================================
-- 1. ADD IS_SUPER_ADMIN TO USERS
-- =====================================================

ALTER TABLE users ADD COLUMN IF NOT EXISTS is_super_admin boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS users_is_super_admin_idx 
  ON users(is_super_admin) WHERE is_super_admin = true;

-- =====================================================
-- 2. CREATE USER_ROLE_LEVELS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS user_role_levels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role_level_id uuid NOT NULL REFERENCES role_levels(id) ON DELETE CASCADE,
  granted_at timestamptz NOT NULL DEFAULT now(),
  granted_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT user_role_levels_unique UNIQUE (user_id, role_level_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS user_role_levels_user_id_idx 
  ON user_role_levels(user_id);

CREATE INDEX IF NOT EXISTS user_role_levels_role_level_id_idx 
  ON user_role_levels(role_level_id);

-- =====================================================
-- 3. ROW LEVEL SECURITY FOR USER_ROLE_LEVELS
-- =====================================================

ALTER TABLE user_role_levels ENABLE ROW LEVEL SECURITY;

-- Users can view their own role levels
CREATE POLICY "Users can view their own role levels"
  ON user_role_levels FOR SELECT
  TO authenticated
  USING (
    user_id IN (
      SELECT id FROM users WHERE email = current_setting('request.jwt.claims', true)::json->>'email'
    )
  );

-- Client admins can view role levels for users in their client
CREATE POLICY "Client admins can view role levels for their client"
  ON user_role_levels FOR SELECT
  TO authenticated
  USING (
    role_level_id IN (
      SELECT rl.id FROM role_levels rl
      WHERE rl.client_id IN (
        SELECT ca.client_id
        FROM client_admins ca
        INNER JOIN users u ON u.id = ca.user_id
        WHERE u.email = current_setting('request.jwt.claims', true)::json->>'email'
      )
    )
  );

-- Client admins can grant role levels for their client
CREATE POLICY "Client admins can grant role levels for their client"
  ON user_role_levels FOR INSERT
  TO authenticated
  WITH CHECK (
    role_level_id IN (
      SELECT rl.id FROM role_levels rl
      WHERE rl.client_id IN (
        SELECT ca.client_id
        FROM client_admins ca
        INNER JOIN users u ON u.id = ca.user_id
        WHERE u.email = current_setting('request.jwt.claims', true)::json->>'email'
      )
    )
  );

-- Client admins can revoke role levels for their client
CREATE POLICY "Client admins can revoke role levels for their client"
  ON user_role_levels FOR DELETE
  TO authenticated
  USING (
    role_level_id IN (
      SELECT rl.id FROM role_levels rl
      WHERE rl.client_id IN (
        SELECT ca.client_id
        FROM client_admins ca
        INNER JOIN users u ON u.id = ca.user_id
        WHERE u.email = current_setting('request.jwt.claims', true)::json->>'email'
      )
    )
  );

-- Super admins can manage all role levels
CREATE POLICY "Super admins can manage all role levels"
  ON user_role_levels FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE email = current_setting('request.jwt.claims', true)::json->>'email'
      AND is_super_admin = true
    )
  );