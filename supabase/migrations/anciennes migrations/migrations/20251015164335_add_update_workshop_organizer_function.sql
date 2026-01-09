/*
  # Add update_workshop_organizer function

  ## Purpose
  This migration creates a stored procedure to safely update workshop organizer references
  during user account migration. This function is critical for the authentication system
  to properly migrate existing users to authenticated accounts.

  ## Changes
  1. Creates `update_workshop_organizer` function
     - Updates workshops.organizer field when migrating user IDs
     - Updates co_organizers array by replacing old user ID with new one
     - Uses service role permissions to bypass RLS

  ## Security
  - Function runs with SECURITY DEFINER to use creator's permissions
  - Only updates organizer and co_organizers fields
  - No data loss, only ID updates
*/

CREATE OR REPLACE FUNCTION update_workshop_organizer(
  old_user_id UUID,
  new_user_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE workshops
  SET organizer = new_user_id
  WHERE organizer = old_user_id;

  UPDATE workshops
  SET co_organizers = array_replace(co_organizers, old_user_id, new_user_id)
  WHERE old_user_id = ANY(co_organizers);
END;
$$;