/*
  # Create User Client Memberships Table

  ## Overview
  Tracks which clients a user is affiliated with as an animator/organizer.
  This enables multi-client support where a user can be an animator for multiple organizations.

  ## New Table

  `user_client_memberships` - Links users to clients they work with
    - Automatically populated based on workshop participation
    - Used to determine which clients a user can access
    - Enables client selector for multi-client users

  ## Security

  - RLS enabled
  - Users can view their own memberships
  - Admins can view memberships for their client
*/

-- =====================================================
-- USER CLIENT MEMBERSHIPS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS user_client_memberships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  workshop_family_id uuid REFERENCES workshop_families(id) ON DELETE SET NULL,
  role text NOT NULL DEFAULT 'animator',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT user_client_memberships_role_check CHECK (role IN ('animator', 'organizer', 'trainer', 'admin'))
);

-- Unique constraint: one membership per user-client-family combination
CREATE UNIQUE INDEX IF NOT EXISTS user_client_memberships_user_client_family_idx
  ON user_client_memberships(user_id, client_id, workshop_family_id);

-- Index for queries by user
CREATE INDEX IF NOT EXISTS user_client_memberships_user_id_idx
  ON user_client_memberships(user_id);

-- Index for queries by client
CREATE INDEX IF NOT EXISTS user_client_memberships_client_id_idx
  ON user_client_memberships(client_id);

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE user_client_memberships ENABLE ROW LEVEL SECURITY;

-- Users can view their own memberships
CREATE POLICY "Users can view their own client memberships"
  ON user_client_memberships FOR SELECT
  TO authenticated
  USING (
    user_id IN (
      SELECT id FROM users WHERE email = current_setting('request.jwt.claims', true)::json->>'email'
    )
  );

-- Client admins can view memberships for their client
CREATE POLICY "Client admins can view memberships for their client"
  ON user_client_memberships FOR SELECT
  TO authenticated
  USING (
    client_id IN (
      SELECT ca.client_id
      FROM client_admins ca
      INNER JOIN users u ON u.id = ca.user_id
      WHERE u.email = current_setting('request.jwt.claims', true)::json->>'email'
    )
  );

-- Client admins can manage memberships for their client
CREATE POLICY "Client admins can insert memberships for their client"
  ON user_client_memberships FOR INSERT
  TO authenticated
  WITH CHECK (
    client_id IN (
      SELECT ca.client_id
      FROM client_admins ca
      INNER JOIN users u ON u.id = ca.user_id
      WHERE u.email = current_setting('request.jwt.claims', true)::json->>'email'
    )
  );

CREATE POLICY "Client admins can update memberships for their client"
  ON user_client_memberships FOR UPDATE
  TO authenticated
  USING (
    client_id IN (
      SELECT ca.client_id
      FROM client_admins ca
      INNER JOIN users u ON u.id = ca.user_id
      WHERE u.email = current_setting('request.jwt.claims', true)::json->>'email'
    )
  );

CREATE POLICY "Client admins can delete memberships for their client"
  ON user_client_memberships FOR DELETE
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
-- FUNCTION TO AUTO-CREATE MEMBERSHIPS
-- =====================================================

-- Function to automatically create user-client memberships when a user organizes a workshop
CREATE OR REPLACE FUNCTION auto_create_user_client_membership()
RETURNS TRIGGER AS $$
DECLARE
  v_client_id uuid;
  v_family_id uuid;
BEGIN
  -- Get client_id and family_id from the workshop
  SELECT wf.client_id, NEW.workshop_family_id
  INTO v_client_id, v_family_id
  FROM workshop_families wf
  WHERE wf.id = NEW.workshop_family_id;

  -- Create membership if it doesn't exist
  IF v_client_id IS NOT NULL THEN
    INSERT INTO user_client_memberships (user_id, client_id, workshop_family_id, role, is_active)
    VALUES (NEW.organizer, v_client_id, v_family_id, 'animator', true)
    ON CONFLICT (user_id, client_id, workshop_family_id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-create memberships when workshops are created
DROP TRIGGER IF EXISTS trigger_auto_create_user_client_membership ON workshops;
CREATE TRIGGER trigger_auto_create_user_client_membership
  AFTER INSERT ON workshops
  FOR EACH ROW
  EXECUTE FUNCTION auto_create_user_client_membership();