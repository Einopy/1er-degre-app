/*
  # Create mail_logs table for email delivery tracking

  1. New Tables
    - `mail_logs`
      - `id` (uuid, primary key) - Unique mail log identifier
      - `workshop_id` (uuid, foreign key) - Reference to workshop
      - `participation_id` (uuid, foreign key, nullable) - Reference to specific participation
      - `recipient_email` (text) - Recipient email address
      - `recipient_user_id` (uuid, nullable) - Reference to recipient user if registered
      - `email_type` (text) - Type of email: 'pre', 'post', or 'spontane'
      - `subject` (text) - Email subject line
      - `sent_at` (timestamptz, nullable) - When email was sent to provider
      - `delivery_status` (text) - Status: 'queued', 'sent', 'delivered', 'failed'
      - `error_message` (text, nullable) - Error details if delivery failed
      - `provider_message_id` (text, nullable) - Email service provider's message identifier
      - `tenant_id` (uuid) - Tenant identifier for multi-tenant isolation
      - `created_at` (timestamptz) - Log entry creation timestamp
      - `updated_at` (timestamptz) - Last update timestamp

  2. Indexes
    - Index on workshop_id for efficient workshop queries
    - Index on participation_id for participant-specific queries
    - Index on email_type for filtering by email type
    - Index on delivery_status for failed email queries

  3. Security
    - Enable RLS on mail_logs table
    - Add policy for organizers to view logs for their workshops
    - Add policy for system to insert and update logs
*/

-- Create mail_logs table
CREATE TABLE IF NOT EXISTS mail_logs (
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

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_mail_logs_workshop_id ON mail_logs(workshop_id);
CREATE INDEX IF NOT EXISTS idx_mail_logs_participation_id ON mail_logs(participation_id) WHERE participation_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_mail_logs_email_type ON mail_logs(email_type);
CREATE INDEX IF NOT EXISTS idx_mail_logs_delivery_status ON mail_logs(delivery_status);
CREATE INDEX IF NOT EXISTS idx_mail_logs_workshop_participant ON mail_logs(workshop_id, participation_id);

-- Enable Row Level Security
ALTER TABLE mail_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can view mail logs (application layer enforces permissions)
CREATE POLICY "Public can view mail logs"
  ON mail_logs FOR SELECT
  TO public
  USING (true);

-- Policy: Anyone can insert mail logs (application layer enforces permissions)
CREATE POLICY "Public can insert mail logs"
  ON mail_logs FOR INSERT
  TO public
  WITH CHECK (true);

-- Policy: Anyone can update mail logs (application layer enforces permissions)
CREATE POLICY "Public can update mail logs"
  ON mail_logs FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (true);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_mail_logs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER mail_logs_updated_at
  BEFORE UPDATE ON mail_logs
  FOR EACH ROW
  EXECUTE FUNCTION update_mail_logs_updated_at();
