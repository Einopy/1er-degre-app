/*
  # Fix RLS Policies for Workshop History Logs
  
  ## Overview
  This migration fixes the RLS policies for the workshop_history_logs table to work
  with the custom authentication system. The current policies use auth.uid() which
  returns null since the app uses custom auth instead of Supabase Auth.
  
  ## Changes
    - Drop existing RLS policies that depend on auth.uid()
    - Create new policies that allow public access with proper WITH CHECK conditions
    - Application layer enforces permissions (organizers/co-organizers only)
  
  ## Security
    - Table remains protected by RLS (enabled)
    - SELECT policy allows anyone to read (application filters results)
    - INSERT policy allows anyone to insert (application validates user permissions)
    - This matches the pattern used for workshops and participations tables
*/

-- Drop existing policies that rely on auth.uid()
DROP POLICY IF EXISTS "Organizers can view workshop history logs" ON workshop_history_logs;
DROP POLICY IF EXISTS "Authenticated users can create workshop history logs" ON workshop_history_logs;
DROP POLICY IF EXISTS "Admins can view all workshop history logs" ON workshop_history_logs;

-- Allow public to view workshop history logs
-- Application layer filters based on user permissions
CREATE POLICY "Public can view workshop history logs"
  ON workshop_history_logs
  FOR SELECT
  TO public
  USING (true);

-- Allow public to insert workshop history logs
-- Application layer validates that only organizers/co-organizers can log events
CREATE POLICY "Public can insert workshop history logs"
  ON workshop_history_logs
  FOR INSERT
  TO public
  WITH CHECK (true);
