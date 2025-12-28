/*
  # Add INSERT policy for workshops

  1. Changes
    - Add RLS policy to allow authenticated users to insert workshops
    - Users can only create workshops where they are the organizer

  2. Security
    - Authenticated users can create workshops
    - Users must be the organizer of the workshops they create
    - This allows organizers to create new workshops through the wizard
*/

-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Authenticated users can create workshops" ON workshops;

-- Add INSERT policy for workshops
CREATE POLICY "Authenticated users can create workshops"
  ON workshops
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = organizer);
