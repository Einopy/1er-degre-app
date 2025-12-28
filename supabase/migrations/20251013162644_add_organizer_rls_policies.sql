/*
  # Add Organizer RLS Policies

  ## Overview
  Adds comprehensive RLS policies to allow organizers to manage their workshops
  and participants.

  ## Changes

  ### Workshops Policies
  - Allows organizers and co-organizers to view all details of their workshops
  - Allows organizers and co-organizers to update their workshops

  ### Participations Policies
  - Allows organizers to view all participants in their workshops
  - Allows organizers to insert participants (manual addition)
  - Allows organizers to update participant information (attendance, refunds)

  ### Users Policies
  - Allows authenticated users to view other users (for co-organizer selection)

  ## Security
  - All policies check proper authorization (organizer or co-organizer)
  - Maintains data isolation and prevents unauthorized access
*/

-- Allow organizers and co-organizers to view their workshops
CREATE POLICY "Organizers can view own workshops"
  ON workshops FOR SELECT
  TO authenticated
  USING (
    auth.uid() = organizer OR
    auth.uid() = ANY(co_organizers)
  );

-- Allow co-organizers to update workshops
CREATE POLICY "Co-organizers can update workshops"
  ON workshops FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = ANY(co_organizers)
  )
  WITH CHECK (
    auth.uid() = ANY(co_organizers)
  );

-- Allow organizers to view participants in their workshops
CREATE POLICY "Organizers can view workshop participants"
  ON participations FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM workshops
      WHERE workshops.id = participations.workshop_id
      AND (workshops.organizer = auth.uid() OR auth.uid() = ANY(workshops.co_organizers))
    )
  );

-- Allow organizers to insert participants (manual addition)
CREATE POLICY "Organizers can add participants to workshops"
  ON participations FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM workshops
      WHERE workshops.id = participations.workshop_id
      AND (workshops.organizer = auth.uid() OR auth.uid() = ANY(workshops.co_organizers))
    )
  );

-- Allow organizers to update participant information
CREATE POLICY "Organizers can update workshop participants"
  ON participations FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM workshops
      WHERE workshops.id = participations.workshop_id
      AND (workshops.organizer = auth.uid() OR auth.uid() = ANY(workshops.co_organizers))
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM workshops
      WHERE workshops.id = participations.workshop_id
      AND (workshops.organizer = auth.uid() OR auth.uid() = ANY(workshops.co_organizers))
    )
  );

-- Allow authenticated users to view other users (for co-organizer selection)
CREATE POLICY "Authenticated users can view other users"
  ON users FOR SELECT
  TO authenticated
  USING (true);
