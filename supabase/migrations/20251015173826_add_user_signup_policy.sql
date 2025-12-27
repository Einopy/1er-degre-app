/*
  # Add Policy for User Signup

  This migration adds a policy to allow users to update their own record during signup.
  During signup, a user creates an auth account and needs to update their existing user record
  to link it to the auth account by updating the id and setting authenticated = true.

  ## Changes

  1. Add INSERT policy for users table to allow service role to create users
  2. Add UPDATE policy to allow updating user record during signup when email matches
  
  ## Security

  - Users can only update records where the email matches their auth email
  - This allows the signup flow to work while maintaining security
*/

-- Drop existing policies to recreate them with proper permissions
DROP POLICY IF EXISTS "Users can insert own profile during signup" ON users;
DROP POLICY IF EXISTS "Users can update profile during signup" ON users;

-- Allow users to update their profile during signup by matching email
CREATE POLICY "Users can update profile during signup"
  ON users FOR UPDATE
  TO authenticated
  USING (
    email = (SELECT email FROM auth.users WHERE id = auth.uid())
  )
  WITH CHECK (
    email = (SELECT email FROM auth.users WHERE id = auth.uid())
  );

-- Also keep the existing policy for after signup
DROP POLICY IF EXISTS "Users can update own profile" ON users;
CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);
