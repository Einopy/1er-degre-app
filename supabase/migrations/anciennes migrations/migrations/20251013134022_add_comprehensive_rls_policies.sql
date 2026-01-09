/*
  # Add Comprehensive Row Level Security Policies

  1. Security Policies
    - Users table: Users can read and update their own data only
    - Participations table: Users can read their own participations only
    - Workshops table: Public read access for active workshops
    - Waitlist entries table: Users can read and manage their own entries
    - Invoices table (if exists): Users can read invoices where they are the payor
    - Questionnaires table (if exists): Users can read questionnaires for workshops they attended
    - Questionnaire responses table (if exists): Users can create and read their own responses
  
  2. Important Notes
    - All policies are restrictive by default
    - Users must be authenticated to access most data
    - Public can view active workshops only
    - No user can access another user's private data
    - Invoice access is limited to payor only
*/

-- Users table RLS policies
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own profile" ON users;
CREATE POLICY "Users can read own profile"
  ON users FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON users;
CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Participations table RLS policies
ALTER TABLE participations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own participations" ON participations;
CREATE POLICY "Users can view own participations"
  ON participations FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own participations" ON participations;
CREATE POLICY "Users can insert own participations"
  ON participations FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own participations" ON participations;
CREATE POLICY "Users can update own participations"
  ON participations FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Workshops table RLS policies
ALTER TABLE workshops ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view active workshops" ON workshops;
CREATE POLICY "Public can view active workshops"
  ON workshops FOR SELECT
  TO public
  USING (lifecycle_status = 'active');

DROP POLICY IF EXISTS "Authenticated can view all workshops" ON workshops;
CREATE POLICY "Authenticated can view all workshops"
  ON workshops FOR SELECT
  TO authenticated
  USING (true);

-- Waitlist entries table RLS policies
ALTER TABLE waitlist_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own waitlist entries" ON waitlist_entries;
CREATE POLICY "Users can view own waitlist entries"
  ON waitlist_entries FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR email = (SELECT email FROM users WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Users can insert own waitlist entries" ON waitlist_entries;
CREATE POLICY "Users can insert own waitlist entries"
  ON waitlist_entries FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id OR email = (SELECT email FROM users WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Users can update own waitlist entries" ON waitlist_entries;
CREATE POLICY "Users can update own waitlist entries"
  ON waitlist_entries FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id OR email = (SELECT email FROM users WHERE id = auth.uid()))
  WITH CHECK (auth.uid() = user_id OR email = (SELECT email FROM users WHERE id = auth.uid()));

-- Create invoices table if it doesn't exist (for future use)
CREATE TABLE IF NOT EXISTS invoices (
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

ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own invoices" ON invoices;
CREATE POLICY "Users can view own invoices"
  ON invoices FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Create questionnaires table if it doesn't exist (for future use)
CREATE TABLE IF NOT EXISTS questionnaires (
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

ALTER TABLE questionnaires ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view questionnaires for attended workshops" ON questionnaires;
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
        AND participations.user_id = auth.uid()
        AND participations.attended = true
      )
    )
  );

-- Create questionnaire_responses table if it doesn't exist (for future use)
CREATE TABLE IF NOT EXISTS questionnaire_responses (
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

ALTER TABLE questionnaire_responses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own questionnaire responses" ON questionnaire_responses;
CREATE POLICY "Users can view own questionnaire responses"
  ON questionnaire_responses FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own questionnaire responses" ON questionnaire_responses;
CREATE POLICY "Users can insert own questionnaire responses"
  ON questionnaire_responses FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_invoices_user_id ON invoices(user_id);
CREATE INDEX IF NOT EXISTS idx_invoices_workshop_id ON invoices(workshop_id);
CREATE INDEX IF NOT EXISTS idx_questionnaires_workshop_id ON questionnaires(workshop_id);
CREATE INDEX IF NOT EXISTS idx_questionnaire_responses_user_id ON questionnaire_responses(user_id);
CREATE INDEX IF NOT EXISTS idx_questionnaire_responses_questionnaire_id ON questionnaire_responses(questionnaire_id);