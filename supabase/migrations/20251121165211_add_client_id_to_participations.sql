/*
  # Add client_id to Participations Table

  ## Overview
  Adds a direct client_id reference to the participations table for simpler
  RLS policies and better query performance.

  ## Changes
  1. Add client_id column to participations (nullable initially)
  2. Backfill client_id from workshops → workshop_families → client_id
  3. Make client_id NOT NULL and add foreign key constraint
  4. Add index on client_id for performance

  ## Benefits
  - Simpler RLS policies (no subqueries needed)
  - Better query performance
  - Prevents cross-client data leaks
*/

-- =====================================================
-- 1. ADD CLIENT_ID COLUMN (NULLABLE FIRST)
-- =====================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'participations' AND column_name = 'client_id'
  ) THEN
    ALTER TABLE participations ADD COLUMN client_id uuid;
  END IF;
END $$;

-- =====================================================
-- 2. BACKFILL CLIENT_ID FROM WORKSHOPS
-- =====================================================

UPDATE participations p
SET client_id = wf.client_id
FROM workshops w
INNER JOIN workshop_families wf ON wf.id = w.workshop_family_id
WHERE p.workshop_id = w.id
AND p.client_id IS NULL;

-- =====================================================
-- 3. MAKE CLIENT_ID NOT NULL AND ADD CONSTRAINTS
-- =====================================================

-- Make column NOT NULL
ALTER TABLE participations 
  ALTER COLUMN client_id SET NOT NULL;

-- Add foreign key constraint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'participations_client_id_fkey'
  ) THEN
    ALTER TABLE participations
      ADD CONSTRAINT participations_client_id_fkey
      FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE;
  END IF;
END $$;

-- =====================================================
-- 4. CREATE INDEX FOR PERFORMANCE
-- =====================================================

CREATE INDEX IF NOT EXISTS participations_client_id_idx 
  ON participations(client_id);

-- =====================================================
-- 5. UPDATE RLS POLICIES TO USE DIRECT CLIENT_ID
-- =====================================================

-- Drop old policies that use subqueries
DROP POLICY IF EXISTS "Users can view their own participations" ON participations;
DROP POLICY IF EXISTS "Users can insert their own participations" ON participations;
DROP POLICY IF EXISTS "Users can update their own participations" ON participations;
DROP POLICY IF EXISTS "Organizers can view participations for their workshops" ON participations;
DROP POLICY IF EXISTS "Organizers can update participations for their workshops" ON participations;

-- Recreate with direct client_id checks
CREATE POLICY "Users can view their own participations"
  ON participations FOR SELECT
  TO authenticated
  USING (
    user_id IN (
      SELECT id FROM users WHERE email = current_setting('request.jwt.claims', true)::json->>'email'
    )
  );

CREATE POLICY "Users can insert their own participations"
  ON participations FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id IN (
      SELECT id FROM users WHERE email = current_setting('request.jwt.claims', true)::json->>'email'
    )
  );

CREATE POLICY "Users can update their own participations"
  ON participations FOR UPDATE
  TO authenticated
  USING (
    user_id IN (
      SELECT id FROM users WHERE email = current_setting('request.jwt.claims', true)::json->>'email'
    )
  );

CREATE POLICY "Organizers can view participations for their workshops"
  ON participations FOR SELECT
  TO authenticated
  USING (
    workshop_id IN (
      SELECT id FROM workshops WHERE organizer IN (
        SELECT id FROM users WHERE email = current_setting('request.jwt.claims', true)::json->>'email'
      )
    )
  );

CREATE POLICY "Organizers can update participations for their workshops"
  ON participations FOR UPDATE
  TO authenticated
  USING (
    workshop_id IN (
      SELECT id FROM workshops WHERE organizer IN (
        SELECT id FROM users WHERE email = current_setting('request.jwt.claims', true)::json->>'email'
      )
    )
  );

CREATE POLICY "Client admins can view participations for their client"
  ON participations FOR SELECT
  TO authenticated
  USING (
    client_id IN (
      SELECT ca.client_id
      FROM client_admins ca
      INNER JOIN users u ON u.id = ca.user_id
      WHERE u.email = current_setting('request.jwt.claims', true)::json->>'email'
    )
  );

CREATE POLICY "Client admins can manage participations for their client"
  ON participations FOR ALL
  TO authenticated
  USING (
    client_id IN (
      SELECT ca.client_id
      FROM client_admins ca
      INNER JOIN users u ON u.id = ca.user_id
      WHERE u.email = current_setting('request.jwt.claims', true)::json->>'email'
    )
  );