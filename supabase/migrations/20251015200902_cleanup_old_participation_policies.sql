/*
  # Cleanup Old Participation Policies

  ## Overview
  Remove obsolete policies from previous migrations that conflict with or are
  redundant to the new public access model for custom authentication.

  ## Changes
  1. Remove old organizer-specific policies (covered by public policies + app logic)
  2. Remove old migration policies (no longer needed)
  3. Keep only: service_role full access, and public insert/select/update policies

  ## Security Notes
  - Application layer handles authorization for organizers
  - Public policies allow database operations with app-level filtering
  - Data integrity maintained by constraints and foreign keys
*/

-- Remove obsolete organizer policies (app layer handles this now)
DROP POLICY IF EXISTS "Organizers can view workshop participants" ON participations;
DROP POLICY IF EXISTS "Organizers can update workshop participants" ON participations;

-- Remove obsolete migration policies (no longer needed)
DROP POLICY IF EXISTS "Users can update participation user_id during migration" ON participations;
