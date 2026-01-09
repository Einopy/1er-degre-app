/*
  # Fix Admin Access to user_role_levels

  ## Problem
  System admins (users with 'admin' in roles array) cannot query user_role_levels
  because RLS policies only allow:
  - Users to see their own
  - Client admins to see their client's
  - Super admins to see all
  
  But the Admin Console needs to query ALL user_role_levels to show the organizers list.

  ## Solution
  Add RLS policy allowing system admins to view all user_role_levels.

  ## Changes
  1. Add "System admins can view all role levels" policy
*/

-- =====================================================
-- ADD SYSTEM ADMIN POLICY
-- =====================================================

CREATE POLICY "System admins can view all role levels"
  ON user_role_levels FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE email = current_setting('request.jwt.claims', true)::json->>'email'
      AND 'admin' = ANY(roles)
    )
  );