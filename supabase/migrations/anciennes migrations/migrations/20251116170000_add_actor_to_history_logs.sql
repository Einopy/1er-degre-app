/*
  # Add Actor Attribution to Workshop History Logs

  1. Changes
    - Add `actor_user_id` column to `workshop_history_logs` table to track who performed the action
    - This distinguishes between:
      - actor_user_id: Who performed the action (e.g., organizer who cancelled)
      - user_id: Who is affected by the action (e.g., participant who was cancelled)
    - Add index on `actor_user_id` for performance
    - Add foreign key constraint to users table

  2. Data Migration
    - Backfill existing records where user_id should be actor_user_id
    - For actions like participant_add, participant_remove, etc., the user_id was actually the actor
    - Set actor_user_id = user_id for all existing records as a baseline

  3. Security
    - No changes to RLS policies
    - Existing policies continue to work with the new column

  4. Examples
    - Organizer cancels a participant:
      - actor_user_id: organizer's ID
      - user_id: participant's ID (can be null if action doesn't target a specific user)
    - Participant self-cancels:
      - actor_user_id: participant's ID
      - user_id: participant's ID (same person)
    - Organizer sends email:
      - actor_user_id: organizer's ID
      - user_id: null (action doesn't target a specific user)
*/

-- Add actor_user_id column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'workshop_history_logs' AND column_name = 'actor_user_id'
  ) THEN
    ALTER TABLE workshop_history_logs ADD COLUMN actor_user_id uuid REFERENCES users(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Backfill existing records: set actor_user_id from user_id
UPDATE workshop_history_logs
SET actor_user_id = user_id
WHERE actor_user_id IS NULL AND user_id IS NOT NULL;

-- For system-generated events without a user_id, leave actor_user_id as null
-- These might be automated events or initial workshop creation events

-- Add index for performance when querying by actor
CREATE INDEX IF NOT EXISTS idx_workshop_history_logs_actor_user_id
  ON workshop_history_logs(actor_user_id);

-- Add comment to clarify the distinction
COMMENT ON COLUMN workshop_history_logs.actor_user_id IS 'User who performed the action (e.g., organizer who cancelled a participant)';
COMMENT ON COLUMN workshop_history_logs.user_id IS 'User affected by the action (e.g., participant who was cancelled). Can be null for actions that do not target a specific user.';
