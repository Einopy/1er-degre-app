/*
  # Fix RLS Policies for Configuration Tables to Support Nested Queries
  
  ## Problem
  When checking user_role_levels RLS policies, the database needs to read role_levels
  and workshop_families tables. However, after removing PUBLIC policies, these tables
  are now fully locked down, causing RLS policy evaluation to fail.
  
  ## Solution
  Add policies that allow authenticated users to read configuration tables when:
  1. They are admin for a client
  2. They need to check their own role levels
  3. The data is scoped to their client(s)
  
  Configuration tables (role_levels, workshop_families, workshop_types) are not 
  sensitive - they define the structure of roles and workshops, not user data.
  
  ## Changes
  1. Add "Authenticated users can view role levels for their client" policy
  2. Add "Authenticated users can view workshop families for their client" policy
  3. These policies check client_admins relationship properly
*/

-- =====================================================
-- ROLE_LEVELS - ADD AUTHENTICATED USER ACCESS
-- =====================================================

-- Policy for authenticated users to read role levels for their client
CREATE POLICY "Authenticated users can view role levels for their client"
  ON role_levels FOR SELECT
  TO authenticated
  USING (
    client_id IN (
      SELECT ca.client_id
      FROM client_admins ca
      INNER JOIN users u ON u.id = ca.user_id
      WHERE u.email = current_setting('request.jwt.claims', true)::json->>'email'
    )
  );

-- =====================================================
-- WORKSHOP_FAMILIES - ADD AUTHENTICATED USER ACCESS
-- =====================================================

-- Policy for authenticated users to read workshop families for their client
CREATE POLICY "Authenticated users can view workshop families for their client"
  ON workshop_families FOR SELECT
  TO authenticated
  USING (
    client_id IN (
      SELECT ca.client_id
      FROM client_admins ca
      INNER JOIN users u ON u.id = ca.user_id
      WHERE u.email = current_setting('request.jwt.claims', true)::json->>'email'
    )
  );

-- =====================================================
-- WORKSHOP_TYPES - ADD AUTHENTICATED USER ACCESS
-- =====================================================

-- Policy for authenticated users to read workshop types for their client
CREATE POLICY "Authenticated users can view workshop types for their client"
  ON workshop_types FOR SELECT
  TO authenticated
  USING (
    client_id IN (
      SELECT ca.client_id
      FROM client_admins ca
      INNER JOIN users u ON u.id = ca.user_id
      WHERE u.email = current_setting('request.jwt.claims', true)::json->>'email'
    )
  );
