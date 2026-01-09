/*
  # Migrate Existing Roles to user_role_levels

  ## Overview
  Migrates workshop permission roles from users.roles array to user_role_levels table.
  Handles super_admin conversion and cleans up roles array.

  ## Steps
  1. Identify super_admins and set is_super_admin flag
  2. Parse workshop permissions from roles array (FDFP_public, HD_pro, etc.)
  3. Create user_role_levels entries for each workshop permission
  4. Clean up roles array to remove workshop permissions

  ## Data Mapping
  - "FDFP_public" → role_levels where family=FDFP, internal_key=public
  - "HD_pro" → role_levels where family=HD, internal_key=pro
  - etc.
*/

-- =====================================================
-- 1. SET IS_SUPER_ADMIN FLAG
-- =====================================================

UPDATE users
SET is_super_admin = true
WHERE 'super_admin' = ANY(roles);

-- =====================================================
-- 2. MIGRATE WORKSHOP PERMISSIONS TO USER_ROLE_LEVELS
-- =====================================================

-- Helper function to extract family and key from role string
CREATE OR REPLACE FUNCTION parse_workshop_role(role_string text)
RETURNS TABLE(family_code text, internal_key text) AS $$
BEGIN
  -- Check if this is a workshop permission role (contains underscore and known family)
  IF role_string LIKE 'FDFP_%' THEN
    RETURN QUERY SELECT 'FDFP'::text, substring(role_string from 6)::text;
  ELSIF role_string LIKE 'HD_%' THEN
    RETURN QUERY SELECT 'HD'::text, substring(role_string from 4)::text;
  ELSE
    RETURN;
  END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Migrate all workshop permissions
INSERT INTO user_role_levels (user_id, role_level_id, granted_at)
SELECT DISTINCT
  u.id as user_id,
  rl.id as role_level_id,
  u.created_at as granted_at
FROM users u
CROSS JOIN LATERAL unnest(u.roles) as user_role(role_name)
CROSS JOIN LATERAL parse_workshop_role(user_role.role_name) as parsed(family_code, internal_key)
INNER JOIN workshop_families wf ON wf.code = parsed.family_code
INNER JOIN role_levels rl ON rl.workshop_family_id = wf.id AND rl.internal_key = parsed.internal_key
WHERE parsed.family_code IS NOT NULL
ON CONFLICT (user_id, role_level_id) DO NOTHING;

-- =====================================================
-- 3. CLEAN UP ROLES ARRAY
-- =====================================================

-- Remove workshop permissions and super_admin from roles array
-- Keep only system roles like 'admin'
UPDATE users
SET roles = array_remove(
  array_remove(
    array_remove(
      array_remove(
        array_remove(
          array_remove(
            array_remove(
              array_remove(
                array_remove(roles, 'super_admin'),
              'FDFP_public'),
            'FDFP_pro'),
          'FDFP_trainer'),
        'FDFP_instructor'),
      'HD_public'),
    'HD_pro'),
  'HD_trainer'),
'HD_instructor');

-- If a user only had workshop roles and no system roles, ensure array is empty (not null)
UPDATE users
SET roles = '{}'::text[]
WHERE roles IS NULL OR roles = '{}';

-- Drop the helper function
DROP FUNCTION IF EXISTS parse_workshop_role(text);