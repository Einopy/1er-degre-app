/*
  # Simplify Co-Organizers to Array Column

  1. Changes
    - Add `co_organizers` array column to workshops table
    - Keep `workshop_co_organizer_alerts` table for notifications
    - Drop `workshop_co_organizers` junction table (no longer needed)

  2. Data Safety
    - Using IF EXISTS/IF NOT EXISTS to prevent errors
    - Alerts table remains for notification functionality

  3. Security
    - Co-organizers are managed through the workshops table
    - RLS policies updated to check co_organizers array
*/

-- Add co_organizers column to workshops table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'workshops' AND column_name = 'co_organizers'
  ) THEN
    ALTER TABLE workshops ADD COLUMN co_organizers uuid[] DEFAULT ARRAY[]::uuid[];
  END IF;
END $$;

-- Drop the junction table if it exists (CASCADE to drop dependent policies)
DROP TABLE IF EXISTS workshop_co_organizers CASCADE;

-- Update RLS policies for workshops to include co-organizers
DROP POLICY IF EXISTS "Organizers can update own workshops" ON workshops;
DROP POLICY IF EXISTS "Organizers can insert own workshops" ON workshops;

CREATE POLICY "Organizers and co-organizers can update workshops"
  ON workshops FOR UPDATE
  TO authenticated
  USING (
    organizer = current_setting('app.current_user_id')::uuid
    OR current_setting('app.current_user_id')::uuid = ANY(co_organizers)
  )
  WITH CHECK (
    organizer = current_setting('app.current_user_id')::uuid
    OR current_setting('app.current_user_id')::uuid = ANY(co_organizers)
  );

CREATE POLICY "Organizers can insert own workshops"
  ON workshops FOR INSERT
  TO authenticated
  WITH CHECK (organizer = current_setting('app.current_user_id')::uuid);

-- Create index on co_organizers for efficient queries
CREATE INDEX IF NOT EXISTS idx_workshops_co_organizers ON workshops USING GIN (co_organizers);
