/*
  # Add Missing RLS Policies for User Registration

  ## Changes
  - Add INSERT policy for users table to allow sign-up
  - Users can insert their own profile when ID matches auth.uid()

  ## Security
  - Restrictive policy ensures users can only create their own profile
  - ID must match authenticated user's ID from auth system
*/

CREATE POLICY "Users can insert own profile during sign-up"
  ON users FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);
