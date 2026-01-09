/*
  # Complete Database Schema for 1er Degré Workshops System
  
  This is a consolidated migration file that creates the complete database schema
  for a fresh Supabase project. It includes:
  - All tables with complete schemas
  - All functions and triggers
  - Row Level Security (RLS) policies
  - All necessary indexes
  
  ## Authentication
  - Uses Supabase Auth (auth.uid() with auth_user_id column)
  - auth_user_id links users table to auth.users
  
  ## Multi-Client Support
  - Supports multiple organizations (clients) with separate data isolation
  - Client admins can manage their client's workshops and users
  - Super admins can manage all clients
  
  ## Co-Organizers
  - Uses junction table (workshop_co_organizers) instead of array column
*/

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to compute can_refund for a participation
CREATE OR REPLACE FUNCTION can_refund_participation(
  p_participation_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_workshop_start timestamptz;
  v_workshop_lifecycle_status text;
  v_participation_created_at timestamptz;
  v_participation_status text;
  v_modified_date_flag boolean;
  v_modified_location_flag boolean;
  v_hours_until_workshop numeric;
BEGIN
  -- Get participation and workshop data
  SELECT 
    w.start_at,
    w.lifecycle_status,
    w.modified_date_flag,
    w.modified_location_flag,
    p.created_at,
    p.status
  INTO 
    v_workshop_start,
    v_workshop_lifecycle_status,
    v_modified_date_flag,
    v_modified_location_flag,
    v_participation_created_at,
    v_participation_status
  FROM participations p
  JOIN workshops w ON p.workshop_id = w.id
  WHERE p.id = p_participation_id;

  -- Cannot refund if already cancelled or refunded
  IF v_participation_status IN ('annule', 'rembourse') THEN
    RETURN false;
  END IF;

  -- Can refund if workshop is cancelled
  IF v_workshop_lifecycle_status = 'canceled' THEN
    RETURN true;
  END IF;

  -- Can refund if date or location was modified after purchase
  IF v_modified_date_flag OR v_modified_location_flag THEN
    RETURN true;
  END IF;

  -- Calculate hours until workshop
  v_hours_until_workshop := EXTRACT(EPOCH FROM (v_workshop_start - now())) / 3600;

  -- Can refund if 72+ hours before workshop start
  IF v_hours_until_workshop >= 72 THEN
    RETURN true;
  END IF;

  -- Otherwise cannot refund
  RETURN false;
END;
$$;

-- Function to update consent timestamp
CREATE OR REPLACE FUNCTION update_consent_timestamp()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF (NEW.consent_transactional IS DISTINCT FROM OLD.consent_transactional) OR
     (NEW.consent_marketing IS DISTINCT FROM OLD.consent_marketing) THEN
    NEW.consent_updated_at = now();
  END IF;
  RETURN NEW;
END;
$$;

-- Function to update mail_logs updated_at
CREATE OR REPLACE FUNCTION update_mail_logs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to update scheduled_emails updated_at
CREATE OR REPLACE FUNCTION update_scheduled_emails_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to get organizers (bypasses RLS for admin queries)
CREATE OR REPLACE FUNCTION get_organizers()
RETURNS TABLE (
  user_id uuid,
  role_count bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    url.user_id,
    COUNT(*)::bigint as role_count
  FROM user_role_levels url
  GROUP BY url.user_id;
END;
$$;

-- ============================================================================
-- CORE TABLES
-- ============================================================================

-- Users table
CREATE TABLE users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  first_name text NOT NULL,
  last_name text NOT NULL,
  phone text,
  birthdate date,
  language_animation text,
  outside_animation text,
  language_animation_codes jsonb DEFAULT '[]'::jsonb,
  signed_contract boolean DEFAULT false,
  signed_contract_year integer,
  roles text[] DEFAULT ARRAY['participant']::text[],
  stripe_customer_id text,
  billing_address jsonb,
  shipping_address jsonb,
  status_labels text[] DEFAULT ARRAY[]::text[],
  consent_transactional boolean DEFAULT true NOT NULL,
  consent_marketing boolean DEFAULT false NOT NULL,
  consent_updated_at timestamptz DEFAULT now(),
  auth_user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  is_super_admin boolean NOT NULL DEFAULT false,
  tenant_id text DEFAULT '1er-Degré',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Clients table
CREATE TABLE clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  name text NOT NULL,
  logo_url text,
  primary_logo_url text,
  secondary_logo_url text,
  favicon_url text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT clients_slug_format CHECK (slug ~ '^[a-z0-9_-]+$'),
  CONSTRAINT clients_name_not_empty CHECK (length(trim(name)) > 0)
);

-- ============================================================================
-- REFERENCE TABLES
-- ============================================================================

-- Workshop families table
CREATE TABLE workshop_families (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  code text NOT NULL,
  name text NOT NULL,
  description text,
  description_short text,
  description_long text,
  default_duration_minutes integer NOT NULL DEFAULT 180,
  card_illustration_url text,
  primary_color text,
  secondary_color text,
  badge_emoji text,
  is_active boolean NOT NULL DEFAULT true,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT workshop_families_code_check CHECK (length(code) >= 2 AND length(code) <= 50),
  CONSTRAINT workshop_families_duration_check CHECK (default_duration_minutes > 0),
  UNIQUE (client_id, code)
);

-- Workshop types table
CREATE TABLE workshop_types (
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
  CONSTRAINT workshop_types_duration_check CHECK (default_duration_minutes > 0),
  UNIQUE (client_id, code)
);

-- Role levels table
CREATE TABLE role_levels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  workshop_family_id uuid NOT NULL REFERENCES workshop_families(id) ON DELETE CASCADE,
  level integer NOT NULL,
  internal_key text NOT NULL,
  label text NOT NULL,
  description text,
  badge_emoji text,
  badge_color_primary text,
  badge_color_bg text,
  description_short text,
  description_long text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT role_levels_level_check CHECK (level IN (1, 2, 3, 4)),
  CONSTRAINT role_levels_key_check CHECK (internal_key IN ('public', 'pro', 'trainer', 'instructor')),
  UNIQUE (client_id, workshop_family_id, level)
);

-- Role requirements table
CREATE TABLE role_requirements (
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
  ),
  UNIQUE (role_level_id)
);

-- Client languages table
CREATE TABLE client_languages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  workshop_family_id uuid REFERENCES workshop_families(id) ON DELETE CASCADE,
  language_code text NOT NULL,
  language_name text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT client_languages_code_check CHECK (length(language_code) = 2),
  UNIQUE (client_id, COALESCE(workshop_family_id, '00000000-0000-0000-0000-000000000000'::uuid), language_code)
);

-- ============================================================================
-- JUNCTION TABLES (that don't depend on workshops)
-- ============================================================================

-- Client admins table
CREATE TABLE client_admins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role text DEFAULT 'admin',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(client_id, user_id),
  CONSTRAINT client_admins_role_check CHECK (role IN ('admin'))
);

-- User role levels table
CREATE TABLE user_role_levels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role_level_id uuid NOT NULL REFERENCES role_levels(id) ON DELETE CASCADE,
  granted_at timestamptz NOT NULL DEFAULT now(),
  granted_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role_level_id)
);

-- ============================================================================
-- MAIN TABLES
-- ============================================================================

-- Workshops table
CREATE TABLE workshops (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  workshop_family_id uuid NOT NULL REFERENCES workshop_families(id) ON DELETE RESTRICT,
  workshop_type_id uuid NOT NULL REFERENCES workshop_types(id) ON DELETE RESTRICT,
  language text NOT NULL,
  organizer uuid REFERENCES users(id) ON DELETE SET NULL,
  client_id uuid NOT NULL REFERENCES clients(id),
  lifecycle_status text NOT NULL CHECK (lifecycle_status IN ('active', 'closed', 'canceled')),
  classification_status text NOT NULL CHECK (classification_status IN (
    'benevole_grand_public', 'interne_asso', 'interne_entreprise', 'interne_profs',
    'interne_etudiants_alumnis', 'interne_elus', 'interne_agents', 'externe_asso',
    'externe_entreprise', 'externe_profs', 'externe_etudiants_alumnis', 'externe_elus', 'externe_agents'
  )),
  audience_number integer NOT NULL CHECK (audience_number >= 0),
  invoice_number text,
  is_remote boolean DEFAULT false,
  visio_link text,
  mural_link text,
  location jsonb,
  start_at timestamptz NOT NULL,
  end_at timestamptz NOT NULL,
  extra_duration_minutes integer DEFAULT 0,
  ics_file_url text,
  date_change_history jsonb DEFAULT '[]'::jsonb,
  location_change_history jsonb DEFAULT '[]'::jsonb,
  modified_date_flag boolean DEFAULT false,
  modified_location_flag boolean DEFAULT false,
  mail_pre_html text,
  mail_pre_subject text,
  mail_post_html text,
  mail_post_subject text,
  tenant_id text DEFAULT '1er-Degré',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Participations table
CREATE TABLE participations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  workshop_id uuid NOT NULL REFERENCES workshops(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  status text NOT NULL CHECK (status IN ('en_attente', 'inscrit', 'paye', 'rembourse', 'echange', 'annule')),
  payment_status text NOT NULL CHECK (payment_status IN ('none', 'pending', 'paid', 'refunded', 'failed')),
  ticket_type text NOT NULL CHECK (ticket_type IN ('normal', 'reduit', 'gratuit', 'pro')),
  price_paid numeric NOT NULL CHECK (price_paid >= 0),
  exchange_parent_participation_id uuid REFERENCES participations(id),
  invoice_url text,
  confirmation_date timestamptz,
  mail_disabled boolean DEFAULT false,
  training_completion jsonb,
  attended boolean,
  is_present boolean DEFAULT false,
  questionnaire_response_id uuid,
  date_confirmation_version integer DEFAULT 0,
  location_confirmation_version integer DEFAULT 0,
  tenant_id text DEFAULT '1er-Degré',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Waitlist entries table
CREATE TABLE waitlist_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  workshop_family text NOT NULL CHECK (workshop_family IN ('FDFP', 'HD')),
  city text NOT NULL,
  radius_km integer DEFAULT 35 CHECK (radius_km >= 0),
  status text NOT NULL CHECK (status IN ('waiting', 'notified', 'converted', 'expired')),
  geographic_hint text,
  notified_at timestamptz,
  notified_workshop_id uuid REFERENCES workshops(id),
  tenant_id text DEFAULT '1er-Degré',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ============================================================================
-- SUPPORTING TABLES
-- ============================================================================

-- Invoices table
CREATE TABLE invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number text NOT NULL UNIQUE,
  order_id uuid,
  workshop_id uuid REFERENCES workshops(id),
  user_id uuid REFERENCES users(id) NOT NULL,
  company_id uuid,
  issue_date date NOT NULL,
  due_date date NOT NULL,
  line_items jsonb NOT NULL,
  subtotal numeric(10, 2) NOT NULL DEFAULT 0,
  tax_rate numeric(5, 4) NOT NULL DEFAULT 0,
  tax_total numeric(10, 2) NOT NULL DEFAULT 0,
  grand_total numeric(10, 2) NOT NULL DEFAULT 0,
  status text NOT NULL CHECK (status IN ('draft', 'issued', 'paid', 'overdue', 'cancelled', 'void')),
  payment_date date,
  payment_method text,
  notes text,
  pdf_url text,
  tenant_id text DEFAULT '1er-Degré' NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Questionnaires table
CREATE TABLE questionnaires (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workshop_id uuid REFERENCES workshops(id),
  title text NOT NULL,
  description text,
  questions jsonb NOT NULL,
  is_active boolean DEFAULT true NOT NULL,
  available_from timestamptz,
  available_until timestamptz,
  tenant_id text DEFAULT '1er-Degré' NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Questionnaire responses table
CREATE TABLE questionnaire_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  questionnaire_id uuid REFERENCES questionnaires(id) NOT NULL,
  user_id uuid REFERENCES users(id) NOT NULL,
  participation_id uuid REFERENCES participations(id),
  responses jsonb NOT NULL,
  submitted_at timestamptz DEFAULT now() NOT NULL,
  tenant_id text DEFAULT '1er-Degré' NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(questionnaire_id, user_id)
);

-- Workshop history logs table
CREATE TABLE workshop_history_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workshop_id uuid NOT NULL REFERENCES workshops(id) ON DELETE CASCADE,
  log_type text NOT NULL CHECK (log_type IN (
    'status_change',
    'field_edit',
    'participant_add',
    'participant_remove',
    'participant_reinscribe',
    'refund',
    'email_sent',
    'date_change',
    'location_change'
  )),
  description text NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  actor_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  tenant_id uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000'::uuid,
  created_at timestamptz DEFAULT now()
);

-- Email templates table
CREATE TABLE email_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  workshop_type text NOT NULL,
  workshop_classification text DEFAULT 'all',
  language text NOT NULL,
  template_type text NOT NULL CHECK (template_type IN ('pre', 'post')),
  subject text NOT NULL,
  html_content text NOT NULL,
  is_official boolean DEFAULT false,
  official_version integer DEFAULT 1,
  last_viewed_official_version integer DEFAULT 0,
  tenant_id uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000'::uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Mail logs table
CREATE TABLE mail_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workshop_id uuid NOT NULL REFERENCES workshops(id) ON DELETE CASCADE,
  participation_id uuid REFERENCES participations(id) ON DELETE SET NULL,
  recipient_email text NOT NULL,
  recipient_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  email_type text NOT NULL CHECK (email_type IN ('pre', 'post', 'spontane')),
  subject text NOT NULL,
  sent_at timestamptz,
  delivery_status text NOT NULL CHECK (delivery_status IN ('queued', 'sent', 'delivered', 'failed')) DEFAULT 'queued',
  error_message text,
  provider_message_id text,
  tenant_id uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000'::uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Scheduled emails table
CREATE TABLE scheduled_emails (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workshop_id uuid NOT NULL REFERENCES workshops(id) ON DELETE CASCADE,
  email_type text NOT NULL CHECK (email_type IN ('pre', 'post', 'spontane')),
  scheduled_at timestamptz NOT NULL,
  status text NOT NULL CHECK (status IN ('pending', 'processing', 'sent', 'failed')) DEFAULT 'pending',
  recipient_count integer NOT NULL DEFAULT 0,
  subject_snapshot text NOT NULL,
  html_snapshot text NOT NULL,
  sent_at timestamptz,
  error_message text,
  tenant_id uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000'::uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ============================================================================
-- JUNCTION TABLES (that depend on workshops)
-- ============================================================================

-- Workshop co-organizers table
CREATE TABLE workshop_co_organizers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workshop_id uuid NOT NULL REFERENCES workshops(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  assigned_at timestamptz DEFAULT now(),
  tenant_id text DEFAULT '1er-Degré',
  UNIQUE (workshop_id, user_id)
);

-- Workshop co-organizer alerts table
CREATE TABLE workshop_co_organizer_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  workshop_id uuid NOT NULL REFERENCES workshops(id) ON DELETE CASCADE,
  dismissed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  tenant_id text DEFAULT '1er-Degré'
);

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Updated_at triggers
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON clients
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_workshop_families_updated_at BEFORE UPDATE ON workshop_families
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_workshop_types_updated_at BEFORE UPDATE ON workshop_types
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_role_levels_updated_at BEFORE UPDATE ON role_levels
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_role_requirements_updated_at BEFORE UPDATE ON role_requirements
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_client_languages_updated_at BEFORE UPDATE ON client_languages
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_client_admins_updated_at BEFORE UPDATE ON client_admins
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_role_levels_updated_at BEFORE UPDATE ON user_role_levels
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_workshops_updated_at BEFORE UPDATE ON workshops
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_participations_updated_at BEFORE UPDATE ON participations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_waitlist_entries_updated_at BEFORE UPDATE ON waitlist_entries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_invoices_updated_at BEFORE UPDATE ON invoices
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_questionnaires_updated_at BEFORE UPDATE ON questionnaires
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_questionnaire_responses_updated_at BEFORE UPDATE ON questionnaire_responses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_email_templates_updated_at BEFORE UPDATE ON email_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER mail_logs_updated_at BEFORE UPDATE ON mail_logs
  FOR EACH ROW EXECUTE FUNCTION update_mail_logs_updated_at();

CREATE TRIGGER scheduled_emails_updated_at BEFORE UPDATE ON scheduled_emails
  FOR EACH ROW EXECUTE FUNCTION update_scheduled_emails_updated_at();

-- Consent timestamp trigger
CREATE TRIGGER trigger_update_consent_timestamp
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_consent_timestamp();

-- ============================================================================
-- ENABLE ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE workshop_families ENABLE ROW LEVEL SECURITY;
ALTER TABLE workshop_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_requirements ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_languages ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_role_levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE workshops ENABLE ROW LEVEL SECURITY;
ALTER TABLE workshop_co_organizers ENABLE ROW LEVEL SECURITY;
ALTER TABLE workshop_co_organizer_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE participations ENABLE ROW LEVEL SECURITY;
ALTER TABLE waitlist_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE questionnaires ENABLE ROW LEVEL SECURITY;
ALTER TABLE questionnaire_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE workshop_history_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE mail_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE scheduled_emails ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- RLS POLICIES - USERS
-- ============================================================================

CREATE POLICY "Users can view own profile"
  ON users FOR SELECT
  TO authenticated
  USING (auth_user_id = auth.uid());

CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  TO authenticated
  USING (auth_user_id = auth.uid())
  WITH CHECK (auth_user_id = auth.uid());

CREATE POLICY "Users can insert own profile during sign-up"
  ON users FOR INSERT
  TO authenticated
  WITH CHECK (auth_user_id = auth.uid());

CREATE POLICY "Super admins can view all users"
  ON users FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE auth_user_id = auth.uid()
      AND is_super_admin = true
    )
  );

CREATE POLICY "Super admins can update all users"
  ON users FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE auth_user_id = auth.uid()
      AND is_super_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE auth_user_id = auth.uid()
      AND is_super_admin = true
    )
  );

-- ============================================================================
-- RLS POLICIES - CLIENTS
-- ============================================================================

CREATE POLICY "Super admins can view all clients"
  ON clients FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE auth_user_id = auth.uid()
      AND is_super_admin = true
    )
  );

CREATE POLICY "Client admins can view their clients"
  ON clients FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT ca.client_id
      FROM client_admins ca
      JOIN users u ON u.id = ca.user_id
      WHERE u.auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Super admins can insert clients"
  ON clients FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE auth_user_id = auth.uid()
      AND is_super_admin = true
    )
  );

CREATE POLICY "Super admins can update clients"
  ON clients FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE auth_user_id = auth.uid()
      AND is_super_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE auth_user_id = auth.uid()
      AND is_super_admin = true
    )
  );

CREATE POLICY "Super admins can delete clients"
  ON clients FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE auth_user_id = auth.uid()
      AND is_super_admin = true
    )
  );

-- ============================================================================
-- RLS POLICIES - CLIENT_ADMINS
-- ============================================================================

CREATE POLICY "Client admins can view their assignments"
  ON client_admins FOR SELECT
  TO authenticated
  USING (
    user_id IN (
      SELECT id FROM users WHERE auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Super admins can view all client admins"
  ON client_admins FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE auth_user_id = auth.uid()
      AND is_super_admin = true
    )
  );

CREATE POLICY "Client admins can view co-admins"
  ON client_admins FOR SELECT
  TO authenticated
  USING (
    client_id IN (
      SELECT ca.client_id
      FROM client_admins ca
      JOIN users u ON u.id = ca.user_id
      WHERE u.auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Super admins can manage all client admins"
  ON client_admins FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE auth_user_id = auth.uid()
      AND is_super_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE auth_user_id = auth.uid()
      AND is_super_admin = true
    )
  );

-- ============================================================================
-- RLS POLICIES - WORKSHOP_FAMILIES
-- ============================================================================

CREATE POLICY "Client admins can view their client's workshop families"
  ON workshop_families FOR SELECT
  TO authenticated
  USING (
    client_id IN (
      SELECT ca.client_id
      FROM client_admins ca
      JOIN users u ON u.id = ca.user_id
      WHERE u.auth_user_id = auth.uid()
    )
  );

CREATE POLICY "System admins can view all workshop families"
  ON workshop_families FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE auth_user_id = auth.uid()
      AND 'admin' = ANY(roles)
    )
  );

CREATE POLICY "Super admins can view all workshop families"
  ON workshop_families FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE auth_user_id = auth.uid()
      AND is_super_admin = true
    )
  );

CREATE POLICY "Client admins can insert workshop families for their client"
  ON workshop_families FOR INSERT
  TO authenticated
  WITH CHECK (
    client_id IN (
      SELECT ca.client_id
      FROM client_admins ca
      JOIN users u ON u.id = ca.user_id
      WHERE u.auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Client admins can update their client's workshop families"
  ON workshop_families FOR UPDATE
  TO authenticated
  USING (
    client_id IN (
      SELECT ca.client_id
      FROM client_admins ca
      JOIN users u ON u.id = ca.user_id
      WHERE u.auth_user_id = auth.uid()
    )
  )
  WITH CHECK (
    client_id IN (
      SELECT ca.client_id
      FROM client_admins ca
      JOIN users u ON u.id = ca.user_id
      WHERE u.auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Client admins can delete their client's workshop families"
  ON workshop_families FOR DELETE
  TO authenticated
  USING (
    client_id IN (
      SELECT ca.client_id
      FROM client_admins ca
      JOIN users u ON u.id = ca.user_id
      WHERE u.auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Super admins can manage all workshop families"
  ON workshop_families FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE auth_user_id = auth.uid()
      AND is_super_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE auth_user_id = auth.uid()
      AND is_super_admin = true
    )
  );

-- ============================================================================
-- RLS POLICIES - WORKSHOP_TYPES
-- ============================================================================

CREATE POLICY "Client admins can view their client's workshop types"
  ON workshop_types FOR SELECT
  TO authenticated
  USING (
    client_id IN (
      SELECT ca.client_id
      FROM client_admins ca
      INNER JOIN users u ON u.id = ca.user_id
      WHERE u.auth_user_id = auth.uid()
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
      WHERE u.auth_user_id = auth.uid()
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
      WHERE u.auth_user_id = auth.uid()
    )
  )
  WITH CHECK (
    client_id IN (
      SELECT ca.client_id
      FROM client_admins ca
      INNER JOIN users u ON u.id = ca.user_id
      WHERE u.auth_user_id = auth.uid()
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
      WHERE u.auth_user_id = auth.uid()
    )
  );

-- ============================================================================
-- RLS POLICIES - ROLE_LEVELS
-- ============================================================================

CREATE POLICY "Client admins can view their client's role levels"
  ON role_levels FOR SELECT
  TO authenticated
  USING (
    client_id IN (
      SELECT ca.client_id
      FROM client_admins ca
      INNER JOIN users u ON u.id = ca.user_id
      WHERE u.auth_user_id = auth.uid()
    )
  );

CREATE POLICY "System admins can view all role levels"
  ON role_levels FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE auth_user_id = auth.uid()
      AND 'admin' = ANY(roles)
    )
  );

CREATE POLICY "Super admins can view all role levels"
  ON role_levels FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE auth_user_id = auth.uid()
      AND is_super_admin = true
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
      WHERE u.auth_user_id = auth.uid()
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
      WHERE u.auth_user_id = auth.uid()
    )
  )
  WITH CHECK (
    client_id IN (
      SELECT ca.client_id
      FROM client_admins ca
      INNER JOIN users u ON u.id = ca.user_id
      WHERE u.auth_user_id = auth.uid()
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
      WHERE u.auth_user_id = auth.uid()
    )
  );

-- ============================================================================
-- RLS POLICIES - ROLE_REQUIREMENTS
-- ============================================================================

CREATE POLICY "Client admins can view role requirements for their client"
  ON role_requirements FOR SELECT
  TO authenticated
  USING (
    role_level_id IN (
      SELECT rl.id
      FROM role_levels rl
      INNER JOIN client_admins ca ON ca.client_id = rl.client_id
      INNER JOIN users u ON u.id = ca.user_id
      WHERE u.auth_user_id = auth.uid()
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
      WHERE u.auth_user_id = auth.uid()
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
      WHERE u.auth_user_id = auth.uid()
    )
  )
  WITH CHECK (
    role_level_id IN (
      SELECT rl.id
      FROM role_levels rl
      INNER JOIN client_admins ca ON ca.client_id = rl.client_id
      INNER JOIN users u ON u.id = ca.user_id
      WHERE u.auth_user_id = auth.uid()
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
      WHERE u.auth_user_id = auth.uid()
    )
  );

-- ============================================================================
-- RLS POLICIES - CLIENT_LANGUAGES
-- ============================================================================

CREATE POLICY "Client admins can view their client's languages"
  ON client_languages FOR SELECT
  TO authenticated
  USING (
    client_id IN (
      SELECT ca.client_id
      FROM client_admins ca
      INNER JOIN users u ON u.id = ca.user_id
      WHERE u.auth_user_id = auth.uid()
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
      WHERE u.auth_user_id = auth.uid()
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
      WHERE u.auth_user_id = auth.uid()
    )
  )
  WITH CHECK (
    client_id IN (
      SELECT ca.client_id
      FROM client_admins ca
      INNER JOIN users u ON u.id = ca.user_id
      WHERE u.auth_user_id = auth.uid()
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
      WHERE u.auth_user_id = auth.uid()
    )
  );

-- ============================================================================
-- RLS POLICIES - WORKSHOP_CO_ORGANIZERS
-- ============================================================================

CREATE POLICY "Users can view their co-organizer assignments"
  ON workshop_co_organizers FOR SELECT
  TO authenticated
  USING (
    user_id IN (
      SELECT id FROM users WHERE auth_user_id = auth.uid()
    )
    OR
    workshop_id IN (
      SELECT id FROM workshops WHERE organizer IN (
        SELECT id FROM users WHERE auth_user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Primary organizers can insert co-organizers"
  ON workshop_co_organizers FOR INSERT
  TO authenticated
  WITH CHECK (
    workshop_id IN (
      SELECT id FROM workshops WHERE organizer IN (
        SELECT id FROM users WHERE auth_user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Primary organizers can delete co-organizers"
  ON workshop_co_organizers FOR DELETE
  TO authenticated
  USING (
    workshop_id IN (
      SELECT id FROM workshops WHERE organizer IN (
        SELECT id FROM users WHERE auth_user_id = auth.uid()
      )
    )
  );

-- ============================================================================
-- RLS POLICIES - WORKSHOP_CO_ORGANIZER_ALERTS
-- ============================================================================

CREATE POLICY "Users can view their own alerts"
  ON workshop_co_organizer_alerts FOR SELECT
  TO authenticated
  USING (
    user_id IN (
      SELECT id FROM users WHERE auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Anyone can insert alerts"
  ON workshop_co_organizer_alerts FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update their own alerts"
  ON workshop_co_organizer_alerts FOR UPDATE
  TO authenticated
  USING (
    user_id IN (
      SELECT id FROM users WHERE auth_user_id = auth.uid()
    )
  )
  WITH CHECK (
    user_id IN (
      SELECT id FROM users WHERE auth_user_id = auth.uid()
    )
  );

-- ============================================================================
-- RLS POLICIES - USER_ROLE_LEVELS
-- ============================================================================

CREATE POLICY "Users can view their own role levels"
  ON user_role_levels FOR SELECT
  TO authenticated
  USING (
    user_id IN (
      SELECT id FROM users WHERE auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Client admins can view role levels for their client"
  ON user_role_levels FOR SELECT
  TO authenticated
  USING (
    role_level_id IN (
      SELECT rl.id FROM role_levels rl
      WHERE rl.client_id IN (
        SELECT ca.client_id
        FROM client_admins ca
        INNER JOIN users u ON u.id = ca.user_id
        WHERE u.auth_user_id = auth.uid()
      )
    )
  );

CREATE POLICY "System admins can view all role levels"
  ON user_role_levels FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE auth_user_id = auth.uid()
      AND 'admin' = ANY(roles)
    )
  );

CREATE POLICY "Client admins can grant role levels for their client"
  ON user_role_levels FOR INSERT
  TO authenticated
  WITH CHECK (
    role_level_id IN (
      SELECT rl.id FROM role_levels rl
      WHERE rl.client_id IN (
        SELECT ca.client_id
        FROM client_admins ca
        INNER JOIN users u ON u.id = ca.user_id
        WHERE u.auth_user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Client admins can revoke role levels for their client"
  ON user_role_levels FOR DELETE
  TO authenticated
  USING (
    role_level_id IN (
      SELECT rl.id FROM role_levels rl
      WHERE rl.client_id IN (
        SELECT ca.client_id
        FROM client_admins ca
        INNER JOIN users u ON u.id = ca.user_id
        WHERE u.auth_user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Super admins can manage all role levels"
  ON user_role_levels FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE auth_user_id = auth.uid()
      AND is_super_admin = true
    )
  );

-- ============================================================================
-- RLS POLICIES - WORKSHOPS
-- ============================================================================

CREATE POLICY "Public can view active future workshops"
  ON workshops FOR SELECT
  TO public
  USING (lifecycle_status = 'active' AND start_at > now());

CREATE POLICY "Authenticated can view all workshops"
  ON workshops FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Organizers can insert own workshops"
  ON workshops FOR INSERT
  TO authenticated
  WITH CHECK (
    organizer IN (
      SELECT id FROM users WHERE auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Organizers can update own workshops"
  ON workshops FOR UPDATE
  TO authenticated
  USING (
    organizer IN (
      SELECT id FROM users WHERE auth_user_id = auth.uid()
    )
  )
  WITH CHECK (
    organizer IN (
      SELECT id FROM users WHERE auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Co-organizers can update workshops"
  ON workshops FOR UPDATE
  TO authenticated
  USING (
    id IN (
      SELECT workshop_id FROM workshop_co_organizers
      WHERE user_id IN (
        SELECT id FROM users WHERE auth_user_id = auth.uid()
      )
    )
  )
  WITH CHECK (
    id IN (
      SELECT workshop_id FROM workshop_co_organizers
      WHERE user_id IN (
        SELECT id FROM users WHERE auth_user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Client admins can manage workshops for their client"
  ON workshops FOR ALL
  TO authenticated
  USING (
    client_id IN (
      SELECT ca.client_id
      FROM client_admins ca
      JOIN users u ON u.id = ca.user_id
      WHERE u.auth_user_id = auth.uid()
    )
  )
  WITH CHECK (
    client_id IN (
      SELECT ca.client_id
      FROM client_admins ca
      JOIN users u ON u.id = ca.user_id
      WHERE u.auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Super admins can manage all workshops"
  ON workshops FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE auth_user_id = auth.uid()
      AND is_super_admin = true
    )
  );

-- ============================================================================
-- RLS POLICIES - PARTICIPATIONS
-- ============================================================================

CREATE POLICY "Users can view own participations"
  ON participations FOR SELECT
  TO authenticated
  USING (
    user_id IN (
      SELECT id FROM users WHERE auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own participations"
  ON participations FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id IN (
      SELECT id FROM users WHERE auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own participations"
  ON participations FOR UPDATE
  TO authenticated
  USING (
    user_id IN (
      SELECT id FROM users WHERE auth_user_id = auth.uid()
    )
  )
  WITH CHECK (
    user_id IN (
      SELECT id FROM users WHERE auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Organizers can view participations for their workshops"
  ON participations FOR SELECT
  TO authenticated
  USING (
    workshop_id IN (
      SELECT id FROM workshops WHERE organizer IN (
        SELECT id FROM users WHERE auth_user_id = auth.uid()
      )
      OR id IN (
        SELECT workshop_id FROM workshop_co_organizers
        WHERE user_id IN (
          SELECT id FROM users WHERE auth_user_id = auth.uid()
        )
      )
    )
  );

CREATE POLICY "Organizers can update participations for their workshops"
  ON participations FOR UPDATE
  TO authenticated
  USING (
    workshop_id IN (
      SELECT id FROM workshops WHERE organizer IN (
        SELECT id FROM users WHERE auth_user_id = auth.uid()
      )
      OR id IN (
        SELECT workshop_id FROM workshop_co_organizers
        WHERE user_id IN (
          SELECT id FROM users WHERE auth_user_id = auth.uid()
        )
      )
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
      WHERE u.auth_user_id = auth.uid()
    )
  );

-- ============================================================================
-- RLS POLICIES - WAITLIST_ENTRIES
-- ============================================================================

CREATE POLICY "Anyone can view own waitlist entries"
  ON waitlist_entries FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Anyone can insert waitlist entries"
  ON waitlist_entries FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Users can update own waitlist entries"
  ON waitlist_entries FOR UPDATE
  TO authenticated
  USING (
    user_id IN (
      SELECT id FROM users WHERE auth_user_id = auth.uid()
    )
    OR email = (
      SELECT email FROM users WHERE auth_user_id = auth.uid()
    )
  )
  WITH CHECK (
    user_id IN (
      SELECT id FROM users WHERE auth_user_id = auth.uid()
    )
    OR email = (
      SELECT email FROM users WHERE auth_user_id = auth.uid()
    )
  );

-- ============================================================================
-- RLS POLICIES - INVOICES
-- ============================================================================

CREATE POLICY "Users can view own invoices"
  ON invoices FOR SELECT
  TO authenticated
  USING (
    user_id IN (
      SELECT id FROM users WHERE auth_user_id = auth.uid()
    )
  );

-- ============================================================================
-- RLS POLICIES - QUESTIONNAIRES
-- ============================================================================

CREATE POLICY "Users can view questionnaires for attended workshops"
  ON questionnaires FOR SELECT
  TO authenticated
  USING (
    is_active = true AND
    (
      workshop_id IS NULL OR
      EXISTS (
        SELECT 1 FROM participations
        WHERE participations.workshop_id = questionnaires.workshop_id
        AND participations.user_id IN (
          SELECT id FROM users WHERE auth_user_id = auth.uid()
        )
        AND participations.attended = true
      )
    )
  );

-- ============================================================================
-- RLS POLICIES - QUESTIONNAIRE_RESPONSES
-- ============================================================================

CREATE POLICY "Users can view own questionnaire responses"
  ON questionnaire_responses FOR SELECT
  TO authenticated
  USING (
    user_id IN (
      SELECT id FROM users WHERE auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own questionnaire responses"
  ON questionnaire_responses FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id IN (
      SELECT id FROM users WHERE auth_user_id = auth.uid()
    )
  );

-- ============================================================================
-- RLS POLICIES - WORKSHOP_HISTORY_LOGS
-- ============================================================================

CREATE POLICY "Organizers can view workshop history logs"
  ON workshop_history_logs FOR SELECT
  TO authenticated
  USING (
    workshop_id IN (
      SELECT id FROM workshops WHERE organizer IN (
        SELECT id FROM users WHERE auth_user_id = auth.uid()
      )
      OR id IN (
        SELECT workshop_id FROM workshop_co_organizers
        WHERE user_id IN (
          SELECT id FROM users WHERE auth_user_id = auth.uid()
        )
      )
    )
  );

CREATE POLICY "Authenticated users can create workshop history logs"
  ON workshop_history_logs FOR INSERT
  TO authenticated
  WITH CHECK (
    workshop_id IN (
      SELECT id FROM workshops WHERE organizer IN (
        SELECT id FROM users WHERE auth_user_id = auth.uid()
      )
      OR id IN (
        SELECT workshop_id FROM workshop_co_organizers
        WHERE user_id IN (
          SELECT id FROM users WHERE auth_user_id = auth.uid()
        )
      )
    )
  );

CREATE POLICY "Admins can view all workshop history logs"
  ON workshop_history_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE auth_user_id = auth.uid()
      AND 'admin' = ANY(roles)
    )
  );

-- ============================================================================
-- RLS POLICIES - EMAIL_TEMPLATES
-- ============================================================================

CREATE POLICY "Anyone can read official templates"
  ON email_templates FOR SELECT
  TO authenticated
  USING (is_official = true);

CREATE POLICY "Users can read own templates"
  ON email_templates FOR SELECT
  TO authenticated
  USING (
    user_id IN (
      SELECT id FROM users WHERE auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create own templates"
  ON email_templates FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id IN (
      SELECT id FROM users WHERE auth_user_id = auth.uid()
    )
    AND is_official = false
  );

CREATE POLICY "Users can update own templates"
  ON email_templates FOR UPDATE
  TO authenticated
  USING (
    user_id IN (
      SELECT id FROM users WHERE auth_user_id = auth.uid()
    )
  )
  WITH CHECK (
    user_id IN (
      SELECT id FROM users WHERE auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own templates"
  ON email_templates FOR DELETE
  TO authenticated
  USING (
    user_id IN (
      SELECT id FROM users WHERE auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can insert official templates"
  ON email_templates FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE auth_user_id = auth.uid()
      AND 'admin' = ANY(roles)
    )
    AND is_official = true
  );

CREATE POLICY "Admins can update official templates"
  ON email_templates FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE auth_user_id = auth.uid()
      AND 'admin' = ANY(roles)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE auth_user_id = auth.uid()
      AND 'admin' = ANY(roles)
    )
  );

-- ============================================================================
-- RLS POLICIES - MAIL_LOGS
-- ============================================================================

CREATE POLICY "Public can view mail logs"
  ON mail_logs FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Public can insert mail logs"
  ON mail_logs FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Public can update mail logs"
  ON mail_logs FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- RLS POLICIES - SCHEDULED_EMAILS
-- ============================================================================

CREATE POLICY "Public can view scheduled emails"
  ON scheduled_emails FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Public can insert scheduled emails"
  ON scheduled_emails FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Public can update scheduled emails"
  ON scheduled_emails FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Users indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_tenant ON users(tenant_id);
CREATE INDEX idx_users_auth_user_id ON users(auth_user_id);
CREATE INDEX idx_users_roles_gin ON users USING gin(roles);
CREATE INDEX users_is_super_admin_idx ON users(is_super_admin) WHERE is_super_admin = true;

-- Clients indexes
CREATE INDEX idx_clients_slug ON clients(slug);
CREATE INDEX idx_clients_is_active ON clients(is_active);

-- Workshop families indexes
CREATE INDEX workshop_families_client_id_idx ON workshop_families(client_id);
CREATE UNIQUE INDEX workshop_families_client_code_idx ON workshop_families(client_id, code);

-- Workshop types indexes
CREATE INDEX workshop_types_client_id_idx ON workshop_types(client_id);
CREATE INDEX workshop_types_family_id_idx ON workshop_types(workshop_family_id);
CREATE UNIQUE INDEX workshop_types_client_code_idx ON workshop_types(client_id, code);

-- Role levels indexes
CREATE INDEX role_levels_client_id_idx ON role_levels(client_id);
CREATE INDEX role_levels_family_id_idx ON role_levels(workshop_family_id);
CREATE UNIQUE INDEX role_levels_client_family_level_idx ON role_levels(client_id, workshop_family_id, level);

-- Role requirements indexes
CREATE UNIQUE INDEX role_requirements_role_level_idx ON role_requirements(role_level_id);

-- Client languages indexes
CREATE INDEX client_languages_client_id_idx ON client_languages(client_id);
CREATE INDEX client_languages_family_id_idx ON client_languages(workshop_family_id);
CREATE UNIQUE INDEX client_languages_client_family_code_idx ON client_languages(client_id, COALESCE(workshop_family_id, '00000000-0000-0000-0000-000000000000'::uuid), language_code);

-- Client admins indexes
CREATE INDEX idx_client_admins_client ON client_admins(client_id);
CREATE INDEX idx_client_admins_user ON client_admins(user_id);
CREATE INDEX idx_client_admins_role ON client_admins(role);
CREATE UNIQUE INDEX client_admins_user_client_unique ON client_admins(user_id, client_id);

-- Workshop co-organizers indexes
CREATE INDEX idx_workshop_co_organizers_workshop ON workshop_co_organizers(workshop_id);
CREATE INDEX idx_workshop_co_organizers_user ON workshop_co_organizers(user_id);
CREATE INDEX idx_workshop_co_organizers_tenant ON workshop_co_organizers(tenant_id);

-- Co-organizer alerts indexes
CREATE INDEX idx_co_organizer_alerts_user ON workshop_co_organizer_alerts(user_id);
CREATE INDEX idx_co_organizer_alerts_workshop ON workshop_co_organizer_alerts(workshop_id);
CREATE INDEX idx_co_organizer_alerts_dismissed ON workshop_co_organizer_alerts(dismissed_at);
CREATE INDEX idx_co_organizer_alerts_tenant ON workshop_co_organizer_alerts(tenant_id);

-- User role levels indexes
CREATE INDEX user_role_levels_user_id_idx ON user_role_levels(user_id);
CREATE INDEX user_role_levels_role_level_id_idx ON user_role_levels(role_level_id);

-- Workshops indexes
CREATE INDEX idx_workshops_organizer ON workshops(organizer);
CREATE INDEX idx_workshops_lifecycle_status ON workshops(lifecycle_status);
CREATE INDEX idx_workshops_start_at ON workshops(start_at);
CREATE INDEX idx_workshops_language ON workshops(language);
CREATE INDEX idx_workshops_is_remote ON workshops(is_remote);
CREATE INDEX idx_workshops_tenant ON workshops(tenant_id);
CREATE INDEX idx_workshops_client_id ON workshops(client_id);
CREATE INDEX idx_workshops_workshop_family_id ON workshops(workshop_family_id);
CREATE INDEX idx_workshops_workshop_type_id ON workshops(workshop_type_id);

-- Participations indexes
CREATE INDEX idx_participations_user ON participations(user_id);
CREATE INDEX idx_participations_workshop ON participations(workshop_id);
CREATE INDEX idx_participations_status ON participations(status);
CREATE INDEX idx_participations_tenant ON participations(tenant_id);
CREATE INDEX participations_client_id_idx ON participations(client_id);

-- Waitlist indexes
CREATE INDEX idx_waitlist_email ON waitlist_entries(email);
CREATE INDEX idx_waitlist_user ON waitlist_entries(user_id);
CREATE INDEX idx_waitlist_workshop_family ON waitlist_entries(workshop_family);
CREATE INDEX idx_waitlist_status ON waitlist_entries(status);
CREATE INDEX idx_waitlist_city ON waitlist_entries(city);
CREATE INDEX idx_waitlist_tenant ON waitlist_entries(tenant_id);

-- Invoices indexes
CREATE INDEX idx_invoices_user_id ON invoices(user_id);
CREATE INDEX idx_invoices_workshop_id ON invoices(workshop_id);

-- Questionnaires indexes
CREATE INDEX idx_questionnaires_workshop_id ON questionnaires(workshop_id);

-- Questionnaire responses indexes
CREATE INDEX idx_questionnaire_responses_user_id ON questionnaire_responses(user_id);
CREATE INDEX idx_questionnaire_responses_questionnaire_id ON questionnaire_responses(questionnaire_id);

-- Workshop history logs indexes
CREATE INDEX idx_workshop_history_logs_workshop_id ON workshop_history_logs(workshop_id);
CREATE INDEX idx_workshop_history_logs_created_at ON workshop_history_logs(created_at DESC);
CREATE INDEX idx_workshop_history_logs_log_type ON workshop_history_logs(log_type);
CREATE INDEX idx_workshop_history_logs_actor_user_id ON workshop_history_logs(actor_user_id);

-- Email templates indexes
CREATE INDEX idx_email_templates_user_id ON email_templates(user_id);
CREATE INDEX idx_email_templates_lookup ON email_templates(workshop_type, language, template_type) WHERE is_official = true;
CREATE INDEX idx_email_templates_official ON email_templates(is_official);
CREATE INDEX idx_email_templates_tenant ON email_templates(tenant_id);

-- Mail logs indexes
CREATE INDEX idx_mail_logs_workshop_id ON mail_logs(workshop_id);
CREATE INDEX idx_mail_logs_participation_id ON mail_logs(participation_id) WHERE participation_id IS NOT NULL;
CREATE INDEX idx_mail_logs_email_type ON mail_logs(email_type);
CREATE INDEX idx_mail_logs_delivery_status ON mail_logs(delivery_status);
CREATE INDEX idx_mail_logs_workshop_participant ON mail_logs(workshop_id, participation_id);

-- Scheduled emails indexes
CREATE INDEX idx_scheduled_emails_workshop_id ON scheduled_emails(workshop_id);
CREATE INDEX idx_scheduled_emails_email_type ON scheduled_emails(email_type);
CREATE INDEX idx_scheduled_emails_status ON scheduled_emails(status);
CREATE INDEX idx_scheduled_emails_scheduled_at ON scheduled_emails(scheduled_at);
CREATE INDEX idx_scheduled_emails_workshop_type ON scheduled_emails(workshop_id, email_type);

-- ============================================================================
-- GRANTS
-- ============================================================================

GRANT EXECUTE ON FUNCTION get_organizers() TO authenticated;
