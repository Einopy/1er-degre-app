/*
  # Add Debug Anon SELECT Policies for Role-Related Tables

  This migration adds temporary debug policies to allow anon (unauthenticated) users
  to SELECT from role-related tables. These policies are designed to help diagnose
  permission issues without modifying existing policies.

  1. Changes
    - Add anon SELECT policy for user_role_levels table
    - Add anon SELECT policy for role_levels table
    - Add anon SELECT policy for workshop_families table

  2. Security
    - All three policies only grant SELECT (read) access
    - Access is for anon role (browser client using anon key)
    - No write permissions are granted
    - Existing policies remain unchanged
*/

-- Add debug anon SELECT policy for user_role_levels
CREATE POLICY "Debug: anon can select user_role_levels"
  ON user_role_levels
  FOR SELECT
  TO anon
  USING (true);

-- Add debug anon SELECT policy for role_levels
CREATE POLICY "Debug: anon can select role_levels"
  ON role_levels
  FOR SELECT
  TO anon
  USING (true);

-- Add debug anon SELECT policy for workshop_families
CREATE POLICY "Debug: anon can select workshop_families"
  ON workshop_families
  FOR SELECT
  TO anon
  USING (true);
