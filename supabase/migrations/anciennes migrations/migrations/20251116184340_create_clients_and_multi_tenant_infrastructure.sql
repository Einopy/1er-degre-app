/*
  # Create Multi-Client Infrastructure

  ## Overview
  Introduces multi-client (multi-tenant) architecture to support multiple organizations
  (e.g., "1er Degré", "La Fresque du Climat") with separate data isolation and admin scoping.

  ## New Tables

  ### `clients`
  Organizations/brands that use the platform
  - `id` (uuid, primary key) - Unique client identifier
  - `slug` (text, unique, required) - URL-friendly identifier (e.g., "1erdegre", "fresque_climat")
  - `name` (text, required) - Display name (e.g., "1er Degré", "La Fresque du Climat")
  - `logo_url` (text, nullable) - URL to client's logo image
  - `is_active` (boolean, default true) - Whether client is currently active
  - `created_at` (timestamptz, auto)
  - `updated_at` (timestamptz, auto)

  ### `client_admins`
  Links users with admin role to specific clients they can manage
  - `id` (uuid, primary key)
  - `client_id` (uuid, required) - FK to clients.id
  - `user_id` (uuid, required) - FK to users.id
  - `role` (text, default 'admin') - Role within client context (currently only 'admin')
  - `created_at` (timestamptz, auto)
  - `updated_at` (timestamptz, auto)
  - Unique constraint on (client_id, user_id) - User can only be admin of a client once

  ## Data Migration

  1. Create initial "1er Degré" client
  2. Link all existing admins to "1er Degré" client
  3. Add client_id foreign key to workshops table
  4. Backfill all existing workshops with "1er Degré" client_id

  ## Security

  - RLS enabled on clients and client_admins tables
  - Super admins can manage all clients
  - Client admins can only view their assigned clients
  - Regular users cannot access client management

  ## Important Notes

  - This migration does NOT break existing functionality
  - All existing data is preserved and linked to "1er Degré" client
  - Super admin role will be added in next migration
  - Client filtering in queries will be added incrementally
*/

-- ============================================================================
-- PART 1: Create clients table
-- ============================================================================

CREATE TABLE IF NOT EXISTS clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  name text NOT NULL,
  logo_url text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add constraints
ALTER TABLE clients ADD CONSTRAINT clients_slug_format CHECK (slug ~ '^[a-z0-9_-]+$');
ALTER TABLE clients ADD CONSTRAINT clients_name_not_empty CHECK (length(trim(name)) > 0);

-- Enable RLS
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;

-- Create updated_at trigger for clients
CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON clients
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create index
CREATE INDEX IF NOT EXISTS idx_clients_slug ON clients(slug);
CREATE INDEX IF NOT EXISTS idx_clients_is_active ON clients(is_active);

-- ============================================================================
-- PART 2: Create client_admins junction table
-- ============================================================================

CREATE TABLE IF NOT EXISTS client_admins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role text DEFAULT 'admin',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(client_id, user_id)
);

-- Add constraint for valid roles
ALTER TABLE client_admins ADD CONSTRAINT client_admins_role_check
  CHECK (role IN ('admin'));

-- Enable RLS
ALTER TABLE client_admins ENABLE ROW LEVEL SECURITY;

-- Create updated_at trigger for client_admins
CREATE TRIGGER update_client_admins_updated_at BEFORE UPDATE ON client_admins
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_client_admins_client ON client_admins(client_id);
CREATE INDEX IF NOT EXISTS idx_client_admins_user ON client_admins(user_id);
CREATE INDEX IF NOT EXISTS idx_client_admins_role ON client_admins(role);

-- ============================================================================
-- PART 3: Insert initial "1er Degré" client
-- ============================================================================

-- Insert 1er Degré as the first client
INSERT INTO clients (slug, name, is_active)
VALUES ('1erdegre', '1er Degré', true)
ON CONFLICT (slug) DO NOTHING;

-- ============================================================================
-- PART 4: Link existing admins to 1er Degré client
-- ============================================================================

-- Find all users with 'admin' role and link them to 1er Degré client
DO $$
DECLARE
  client_1erdegre_id uuid;
BEGIN
  -- Get the 1er Degré client id
  SELECT id INTO client_1erdegre_id FROM clients WHERE slug = '1erdegre';

  IF client_1erdegre_id IS NOT NULL THEN
    -- Insert client_admin records for all existing admins
    INSERT INTO client_admins (client_id, user_id, role)
    SELECT
      client_1erdegre_id,
      id,
      'admin'
    FROM users
    WHERE 'admin' = ANY(roles)
    ON CONFLICT (client_id, user_id) DO NOTHING;

    RAISE NOTICE 'Linked existing admins to 1er Degré client';
  ELSE
    RAISE EXCEPTION '1er Degré client not found - cannot link admins';
  END IF;
END $$;

-- ============================================================================
-- PART 5: Add client_id to workshops table
-- ============================================================================

-- Check if client_id column already exists, if not add it
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'workshops' AND column_name = 'client_id'
  ) THEN
    -- Add client_id column as nullable first
    ALTER TABLE workshops ADD COLUMN client_id uuid REFERENCES clients(id);

    RAISE NOTICE 'Added client_id column to workshops table';
  END IF;
END $$;

-- Backfill all existing workshops with 1er Degré client_id
DO $$
DECLARE
  client_1erdegre_id uuid;
  affected_rows INTEGER;
BEGIN
  -- Get the 1er Degré client id
  SELECT id INTO client_1erdegre_id FROM clients WHERE slug = '1erdegre';

  IF client_1erdegre_id IS NOT NULL THEN
    -- Update all workshops that don't have a client_id
    UPDATE workshops
    SET client_id = client_1erdegre_id
    WHERE client_id IS NULL;

    GET DIAGNOSTICS affected_rows = ROW_COUNT;
    RAISE NOTICE 'Backfilled % workshops with 1er Degré client_id', affected_rows;

    -- Now make client_id NOT NULL since all rows are backfilled
    ALTER TABLE workshops ALTER COLUMN client_id SET NOT NULL;

    RAISE NOTICE 'Made workshops.client_id NOT NULL';
  ELSE
    RAISE EXCEPTION '1er Degré client not found - cannot backfill workshops';
  END IF;
END $$;

-- Create index on workshops.client_id for performance
CREATE INDEX IF NOT EXISTS idx_workshops_client_id ON workshops(client_id);

-- ============================================================================
-- PART 6: Add client_id to other tenant-scoped tables
-- ============================================================================

-- Note: participations, waitlist_entries, email_templates, mail_logs,
-- scheduled_emails, and workshop_history_logs already have tenant_id.
-- We will add client_id in a future migration if needed, or rely on
-- joins through workshops for now.

-- ============================================================================
-- PART 7: Create RLS policies for clients table
-- ============================================================================

-- Super admins can view all clients (will be enabled after super_admin role exists)
-- For now, create placeholder policy that checks for super_admin role
CREATE POLICY "Super admins can view all clients"
  ON clients FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = (SELECT id FROM users WHERE email = current_setting('request.jwt.claims', true)::json->>'email')
      AND 'super_admin' = ANY(users.roles)
    )
  );

-- Client admins can view their assigned clients
CREATE POLICY "Client admins can view their clients"
  ON clients FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT client_id FROM client_admins
      WHERE user_id = (SELECT id FROM users WHERE email = current_setting('request.jwt.claims', true)::json->>'email')
    )
  );

-- Super admins can insert/update/delete clients
CREATE POLICY "Super admins can insert clients"
  ON clients FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = (SELECT id FROM users WHERE email = current_setting('request.jwt.claims', true)::json->>'email')
      AND 'super_admin' = ANY(users.roles)
    )
  );

CREATE POLICY "Super admins can update clients"
  ON clients FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = (SELECT id FROM users WHERE email = current_setting('request.jwt.claims', true)::json->>'email')
      AND 'super_admin' = ANY(users.roles)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = (SELECT id FROM users WHERE email = current_setting('request.jwt.claims', true)::json->>'email')
      AND 'super_admin' = ANY(users.roles)
    )
  );

CREATE POLICY "Super admins can delete clients"
  ON clients FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = (SELECT id FROM users WHERE email = current_setting('request.jwt.claims', true)::json->>'email')
      AND 'super_admin' = ANY(users.roles)
    )
  );

-- ============================================================================
-- PART 8: Create RLS policies for client_admins table
-- ============================================================================

-- Super admins can view all client_admins relationships
CREATE POLICY "Super admins can view all client admins"
  ON client_admins FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = (SELECT id FROM users WHERE email = current_setting('request.jwt.claims', true)::json->>'email')
      AND 'super_admin' = ANY(users.roles)
    )
  );

-- Client admins can view other admins of their clients
CREATE POLICY "Client admins can view co-admins"
  ON client_admins FOR SELECT
  TO authenticated
  USING (
    client_id IN (
      SELECT client_id FROM client_admins
      WHERE user_id = (SELECT id FROM users WHERE email = current_setting('request.jwt.claims', true)::json->>'email')
    )
  );

-- Super admins can insert/update/delete client_admins
CREATE POLICY "Super admins can insert client admins"
  ON client_admins FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = (SELECT id FROM users WHERE email = current_setting('request.jwt.claims', true)::json->>'email')
      AND 'super_admin' = ANY(users.roles)
    )
  );

CREATE POLICY "Super admins can update client admins"
  ON client_admins FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = (SELECT id FROM users WHERE email = current_setting('request.jwt.claims', true)::json->>'email')
      AND 'super_admin' = ANY(users.roles)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = (SELECT id FROM users WHERE email = current_setting('request.jwt.claims', true)::json->>'email')
      AND 'super_admin' = ANY(users.roles)
    )
  );

CREATE POLICY "Super admins can delete client admins"
  ON client_admins FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = (SELECT id FROM users WHERE email = current_setting('request.jwt.claims', true)::json->>'email')
      AND 'super_admin' = ANY(users.roles)
    )
  );

-- ============================================================================
-- PART 9: Log migration completion
-- ============================================================================

DO $$
DECLARE
  client_count INTEGER;
  admin_link_count INTEGER;
  workshop_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO client_count FROM clients;
  SELECT COUNT(*) INTO admin_link_count FROM client_admins;
  SELECT COUNT(*) INTO workshop_count FROM workshops WHERE client_id IS NOT NULL;

  RAISE NOTICE '====================================';
  RAISE NOTICE 'Multi-client infrastructure created';
  RAISE NOTICE '====================================';
  RAISE NOTICE 'Clients created: %', client_count;
  RAISE NOTICE 'Admin-client links created: %', admin_link_count;
  RAISE NOTICE 'Workshops linked to clients: %', workshop_count;
  RAISE NOTICE '';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '1. Run migration to add super_admin role';
  RAISE NOTICE '2. Update frontend to use client filtering';
  RAISE NOTICE '3. Create Super Admin interface';
END $$;
