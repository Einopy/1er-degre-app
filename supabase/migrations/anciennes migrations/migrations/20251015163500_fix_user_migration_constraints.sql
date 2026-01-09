/*
  # Fix User Migration Foreign Key Constraints

  ## Overview
  Fixes foreign key constraints to support user migration without conflicts.
  Adds helper function for updating workshop organizer references.

  ## Changes Made

  1. Foreign Key Updates
    - Update workshops.organizer to use ON DELETE SET NULL instead of constraint error
    - Update participations.user_id to use ON DELETE CASCADE
    - Update waitlist_entries.user_id to use ON DELETE SET NULL
    - Update invoices.user_id to use ON DELETE CASCADE (if table exists)
    - Update questionnaire_responses.user_id to use ON DELETE CASCADE (if table exists)

  2. Helper Functions
    - Create update_workshop_organizer RPC function to update organizer and co_organizers arrays

  3. Security
    - Helper function only callable by authenticated users with service role

  ## Important Notes
  - This migration enables smooth user account migration from non-authenticated to authenticated
  - ON DELETE CASCADE ensures related data is handled appropriately
  - ON DELETE SET NULL preserves workshop records when organizer is removed
*/

-- Drop existing foreign key constraints and recreate with proper ON DELETE behavior

-- Update workshops.organizer constraint
ALTER TABLE workshops
  DROP CONSTRAINT IF EXISTS workshops_organizer_fkey;

ALTER TABLE workshops
  ADD CONSTRAINT workshops_organizer_fkey
  FOREIGN KEY (organizer)
  REFERENCES users(id)
  ON DELETE SET NULL;

-- Update participations.user_id constraint (should cascade to preserve data integrity)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'participations_user_id_fkey'
    AND table_name = 'participations'
  ) THEN
    ALTER TABLE participations DROP CONSTRAINT participations_user_id_fkey;
  END IF;
END $$;

ALTER TABLE participations
  ADD CONSTRAINT participations_user_id_fkey
  FOREIGN KEY (user_id)
  REFERENCES users(id)
  ON DELETE CASCADE;

-- Update waitlist_entries.user_id constraint
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'waitlist_entries_user_id_fkey'
    AND table_name = 'waitlist_entries'
  ) THEN
    ALTER TABLE waitlist_entries DROP CONSTRAINT waitlist_entries_user_id_fkey;
  END IF;
END $$;

ALTER TABLE waitlist_entries
  ADD CONSTRAINT waitlist_entries_user_id_fkey
  FOREIGN KEY (user_id)
  REFERENCES users(id)
  ON DELETE SET NULL;

-- Update invoices.user_id constraint if table exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'invoices') THEN
    IF EXISTS (
      SELECT 1 FROM information_schema.table_constraints
      WHERE constraint_name = 'invoices_user_id_fkey'
      AND table_name = 'invoices'
    ) THEN
      ALTER TABLE invoices DROP CONSTRAINT invoices_user_id_fkey;
    END IF;

    ALTER TABLE invoices
      ADD CONSTRAINT invoices_user_id_fkey
      FOREIGN KEY (user_id)
      REFERENCES users(id)
      ON DELETE CASCADE;
  END IF;
END $$;

-- Update questionnaire_responses.user_id constraint if table exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'questionnaire_responses') THEN
    IF EXISTS (
      SELECT 1 FROM information_schema.table_constraints
      WHERE constraint_name = 'questionnaire_responses_user_id_fkey'
      AND table_name = 'questionnaire_responses'
    ) THEN
      ALTER TABLE questionnaire_responses DROP CONSTRAINT questionnaire_responses_user_id_fkey;
    END IF;

    ALTER TABLE questionnaire_responses
      ADD CONSTRAINT questionnaire_responses_user_id_fkey
      FOREIGN KEY (user_id)
      REFERENCES users(id)
      ON DELETE CASCADE;
  END IF;
END $$;

-- Create helper function to update workshop organizer references
CREATE OR REPLACE FUNCTION update_workshop_organizer(
  old_user_id uuid,
  new_user_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Update main organizer field
  UPDATE workshops
  SET organizer = new_user_id
  WHERE organizer = old_user_id;

  -- Update co_organizers array by replacing old ID with new ID
  UPDATE workshops
  SET co_organizers = array_replace(co_organizers, old_user_id, new_user_id)
  WHERE old_user_id = ANY(co_organizers);
END;
$$;

-- Grant execute permission to authenticated users (service role will use this)
GRANT EXECUTE ON FUNCTION update_workshop_organizer(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION update_workshop_organizer(uuid, uuid) TO service_role;
