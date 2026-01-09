/*
  # Create email templates table for workshop communications

  1. New Tables
    - `email_templates`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references users) - Owner of the template (null for official templates)
      - `workshop_type` (text) - Type of workshop (FDFP, HD, or 'all' for universal)
      - `workshop_classification` (text) - Specific classification or 'all'
      - `language` (text) - Language code (fr, en, de, etc.)
      - `template_type` (text) - 'pre' or 'post' workshop
      - `subject` (text) - Email subject line with merge tag support
      - `html_content` (text) - Email body HTML with merge tags
      - `is_official` (boolean) - Whether this is an official 1er Degré template
      - `official_version` (integer) - Version number for official templates
      - `last_viewed_official_version` (integer) - Last official version the user viewed
      - `tenant_id` (uuid)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on `email_templates` table
    - Add policies for:
      - Anyone can read official templates (is_official = true)
      - Users can read their own templates
      - Users can create/update/delete their own templates
      - Only admins can create/update official templates

  3. Indexes
    - Index on user_id for fast personal template lookups
    - Index on workshop_type, language, template_type for official template lookups
    - Index on is_official for filtering

  4. Notes
    - Official templates have user_id = NULL
    - Personal templates override official templates when present
    - Merge tags supported: {{first_name}}, {{last_name}}, {{workshop_title}}, {{workshop_date}}, {{workshop_time}}, {{location}}, {{visio_link}}, {{mural_link}}
*/

-- Create email_templates table
CREATE TABLE IF NOT EXISTS email_templates (
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
  tenant_id uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_email_templates_user_id ON email_templates(user_id);
CREATE INDEX IF NOT EXISTS idx_email_templates_lookup ON email_templates(workshop_type, language, template_type) WHERE is_official = true;
CREATE INDEX IF NOT EXISTS idx_email_templates_official ON email_templates(is_official);
CREATE INDEX IF NOT EXISTS idx_email_templates_tenant ON email_templates(tenant_id);

-- RLS Policies

-- Anyone (authenticated) can read official templates
CREATE POLICY "Anyone can read official templates"
  ON email_templates FOR SELECT
  TO authenticated
  USING (is_official = true);

-- Users can read their own personal templates
CREATE POLICY "Users can read own templates"
  ON email_templates FOR SELECT
  TO authenticated
  USING (user_id = (SELECT id FROM users WHERE auth_user_id = auth.uid()));

-- Users can create their own templates
CREATE POLICY "Users can create own templates"
  ON email_templates FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = (SELECT id FROM users WHERE auth_user_id = auth.uid())
    AND is_official = false
  );

-- Users can update their own templates
CREATE POLICY "Users can update own templates"
  ON email_templates FOR UPDATE
  TO authenticated
  USING (user_id = (SELECT id FROM users WHERE auth_user_id = auth.uid()))
  WITH CHECK (
    user_id = (SELECT id FROM users WHERE auth_user_id = auth.uid())
    AND is_official = false
  );

-- Users can delete their own templates
CREATE POLICY "Users can delete own templates"
  ON email_templates FOR DELETE
  TO authenticated
  USING (user_id = (SELECT id FROM users WHERE auth_user_id = auth.uid()));

-- Admins can manage official templates
CREATE POLICY "Admins can insert official templates"
  ON email_templates FOR INSERT
  TO authenticated
  WITH CHECK (
    'admin' = ANY((SELECT roles FROM users WHERE auth_user_id = auth.uid())::text[])
    AND is_official = true
  );

CREATE POLICY "Admins can update official templates"
  ON email_templates FOR UPDATE
  TO authenticated
  USING ('admin' = ANY((SELECT roles FROM users WHERE auth_user_id = auth.uid())::text[]))
  WITH CHECK ('admin' = ANY((SELECT roles FROM users WHERE auth_user_id = auth.uid())::text[]));

-- Seed official templates for common workshop types
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
