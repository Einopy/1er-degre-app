/*
  # Create Client Configuration Tables

  ## Overview
  This migration creates the infrastructure for client-specific workshop configuration,
  allowing each client to define their own workshop families, types, roles, and requirements.

  ## New Tables

  1. `workshop_families` - Workshop families/brands per client (e.g., FDFP, HD)
     - Replaces hardcoded 'FDFP' | 'HD' enum
     - Each client can define their own workshop families
     - Stores default duration, illustration, and metadata

  2. `workshop_types` - Workshop types per client (e.g., workshop, formation, formation_pro_1)
     - Replaces hardcoded workshop type enum
     - Each type can be linked to a family or be transversal
     - Customizable labels and durations

  3. `role_levels` - The 4 structural animator role levels per client and family
     - Level 1: Public Animator (e.g., FDFP_public, HD_public)
     - Level 2: Pro Animator (e.g., FDFP_pro, HD_pro)
     - Level 3: Trainer (e.g., FDFP_trainer, HD_trainer)
     - Level 4: Instructor (e.g., FDFP_instructor, HD_instructor)
     - Customizable labels while maintaining structure

  4. `role_requirements` - Prerequisites for each role level
     - Required workshop types (formations)
     - Minimum workshop counts (total, online, in-person)
     - Minimum feedback requirements

  5. `client_languages` - Supported languages per client and family
     - ISO language codes
     - Can be family-specific or client-wide

  ## Changes to Existing Tables

  - `workshops`: Add workshop_family_id and workshop_type_id (keeping old columns for compatibility)
  - `users`: Add language_animation_codes (JSONB array of ISO codes)

  ## Security

  All tables have RLS enabled with policies for Client Admins only.
*/

-- =====================================================
-- 1. WORKSHOP FAMILIES TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS workshop_families (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  code text NOT NULL,
  name text NOT NULL,
  description text,
  default_duration_minutes integer NOT NULL DEFAULT 180,
  card_illustration_url text,
  is_active boolean NOT NULL DEFAULT true,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT workshop_families_code_check CHECK (length(code) >= 2 AND length(code) <= 50),
  CONSTRAINT workshop_families_duration_check CHECK (default_duration_minutes > 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS workshop_families_client_code_idx ON workshop_families(client_id, code);
CREATE INDEX IF NOT EXISTS workshop_families_client_id_idx ON workshop_families(client_id);

ALTER TABLE workshop_families ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Client admins can view their client's workshop families"
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

CREATE POLICY "Client admins can insert workshop families for their client"
  ON workshop_families FOR INSERT
  TO authenticated
  WITH CHECK (
    client_id IN (
      SELECT ca.client_id
      FROM client_admins ca
      INNER JOIN users u ON u.id = ca.user_id
      WHERE u.email = current_setting('request.jwt.claims', true)::json->>'email'
    )
  );

CREATE POLICY "Client admins can update their client's workshop families"
  ON workshop_families FOR UPDATE
  TO authenticated
  USING (
    client_id IN (
      SELECT ca.client_id
      FROM client_admins ca
      INNER JOIN users u ON u.id = ca.user_id
      WHERE u.email = current_setting('request.jwt.claims', true)::json->>'email'
    )
  );

CREATE POLICY "Client admins can delete their client's workshop families"
  ON workshop_families FOR DELETE
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
-- 2. WORKSHOP TYPES TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS workshop_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  workshop_family_id uuid REFERENCES workshop_families(id) ON DELETE SET NULL,
  code text NOT NULL,
  label text NOT NULL,
  default_duration_minutes integer NOT NULL DEFAULT 180,
  is_formation boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT workshop_types_code_check CHECK (length(code) >= 2 AND length(code) <= 50),
  CONSTRAINT workshop_types_duration_check CHECK (default_duration_minutes > 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS workshop_types_client_code_idx ON workshop_types(client_id, code);
CREATE INDEX IF NOT EXISTS workshop_types_client_id_idx ON workshop_types(client_id);
CREATE INDEX IF NOT EXISTS workshop_types_family_id_idx ON workshop_types(workshop_family_id);

ALTER TABLE workshop_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Client admins can view their client's workshop types"
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

CREATE POLICY "Client admins can insert workshop types for their client"
  ON workshop_types FOR INSERT
  TO authenticated
  WITH CHECK (
    client_id IN (
      SELECT ca.client_id
      FROM client_admins ca
      INNER JOIN users u ON u.id = ca.user_id
      WHERE u.email = current_setting('request.jwt.claims', true)::json->>'email'
    )
  );

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
  );

CREATE POLICY "Client admins can delete their client's workshop types"
  ON workshop_types FOR DELETE
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
-- 3. ROLE LEVELS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS role_levels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  workshop_family_id uuid NOT NULL REFERENCES workshop_families(id) ON DELETE CASCADE,
  level integer NOT NULL,
  internal_key text NOT NULL,
  label text NOT NULL,
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT role_levels_level_check CHECK (level IN (1, 2, 3, 4)),
  CONSTRAINT role_levels_key_check CHECK (internal_key IN ('public', 'pro', 'trainer', 'instructor'))
);

CREATE UNIQUE INDEX IF NOT EXISTS role_levels_client_family_level_idx
  ON role_levels(client_id, workshop_family_id, level);
CREATE INDEX IF NOT EXISTS role_levels_client_id_idx ON role_levels(client_id);
CREATE INDEX IF NOT EXISTS role_levels_family_id_idx ON role_levels(workshop_family_id);

ALTER TABLE role_levels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Client admins can view their client's role levels"
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

CREATE POLICY "Client admins can insert role levels for their client"
  ON role_levels FOR INSERT
  TO authenticated
  WITH CHECK (
    client_id IN (
      SELECT ca.client_id
      FROM client_admins ca
      INNER JOIN users u ON u.id = ca.user_id
      WHERE u.email = current_setting('request.jwt.claims', true)::json->>'email'
    )
  );

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
  );

CREATE POLICY "Client admins can delete their client's role levels"
  ON role_levels FOR DELETE
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
-- 4. ROLE REQUIREMENTS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS role_requirements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role_level_id uuid NOT NULL REFERENCES role_levels(id) ON DELETE CASCADE,
  required_workshop_types jsonb NOT NULL DEFAULT '[]'::jsonb,
  min_workshops_total integer NOT NULL DEFAULT 0,
  min_workshops_online integer NOT NULL DEFAULT 0,
  min_workshops_in_person integer NOT NULL DEFAULT 0,
  min_feedback_count integer NOT NULL DEFAULT 0,
  min_feedback_avg decimal(3,2) NOT NULL DEFAULT 0.0,
  custom_rules jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT role_requirements_min_workshops_check CHECK (
    min_workshops_total >= 0 AND
    min_workshops_online >= 0 AND
    min_workshops_in_person >= 0
  ),
  CONSTRAINT role_requirements_feedback_check CHECK (
    min_feedback_count >= 0 AND
    min_feedback_avg >= 0.0 AND
    min_feedback_avg <= 5.0
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS role_requirements_role_level_idx ON role_requirements(role_level_id);

ALTER TABLE role_requirements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Client admins can view role requirements for their client"
  ON role_requirements FOR SELECT
  TO authenticated
  USING (
    role_level_id IN (
      SELECT rl.id
      FROM role_levels rl
      INNER JOIN client_admins ca ON ca.client_id = rl.client_id
      INNER JOIN users u ON u.id = ca.user_id
      WHERE u.email = current_setting('request.jwt.claims', true)::json->>'email'
    )
  );

CREATE POLICY "Client admins can insert role requirements for their client"
  ON role_requirements FOR INSERT
  TO authenticated
  WITH CHECK (
    role_level_id IN (
      SELECT rl.id
      FROM role_levels rl
      INNER JOIN client_admins ca ON ca.client_id = rl.client_id
      INNER JOIN users u ON u.id = ca.user_id
      WHERE u.email = current_setting('request.jwt.claims', true)::json->>'email'
    )
  );

CREATE POLICY "Client admins can update role requirements for their client"
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
  );

CREATE POLICY "Client admins can delete role requirements for their client"
  ON role_requirements FOR DELETE
  TO authenticated
  USING (
    role_level_id IN (
      SELECT rl.id
      FROM role_levels rl
      INNER JOIN client_admins ca ON ca.client_id = rl.client_id
      INNER JOIN users u ON u.id = ca.user_id
      WHERE u.email = current_setting('request.jwt.claims', true)::json->>'email'
    )
  );

-- =====================================================
-- 5. CLIENT LANGUAGES TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS client_languages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  workshop_family_id uuid REFERENCES workshop_families(id) ON DELETE CASCADE,
  language_code text NOT NULL,
  language_name text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT client_languages_code_check CHECK (length(language_code) = 2)
);

CREATE UNIQUE INDEX IF NOT EXISTS client_languages_client_family_code_idx
  ON client_languages(client_id, COALESCE(workshop_family_id, '00000000-0000-0000-0000-000000000000'::uuid), language_code);
CREATE INDEX IF NOT EXISTS client_languages_client_id_idx ON client_languages(client_id);
CREATE INDEX IF NOT EXISTS client_languages_family_id_idx ON client_languages(workshop_family_id);

ALTER TABLE client_languages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Client admins can view their client's languages"
  ON client_languages FOR SELECT
  TO authenticated
  USING (
    client_id IN (
      SELECT ca.client_id
      FROM client_admins ca
      INNER JOIN users u ON u.id = ca.user_id
      WHERE u.email = current_setting('request.jwt.claims', true)::json->>'email'
    )
  );

CREATE POLICY "Client admins can insert languages for their client"
  ON client_languages FOR INSERT
  TO authenticated
  WITH CHECK (
    client_id IN (
      SELECT ca.client_id
      FROM client_admins ca
      INNER JOIN users u ON u.id = ca.user_id
      WHERE u.email = current_setting('request.jwt.claims', true)::json->>'email'
    )
  );

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
  );

CREATE POLICY "Client admins can delete their client's languages"
  ON client_languages FOR DELETE
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
-- 6. UPDATE EXISTING TABLES
-- =====================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'workshops' AND column_name = 'workshop_family_id'
  ) THEN
    ALTER TABLE workshops ADD COLUMN workshop_family_id uuid REFERENCES workshop_families(id) ON DELETE RESTRICT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'workshops' AND column_name = 'workshop_type_id'
  ) THEN
    ALTER TABLE workshops ADD COLUMN workshop_type_id uuid REFERENCES workshop_types(id) ON DELETE RESTRICT;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS workshops_family_id_idx ON workshops(workshop_family_id);
CREATE INDEX IF NOT EXISTS workshops_type_id_idx ON workshops(workshop_type_id);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'language_animation_codes'
  ) THEN
    ALTER TABLE users ADD COLUMN language_animation_codes jsonb DEFAULT '[]'::jsonb;
  END IF;
END $$;
