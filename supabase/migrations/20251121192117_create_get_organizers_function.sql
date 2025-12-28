/*
  # Create get_organizers() Database Function

  ## Purpose
  Create a PostgreSQL function that can reliably fetch organizers list
  even if RLS policies are causing issues with the client-side queries.

  ## Function Details
  - Returns a list of user IDs who have organizer roles
  - Uses SECURITY DEFINER to bypass RLS
  - Can be called from JavaScript using supabase.rpc('get_organizers')

  ## Why This Helps
  If RLS policies are blocking the user_role_levels query from the client,
  this function runs with elevated privileges and can reliably access the data.

  ## Changes
  1. Create get_organizers() function that returns user IDs with role levels
  2. Grant execute permission to authenticated users
*/

-- =====================================================
-- CREATE GET_ORGANIZERS FUNCTION
-- =====================================================

CREATE OR REPLACE FUNCTION get_organizers()
RETURNS TABLE (
  user_id uuid,
  role_count bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    url.user_id,
    COUNT(url.id) as role_count
  FROM user_role_levels url
  GROUP BY url.user_id
  ORDER BY role_count DESC;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_organizers() TO authenticated;

-- Add comment for documentation
COMMENT ON FUNCTION get_organizers() IS
'Returns list of users who have at least one role level (organizers/animators). Uses SECURITY DEFINER to bypass RLS policies.';
