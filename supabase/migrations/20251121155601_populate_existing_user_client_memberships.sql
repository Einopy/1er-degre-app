/*
  # Populate Existing User Client Memberships

  ## Overview
  Backfills user_client_memberships table with existing organizer relationships
  from the workshops table to ensure current users have their memberships set up.

  ## Actions
  - Inserts memberships for all users who have organized workshops
  - Groups by user, client, and workshop family
*/

-- Populate memberships for existing workshop organizers
INSERT INTO user_client_memberships (user_id, client_id, workshop_family_id, role, is_active)
SELECT DISTINCT
  w.organizer as user_id,
  wf.client_id,
  w.workshop_family_id,
  'animator' as role,
  true as is_active
FROM workshops w
INNER JOIN workshop_families wf ON wf.id = w.workshop_family_id
WHERE w.organizer IS NOT NULL
ON CONFLICT (user_id, client_id, workshop_family_id) DO NOTHING;