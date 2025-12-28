/*
  # Add Organizer Workshop Management Fields

  ## Overview
  This migration adds comprehensive change tracking and management features for workshop organizers.
  It enables versioned date/location changes, participant confirmation tracking, ICS file storage,
  and detailed history logging.

  ## New Fields on `workshops` table
    - `ics_file_url` (text, nullable) - Stores the URL of the generated ICS calendar file
    - `date_change_history` (jsonb, default []) - Array of date change objects with versions
    - `location_change_history` (jsonb, default []) - Array of location change objects with versions

  ## New Fields on `participations` table
    - `date_confirmation_version` (integer, default 0) - Version of date the participant has confirmed
    - `location_confirmation_version` (integer, default 0) - Version of location the participant has confirmed

  ## New Table: `workshop_history_logs`
    - Comprehensive logging of all workshop state changes, edits, and participant actions
    - Enables audit trails and timeline views for organizers
    - Supports future email tracking and advanced analytics

  ## Security
    - Enable RLS on workshop_history_logs table
    - Organizers and co-organizers can view logs for their workshops
    - Only authenticated users with proper permissions can create logs
*/

-- Add new fields to workshops table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'workshops' AND column_name = 'ics_file_url'
  ) THEN
    ALTER TABLE workshops ADD COLUMN ics_file_url text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'workshops' AND column_name = 'date_change_history'
  ) THEN
    ALTER TABLE workshops ADD COLUMN date_change_history jsonb DEFAULT '[]'::jsonb;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'workshops' AND column_name = 'location_change_history'
  ) THEN
    ALTER TABLE workshops ADD COLUMN location_change_history jsonb DEFAULT '[]'::jsonb;
  END IF;
END $$;

-- Add new fields to participations table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'participations' AND column_name = 'date_confirmation_version'
  ) THEN
    ALTER TABLE participations ADD COLUMN date_confirmation_version integer DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'participations' AND column_name = 'location_confirmation_version'
  ) THEN
    ALTER TABLE participations ADD COLUMN location_confirmation_version integer DEFAULT 0;
  END IF;
END $$;

-- Create workshop_history_logs table
CREATE TABLE IF NOT EXISTS workshop_history_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workshop_id uuid NOT NULL REFERENCES workshops(id) ON DELETE CASCADE,
  log_type text NOT NULL CHECK (log_type IN (
    'status_change',
    'field_edit',
    'participant_add',
    'participant_remove',
    'refund',
    'email_sent',
    'date_change',
    'location_change'
  )),
  description text NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  tenant_id uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000'::uuid,
  created_at timestamptz DEFAULT now()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_workshop_history_logs_workshop_id 
  ON workshop_history_logs(workshop_id);

CREATE INDEX IF NOT EXISTS idx_workshop_history_logs_created_at 
  ON workshop_history_logs(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_workshop_history_logs_log_type 
  ON workshop_history_logs(log_type);

-- Enable RLS on workshop_history_logs
ALTER TABLE workshop_history_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for workshop_history_logs

-- Organizers and co-organizers can view logs for their workshops
CREATE POLICY "Organizers can view workshop history logs"
  ON workshop_history_logs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM workshops
      WHERE workshops.id = workshop_history_logs.workshop_id
      AND (
        workshops.organizer = auth.uid()
        OR auth.uid() = ANY(workshops.co_organizers)
      )
    )
  );

-- Authenticated users can create logs (via application logic with proper permissions)
CREATE POLICY "Authenticated users can create workshop history logs"
  ON workshop_history_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM workshops
      WHERE workshops.id = workshop_history_logs.workshop_id
      AND (
        workshops.organizer = auth.uid()
        OR auth.uid() = ANY(workshops.co_organizers)
      )
    )
  );

-- Admins can view all logs
CREATE POLICY "Admins can view all workshop history logs"
  ON workshop_history_logs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND 'admin' = ANY(users.roles)
    )
  );