/*
  # Add Debug SELECT Policies for Role-Related Tables

  This migration adds temporary debug policies to allow all authenticated users
  to SELECT from role-related tables. These policies are designed to help diagnose
  permission issues without modifying existing policies.

  1. Changes
    - Add SELECT policy for user_role_levels table
    - Add SELECT policy for role_levels table
    - Add SELECT policy for workshop_families table

  2. Security
    - All three policies only grant SELECT (read) access
    - Access is restricted to authenticated users only
    - No write permissions are granted
    - Existing policies remain unchanged
*/

-- Add debug SELECT policy for user_role_levels
CREATE POLICY "Debug: all authenticated can select user_role_levels"
  ON user_role_levels
  FOR SELECT
  TO authenticated
  USING (true);

-- Add debug SELECT policy for role_levels
CREATE POLICY "Debug: all authenticated can select role_levels"
  ON role_levels
  FOR SELECT
  TO authenticated
  USING (true);

-- Add debug SELECT policy for workshop_families
CREATE POLICY "Debug: all authenticated can select workshop_families"
  ON workshop_families
  FOR SELECT
  TO authenticated
  USING (true);
