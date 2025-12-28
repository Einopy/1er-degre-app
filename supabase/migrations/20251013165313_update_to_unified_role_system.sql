/*
  # Update to Unified Role System

  ## Overview
  Simplifies authorization by merging roles and certifications into a single unified system.
  The users.roles array now contains both system roles and granular workshop permissions.

  ## Changes Made

  1. Role System Redesign
    - Removes separate "organizer" and certification concepts
    - New role values:
      - System: participant, admin
      - FDFP Permissions: FDFP_public, FDFP_pro, FDFP_trainer
      - HD Permissions: HD_public, HD_pro, HD_trainer
    
  2. Data Migration
    - Convert "organizer" role → removed (having workshop permissions implies organizer status)
    - Convert "certified_FDFP" status_label → FDFP_public role
    - Convert "certified_HD" status_label → HD_public role
    - Remove certification labels from status_labels
    - Update joel.frade@gmail.com with comprehensive roles

  3. Authorization Logic
    - Workshop type + classification determines required role
    - HD workshops (benevole_grand_public) require HD_public
    - FDFP workshops (benevole_grand_public) require FDFP_public
    - FDFP Pro workshops (externe_entreprise) require FDFP_pro
    - FDFP Trainer courses (formation_formateur) require FDFP_trainer

  ## Role Definitions

  - participant: Can register for and attend workshops
  - admin: Full system access including user management
  - FDFP_public: Can animate FDFP workshops for general public
  - FDFP_pro: Can animate FDFP workshops for professional clients
  - FDFP_trainer: Can lead FDFP training courses (formation_formateur)
  - HD_public: Can animate HD workshops for general public
  - HD_pro: Can animate HD workshops for professional clients
  - HD_trainer: Can lead HD training courses
*/

-- Step 1: Migrate existing certified users to new role system
-- Convert certified_FDFP to FDFP_public
UPDATE users
SET roles = array_append(
  array_remove(roles, 'organizer'),
  'FDFP_public'
)
WHERE 'certified_FDFP' = ANY(status_labels)
AND NOT ('FDFP_public' = ANY(roles));

-- Convert certified_HD to HD_public
UPDATE users
SET roles = array_append(roles, 'HD_public')
WHERE 'certified_HD' = ANY(status_labels)
AND NOT ('HD_public' = ANY(roles));

-- Step 2: Remove organizer role from all users (workshop permissions imply organizer status)
UPDATE users
SET roles = array_remove(roles, 'organizer')
WHERE 'organizer' = ANY(roles);

-- Also remove co_organizer role if it exists
UPDATE users
SET roles = array_remove(roles, 'co_organizer')
WHERE 'co_organizer' = ANY(roles);

-- Step 3: Clean up status_labels by removing certification flags
UPDATE users
SET status_labels = array_remove(array_remove(status_labels, 'certified_FDFP'), 'certified_HD');

-- Step 4: Ensure joel.frade@gmail.com exists and has full permissions
DO $$
BEGIN
  -- Insert user if doesn't exist
  INSERT INTO users (email, first_name, last_name, roles, authenticated, tenant_id)
  VALUES (
    'joel.frade@gmail.com',
    'Joel',
    'Frade',
    ARRAY['participant']::text[],
    true,
    '1er-Degré'
  )
  ON CONFLICT (email) DO NOTHING;

  -- Update joel.frade@gmail.com with all required roles
  UPDATE users
  SET roles = ARRAY[
    'participant',
    'admin',
    'FDFP_public',
    'FDFP_pro',
    'FDFP_trainer',
    'HD_public'
  ]::text[],
  authenticated = true
  WHERE email = 'joel.frade@gmail.com';
END $$;

-- Step 5: Ensure all users have at least participant role
UPDATE users
SET roles = array_append(roles, 'participant')
WHERE NOT ('participant' = ANY(roles));

-- Step 6: Create index on roles for efficient permission checking
CREATE INDEX IF NOT EXISTS idx_users_roles_gin ON users USING gin(roles);

-- Step 7: Log migration results
DO $$
DECLARE
  fdfp_public_count INTEGER;
  fdfp_pro_count INTEGER;
  fdfp_trainer_count INTEGER;
  hd_public_count INTEGER;
  admin_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO fdfp_public_count FROM users WHERE 'FDFP_public' = ANY(roles);
  SELECT COUNT(*) INTO fdfp_pro_count FROM users WHERE 'FDFP_pro' = ANY(roles);
  SELECT COUNT(*) INTO fdfp_trainer_count FROM users WHERE 'FDFP_trainer' = ANY(roles);
  SELECT COUNT(*) INTO hd_public_count FROM users WHERE 'HD_public' = ANY(roles);
  SELECT COUNT(*) INTO admin_count FROM users WHERE 'admin' = ANY(roles);
  
  RAISE NOTICE 'Migration completed:';
  RAISE NOTICE '  - FDFP_public: % users', fdfp_public_count;
  RAISE NOTICE '  - FDFP_pro: % users', fdfp_pro_count;
  RAISE NOTICE '  - FDFP_trainer: % users', fdfp_trainer_count;
  RAISE NOTICE '  - HD_public: % users', hd_public_count;
  RAISE NOTICE '  - admin: % users', admin_count;
END $$;