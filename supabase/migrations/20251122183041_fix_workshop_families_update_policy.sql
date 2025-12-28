/*
  # Fix workshop families UPDATE policy

  1. Issue
    - UPDATE policy for workshop_families only has USING clause
    - Missing WITH CHECK clause causes updates to fail with 0 rows returned
    
  2. Fix
    - Drop existing UPDATE policy
    - Recreate with both USING and WITH CHECK clauses
    - Ensures admins can both read and write their client's families
*/

DROP POLICY IF EXISTS "Client admins can update their client's workshop families" ON workshop_families;

CREATE POLICY "Client admins can update their client's workshop families"
  ON workshop_families FOR UPDATE
  TO authenticated
  USING (
    client_id IN (
      SELECT ca.client_id
      FROM client_admins ca
      JOIN users u ON u.id = ca.user_id
      WHERE u.email = current_setting('request.jwt.claims', true)::json->>'email'
    )
  )
  WITH CHECK (
    client_id IN (
      SELECT ca.client_id
      FROM client_admins ca
      JOIN users u ON u.id = ca.user_id
      WHERE u.email = current_setting('request.jwt.claims', true)::json->>'email'
    )
  );
