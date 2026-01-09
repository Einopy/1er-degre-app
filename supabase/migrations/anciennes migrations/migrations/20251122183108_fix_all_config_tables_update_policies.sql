/*
  # Fix UPDATE policies for all configuration tables

  1. Issue
    - UPDATE policies for configuration tables only have USING clause
    - Missing WITH CHECK clause causes updates to fail with 0 rows returned
    
  2. Fix
    - Drop existing UPDATE policies for:
      - workshop_types
      - role_levels
      - role_requirements
      - client_languages
    - Recreate with both USING and WITH CHECK clauses
*/

-- Workshop Types
DROP POLICY IF EXISTS "Client admins can update their client's workshop types" ON workshop_types;

CREATE POLICY "Client admins can update their client's workshop types"
  ON workshop_types FOR UPDATE
  TO authenticated
  USING (
    client_id IN (
      SELECT ca.client_id
      FROM client_admins ca
      INNER JOIN users u ON u.id = ca.user_id
      WHERE u.email = current_setting('request.jwt.claims', true)::json->>'email'
    )
  )
  WITH CHECK (
    client_id IN (
      SELECT ca.client_id
      FROM client_admins ca
      INNER JOIN users u ON u.id = ca.user_id
      WHERE u.email = current_setting('request.jwt.claims', true)::json->>'email'
    )
  );

-- Role Levels
DROP POLICY IF EXISTS "Client admins can update their client's role levels" ON role_levels;

CREATE POLICY "Client admins can update their client's role levels"
  ON role_levels FOR UPDATE
  TO authenticated
  USING (
    client_id IN (
      SELECT ca.client_id
      FROM client_admins ca
      INNER JOIN users u ON u.id = ca.user_id
      WHERE u.email = current_setting('request.jwt.claims', true)::json->>'email'
    )
  )
  WITH CHECK (
    client_id IN (
      SELECT ca.client_id
      FROM client_admins ca
      INNER JOIN users u ON u.id = ca.user_id
      WHERE u.email = current_setting('request.jwt.claims', true)::json->>'email'
    )
  );

-- Role Requirements
DROP POLICY IF EXISTS "Client admins can update role requirements" ON role_requirements;

CREATE POLICY "Client admins can update role requirements"
  ON role_requirements FOR UPDATE
  TO authenticated
  USING (
    role_level_id IN (
      SELECT rl.id
      FROM role_levels rl
      INNER JOIN client_admins ca ON ca.client_id = rl.client_id
      INNER JOIN users u ON u.id = ca.user_id
      WHERE u.email = current_setting('request.jwt.claims', true)::json->>'email'
    )
  )
  WITH CHECK (
    role_level_id IN (
      SELECT rl.id
      FROM role_levels rl
      INNER JOIN client_admins ca ON ca.client_id = rl.client_id
      INNER JOIN users u ON u.id = ca.user_id
      WHERE u.email = current_setting('request.jwt.claims', true)::json->>'email'
    )
  );

-- Client Languages
DROP POLICY IF EXISTS "Client admins can update their client's languages" ON client_languages;

CREATE POLICY "Client admins can update their client's languages"
  ON client_languages FOR UPDATE
  TO authenticated
  USING (
    client_id IN (
      SELECT ca.client_id
      FROM client_admins ca
      INNER JOIN users u ON u.id = ca.user_id
      WHERE u.email = current_setting('request.jwt.claims', true)::json->>'email'
    )
  )
  WITH CHECK (
    client_id IN (
      SELECT ca.client_id
      FROM client_admins ca
      INNER JOIN users u ON u.id = ca.user_id
      WHERE u.email = current_setting('request.jwt.claims', true)::json->>'email'
    )
  );
