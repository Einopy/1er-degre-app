/*
  # Drop user_client_memberships Table

  ## Overview
  Removes the user_client_memberships table which has been replaced
  by the user_role_levels table for better granularity and multi-client support.

  ## Changes
  - Drop trigger and function
  - Drop table and indexes
*/

-- Drop trigger
DROP TRIGGER IF EXISTS trigger_auto_create_user_client_membership ON workshops;

-- Drop function
DROP FUNCTION IF EXISTS auto_create_user_client_membership();

-- Drop table (CASCADE will drop related constraints)
DROP TABLE IF EXISTS user_client_memberships CASCADE;