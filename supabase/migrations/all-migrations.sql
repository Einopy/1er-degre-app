/*
  =============================================================================
  1er Degré Workshop Management System - Clean Database Schema
  =============================================================================

  Ce fichier SQL crée le schéma complet pour le système de gestion d'ateliers
  "1er Degré". Il est conçu pour être exécuté d'un seul coup sur une base
  Supabase vide.

  ## Choix architecturaux

  -- NOTE: On utilise la table de jonction workshop_co_organizers au lieu de
  -- la colonne co_organizers uuid[] pour une meilleure flexibilité relationnelle
  -- et des RLS policies plus propres.

  -- NOTE: L'authentification utilise exclusivement Supabase Auth :
  -- - auth.uid() pour identifier l'utilisateur connecté
  -- - users.auth_user_id pour lier notre table users à auth.users
  -- - Plus de current_setting('request.jwt.claims')

  -- NOTE: La colonne users.roles a été supprimée au profit de user_role_levels
  -- qui permet une gestion relationnelle multi-client des permissions.

  ## Structure du fichier
  1. Extensions
  2. Fonctions utilitaires
  3. Tables (dans l'ordre des dépendances)
  4. Indexes
  5. Triggers
  6. Enable RLS
  7. RLS Policies
  8. Données d'initialisation
  9. Storage buckets

  =============================================================================
*/

-- =============================================================================
-- 1. EXTENSIONS
-- =============================================================================

-- Les extensions nécessaires sont généralement déjà activées sur Supabase

-- =============================================================================
-- 2. FONCTIONS UTILITAIRES
-- =============================================================================

-- Fonction générique pour mettre à jour updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Fonction pour vérifier si un utilisateur peut être remboursé
CREATE OR REPLACE FUNCTION can_refund_participation(p_participation_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_workshop_start timestamptz;
  v_workshop_lifecycle_status text;
  v_participation_status text;
  v_modified_date_flag boolean;
  v_modified_location_flag boolean;
  v_hours_until_workshop numeric;
BEGIN
  SELECT 
    w.start_at,
    w.lifecycle_status,
    w.modified_date_flag,
    w.modified_location_flag,
    p.status
  INTO 
    v_workshop_start,
    v_workshop_lifecycle_status,
    v_modified_date_flag,
    v_modified_location_flag,
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

  RETURN false;
END;
$$;

-- Fonction pour mettre à jour les références d'organisateur
CREATE OR REPLACE FUNCTION update_workshop_organizer(old_user_id uuid, new_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE workshops
  SET organizer = new_user_id
  WHERE organizer = old_user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION update_workshop_organizer(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION update_workshop_organizer(uuid, uuid) TO service_role;

-- =============================================================================
-- 3. TABLES
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 3.1 USERS - Profils utilisateurs
-- -----------------------------------------------------------------------------
CREATE TABLE users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id uuid UNIQUE,
  email text UNIQUE NOT NULL,
  first_name text NOT NULL,
  last_name text NOT NULL,
  phone text,
  birthdate date,
  language_animation text,
  language_animation_codes jsonb DEFAULT '[]'::jsonb,
  outside_animation text,
  signed_contract boolean DEFAULT false,
  signed_contract_year integer,
  stripe_customer_id text,
  billing_address jsonb,
  shipping_address jsonb,
  status_labels text[] DEFAULT ARRAY[]::text[],
  is_super_admin boolean NOT NULL DEFAULT false,
  password_hash text,
  consent_transactional boolean DEFAULT true NOT NULL,
  consent_marketing boolean DEFAULT false NOT NULL,
  consent_updated_at timestamptz DEFAULT now(),
  tenant_id text DEFAULT '1er-Degré',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

COMMENT ON TABLE users IS 'Profils utilisateurs liés à Supabase Auth via auth_user_id';
COMMENT ON COLUMN users.auth_user_id IS 'Référence à auth.users.id pour Supabase Auth';
COMMENT ON COLUMN users.is_super_admin IS 'Super admin global pouvant gérer tous les clients';

-- -----------------------------------------------------------------------------
-- 3.2 CLIENTS - Organisations/marques multi-tenant
-- -----------------------------------------------------------------------------
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

COMMENT ON TABLE clients IS 'Organisations/marques utilisant la plateforme (multi-tenant)';

-- -----------------------------------------------------------------------------
-- 3.3 CLIENT_ADMINS - Administrateurs par client
-- -----------------------------------------------------------------------------
CREATE TABLE client_admins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role text DEFAULT 'admin',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT client_admins_role_check CHECK (role IN ('admin')),
  CONSTRAINT client_admins_unique UNIQUE (client_id, user_id)
);

COMMENT ON TABLE client_admins IS 'Liaison utilisateurs-clients pour les administrateurs';

-- -----------------------------------------------------------------------------
-- 3.4 WORKSHOP_FAMILIES - Familles d'ateliers (FDFP, HD, etc.)
-- -----------------------------------------------------------------------------
CREATE TABLE workshop_families (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  code text NOT NULL,
  name text NOT NULL,
  description text,
  default_duration_minutes integer NOT NULL DEFAULT 180,
  card_illustration_url text,
  primary_color text,
  secondary_color text,
  badge_emoji text,
  description_short text,
  description_long text,
  is_active boolean NOT NULL DEFAULT true,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT workshop_families_code_check CHECK (length(code) >= 2 AND length(code) <= 50),
  CONSTRAINT workshop_families_duration_check CHECK (default_duration_minutes > 0)
);

CREATE UNIQUE INDEX workshop_families_client_code_idx ON workshop_families(client_id, code);

COMMENT ON TABLE workshop_families IS 'Familles/types d''ateliers par client (ex: FDFP, HD)';

-- -----------------------------------------------------------------------------
-- 3.5 WORKSHOP_TYPES - Types d'ateliers
-- -----------------------------------------------------------------------------
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
  CONSTRAINT workshop_types_duration_check CHECK (default_duration_minutes > 0)
);

CREATE UNIQUE INDEX workshop_types_client_code_idx ON workshop_types(client_id, code);

COMMENT ON TABLE workshop_types IS 'Types d''ateliers (workshop, formation, formation_pro, etc.)';

-- -----------------------------------------------------------------------------
-- 3.6 ROLE_LEVELS - Niveaux de rôle par famille
-- -----------------------------------------------------------------------------
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
  CONSTRAINT role_levels_key_check CHECK (internal_key IN ('public', 'pro', 'trainer', 'instructor'))
);

CREATE UNIQUE INDEX role_levels_client_family_level_idx ON role_levels(client_id, workshop_family_id, level);

COMMENT ON TABLE role_levels IS 'Niveaux de certification (Animateur, Pro, Formateur, Instructeur)';

-- -----------------------------------------------------------------------------
-- 3.7 ROLE_REQUIREMENTS - Prérequis pour chaque niveau
-- -----------------------------------------------------------------------------
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
  )
);

CREATE UNIQUE INDEX role_requirements_role_level_idx ON role_requirements(role_level_id);

COMMENT ON TABLE role_requirements IS 'Prérequis pour obtenir chaque niveau de rôle';

-- -----------------------------------------------------------------------------
-- 3.8 CLIENT_LANGUAGES - Langues par client
-- -----------------------------------------------------------------------------
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
  CONSTRAINT client_languages_code_check CHECK (length(language_code) = 2)
);

CREATE UNIQUE INDEX client_languages_client_family_code_idx 
  ON client_languages(client_id, COALESCE(workshop_family_id, '00000000-0000-0000-0000-000000000000'::uuid), language_code);

COMMENT ON TABLE client_languages IS 'Langues supportées par client/famille';

-- -----------------------------------------------------------------------------
-- 3.9 USER_ROLE_LEVELS - Rôles assignés aux utilisateurs
-- -----------------------------------------------------------------------------
CREATE TABLE user_role_levels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role_level_id uuid NOT NULL REFERENCES role_levels(id) ON DELETE CASCADE,
  granted_at timestamptz NOT NULL DEFAULT now(),
  granted_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT user_role_levels_unique UNIQUE (user_id, role_level_id)
);

COMMENT ON TABLE user_role_levels IS 'Rôles/certifications assignés aux utilisateurs (remplace users.roles)';

-- -----------------------------------------------------------------------------
-- 3.10 WORKSHOPS - Ateliers
-- -----------------------------------------------------------------------------
CREATE TABLE workshops (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  workshop_family_id uuid NOT NULL REFERENCES workshop_families(id) ON DELETE RESTRICT,
  workshop_type_id uuid NOT NULL REFERENCES workshop_types(id) ON DELETE RESTRICT,
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE RESTRICT,
  language text NOT NULL,
  organizer uuid REFERENCES users(id) ON DELETE SET NULL,
  lifecycle_status text NOT NULL CHECK (lifecycle_status IN ('active', 'closed', 'canceled')),
  classification_status text NOT NULL CHECK (classification_status IN (
    'formation',
    'benevole_grand_public', 
    'interne_asso', 
    'interne_entreprise', 
    'interne_profs',
    'interne_etudiants_alumnis', 
    'interne_elus', 
    'interne_agents', 
    'externe_asso',
    'externe_entreprise', 
    'externe_profs', 
    'externe_etudiants_alumnis', 
    'externe_elus', 
    'externe_agents'
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
  mail_pre_html text,
  mail_pre_subject text,
  mail_post_html text,
  mail_post_subject text,
  modified_date_flag boolean DEFAULT false,
  modified_location_flag boolean DEFAULT false,
  ics_file_url text,
  date_change_history jsonb DEFAULT '[]'::jsonb,
  location_change_history jsonb DEFAULT '[]'::jsonb,
  card_illustration_url text,
  tenant_id text DEFAULT '1er-Degré',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

COMMENT ON TABLE workshops IS 'Ateliers et formations';

-- -----------------------------------------------------------------------------
-- 3.11 WORKSHOP_CO_ORGANIZERS - Co-organisateurs (table de jonction)
-- -----------------------------------------------------------------------------
-- NOTE: On utilise une table de jonction au lieu d'un array uuid[]
-- pour une meilleure flexibilité relationnelle et des RLS policies plus propres.
CREATE TABLE workshop_co_organizers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workshop_id uuid NOT NULL REFERENCES workshops(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  assigned_at timestamptz DEFAULT now(),
  tenant_id text DEFAULT '1er-Degré',
  CONSTRAINT workshop_co_organizers_unique UNIQUE (workshop_id, user_id)
);

COMMENT ON TABLE workshop_co_organizers IS 'Table de jonction pour les co-organisateurs d''ateliers';

-- -----------------------------------------------------------------------------
-- 3.12 WORKSHOP_CO_ORGANIZER_ALERTS - Alertes co-organisateurs
-- -----------------------------------------------------------------------------
CREATE TABLE workshop_co_organizer_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  workshop_id uuid NOT NULL REFERENCES workshops(id) ON DELETE CASCADE,
  dismissed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  tenant_id text DEFAULT '1er-Degré'
);

COMMENT ON TABLE workshop_co_organizer_alerts IS 'Alertes de nomination comme co-organisateur';

-- -----------------------------------------------------------------------------
-- 3.13 PARTICIPATIONS - Inscriptions aux ateliers
-- -----------------------------------------------------------------------------
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

COMMENT ON TABLE participations IS 'Inscriptions des participants aux ateliers';

-- -----------------------------------------------------------------------------
-- 3.14 WORKSHOP_HISTORY_LOGS - Historique des actions
-- -----------------------------------------------------------------------------
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
  tenant_id text DEFAULT '1er-Degré',
  created_at timestamptz DEFAULT now()
);

COMMENT ON COLUMN workshop_history_logs.actor_user_id IS 'Utilisateur ayant effectué l''action';
COMMENT ON COLUMN workshop_history_logs.user_id IS 'Utilisateur affecté par l''action (peut être null)';

-- -----------------------------------------------------------------------------
-- 3.15 WAITLIST_ENTRIES - Liste d'attente géographique
-- -----------------------------------------------------------------------------
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

COMMENT ON TABLE waitlist_entries IS 'Liste d''attente géographique pour les ateliers';

-- -----------------------------------------------------------------------------
-- 3.16 INVOICES - Factures
-- -----------------------------------------------------------------------------
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

-- -----------------------------------------------------------------------------
-- 3.17 QUESTIONNAIRES - Questionnaires de feedback
-- -----------------------------------------------------------------------------
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

-- -----------------------------------------------------------------------------
-- 3.18 QUESTIONNAIRE_RESPONSES - Réponses aux questionnaires
-- -----------------------------------------------------------------------------
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

-- -----------------------------------------------------------------------------
-- 3.19 EMAIL_TEMPLATES - Templates d'emails
-- -----------------------------------------------------------------------------
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
  tenant_id text DEFAULT '1er-Degré' NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

COMMENT ON TABLE email_templates IS 'Templates d''emails pré/post atelier';

-- -----------------------------------------------------------------------------
-- 3.20 MAIL_LOGS - Journal d'envoi d'emails
-- -----------------------------------------------------------------------------
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
  tenant_id text DEFAULT '1er-Degré' NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- -----------------------------------------------------------------------------
-- 3.21 SCHEDULED_EMAILS - Emails programmés
-- -----------------------------------------------------------------------------
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
  tenant_id text DEFAULT '1er-Degré' NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- =============================================================================
-- 4. INDEXES
-- =============================================================================

-- Users indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_auth_user_id ON users(auth_user_id);
CREATE INDEX idx_users_tenant ON users(tenant_id);
CREATE INDEX idx_users_is_super_admin ON users(is_super_admin) WHERE is_super_admin = true;

-- Clients indexes
CREATE INDEX idx_clients_slug ON clients(slug);
CREATE INDEX idx_clients_is_active ON clients(is_active);

-- Client admins indexes
CREATE INDEX idx_client_admins_client ON client_admins(client_id);
CREATE INDEX idx_client_admins_user ON client_admins(user_id);

-- Workshop families indexes
CREATE INDEX idx_workshop_families_client_id ON workshop_families(client_id);

-- Workshop types indexes
CREATE INDEX idx_workshop_types_client_id ON workshop_types(client_id);
CREATE INDEX idx_workshop_types_family_id ON workshop_types(workshop_family_id);

-- Role levels indexes
CREATE INDEX idx_role_levels_client_id ON role_levels(client_id);
CREATE INDEX idx_role_levels_family_id ON role_levels(workshop_family_id);

-- Client languages indexes
CREATE INDEX idx_client_languages_client_id ON client_languages(client_id);
CREATE INDEX idx_client_languages_family_id ON client_languages(workshop_family_id);

-- User role levels indexes
CREATE INDEX idx_user_role_levels_user_id ON user_role_levels(user_id);
CREATE INDEX idx_user_role_levels_role_level_id ON user_role_levels(role_level_id);

-- Workshops indexes
CREATE INDEX idx_workshops_organizer ON workshops(organizer);
CREATE INDEX idx_workshops_lifecycle_status ON workshops(lifecycle_status);
CREATE INDEX idx_workshops_start_at ON workshops(start_at);
CREATE INDEX idx_workshops_language ON workshops(language);
CREATE INDEX idx_workshops_is_remote ON workshops(is_remote);
CREATE INDEX idx_workshops_tenant ON workshops(tenant_id);
CREATE INDEX idx_workshops_client_id ON workshops(client_id);
CREATE INDEX idx_workshops_family_id ON workshops(workshop_family_id);
CREATE INDEX idx_workshops_type_id ON workshops(workshop_type_id);

-- Workshop co-organizers indexes
CREATE INDEX idx_workshop_co_organizers_workshop ON workshop_co_organizers(workshop_id);
CREATE INDEX idx_workshop_co_organizers_user ON workshop_co_organizers(user_id);
CREATE INDEX idx_workshop_co_organizers_tenant ON workshop_co_organizers(tenant_id);

-- Workshop co-organizer alerts indexes
CREATE INDEX idx_co_organizer_alerts_user ON workshop_co_organizer_alerts(user_id);
CREATE INDEX idx_co_organizer_alerts_workshop ON workshop_co_organizer_alerts(workshop_id);
CREATE INDEX idx_co_organizer_alerts_dismissed ON workshop_co_organizer_alerts(dismissed_at);

-- Participations indexes
CREATE INDEX idx_participations_user ON participations(user_id);
CREATE INDEX idx_participations_workshop ON participations(workshop_id);
CREATE INDEX idx_participations_client_id ON participations(client_id);
CREATE INDEX idx_participations_status ON participations(status);
CREATE INDEX idx_participations_tenant ON participations(tenant_id);
CREATE INDEX idx_participations_workshop_status ON participations(workshop_id, status);
CREATE UNIQUE INDEX idx_unique_active_participation 
  ON participations (user_id, workshop_id) 
  WHERE status NOT IN ('annule', 'rembourse');

-- Workshop history logs indexes
CREATE INDEX idx_workshop_history_logs_workshop_id ON workshop_history_logs(workshop_id);
CREATE INDEX idx_workshop_history_logs_created_at ON workshop_history_logs(created_at DESC);
CREATE INDEX idx_workshop_history_logs_log_type ON workshop_history_logs(log_type);
CREATE INDEX idx_workshop_history_logs_actor_user_id ON workshop_history_logs(actor_user_id);

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

-- Email templates indexes
CREATE INDEX idx_email_templates_user_id ON email_templates(user_id);
CREATE INDEX idx_email_templates_lookup ON email_templates(workshop_type, language, template_type) WHERE is_official = true;
CREATE INDEX idx_email_templates_official ON email_templates(is_official);

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

-- =============================================================================
-- 5. TRIGGERS
-- =============================================================================

-- updated_at triggers pour toutes les tables
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON clients
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_client_admins_updated_at BEFORE UPDATE ON client_admins
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

CREATE TRIGGER update_mail_logs_updated_at BEFORE UPDATE ON mail_logs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_scheduled_emails_updated_at BEFORE UPDATE ON scheduled_emails
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger pour mettre à jour consent_updated_at
CREATE OR REPLACE FUNCTION update_consent_timestamp()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF (NEW.consent_transactional IS DISTINCT FROM OLD.consent_transactional) OR
     (NEW.consent_marketing IS DISTINCT FROM OLD.consent_marketing) THEN
    NEW.consent_updated_at = now();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_update_consent_timestamp
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_consent_timestamp();

-- =============================================================================
-- 6. ENABLE ROW LEVEL SECURITY
-- =============================================================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE workshop_families ENABLE ROW LEVEL SECURITY;
ALTER TABLE workshop_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_requirements ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_languages ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_role_levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE workshops ENABLE ROW LEVEL SECURITY;
ALTER TABLE workshop_co_organizers ENABLE ROW LEVEL SECURITY;
ALTER TABLE workshop_co_organizer_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE participations ENABLE ROW LEVEL SECURITY;
ALTER TABLE workshop_history_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE waitlist_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE questionnaires ENABLE ROW LEVEL SECURITY;
ALTER TABLE questionnaire_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE mail_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE scheduled_emails ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- 7. RLS POLICIES
-- =============================================================================
-- Toutes les policies utilisent auth.uid() et users.auth_user_id
-- Pattern : users voient leurs données, client_admins voient leur client, super_admins voient tout

-- -----------------------------------------------------------------------------
-- 7.1 USERS POLICIES
-- -----------------------------------------------------------------------------

-- Users can view their own profile
CREATE POLICY "users_select_own"
  ON users FOR SELECT
  TO authenticated
  USING (auth_user_id = auth.uid());

-- Users can update their own profile
CREATE POLICY "users_update_own"
  ON users FOR UPDATE
  TO authenticated
  USING (auth_user_id = auth.uid())
  WITH CHECK (auth_user_id = auth.uid());

-- Super admins can view all users
CREATE POLICY "users_select_super_admin"
  ON users FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.auth_user_id = auth.uid()
      AND u.is_super_admin = true
    )
  );

-- Super admins can manage all users
CREATE POLICY "users_all_super_admin"
  ON users FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.auth_user_id = auth.uid()
      AND u.is_super_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.auth_user_id = auth.uid()
      AND u.is_super_admin = true
    )
  );

-- Client admins can view users in their client (via participations or organizer)
CREATE POLICY "users_select_client_admin"
  ON users FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM client_admins ca
      JOIN users admin_user ON admin_user.id = ca.user_id
      WHERE admin_user.auth_user_id = auth.uid()
      AND (
        -- User participated in a workshop of this client
        EXISTS (
          SELECT 1 FROM participations p
          WHERE p.user_id = users.id
          AND p.client_id = ca.client_id
        )
        OR
        -- User organized a workshop for this client
        EXISTS (
          SELECT 1 FROM workshops w
          WHERE w.organizer = users.id
          AND w.client_id = ca.client_id
        )
      )
    )
  );

-- Service role has full access (for Edge Functions)
CREATE POLICY "users_service_role"
  ON users FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- -----------------------------------------------------------------------------
-- 7.2 CLIENTS POLICIES
-- -----------------------------------------------------------------------------

-- Super admins can manage all clients
CREATE POLICY "clients_all_super_admin"
  ON clients FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.auth_user_id = auth.uid()
      AND u.is_super_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.auth_user_id = auth.uid()
      AND u.is_super_admin = true
    )
  );

-- Client admins can view their clients
CREATE POLICY "clients_select_client_admin"
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

-- Public can view active clients (for workshop listings)
CREATE POLICY "clients_select_public"
  ON clients FOR SELECT
  TO public
  USING (is_active = true);

-- -----------------------------------------------------------------------------
-- 7.3 CLIENT_ADMINS POLICIES
-- -----------------------------------------------------------------------------

-- Users can view their own admin assignments
CREATE POLICY "client_admins_select_own"
  ON client_admins FOR SELECT
  TO authenticated
  USING (
    user_id IN (
      SELECT id FROM users WHERE auth_user_id = auth.uid()
    )
  );

-- Super admins can manage all client admins
CREATE POLICY "client_admins_all_super_admin"
  ON client_admins FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.auth_user_id = auth.uid()
      AND u.is_super_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.auth_user_id = auth.uid()
      AND u.is_super_admin = true
    )
  );

-- Client admins can view co-admins of their client
CREATE POLICY "client_admins_select_co_admins"
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

-- -----------------------------------------------------------------------------
-- 7.4 WORKSHOP_FAMILIES POLICIES
-- -----------------------------------------------------------------------------

-- Client admins can manage their client's workshop families
CREATE POLICY "workshop_families_all_client_admin"
  ON workshop_families FOR ALL
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

-- Super admins can manage all workshop families
CREATE POLICY "workshop_families_all_super_admin"
  ON workshop_families FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.auth_user_id = auth.uid()
      AND u.is_super_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.auth_user_id = auth.uid()
      AND u.is_super_admin = true
    )
  );

-- Public can view active workshop families (for listings)
CREATE POLICY "workshop_families_select_public"
  ON workshop_families FOR SELECT
  TO public
  USING (is_active = true);

-- -----------------------------------------------------------------------------
-- 7.5 WORKSHOP_TYPES POLICIES
-- -----------------------------------------------------------------------------

-- Client admins can manage their client's workshop types
CREATE POLICY "workshop_types_all_client_admin"
  ON workshop_types FOR ALL
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

-- Public can view active workshop types
CREATE POLICY "workshop_types_select_public"
  ON workshop_types FOR SELECT
  TO public
  USING (is_active = true);

-- -----------------------------------------------------------------------------
-- 7.6 ROLE_LEVELS POLICIES
-- -----------------------------------------------------------------------------

-- Client admins can manage their client's role levels
CREATE POLICY "role_levels_all_client_admin"
  ON role_levels FOR ALL
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

-- Public can view role levels (for UI display)
CREATE POLICY "role_levels_select_public"
  ON role_levels FOR SELECT
  TO public
  USING (true);

-- -----------------------------------------------------------------------------
-- 7.7 ROLE_REQUIREMENTS POLICIES
-- -----------------------------------------------------------------------------

-- Client admins can manage role requirements
CREATE POLICY "role_requirements_all_client_admin"
  ON role_requirements FOR ALL
  TO authenticated
  USING (
    role_level_id IN (
      SELECT rl.id
      FROM role_levels rl
      JOIN client_admins ca ON ca.client_id = rl.client_id
      JOIN users u ON u.id = ca.user_id
      WHERE u.auth_user_id = auth.uid()
    )
  )
  WITH CHECK (
    role_level_id IN (
      SELECT rl.id
      FROM role_levels rl
      JOIN client_admins ca ON ca.client_id = rl.client_id
      JOIN users u ON u.id = ca.user_id
      WHERE u.auth_user_id = auth.uid()
    )
  );

-- Public can view role requirements
CREATE POLICY "role_requirements_select_public"
  ON role_requirements FOR SELECT
  TO public
  USING (true);

-- -----------------------------------------------------------------------------
-- 7.8 CLIENT_LANGUAGES POLICIES
-- -----------------------------------------------------------------------------

-- Client admins can manage their client's languages
CREATE POLICY "client_languages_all_client_admin"
  ON client_languages FOR ALL
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

-- Public can view active languages
CREATE POLICY "client_languages_select_public"
  ON client_languages FOR SELECT
  TO public
  USING (is_active = true);

-- -----------------------------------------------------------------------------
-- 7.9 USER_ROLE_LEVELS POLICIES
-- -----------------------------------------------------------------------------

-- Users can view their own role levels
CREATE POLICY "user_role_levels_select_own"
  ON user_role_levels FOR SELECT
  TO authenticated
  USING (
    user_id IN (
      SELECT id FROM users WHERE auth_user_id = auth.uid()
    )
  );

-- Client admins can manage role levels for users in their client
CREATE POLICY "user_role_levels_all_client_admin"
  ON user_role_levels FOR ALL
  TO authenticated
  USING (
    role_level_id IN (
      SELECT rl.id
      FROM role_levels rl
      JOIN client_admins ca ON ca.client_id = rl.client_id
      JOIN users u ON u.id = ca.user_id
      WHERE u.auth_user_id = auth.uid()
    )
  )
  WITH CHECK (
    role_level_id IN (
      SELECT rl.id
      FROM role_levels rl
      JOIN client_admins ca ON ca.client_id = rl.client_id
      JOIN users u ON u.id = ca.user_id
      WHERE u.auth_user_id = auth.uid()
    )
  );

-- Super admins can manage all user role levels
CREATE POLICY "user_role_levels_all_super_admin"
  ON user_role_levels FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.auth_user_id = auth.uid()
      AND u.is_super_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.auth_user_id = auth.uid()
      AND u.is_super_admin = true
    )
  );

-- Public can view user role levels (for organizer lists)
CREATE POLICY "user_role_levels_select_public"
  ON user_role_levels FOR SELECT
  TO public
  USING (true);

-- -----------------------------------------------------------------------------
-- 7.10 WORKSHOPS POLICIES
-- -----------------------------------------------------------------------------

-- Public can view active workshops
CREATE POLICY "workshops_select_public"
  ON workshops FOR SELECT
  TO public
  USING (lifecycle_status = 'active');

-- Organizers can manage their own workshops
CREATE POLICY "workshops_all_organizer"
  ON workshops FOR ALL
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

-- Co-organizers can view and update workshops
CREATE POLICY "workshops_select_co_organizer"
  ON workshops FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT wco.workshop_id
      FROM workshop_co_organizers wco
      JOIN users u ON u.id = wco.user_id
      WHERE u.auth_user_id = auth.uid()
    )
  );

CREATE POLICY "workshops_update_co_organizer"
  ON workshops FOR UPDATE
  TO authenticated
  USING (
    id IN (
      SELECT wco.workshop_id
      FROM workshop_co_organizers wco
      JOIN users u ON u.id = wco.user_id
      WHERE u.auth_user_id = auth.uid()
    )
  )
  WITH CHECK (
    id IN (
      SELECT wco.workshop_id
      FROM workshop_co_organizers wco
      JOIN users u ON u.id = wco.user_id
      WHERE u.auth_user_id = auth.uid()
    )
  );

-- Client admins can manage workshops for their client
CREATE POLICY "workshops_all_client_admin"
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

-- Super admins can manage all workshops
CREATE POLICY "workshops_all_super_admin"
  ON workshops FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.auth_user_id = auth.uid()
      AND u.is_super_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.auth_user_id = auth.uid()
      AND u.is_super_admin = true
    )
  );

-- Service role has full access
CREATE POLICY "workshops_service_role"
  ON workshops FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- -----------------------------------------------------------------------------
-- 7.11 WORKSHOP_CO_ORGANIZERS POLICIES
-- -----------------------------------------------------------------------------

-- Organizers can manage co-organizers for their workshops
CREATE POLICY "workshop_co_organizers_all_organizer"
  ON workshop_co_organizers FOR ALL
  TO authenticated
  USING (
    workshop_id IN (
      SELECT id FROM workshops
      WHERE organizer IN (
        SELECT id FROM users WHERE auth_user_id = auth.uid()
      )
    )
  )
  WITH CHECK (
    workshop_id IN (
      SELECT id FROM workshops
      WHERE organizer IN (
        SELECT id FROM users WHERE auth_user_id = auth.uid()
      )
    )
  );

-- Users can view their own co-organizer assignments
CREATE POLICY "workshop_co_organizers_select_own"
  ON workshop_co_organizers FOR SELECT
  TO authenticated
  USING (
    user_id IN (
      SELECT id FROM users WHERE auth_user_id = auth.uid()
    )
  );

-- Public can view co-organizers (for workshop display)
CREATE POLICY "workshop_co_organizers_select_public"
  ON workshop_co_organizers FOR SELECT
  TO public
  USING (true);

-- -----------------------------------------------------------------------------
-- 7.12 WORKSHOP_CO_ORGANIZER_ALERTS POLICIES
-- -----------------------------------------------------------------------------

-- Users can manage their own alerts
CREATE POLICY "workshop_co_organizer_alerts_all_own"
  ON workshop_co_organizer_alerts FOR ALL
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

-- Anyone can insert alerts (system)
CREATE POLICY "workshop_co_organizer_alerts_insert_public"
  ON workshop_co_organizer_alerts FOR INSERT
  TO public
  WITH CHECK (true);

-- -----------------------------------------------------------------------------
-- 7.13 PARTICIPATIONS POLICIES
-- -----------------------------------------------------------------------------

-- Users can view their own participations
CREATE POLICY "participations_select_own"
  ON participations FOR SELECT
  TO authenticated
  USING (
    user_id IN (
      SELECT id FROM users WHERE auth_user_id = auth.uid()
    )
  );

-- Users can insert their own participations
CREATE POLICY "participations_insert_own"
  ON participations FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id IN (
      SELECT id FROM users WHERE auth_user_id = auth.uid()
    )
  );

-- Users can update their own participations
CREATE POLICY "participations_update_own"
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

-- Organizers can manage participations for their workshops
CREATE POLICY "participations_all_organizer"
  ON participations FOR ALL
  TO authenticated
  USING (
    workshop_id IN (
      SELECT id FROM workshops
      WHERE organizer IN (
        SELECT id FROM users WHERE auth_user_id = auth.uid()
      )
    )
  )
  WITH CHECK (
    workshop_id IN (
      SELECT id FROM workshops
      WHERE organizer IN (
        SELECT id FROM users WHERE auth_user_id = auth.uid()
      )
    )
  );

-- Client admins can manage participations for their client
CREATE POLICY "participations_all_client_admin"
  ON participations FOR ALL
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

-- Service role has full access
CREATE POLICY "participations_service_role"
  ON participations FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Public can insert participations (for anonymous registration)
CREATE POLICY "participations_insert_public"
  ON participations FOR INSERT
  TO public
  WITH CHECK (
    EXISTS (SELECT 1 FROM users WHERE id = user_id) AND
    EXISTS (SELECT 1 FROM workshops WHERE id = workshop_id AND lifecycle_status = 'active')
  );

-- -----------------------------------------------------------------------------
-- 7.14 WORKSHOP_HISTORY_LOGS POLICIES
-- -----------------------------------------------------------------------------

-- Organizers can view and insert logs for their workshops
CREATE POLICY "workshop_history_logs_all_organizer"
  ON workshop_history_logs FOR ALL
  TO authenticated
  USING (
    workshop_id IN (
      SELECT id FROM workshops
      WHERE organizer IN (
        SELECT id FROM users WHERE auth_user_id = auth.uid()
      )
    )
  )
  WITH CHECK (
    workshop_id IN (
      SELECT id FROM workshops
      WHERE organizer IN (
        SELECT id FROM users WHERE auth_user_id = auth.uid()
      )
    )
  );

-- Client admins can view logs for their client's workshops
CREATE POLICY "workshop_history_logs_select_client_admin"
  ON workshop_history_logs FOR SELECT
  TO authenticated
  USING (
    workshop_id IN (
      SELECT w.id FROM workshops w
      JOIN client_admins ca ON ca.client_id = w.client_id
      JOIN users u ON u.id = ca.user_id
      WHERE u.auth_user_id = auth.uid()
    )
  );

-- Super admins can view all logs
CREATE POLICY "workshop_history_logs_select_super_admin"
  ON workshop_history_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.auth_user_id = auth.uid()
      AND u.is_super_admin = true
    )
  );

-- -----------------------------------------------------------------------------
-- 7.15 WAITLIST_ENTRIES POLICIES
-- -----------------------------------------------------------------------------

-- Users can manage their own waitlist entries
CREATE POLICY "waitlist_entries_all_own"
  ON waitlist_entries FOR ALL
  TO authenticated
  USING (
    user_id IN (
      SELECT id FROM users WHERE auth_user_id = auth.uid()
    )
    OR
    email IN (
      SELECT email FROM users WHERE auth_user_id = auth.uid()
    )
  )
  WITH CHECK (
    user_id IN (
      SELECT id FROM users WHERE auth_user_id = auth.uid()
    )
    OR
    email IN (
      SELECT email FROM users WHERE auth_user_id = auth.uid()
    )
  );

-- Public can insert waitlist entries
CREATE POLICY "waitlist_entries_insert_public"
  ON waitlist_entries FOR INSERT
  TO public
  WITH CHECK (true);

-- Public can view their own entries by email
CREATE POLICY "waitlist_entries_select_public"
  ON waitlist_entries FOR SELECT
  TO public
  USING (true);

-- -----------------------------------------------------------------------------
-- 7.16 INVOICES POLICIES
-- -----------------------------------------------------------------------------

-- Users can view their own invoices
CREATE POLICY "invoices_select_own"
  ON invoices FOR SELECT
  TO authenticated
  USING (
    user_id IN (
      SELECT id FROM users WHERE auth_user_id = auth.uid()
    )
  );

-- Client admins can view invoices for their client
CREATE POLICY "invoices_select_client_admin"
  ON invoices FOR SELECT
  TO authenticated
  USING (
    workshop_id IN (
      SELECT w.id FROM workshops w
      JOIN client_admins ca ON ca.client_id = w.client_id
      JOIN users u ON u.id = ca.user_id
      WHERE u.auth_user_id = auth.uid()
    )
  );

-- -----------------------------------------------------------------------------
-- 7.17 QUESTIONNAIRES POLICIES
-- -----------------------------------------------------------------------------

-- Users can view active questionnaires for workshops they attended
CREATE POLICY "questionnaires_select_attended"
  ON questionnaires FOR SELECT
  TO authenticated
  USING (
    is_active = true AND
    (
      workshop_id IS NULL OR
      EXISTS (
        SELECT 1 FROM participations p
        JOIN users u ON u.id = p.user_id
        WHERE p.workshop_id = questionnaires.workshop_id
        AND u.auth_user_id = auth.uid()
        AND p.attended = true
      )
    )
  );

-- Client admins can manage questionnaires for their client
CREATE POLICY "questionnaires_all_client_admin"
  ON questionnaires FOR ALL
  TO authenticated
  USING (
    workshop_id IN (
      SELECT w.id FROM workshops w
      JOIN client_admins ca ON ca.client_id = w.client_id
      JOIN users u ON u.id = ca.user_id
      WHERE u.auth_user_id = auth.uid()
    )
  )
  WITH CHECK (
    workshop_id IN (
      SELECT w.id FROM workshops w
      JOIN client_admins ca ON ca.client_id = w.client_id
      JOIN users u ON u.id = ca.user_id
      WHERE u.auth_user_id = auth.uid()
    )
  );

-- -----------------------------------------------------------------------------
-- 7.18 QUESTIONNAIRE_RESPONSES POLICIES
-- -----------------------------------------------------------------------------

-- Users can manage their own responses
CREATE POLICY "questionnaire_responses_all_own"
  ON questionnaire_responses FOR ALL
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

-- Client admins can view responses
CREATE POLICY "questionnaire_responses_select_client_admin"
  ON questionnaire_responses FOR SELECT
  TO authenticated
  USING (
    questionnaire_id IN (
      SELECT q.id FROM questionnaires q
      JOIN workshops w ON w.id = q.workshop_id
      JOIN client_admins ca ON ca.client_id = w.client_id
      JOIN users u ON u.id = ca.user_id
      WHERE u.auth_user_id = auth.uid()
    )
  );

-- -----------------------------------------------------------------------------
-- 7.19 EMAIL_TEMPLATES POLICIES
-- -----------------------------------------------------------------------------

-- Anyone can read official templates
CREATE POLICY "email_templates_select_official"
  ON email_templates FOR SELECT
  TO authenticated
  USING (is_official = true);

-- Users can manage their own templates
CREATE POLICY "email_templates_all_own"
  ON email_templates FOR ALL
  TO authenticated
  USING (
    user_id IN (
      SELECT id FROM users WHERE auth_user_id = auth.uid()
    )
    AND is_official = false
  )
  WITH CHECK (
    user_id IN (
      SELECT id FROM users WHERE auth_user_id = auth.uid()
    )
    AND is_official = false
  );

-- Super admins can manage official templates
CREATE POLICY "email_templates_all_super_admin"
  ON email_templates FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.auth_user_id = auth.uid()
      AND u.is_super_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.auth_user_id = auth.uid()
      AND u.is_super_admin = true
    )
  );

-- -----------------------------------------------------------------------------
-- 7.20 MAIL_LOGS POLICIES
-- -----------------------------------------------------------------------------

-- Organizers can view and insert mail logs for their workshops
CREATE POLICY "mail_logs_all_organizer"
  ON mail_logs FOR ALL
  TO authenticated
  USING (
    workshop_id IN (
      SELECT id FROM workshops
      WHERE organizer IN (
        SELECT id FROM users WHERE auth_user_id = auth.uid()
      )
    )
  )
  WITH CHECK (
    workshop_id IN (
      SELECT id FROM workshops
      WHERE organizer IN (
        SELECT id FROM users WHERE auth_user_id = auth.uid()
      )
    )
  );

-- Client admins can view mail logs for their client
CREATE POLICY "mail_logs_select_client_admin"
  ON mail_logs FOR SELECT
  TO authenticated
  USING (
    workshop_id IN (
      SELECT w.id FROM workshops w
      JOIN client_admins ca ON ca.client_id = w.client_id
      JOIN users u ON u.id = ca.user_id
      WHERE u.auth_user_id = auth.uid()
    )
  );

-- Service role has full access
CREATE POLICY "mail_logs_service_role"
  ON mail_logs FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- -----------------------------------------------------------------------------
-- 7.21 SCHEDULED_EMAILS POLICIES
-- -----------------------------------------------------------------------------

-- Organizers can manage scheduled emails for their workshops
CREATE POLICY "scheduled_emails_all_organizer"
  ON scheduled_emails FOR ALL
  TO authenticated
  USING (
    workshop_id IN (
      SELECT id FROM workshops
      WHERE organizer IN (
        SELECT id FROM users WHERE auth_user_id = auth.uid()
      )
    )
  )
  WITH CHECK (
    workshop_id IN (
      SELECT id FROM workshops
      WHERE organizer IN (
        SELECT id FROM users WHERE auth_user_id = auth.uid()
      )
    )
  );

-- Client admins can view scheduled emails
CREATE POLICY "scheduled_emails_select_client_admin"
  ON scheduled_emails FOR SELECT
  TO authenticated
  USING (
    workshop_id IN (
      SELECT w.id FROM workshops w
      JOIN client_admins ca ON ca.client_id = w.client_id
      JOIN users u ON u.id = ca.user_id
      WHERE u.auth_user_id = auth.uid()
    )
  );

-- Service role has full access
CREATE POLICY "scheduled_emails_service_role"
  ON scheduled_emails FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- =============================================================================
-- 8. DONNÉES D'INITIALISATION
-- =============================================================================
-- Utilise des lookups dynamiques au lieu d'UUIDs hardcodés

-- -----------------------------------------------------------------------------
-- 8.1 CLIENT "1er Degré"
-- -----------------------------------------------------------------------------
INSERT INTO clients (slug, name, is_active)
VALUES ('1erdegre', '1er Degré', true)
ON CONFLICT (slug) DO NOTHING;

-- -----------------------------------------------------------------------------
-- 8.2 FAMILLES D'ATELIERS (FDFP, HD)
-- -----------------------------------------------------------------------------
DO $$
DECLARE
  v_client_id uuid;
BEGIN
  -- Get the client ID dynamically
  SELECT id INTO v_client_id FROM clients WHERE slug = '1erdegre';
  
  IF v_client_id IS NULL THEN
    RAISE EXCEPTION 'Client 1erdegre not found';
  END IF;

  -- Insert FDFP family
  INSERT INTO workshop_families (
    client_id, code, name, description, default_duration_minutes,
    primary_color, secondary_color, badge_emoji,
    description_short, description_long, is_active, display_order
  ) VALUES (
    v_client_id,
    'FDFP',
    'Fresque du Faire ensemble',
    'La Fresque du Faire ensemble est un atelier collaboratif qui explore les dynamiques de participation citoyenne et de dialogue démocratique.',
    180,
    '#008E45',
    '#E6F4ED',
    '🌱',
    'Fresque du Facteur Humain de la Production',
    'Découvrez et comprenez les enjeux du facteur humain dans la production industrielle',
    true,
    1
  )
  ON CONFLICT (client_id, code) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    primary_color = EXCLUDED.primary_color,
    secondary_color = EXCLUDED.secondary_color,
    badge_emoji = EXCLUDED.badge_emoji;

  -- Insert HD family
  INSERT INTO workshop_families (
    client_id, code, name, description, default_duration_minutes,
    primary_color, secondary_color, badge_emoji,
    description_short, description_long, is_active, display_order
  ) VALUES (
    v_client_id,
    'HD',
    'Hackons le Débat',
    'Hackons le Débat est un atelier collaboratif qui permet d''explorer et d''améliorer les pratiques de débat et de délibération collective.',
    180,
    '#2D2B6B',
    '#E8E7F0',
    '🌊',
    'Halle au Développement',
    'Explorez les pratiques de développement durable et responsable',
    true,
    2
  )
  ON CONFLICT (client_id, code) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    primary_color = EXCLUDED.primary_color,
    secondary_color = EXCLUDED.secondary_color,
    badge_emoji = EXCLUDED.badge_emoji;

END $$;

-- -----------------------------------------------------------------------------
-- 8.3 TYPES D'ATELIERS
-- -----------------------------------------------------------------------------
DO $$
DECLARE
  v_client_id uuid;
  v_fdfp_family_id uuid;
  v_hd_family_id uuid;
BEGIN
  SELECT id INTO v_client_id FROM clients WHERE slug = '1erdegre';
  SELECT id INTO v_fdfp_family_id FROM workshop_families WHERE client_id = v_client_id AND code = 'FDFP';
  SELECT id INTO v_hd_family_id FROM workshop_families WHERE client_id = v_client_id AND code = 'HD';

  -- FDFP workshop types
  INSERT INTO workshop_types (client_id, workshop_family_id, code, label, default_duration_minutes, is_formation, is_active, display_order)
  VALUES
    (v_client_id, v_fdfp_family_id, 'fdfp_workshop', 'Atelier FDFP', 180, false, true, 10),
    (v_client_id, v_fdfp_family_id, 'fdfp_formation', 'Formation FDFP', 480, true, true, 11),
    (v_client_id, v_fdfp_family_id, 'fdfp_formation_pro_1', 'Formation Pro 1 FDFP', 120, true, true, 12),
    (v_client_id, v_fdfp_family_id, 'fdfp_formation_pro_2', 'Formation Pro 2 FDFP', 150, true, true, 13),
    (v_client_id, v_fdfp_family_id, 'fdfp_formation_formateur', 'Formation Formateur FDFP', 960, true, true, 14),
    (v_client_id, v_fdfp_family_id, 'fdfp_formation_retex', 'Formation RETEX FDFP', 90, true, true, 15)
  ON CONFLICT (client_id, code) DO UPDATE SET
    label = EXCLUDED.label,
    default_duration_minutes = EXCLUDED.default_duration_minutes;

  -- HD workshop types
  INSERT INTO workshop_types (client_id, workshop_family_id, code, label, default_duration_minutes, is_formation, is_active, display_order)
  VALUES
    (v_client_id, v_hd_family_id, 'hd_workshop', 'Atelier HD', 180, false, true, 20),
    (v_client_id, v_hd_family_id, 'hd_formation', 'Formation HD', 480, true, true, 21),
    (v_client_id, v_hd_family_id, 'hd_formation_pro_1', 'Formation Pro 1 HD', 120, true, true, 22),
    (v_client_id, v_hd_family_id, 'hd_formation_pro_2', 'Formation Pro 2 HD', 150, true, true, 23),
    (v_client_id, v_hd_family_id, 'hd_formation_formateur', 'Formation Formateur HD', 960, true, true, 24),
    (v_client_id, v_hd_family_id, 'hd_formation_retex', 'Formation RETEX HD', 90, true, true, 25)
  ON CONFLICT (client_id, code) DO UPDATE SET
    label = EXCLUDED.label,
    default_duration_minutes = EXCLUDED.default_duration_minutes;

END $$;

-- -----------------------------------------------------------------------------
-- 8.4 NIVEAUX DE RÔLES (4 niveaux × 2 familles)
-- -----------------------------------------------------------------------------
DO $$
DECLARE
  v_client_id uuid;
  v_fdfp_family_id uuid;
  v_hd_family_id uuid;
BEGIN
  SELECT id INTO v_client_id FROM clients WHERE slug = '1erdegre';
  SELECT id INTO v_fdfp_family_id FROM workshop_families WHERE client_id = v_client_id AND code = 'FDFP';
  SELECT id INTO v_hd_family_id FROM workshop_families WHERE client_id = v_client_id AND code = 'HD';

  -- FDFP Role Levels
  INSERT INTO role_levels (client_id, workshop_family_id, level, internal_key, label, description,
    badge_emoji, badge_color_primary, badge_color_bg, description_short, description_long)
  VALUES
    (v_client_id, v_fdfp_family_id, 1, 'public', 'Animateur',
     'Peut animer des ateliers FDFP pour le grand public',
     '🎯', '#16a34a', 'from-green-50 to-green-100 border-green-400',
     'Obtenue en complétant la formation FDFP initiale. Permet d''animer des ateliers grand public.',
     'Certification de base pour animer des ateliers FDFP auprès du grand public.'),
    (v_client_id, v_fdfp_family_id, 2, 'pro', 'Animateur Pro',
     'Peut animer des ateliers FDFP pour les professionnels',
     '⭐', '#2563eb', 'from-blue-50 to-blue-100 border-blue-400',
     'Obtenue après avoir complété Formation Pro 2. Nécessite 3 ateliers animés et 6 retours positifs.',
     'Certification avancée démontrant une expérience significative en animation.'),
    (v_client_id, v_fdfp_family_id, 3, 'trainer', 'Formateur',
     'Peut animer des formations FDFP',
     '🏆', '#d97706', 'from-amber-50 to-amber-100 border-amber-400',
     'Obtenue en complétant Formation Formateur. Permet de former les futurs animateurs FDFP.',
     'Certification d''expert permettant de former de nouveaux animateurs.'),
    (v_client_id, v_fdfp_family_id, 4, 'instructor', 'Instructeur',
     'Peut former des formateurs FDFP',
     '🎖️', '#4b5563', 'from-gray-50 to-gray-100 border-gray-400',
     'Certification avancée pour les instructeurs principaux. Permet de former les formateurs.',
     'Le plus haut niveau de certification.')
  ON CONFLICT (client_id, workshop_family_id, level) DO UPDATE SET
    label = EXCLUDED.label,
    description = EXCLUDED.description,
    badge_emoji = EXCLUDED.badge_emoji,
    badge_color_primary = EXCLUDED.badge_color_primary;

  -- HD Role Levels
  INSERT INTO role_levels (client_id, workshop_family_id, level, internal_key, label, description,
    badge_emoji, badge_color_primary, badge_color_bg, description_short, description_long)
  VALUES
    (v_client_id, v_hd_family_id, 1, 'public', 'Animateur',
     'Peut animer des ateliers HD pour le grand public',
     '🎯', '#16a34a', 'from-green-50 to-green-100 border-green-400',
     'Obtenue en complétant la formation HD initiale. Permet d''animer des ateliers grand public.',
     'Certification de base pour animer des ateliers HD auprès du grand public.'),
    (v_client_id, v_hd_family_id, 2, 'pro', 'Animateur Pro',
     'Peut animer des ateliers HD pour les professionnels',
     '⭐', '#2563eb', 'from-blue-50 to-blue-100 border-blue-400',
     'Obtenue après avoir complété Formation Pro 2. Nécessite 3 ateliers animés et 6 retours positifs.',
     'Certification avancée démontrant une expérience significative en animation.'),
    (v_client_id, v_hd_family_id, 3, 'trainer', 'Formateur',
     'Peut animer des formations HD',
     '🏆', '#d97706', 'from-amber-50 to-amber-100 border-amber-400',
     'Obtenue en complétant Formation Formateur. Permet de former les futurs animateurs HD.',
     'Certification d''expert permettant de former de nouveaux animateurs.'),
    (v_client_id, v_hd_family_id, 4, 'instructor', 'Instructeur',
     'Peut former des formateurs HD',
     '🎖️', '#4b5563', 'from-gray-50 to-gray-100 border-gray-400',
     'Certification avancée pour les instructeurs principaux. Permet de former les formateurs.',
     'Le plus haut niveau de certification.')
  ON CONFLICT (client_id, workshop_family_id, level) DO UPDATE SET
    label = EXCLUDED.label,
    description = EXCLUDED.description,
    badge_emoji = EXCLUDED.badge_emoji,
    badge_color_primary = EXCLUDED.badge_color_primary;

END $$;

-- -----------------------------------------------------------------------------
-- 8.5 PRÉREQUIS DE RÔLES
-- -----------------------------------------------------------------------------
DO $$
DECLARE
  v_client_id uuid;
  v_fdfp_family_id uuid;
  v_hd_family_id uuid;
  v_fdfp_level1_id uuid;
  v_fdfp_level2_id uuid;
  v_fdfp_level3_id uuid;
  v_fdfp_level4_id uuid;
  v_hd_level1_id uuid;
  v_hd_level2_id uuid;
  v_hd_level3_id uuid;
  v_hd_level4_id uuid;
  v_fdfp_pro1_type_id uuid;
  v_fdfp_pro2_type_id uuid;
  v_fdfp_formateur_type_id uuid;
  v_fdfp_retex_type_id uuid;
  v_hd_pro1_type_id uuid;
  v_hd_pro2_type_id uuid;
  v_hd_formateur_type_id uuid;
  v_hd_retex_type_id uuid;
BEGIN
  SELECT id INTO v_client_id FROM clients WHERE slug = '1erdegre';
  SELECT id INTO v_fdfp_family_id FROM workshop_families WHERE client_id = v_client_id AND code = 'FDFP';
  SELECT id INTO v_hd_family_id FROM workshop_families WHERE client_id = v_client_id AND code = 'HD';

  -- Get role level IDs
  SELECT id INTO v_fdfp_level1_id FROM role_levels WHERE client_id = v_client_id AND workshop_family_id = v_fdfp_family_id AND level = 1;
  SELECT id INTO v_fdfp_level2_id FROM role_levels WHERE client_id = v_client_id AND workshop_family_id = v_fdfp_family_id AND level = 2;
  SELECT id INTO v_fdfp_level3_id FROM role_levels WHERE client_id = v_client_id AND workshop_family_id = v_fdfp_family_id AND level = 3;
  SELECT id INTO v_fdfp_level4_id FROM role_levels WHERE client_id = v_client_id AND workshop_family_id = v_fdfp_family_id AND level = 4;
  SELECT id INTO v_hd_level1_id FROM role_levels WHERE client_id = v_client_id AND workshop_family_id = v_hd_family_id AND level = 1;
  SELECT id INTO v_hd_level2_id FROM role_levels WHERE client_id = v_client_id AND workshop_family_id = v_hd_family_id AND level = 2;
  SELECT id INTO v_hd_level3_id FROM role_levels WHERE client_id = v_client_id AND workshop_family_id = v_hd_family_id AND level = 3;
  SELECT id INTO v_hd_level4_id FROM role_levels WHERE client_id = v_client_id AND workshop_family_id = v_hd_family_id AND level = 4;

  -- Get workshop type IDs
  SELECT id INTO v_fdfp_pro1_type_id FROM workshop_types WHERE client_id = v_client_id AND code = 'fdfp_formation_pro_1';
  SELECT id INTO v_fdfp_pro2_type_id FROM workshop_types WHERE client_id = v_client_id AND code = 'fdfp_formation_pro_2';
  SELECT id INTO v_fdfp_formateur_type_id FROM workshop_types WHERE client_id = v_client_id AND code = 'fdfp_formation_formateur';
  SELECT id INTO v_fdfp_retex_type_id FROM workshop_types WHERE client_id = v_client_id AND code = 'fdfp_formation_retex';
  SELECT id INTO v_hd_pro1_type_id FROM workshop_types WHERE client_id = v_client_id AND code = 'hd_formation_pro_1';
  SELECT id INTO v_hd_pro2_type_id FROM workshop_types WHERE client_id = v_client_id AND code = 'hd_formation_pro_2';
  SELECT id INTO v_hd_formateur_type_id FROM workshop_types WHERE client_id = v_client_id AND code = 'hd_formation_formateur';
  SELECT id INTO v_hd_retex_type_id FROM workshop_types WHERE client_id = v_client_id AND code = 'hd_formation_retex';

  -- FDFP Level 1 (no requirements)
  INSERT INTO role_requirements (role_level_id) VALUES (v_fdfp_level1_id)
  ON CONFLICT (role_level_id) DO NOTHING;

  -- FDFP Level 2 (Pro)
  INSERT INTO role_requirements (role_level_id, required_workshop_types, min_workshops_total, min_workshops_online, min_workshops_in_person, min_feedback_count, min_feedback_avg)
  VALUES (v_fdfp_level2_id, jsonb_build_array(v_fdfp_pro1_type_id, v_fdfp_pro2_type_id), 3, 1, 1, 6, 3.0)
  ON CONFLICT (role_level_id) DO UPDATE SET
    required_workshop_types = EXCLUDED.required_workshop_types,
    min_workshops_total = EXCLUDED.min_workshops_total;

  -- FDFP Level 3 (Trainer)
  INSERT INTO role_requirements (role_level_id, required_workshop_types, min_workshops_total, min_workshops_online, min_workshops_in_person, min_feedback_count, min_feedback_avg)
  VALUES (v_fdfp_level3_id, jsonb_build_array(v_fdfp_formateur_type_id), 10, 3, 3, 20, 4.0)
  ON CONFLICT (role_level_id) DO UPDATE SET
    required_workshop_types = EXCLUDED.required_workshop_types,
    min_workshops_total = EXCLUDED.min_workshops_total;

  -- FDFP Level 4 (Instructor)
  INSERT INTO role_requirements (role_level_id, required_workshop_types, min_workshops_total, min_workshops_online, min_workshops_in_person, min_feedback_count, min_feedback_avg)
  VALUES (v_fdfp_level4_id, jsonb_build_array(v_fdfp_formateur_type_id, v_fdfp_retex_type_id), 25, 10, 10, 50, 4.5)
  ON CONFLICT (role_level_id) DO UPDATE SET
    required_workshop_types = EXCLUDED.required_workshop_types,
    min_workshops_total = EXCLUDED.min_workshops_total;

  -- HD Level 1 (no requirements)
  INSERT INTO role_requirements (role_level_id) VALUES (v_hd_level1_id)
  ON CONFLICT (role_level_id) DO NOTHING;

  -- HD Level 2 (Pro)
  INSERT INTO role_requirements (role_level_id, required_workshop_types, min_workshops_total, min_workshops_online, min_workshops_in_person, min_feedback_count, min_feedback_avg)
  VALUES (v_hd_level2_id, jsonb_build_array(v_hd_pro1_type_id, v_hd_pro2_type_id), 3, 1, 1, 6, 3.0)
  ON CONFLICT (role_level_id) DO UPDATE SET
    required_workshop_types = EXCLUDED.required_workshop_types,
    min_workshops_total = EXCLUDED.min_workshops_total;

  -- HD Level 3 (Trainer)
  INSERT INTO role_requirements (role_level_id, required_workshop_types, min_workshops_total, min_workshops_online, min_workshops_in_person, min_feedback_count, min_feedback_avg)
  VALUES (v_hd_level3_id, jsonb_build_array(v_hd_formateur_type_id), 10, 3, 3, 20, 4.0)
  ON CONFLICT (role_level_id) DO UPDATE SET
    required_workshop_types = EXCLUDED.required_workshop_types,
    min_workshops_total = EXCLUDED.min_workshops_total;

  -- HD Level 4 (Instructor)
  INSERT INTO role_requirements (role_level_id, required_workshop_types, min_workshops_total, min_workshops_online, min_workshops_in_person, min_feedback_count, min_feedback_avg)
  VALUES (v_hd_level4_id, jsonb_build_array(v_hd_formateur_type_id, v_hd_retex_type_id), 25, 10, 10, 50, 4.5)
  ON CONFLICT (role_level_id) DO UPDATE SET
    required_workshop_types = EXCLUDED.required_workshop_types,
    min_workshops_total = EXCLUDED.min_workshops_total;

END $$;

-- -----------------------------------------------------------------------------
-- 8.6 LANGUES PAR DÉFAUT
-- -----------------------------------------------------------------------------
DO $$
DECLARE
  v_client_id uuid;
BEGIN
  SELECT id INTO v_client_id FROM clients WHERE slug = '1erdegre';

  INSERT INTO client_languages (client_id, workshop_family_id, language_code, language_name, display_order)
  VALUES
    (v_client_id, NULL, 'fr', 'Français', 1),
    (v_client_id, NULL, 'en', 'English', 2),
    (v_client_id, NULL, 'de', 'Deutsch', 3),
    (v_client_id, NULL, 'es', 'Español', 4),
    (v_client_id, NULL, 'it', 'Italiano', 5)
  ON CONFLICT DO NOTHING;

END $$;

-- -----------------------------------------------------------------------------
-- 8.7 TEMPLATES D'EMAILS OFFICIELS
-- -----------------------------------------------------------------------------
INSERT INTO email_templates (user_id, workshop_type, language, template_type, subject, html_content, is_official, official_version)
VALUES
  -- FDFP Pre-workshop French
  (
    NULL,
    'FDFP',
    'fr',
    'pre',
    'Rappel : Votre atelier "{{workshop_title}}" dans 3 jours',
    '<p>Bonjour {{first_name}},</p>
    <p>Nous vous rappelons que votre atelier <strong>{{workshop_title}}</strong> aura lieu le <strong>{{workshop_date}}</strong> à <strong>{{workshop_time}}</strong>.</p>
    <p><strong>Lieu :</strong> {{location}}</p>
    <p>Nous avons hâte de vous retrouver !</p>
    <p>L''équipe 1er Degré</p>',
    true,
    1
  ),
  -- FDFP Post-workshop French
  (
    NULL,
    'FDFP',
    'fr',
    'post',
    'Merci pour votre participation à "{{workshop_title}}"',
    '<p>Bonjour {{first_name}},</p>
    <p>Merci d''avoir participé à l''atelier <strong>{{workshop_title}}</strong> qui s''est tenu le {{workshop_date}}.</p>
    <p>Nous espérons que vous avez apprécié cette expérience. N''hésitez pas à nous faire vos retours.</p>
    <p>À bientôt pour de nouvelles aventures !</p>
    <p>L''équipe 1er Degré</p>',
    true,
    1
  ),
  -- HD Pre-workshop French
  (
    NULL,
    'HD',
    'fr',
    'pre',
    'Rappel : Votre atelier "{{workshop_title}}" dans 3 jours',
    '<p>Bonjour {{first_name}},</p>
    <p>Nous vous rappelons que votre atelier <strong>{{workshop_title}}</strong> aura lieu le <strong>{{workshop_date}}</strong> à <strong>{{workshop_time}}</strong>.</p>
    <p><strong>Lieu :</strong> {{location}}</p>
    <p>Nous avons hâte de vous retrouver !</p>
    <p>L''équipe 1er Degré</p>',
    true,
    1
  ),
  -- HD Post-workshop French
  (
    NULL,
    'HD',
    'fr',
    'post',
    'Merci pour votre participation à "{{workshop_title}}"',
    '<p>Bonjour {{first_name}},</p>
    <p>Merci d''avoir participé à l''atelier <strong>{{workshop_title}}</strong> qui s''est tenu le {{workshop_date}}.</p>
    <p>Nous espérons que vous avez apprécié cette expérience. N''hésitez pas à nous faire vos retours.</p>
    <p>À bientôt pour de nouvelles aventures !</p>
    <p>L''équipe 1er Degré</p>',
    true,
    1
  )
ON CONFLICT DO NOTHING;

-- =============================================================================
-- 9. STORAGE BUCKETS
-- =============================================================================
-- NOTE: Ces instructions créent les buckets de stockage Supabase.
-- Elles peuvent échouer si les buckets existent déjà.

-- Client logos bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'client-logos',
  'client-logos',
  true,
  5242880, -- 5MB
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/svg+xml']
)
ON CONFLICT (id) DO NOTHING;

-- Workshop images bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'workshop-images',
  'workshop-images',
  true,
  2097152, -- 2MB
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for client-logos
CREATE POLICY "storage_client_logos_select_public"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'client-logos');

CREATE POLICY "storage_client_logos_insert_authenticated"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'client-logos');

CREATE POLICY "storage_client_logos_update_authenticated"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'client-logos')
  WITH CHECK (bucket_id = 'client-logos');

CREATE POLICY "storage_client_logos_delete_authenticated"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'client-logos');

-- Storage policies for workshop-images
CREATE POLICY "storage_workshop_images_select_public"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'workshop-images');

CREATE POLICY "storage_workshop_images_insert_authenticated"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'workshop-images');

CREATE POLICY "storage_workshop_images_update_authenticated"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'workshop-images')
  WITH CHECK (bucket_id = 'workshop-images');

CREATE POLICY "storage_workshop_images_delete_authenticated"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'workshop-images');

-- =============================================================================
-- FIN DU SCRIPT
-- =============================================================================

DO $$
BEGIN
  RAISE NOTICE '=========================================================';
  RAISE NOTICE 'Schema 1er Degré créé avec succès !';
  RAISE NOTICE '=========================================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Tables créées : 21';
  RAISE NOTICE 'Policies RLS : ~70';
  RAISE NOTICE 'Indexes : ~50';
  RAISE NOTICE '';
  RAISE NOTICE 'Client initialisé : 1er Degré';
  RAISE NOTICE 'Familles : FDFP, HD';
  RAISE NOTICE 'Types par famille : 6';
  RAISE NOTICE 'Niveaux de rôle par famille : 4';
  RAISE NOTICE '';
  RAISE NOTICE 'Prochaines étapes :';
  RAISE NOTICE '1. Créer un utilisateur admin dans auth.users';
  RAISE NOTICE '2. Lier cet utilisateur à la table users avec auth_user_id';
  RAISE NOTICE '3. Ajouter cet utilisateur comme client_admin pour 1er Degré';
  RAISE NOTICE '=========================================================';
END $$;


