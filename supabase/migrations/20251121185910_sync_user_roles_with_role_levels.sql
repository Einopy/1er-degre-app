/*
  # Sync users.roles array with user_role_levels table

  1. Purpose
    - Ensure users.roles array is synchronized with user_role_levels table
    - Users need roles in format "{FAMILY}_{LEVEL}" (e.g., "FDFP_public", "HD_pro")
    - This enables frontend permission checks to work correctly

  2. Changes
    - For each user with entries in user_role_levels
    - Build their roles array from their role level assignments
    - Update users.roles to include all workshop family roles
    - Preserve existing roles like "admin", "participant"

  3. Impact
    - Fixes homepage showing wrong content for organizers
    - Fixes organizers list in admin console
    - Enables proper permission checks throughout the app
*/

-- Create a function to sync roles for all users
DO $$
DECLARE
  user_record RECORD;
  role_string TEXT;
  existing_roles TEXT[];
  new_roles TEXT[];
  base_roles TEXT[];
BEGIN
  -- Loop through all users who have role level assignments
  FOR user_record IN 
    SELECT DISTINCT u.id, u.roles
    FROM users u
    JOIN user_role_levels url ON url.user_id = u.id
  LOOP
    -- Get existing base roles (admin, participant, etc.)
    existing_roles := COALESCE(user_record.roles, ARRAY[]::TEXT[]);
    base_roles := ARRAY[]::TEXT[];
    
    -- Keep non-workshop-family roles (admin, participant, etc.)
    FOREACH role_string IN ARRAY existing_roles
    LOOP
      IF role_string NOT LIKE '%\_%' OR 
         (role_string NOT LIKE 'FDFP\_%' AND 
          role_string NOT LIKE 'HD\_%' AND
          role_string NOT LIKE '%\_public' AND
          role_string NOT LIKE '%\_pro' AND
          role_string NOT LIKE '%\_trainer' AND
          role_string NOT LIKE '%\_instructor') THEN
        base_roles := array_append(base_roles, role_string);
      END IF;
    END LOOP;
    
    -- Build workshop family roles from user_role_levels
    new_roles := base_roles;
    
    FOR role_string IN 
      SELECT DISTINCT wf.code || '_' || rl.internal_key as role_name
      FROM user_role_levels url
      JOIN role_levels rl ON url.role_level_id = rl.id
      JOIN workshop_families wf ON rl.workshop_family_id = wf.id
      WHERE url.user_id = user_record.id
      ORDER BY role_name
    LOOP
      new_roles := array_append(new_roles, role_string);
    END LOOP;
    
    -- Update the user's roles
    UPDATE users 
    SET roles = new_roles
    WHERE id = user_record.id;
    
  END LOOP;
END $$;

-- Log the sync
DO $$
DECLARE
  synced_count INTEGER;
BEGIN
  SELECT COUNT(DISTINCT url.user_id)
  INTO synced_count
  FROM user_role_levels url;
  
  RAISE NOTICE 'Synced roles for % users with role level assignments', synced_count;
END $$;
