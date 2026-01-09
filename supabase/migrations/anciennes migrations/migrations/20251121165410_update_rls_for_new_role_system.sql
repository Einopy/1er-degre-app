/*
  # Update RLS Policies for New Role System

  ## Overview
  Updates RLS policies to use the new role system:
  - user_role_levels table instead of roles array for workshop permissions
  - is_super_admin boolean instead of roles array for super admin checks
  - Keeps roles array checks for system roles like 'admin'

  ## Changes
  Updates policies on workshops table and other tables that check workshop permissions.
*/

-- =====================================================
-- WORKSHOPS TABLE RLS UPDATES
-- =====================================================

-- Drop old policies that check roles array for workshop permissions
DROP POLICY IF EXISTS "Organizers can view their workshops" ON workshops;
DROP POLICY IF EXISTS "Organizers can create workshops" ON workshops;
DROP POLICY IF EXISTS "Organizers can update their workshops" ON workshops;
DROP POLICY IF EXISTS "Organizers can delete their workshops" ON workshops;

-- Recreate with new role system
CREATE POLICY "Organizers can view their workshops"
  ON workshops FOR SELECT
  TO authenticated
  USING (
    organizer IN (
      SELECT id FROM users WHERE email = current_setting('request.jwt.claims', true)::json->>'email'
    )
    OR
    current_setting('request.jwt.claims', true)::json->>'email' IN (
      SELECT u.email FROM users u
      INNER JOIN user_role_levels url ON url.user_id = u.id
      INNER JOIN role_levels rl ON rl.id = url.role_level_id
      WHERE rl.workshop_family_id = workshops.workshop_family_id
    )
  );

CREATE POLICY "Organizers can create workshops with proper role"
  ON workshops FOR INSERT
  TO authenticated
  WITH CHECK (
    -- User must have at least one role level for this workshop family
    workshop_family_id IN (
      SELECT rl.workshop_family_id FROM user_role_levels url
      INNER JOIN role_levels rl ON rl.id = url.role_level_id
      INNER JOIN users u ON u.id = url.user_id
      WHERE u.email = current_setting('request.jwt.claims', true)::json->>'email'
    )
    OR
    -- Or be an admin of the client
    EXISTS (
      SELECT 1 FROM client_admins ca
      INNER JOIN users u ON u.id = ca.user_id
      INNER JOIN workshop_families wf ON wf.client_id = ca.client_id
      WHERE u.email = current_setting('request.jwt.claims', true)::json->>'email'
      AND wf.id = workshop_family_id
    )
  );

CREATE POLICY "Organizers can update their workshops"
  ON workshops FOR UPDATE
  TO authenticated
  USING (
    organizer IN (
      SELECT id FROM users WHERE email = current_setting('request.jwt.claims', true)::json->>'email'
    )
  );

CREATE POLICY "Organizers can delete their workshops"
  ON workshops FOR DELETE
  TO authenticated
  USING (
    organizer IN (
      SELECT id FROM users WHERE email = current_setting('request.jwt.claims', true)::json->>'email'
    )
  );

-- Policy for client admins
CREATE POLICY "Client admins can manage workshops for their client"
  ON workshops FOR ALL
  TO authenticated
  USING (
    workshop_family_id IN (
      SELECT wf.id FROM workshop_families wf
      INNER JOIN client_admins ca ON ca.client_id = wf.client_id
      INNER JOIN users u ON u.id = ca.user_id
      WHERE u.email = current_setting('request.jwt.claims', true)::json->>'email'
    )
  );

-- Policy for super admins
CREATE POLICY "Super admins can manage all workshops"
  ON workshops FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE email = current_setting('request.jwt.claims', true)::json->>'email'
      AND is_super_admin = true
    )
  );