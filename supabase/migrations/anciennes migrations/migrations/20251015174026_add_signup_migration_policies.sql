/*
  # Add Policies for Signup User Migration

  This migration adds policies to allow the signup process to work properly.
  During signup, we need to:
  1. Create a new user record with the auth ID
  2. Update participations and waitlist entries to point to the new user ID
  3. Delete the old user record

  ## Changes

  1. Add INSERT policy for users table during signup
  2. Add DELETE policy for users table during signup
  3. Update participations policies to allow updates during migration
  4. Update waitlist_entries policies to allow updates during migration
  
  ## Security

  - Users can only insert their own record (email matches auth email)
  - Users can only delete records where email matches their auth email
  - Maintains security while allowing the signup flow to work
*/

-- Allow users to insert their own profile during signup
DROP POLICY IF EXISTS "Users can insert own profile during signup" ON users;
CREATE POLICY "Users can insert own profile during signup"
  ON users FOR INSERT
  TO authenticated
  WITH CHECK (
    id = auth.uid() AND
    email = (SELECT email FROM auth.users WHERE id = auth.uid())
  );

-- Allow users to delete old profile during signup migration
DROP POLICY IF EXISTS "Users can delete old profile during signup" ON users;
CREATE POLICY "Users can delete old profile during signup"
  ON users FOR DELETE
  TO authenticated
  USING (
    email = (SELECT email FROM auth.users WHERE id = auth.uid())
  );

-- Update participations policies to allow migration
DROP POLICY IF EXISTS "Users can update participations during migration" ON participations;
CREATE POLICY "Users can update participations during migration"
  ON participations FOR UPDATE
  TO authenticated
  USING (
    user_id IN (
      SELECT id FROM users WHERE email = (SELECT email FROM auth.users WHERE id = auth.uid())
    )
  )
  WITH CHECK (
    user_id = auth.uid()
  );

-- Update waitlist_entries policies to allow migration
DROP POLICY IF EXISTS "Users can update waitlist during migration" ON waitlist_entries;
CREATE POLICY "Users can update waitlist during migration"
  ON waitlist_entries FOR UPDATE
  TO authenticated
  USING (
    user_id IN (
      SELECT id FROM users WHERE email = (SELECT email FROM auth.users WHERE id = auth.uid())
    ) OR
    email = (SELECT email FROM auth.users WHERE id = auth.uid())
  )
  WITH CHECK (
    user_id = auth.uid() OR
    email = (SELECT email FROM auth.users WHERE id = auth.uid())
  );
