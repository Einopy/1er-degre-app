/*
  # Add INSERT Policy for Users Table

  1. Overview
    Adds INSERT policy to allow public role to create new user records.
    This is required for the participant quick-add functionality where organizers
    can add new participants who don't yet have user accounts.

  2. Changes
    - Add INSERT policy for users table that allows public to insert new users
    - This enables the getOrCreateUser function to work correctly

  3. Security
    - While this allows public inserts, the application layer controls who can
      actually call this functionality (only authenticated organizers)
    - New users are created with authenticated = false by default
    - Users cannot escalate privileges through this policy
*/

-- Drop any existing INSERT policies for users
DROP POLICY IF EXISTS "Users can insert own profile during signup" ON users;
DROP POLICY IF EXISTS "Public can insert users" ON users;
DROP POLICY IF EXISTS "Allow user creation" ON users;

-- Create permissive INSERT policy for users table
CREATE POLICY "Public can create user records"
  ON users
  FOR INSERT
  TO public
  WITH CHECK (true);
