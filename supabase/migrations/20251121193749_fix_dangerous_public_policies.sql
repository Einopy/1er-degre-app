/*
  # Fix Dangerous Public Policies

  ## CRITICAL SECURITY ISSUE
  The role_levels and workshop_families tables have PUBLIC policies that allow
  ANY user (even unauthenticated) to read, insert, update, and delete data.
  This is a severe security vulnerability.

  ## Root Cause
  Policies named "Allow public select/insert/update/delete on..." were created
  (likely from Supabase Studio's automatic policy generation).

  ## Solution
  1. Drop all dangerous public policies
  2. Keep only proper RLS policies that check authentication and permissions
  3. Fix "System admins" policies to be client-scoped, not global

  ## Changes
  - Drop public access policies on role_levels
  - Drop public access policies on workshop_families
  - Drop "System admins can view all..." policies (too broad)
  - Ensure client-scoped policies remain for proper admin access
*/

-- =====================================================
-- ROLE_LEVELS - REMOVE DANGEROUS PUBLIC ACCESS
-- =====================================================

DROP POLICY IF EXISTS "Allow public select on role_levels" ON role_levels;
DROP POLICY IF EXISTS "Allow public insert on role_levels" ON role_levels;
DROP POLICY IF EXISTS "Allow public update on role_levels" ON role_levels;
DROP POLICY IF EXISTS "Allow public delete on role_levels" ON role_levels;

-- Drop overly broad system admin policy
DROP POLICY IF EXISTS "System admins can view all role levels" ON role_levels;

-- =====================================================
-- WORKSHOP_FAMILIES - REMOVE DANGEROUS PUBLIC ACCESS
-- =====================================================

DROP POLICY IF EXISTS "Allow public select on workshop_families" ON workshop_families;
DROP POLICY IF EXISTS "Allow public insert on workshop_families" ON workshop_families;
DROP POLICY IF EXISTS "Allow public update on workshop_families" ON workshop_families;
DROP POLICY IF EXISTS "Allow public delete on workshop_families" ON workshop_families;

-- Drop overly broad system admin policy  
DROP POLICY IF EXISTS "System admins can view all workshop families" ON workshop_families;

-- =====================================================
-- USER_ROLE_LEVELS - DROP OVERLY BROAD ADMIN POLICY
-- =====================================================

DROP POLICY IF EXISTS "System admins can view all role levels" ON user_role_levels;

-- Note: The proper "Client admins can view..." policies already exist
-- and will continue to work correctly after removing the overly broad ones.
