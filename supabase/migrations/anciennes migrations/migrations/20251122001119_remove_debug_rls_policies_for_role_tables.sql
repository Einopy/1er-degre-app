/*
  # Remove Debug RLS Policies for Role-Related Tables

  ## Overview
  This migration removes all temporary "Debug:" policies that were added to diagnose
  permission issues. These policies were too permissive (USING true) and are no longer needed.

  ## Analysis
  The existing non-Debug policies already provide proper security:
  
  ### workshop_families (existing policies remain):
  - "Client admins can view their client's workshop families" - Client-scoped SELECT
  - "System admins can view all workshop families" - Admin global access
  - "Super admins can view all workshop families" - Super admin global access
  - Plus INSERT/UPDATE/DELETE policies for client admins
  
  ### role_levels (existing policies remain):
  - "Client admins can view their client's role levels" - Client-scoped SELECT
  - "System admins can view all role levels" - Admin global access
  - "Super admins can view all role levels" - Super admin global access
  - Plus INSERT/UPDATE/DELETE policies for client admins
  
  ### user_role_levels (existing policies remain):
  - "Users can view their own role levels" - Personal data access
  - "Client admins can view role levels for their client" - Client-scoped SELECT
  - "Super admins can manage all role levels" - Super admin full access
  - Plus INSERT/DELETE policies for client admins

  ## Security Impact
  After this migration:
  - Client admins: See only their client's animators (proper multi-tenant isolation)
  - Super admins: See all animators (platform management role)
  - System admins: See all animators (platform management role)
  - Regular users: See only their own role levels
  - Anon users: No access to sensitive role data

  ## Changes
  Removes 6 debug policies:
  1. "Debug: all authenticated can select workshop_families"
  2. "Debug: anon can select workshop_families"
  3. "Debug: all authenticated can select role_levels"
  4. "Debug: anon can select role_levels"
  5. "Debug: all authenticated can select user_role_levels"
  6. "Debug: anon can select user_role_levels"

  All other policies remain unchanged.
*/

-- =====================================================
-- DROP DEBUG POLICIES FOR WORKSHOP_FAMILIES
-- =====================================================

DROP POLICY IF EXISTS "Debug: all authenticated can select workshop_families" ON workshop_families;
DROP POLICY IF EXISTS "Debug: anon can select workshop_families" ON workshop_families;

-- =====================================================
-- DROP DEBUG POLICIES FOR ROLE_LEVELS
-- =====================================================

DROP POLICY IF EXISTS "Debug: all authenticated can select role_levels" ON role_levels;
DROP POLICY IF EXISTS "Debug: anon can select role_levels" ON role_levels;

-- =====================================================
-- DROP DEBUG POLICIES FOR USER_ROLE_LEVELS
-- =====================================================

DROP POLICY IF EXISTS "Debug: all authenticated can select user_role_levels" ON user_role_levels;
DROP POLICY IF EXISTS "Debug: anon can select user_role_levels" ON user_role_levels;
