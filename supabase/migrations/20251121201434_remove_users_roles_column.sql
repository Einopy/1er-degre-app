/*
  # Remove users.roles Column
  
  ## Purpose
  The application now exclusively uses the user_role_levels table for role management.
  The users.roles array column is deprecated and no longer used.
  
  ## Changes
  1. Drop the roles column from users table
  2. This simplifies the data model and removes duplicate sources of truth
  
  ## Impact
  - All role checks now go through user_role_levels table
  - RLS policies should not reference users.roles anymore
  - Application code should use user_role_levels for all permission checks
*/

-- Drop the roles column from users table
ALTER TABLE users DROP COLUMN IF EXISTS roles;
