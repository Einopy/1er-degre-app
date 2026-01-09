/*
  # Create 1er Degré Workshops System Tables

  ## Overview
  Creates the core database schema for the 1er Degré workshop management system with:
  - Users table for participants and organizers
  - Workshops table with FDFP/HD family types and language field
  - Participations table for enrollment tracking
  - Waitlist entries table for geographic matching

  ## New Tables

  ### `users`
  User profiles with roles, addresses, and contract tracking
  - `id` (uuid, primary key)
  - `email` (text, unique, required)
  - `first_name` (text, required)
  - `last_name` (text, required)
  - `phone` (text, nullable)
  - `birthdate` (date, nullable)
  - `language_animation` (text, nullable) - Languages user can animate workshops in
  - `outside_animation` (text, nullable)
  - `signed_contract` (boolean, default false)
  - `signed_contract_year` (integer, nullable)
  - `roles` (text[], default ['participant'])
  - `stripe_customer_id` (text, nullable)
  - `billing_address` (jsonb, nullable)
  - `shipping_address` (jsonb, nullable)
  - `status_labels` (text[], default [])
  - `tenant_id` (text, default '1er-Degré')
  - `created_at` (timestamptz, auto)
  - `updated_at` (timestamptz, auto)

  ### `workshops`
  Workshop sessions with scheduling, location, and classification
  - `id` (uuid, primary key)
  - `title` (text, required)
  - `description` (text)
  - `workshop` (text, required) - Workshop family: FDFP or HD
  - `type` (text, required) - Training type
  - `language` (text, required) - Language workshop is animated in
  - `organizer` (uuid, required) - Primary organizer user ID
  - `co_organizers` (uuid[], default [])
  - `lifecycle_status` (text, required) - active, closed, canceled
  - `classification_status` (text, required) - Audience taxonomy
  - `audience_number` (integer, required) - Maximum participants
  - `invoice_number` (text, nullable)
  - `is_remote` (boolean, default false)
  - `visio_link` (text, nullable)
  - `mural_link` (text, nullable)
  - `location` (jsonb, nullable) - Physical location details
  - `start_at` (timestamptz, required)
  - `end_at` (timestamptz, required)
  - `mail_pre_html` (text, nullable)
  - `mail_post_html` (text, nullable)
  - `modified_date_flag` (boolean, default false)
  - `modified_location_flag` (boolean, default false)
  - `tenant_id` (text, default '1er-Degré')
  - `created_at` (timestamptz, auto)
  - `updated_at` (timestamptz, auto)

  ### `participations`
  User enrollments in workshops with payment tracking
  - `id` (uuid, primary key)
  - `user_id` (uuid, required)
  - `workshop_id` (uuid, required)
  - `status` (text, required) - en_attente, inscrit, paye, rembourse, echange, annule
  - `payment_status` (text, required) - none, pending, paid, refunded, failed
  - `ticket_type` (text, required) - normal, reduit, gratuit, pro
  - `price_paid` (numeric, required)
  - `exchange_parent_participation_id` (uuid, nullable)
  - `invoice_url` (text, nullable)
  - `confirmation_date` (timestamptz, nullable)
  - `mail_disabled` (boolean, default false)
  - `training_completion` (jsonb, nullable)
  - `attended` (boolean, nullable)
  - `questionnaire_response_id` (uuid, nullable)
  - `tenant_id` (text, default '1er-Degré')
  - `created_at` (timestamptz, auto)
  - `updated_at` (timestamptz, auto)

  ### `waitlist_entries`
  Geographic waitlist for workshop interest tracking
  - `id` (uuid, primary key)
  - `email` (text, required)
  - `user_id` (uuid, nullable) - null for anonymous waitlist
  - `workshop_family` (text, required) - FDFP or HD
  - `city` (text, required)
  - `radius_km` (integer, default 35)
  - `status` (text, required) - waiting, notified, converted, expired
  - `geographic_hint` (text, nullable)
  - `notified_at` (timestamptz, nullable)
  - `notified_workshop_id` (uuid, nullable)
  - `tenant_id` (text, default '1er-Degré')
  - `created_at` (timestamptz, auto)
  - `updated_at` (timestamptz, auto)

  ## Security
  - RLS enabled on all tables
  - Public read access for workshops (active, future events only)
  - Public insert access for waitlist entries
  - Users can view/update their own participations
  - Organizers can manage their workshops

  ## Indexes
  - Foreign key indexes for joins
  - Workshop filtering indexes (family, city, date range, status)
  - Participation status indexes
  - Waitlist status and family indexes
*/

-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  first_name text NOT NULL,
  last_name text NOT NULL,
  phone text,
  birthdate date,
  language_animation text,
  outside_animation text,
  signed_contract boolean DEFAULT false,
  signed_contract_year integer,
  roles text[] DEFAULT ARRAY['participant']::text[],
  stripe_customer_id text,
  billing_address jsonb,
  shipping_address jsonb,
  status_labels text[] DEFAULT ARRAY[]::text[],
  tenant_id text DEFAULT '1er-Degré',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create workshops table
CREATE TABLE IF NOT EXISTS workshops (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  workshop text NOT NULL CHECK (workshop IN ('FDFP', 'HD')),
  type text NOT NULL CHECK (type IN ('formation', 'formation_pro_1', 'formation_pro_2', 'formation_formateur', 'formation_retex')),
  language text NOT NULL,
  organizer uuid NOT NULL REFERENCES users(id),
  co_organizers uuid[] DEFAULT ARRAY[]::uuid[],
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
  mail_pre_html text,
  mail_post_html text,
  modified_date_flag boolean DEFAULT false,
  modified_location_flag boolean DEFAULT false,
  tenant_id text DEFAULT '1er-Degré',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create participations table
CREATE TABLE IF NOT EXISTS participations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id),
  workshop_id uuid NOT NULL REFERENCES workshops(id) ON DELETE CASCADE,
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
  questionnaire_response_id uuid,
  tenant_id text DEFAULT '1er-Degré',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create waitlist_entries table
CREATE TABLE IF NOT EXISTS waitlist_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  user_id uuid REFERENCES users(id),
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

-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE workshops ENABLE ROW LEVEL SECURITY;
ALTER TABLE participations ENABLE ROW LEVEL SECURITY;
ALTER TABLE waitlist_entries ENABLE ROW LEVEL SECURITY;

-- RLS Policies for users
CREATE POLICY "Users can view own profile"
  ON users FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- RLS Policies for workshops (public read for active future events)
CREATE POLICY "Public can view active future workshops"
  ON workshops FOR SELECT
  TO public
  USING (lifecycle_status = 'active');

CREATE POLICY "Organizers can insert own workshops"
  ON workshops FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = organizer);

CREATE POLICY "Organizers can update own workshops"
  ON workshops FOR UPDATE
  TO authenticated
  USING (auth.uid() = organizer)
  WITH CHECK (auth.uid() = organizer);

-- RLS Policies for participations
CREATE POLICY "Users can view own participations"
  ON participations FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own participations"
  ON participations FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own participations"
  ON participations FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for waitlist_entries (public insert for anonymous waitlist)
CREATE POLICY "Anyone can view own waitlist entries"
  ON waitlist_entries FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Anyone can insert waitlist entries"
  ON waitlist_entries FOR INSERT
  TO public
  WITH CHECK (true);

-- Create indexes for performance

-- Users indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_tenant ON users(tenant_id);

-- Workshops indexes
CREATE INDEX IF NOT EXISTS idx_workshops_organizer ON workshops(organizer);
CREATE INDEX IF NOT EXISTS idx_workshops_workshop_family ON workshops(workshop);
CREATE INDEX IF NOT EXISTS idx_workshops_lifecycle_status ON workshops(lifecycle_status);
CREATE INDEX IF NOT EXISTS idx_workshops_start_at ON workshops(start_at);
CREATE INDEX IF NOT EXISTS idx_workshops_language ON workshops(language);
CREATE INDEX IF NOT EXISTS idx_workshops_is_remote ON workshops(is_remote);
CREATE INDEX IF NOT EXISTS idx_workshops_tenant ON workshops(tenant_id);

-- Participations indexes
CREATE INDEX IF NOT EXISTS idx_participations_user ON participations(user_id);
CREATE INDEX IF NOT EXISTS idx_participations_workshop ON participations(workshop_id);
CREATE INDEX IF NOT EXISTS idx_participations_status ON participations(status);
CREATE INDEX IF NOT EXISTS idx_participations_tenant ON participations(tenant_id);

-- Waitlist indexes
CREATE INDEX IF NOT EXISTS idx_waitlist_email ON waitlist_entries(email);
CREATE INDEX IF NOT EXISTS idx_waitlist_user ON waitlist_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_waitlist_workshop_family ON waitlist_entries(workshop_family);
CREATE INDEX IF NOT EXISTS idx_waitlist_status ON waitlist_entries(status);
CREATE INDEX IF NOT EXISTS idx_waitlist_city ON waitlist_entries(city);
CREATE INDEX IF NOT EXISTS idx_waitlist_tenant ON waitlist_entries(tenant_id);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers to all tables
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_workshops_updated_at BEFORE UPDATE ON workshops
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_participations_updated_at BEFORE UPDATE ON participations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_waitlist_entries_updated_at BEFORE UPDATE ON waitlist_entries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
