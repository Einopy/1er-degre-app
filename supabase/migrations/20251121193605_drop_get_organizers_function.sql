/*
  # Drop get_organizers() Database Function

  ## Purpose
  Remove the security bypass function that was incorrectly used to circumvent RLS.
  Admins should access data through proper RLS policies, not bypasses.

  ## Changes
  1. Drop the get_organizers() function
*/

-- Drop the function if it exists
DROP FUNCTION IF EXISTS get_organizers();
