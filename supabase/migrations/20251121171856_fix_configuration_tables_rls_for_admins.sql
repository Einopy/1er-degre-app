/*
  # Fix RLS Policies for Configuration Tables - Admin Access

  ## Problem
  System admins and super admins cannot read workshop_families and role_levels tables.
  These tables only have "Client admins" policies, which require client_admins membership.
  
  When fetchOrganizers() tries to do nested SELECT with foreign key relationships:
  ```
  user_role_levels → role_levels → workshop_families
  ```
  The joins fail RLS even though user_role_levels is accessible, because role_levels
  and workshop_families block the query.

  ## Root Cause
  - user_role_levels: ✅ Has system admin policy (added previously)
  - role_levels: ❌ Only has "Client admins" policy
  - workshop_families: ❌ Only has "Client admins" policy
  
  Result: Nested SELECT returns NULL/empty, organizers list shows "Aucun animateur trouvé"

  ## Solution
  Add READ policies for system admins and super admins on:
  1. workshop_families table
  2. role_levels table

  These are configuration/reference tables that admins need to read.

  ## Changes
  1. Add "System admins can view all workshop families" policy
  2. Add "Super admins can view all workshop families" policy
  3. Add "System admins can view all role levels" policy
  4. Add "Super admins can view all role levels" policy
*/

-- =====================================================
-- WORKSHOP FAMILIES - ADMIN READ POLICIES
-- =====================================================

CREATE POLICY "System admins can view all workshop families"
  ON workshop_families FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE email = current_setting('request.jwt.claims', true)::json->>'email'
      AND 'admin' = ANY(roles)
    )
  );

CREATE POLICY "Super admins can view all workshop families"
  ON workshop_families FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE email = current_setting('request.jwt.claims', true)::json->>'email'
      AND is_super_admin = true
    )
  );

-- =====================================================
-- ROLE LEVELS - ADMIN READ POLICIES
-- =====================================================

CREATE POLICY "System admins can view all role levels"
  ON role_levels FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE email = current_setting('request.jwt.claims', true)::json->>'email'
      AND 'admin' = ANY(roles)
    )
  );

CREATE POLICY "Super admins can view all role levels"
  ON role_levels FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE email = current_setting('request.jwt.claims', true)::json->>'email'
      AND is_super_admin = true
    )
  );