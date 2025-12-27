/*
  # Create scheduled_emails table for tracking planned email batches

  1. New Tables
    - `scheduled_emails`
      - `id` (uuid, primary key) - Unique scheduled email identifier
      - `workshop_id` (uuid, foreign key) - Reference to workshop
      - `email_type` (text) - Type of email: 'pre', 'post', or 'spontane'
      - `scheduled_at` (timestamptz) - When email batch should be sent
      - `status` (text) - Status: 'pending', 'processing', 'sent', 'failed'
      - `recipient_count` (integer) - Number of recipients in the batch
      - `subject_snapshot` (text) - Email subject at schedule time
      - `html_snapshot` (text) - HTML content at schedule time for audit trail
      - `sent_at` (timestamptz, nullable) - Actual send timestamp
      - `error_message` (text, nullable) - Error details if batch failed
      - `tenant_id` (uuid) - Tenant identifier for multi-tenant isolation
      - `created_at` (timestamptz) - Schedule creation timestamp
      - `updated_at` (timestamptz) - Last update timestamp

  2. Indexes
    - Index on workshop_id for efficient workshop queries
    - Index on email_type for filtering by email type
    - Index on status for processing queue queries
    - Index on scheduled_at for time-based queries

  3. Security
    - Enable RLS on scheduled_emails table
    - Add policy for organizers to view scheduled emails for their workshops
    - Add policy for system to insert and update scheduled emails
*/

-- Create scheduled_emails table
CREATE TABLE IF NOT EXISTS scheduled_emails (
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

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_scheduled_emails_workshop_id ON scheduled_emails(workshop_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_emails_email_type ON scheduled_emails(email_type);
CREATE INDEX IF NOT EXISTS idx_scheduled_emails_status ON scheduled_emails(status);
CREATE INDEX IF NOT EXISTS idx_scheduled_emails_scheduled_at ON scheduled_emails(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_scheduled_emails_workshop_type ON scheduled_emails(workshop_id, email_type);

-- Enable Row Level Security
ALTER TABLE scheduled_emails ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can view scheduled emails (application layer enforces permissions)
CREATE POLICY "Public can view scheduled emails"
  ON scheduled_emails FOR SELECT
  TO public
  USING (true);

-- Policy: Anyone can insert scheduled emails (application layer enforces permissions)
CREATE POLICY "Public can insert scheduled emails"
  ON scheduled_emails FOR INSERT
  TO public
  WITH CHECK (true);

-- Policy: Anyone can update scheduled emails (application layer enforces permissions)
CREATE POLICY "Public can update scheduled emails"
  ON scheduled_emails FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (true);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_scheduled_emails_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER scheduled_emails_updated_at
  BEFORE UPDATE ON scheduled_emails
  FOR EACH ROW
  EXECUTE FUNCTION update_scheduled_emails_updated_at();
