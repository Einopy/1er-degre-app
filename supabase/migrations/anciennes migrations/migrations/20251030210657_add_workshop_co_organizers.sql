/*
  # Add Workshop Co-Organizers Support

  1. New Tables
    - `workshop_co_organizers`
      - `id` (uuid, primary key)
      - `workshop_id` (uuid, foreign key to workshops)
      - `user_id` (uuid, foreign key to users)
      - `assigned_at` (timestamptz)
      - `tenant_id` (text)
      - Unique constraint on (workshop_id, user_id) to prevent duplicates

    - `workshop_co_organizer_alerts`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to users)
      - `workshop_id` (uuid, foreign key to workshops)
      - `dismissed_at` (timestamptz, nullable)
      - `created_at` (timestamptz)
      - `tenant_id` (text)
      - Tracks dismissal state for co-organizer assignment alerts

  2. Security
    - Enable RLS on both tables
    - Co-organizers can view their assignments
    - Primary organizers can manage co-organizers for their workshops
    - Users can view and dismiss their own alerts

  3. Indexes
    - Index on workshop_id for efficient workshop lookups
    - Index on user_id for efficient user lookups
    - Index on dismissed_at for pending alert queries
*/

-- Create workshop_co_organizers table
CREATE TABLE IF NOT EXISTS workshop_co_organizers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workshop_id uuid NOT NULL REFERENCES workshops(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  assigned_at timestamptz DEFAULT now(),
  tenant_id text DEFAULT '1er-Degré',
  UNIQUE (workshop_id, user_id)
);

-- Create workshop_co_organizer_alerts table
CREATE TABLE IF NOT EXISTS workshop_co_organizer_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  workshop_id uuid NOT NULL REFERENCES workshops(id) ON DELETE CASCADE,
  dismissed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  tenant_id text DEFAULT '1er-Degré'
);

-- Enable RLS
ALTER TABLE workshop_co_organizers ENABLE ROW LEVEL SECURITY;
ALTER TABLE workshop_co_organizer_alerts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for workshop_co_organizers
CREATE POLICY "Users can view their co-organizer assignments"
  ON workshop_co_organizers FOR SELECT
  USING (
    user_id IN (
      SELECT id FROM users WHERE id = current_setting('app.current_user_id')::uuid
    )
    OR
    workshop_id IN (
      SELECT id FROM workshops WHERE organizer = current_setting('app.current_user_id')::uuid
    )
  );

CREATE POLICY "Primary organizers can insert co-organizers"
  ON workshop_co_organizers FOR INSERT
  WITH CHECK (
    workshop_id IN (
      SELECT id FROM workshops WHERE organizer = current_setting('app.current_user_id')::uuid
    )
  );

CREATE POLICY "Primary organizers can delete co-organizers"
  ON workshop_co_organizers FOR DELETE
  USING (
    workshop_id IN (
      SELECT id FROM workshops WHERE organizer = current_setting('app.current_user_id')::uuid
    )
  );

-- RLS Policies for workshop_co_organizer_alerts
CREATE POLICY "Users can view their own alerts"
  ON workshop_co_organizer_alerts FOR SELECT
  USING (
    user_id = current_setting('app.current_user_id')::uuid
  );

CREATE POLICY "Anyone can insert alerts"
  ON workshop_co_organizer_alerts FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can update their own alerts"
  ON workshop_co_organizer_alerts FOR UPDATE
  USING (
    user_id = current_setting('app.current_user_id')::uuid
  )
  WITH CHECK (
    user_id = current_setting('app.current_user_id')::uuid
  );

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_workshop_co_organizers_workshop ON workshop_co_organizers(workshop_id);
CREATE INDEX IF NOT EXISTS idx_workshop_co_organizers_user ON workshop_co_organizers(user_id);
CREATE INDEX IF NOT EXISTS idx_workshop_co_organizers_tenant ON workshop_co_organizers(tenant_id);

CREATE INDEX IF NOT EXISTS idx_co_organizer_alerts_user ON workshop_co_organizer_alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_co_organizer_alerts_workshop ON workshop_co_organizer_alerts(workshop_id);
CREATE INDEX IF NOT EXISTS idx_co_organizer_alerts_dismissed ON workshop_co_organizer_alerts(dismissed_at);
CREATE INDEX IF NOT EXISTS idx_co_organizer_alerts_tenant ON workshop_co_organizer_alerts(tenant_id);
