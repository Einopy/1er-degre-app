/*
  # Add participant_reinscribe log type to workshop_history_logs

  1. Changes
    - Add 'participant_reinscribe' to the allowed log_type values in the CHECK constraint
    - This log type is already used in the application but was missing from the database constraint

  2. Security
    - No changes to RLS policies
*/

-- Drop the existing CHECK constraint
ALTER TABLE workshop_history_logs
  DROP CONSTRAINT IF EXISTS workshop_history_logs_log_type_check;

-- Add the updated CHECK constraint with participant_reinscribe included
ALTER TABLE workshop_history_logs
  ADD CONSTRAINT workshop_history_logs_log_type_check
  CHECK (log_type IN (
    'status_change',
    'field_edit',
    'participant_add',
    'participant_remove',
    'participant_reinscribe',
    'refund',
    'email_sent',
    'date_change',
    'location_change'
  ));
