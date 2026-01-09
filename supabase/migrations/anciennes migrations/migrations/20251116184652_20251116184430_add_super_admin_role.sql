/*
  # Add Super Admin Role

  ## Overview
  Introduces the 'super_admin' role to the system. Super admins have global
  access to manage clients and assign client admins, but do NOT see operational
  workshop data or dashboards.

  ## Changes

  1. Role System Update
    - Add 'super_admin' to the roles array for designated users
    - Super admin is separate from and higher than 'admin' role
    - 'admin' role remains for client-scoped administrators

  2. Super Admin Designation
    - Assign 'super_admin' role to joel.frade@gmail.com
    - Preserve all existing roles (admin, workshop permissions, etc.)

  3. Authorization Model
    - Super admin: Manages clients, assigns client admins, no workshop access
    - Client admin ('admin' role): Manages workshops, sees dashboards for their client(s)
    - Regular users: Participate in workshops, no admin access

  ## Security Notes

  - Super admin does not automatically grant client admin privileges
  - Client admins must be explicitly linked to clients via client_admins table
  - Super admin can only access client management, not workshop operations
  - This separation ensures clear boundaries between system and operational roles
*/

-- ============================================================================
-- PART 1: Ensure joel.frade@gmail.com exists and add super_admin role
-- ============================================================================

DO $$
DECLARE
  joel_user_id uuid;
  joel_roles text[];
BEGIN
  -- Check if joel.frade@gmail.com exists
  SELECT id, roles INTO joel_user_id, joel_roles
  FROM users
  WHERE email = 'joel.frade@gmail.com';

  IF joel_user_id IS NULL THEN
    -- User doesn't exist, create with super_admin role
    INSERT INTO users (
      email,
      first_name,
      last_name,
      roles,
      authenticated,
      tenant_id
    ) VALUES (
      'joel.frade@gmail.com',
      'Joel',
      'Frade',
      ARRAY['participant', 'super_admin']::text[],
      true,
      '1er-Degré'
    )
    RETURNING id INTO joel_user_id;

    RAISE NOTICE 'Created user joel.frade@gmail.com with super_admin role';
  ELSE
    -- User exists, add super_admin role if not present
    IF NOT ('super_admin' = ANY(joel_roles)) THEN
      UPDATE users
      SET roles = array_append(roles, 'super_admin')
      WHERE id = joel_user_id;

      RAISE NOTICE 'Added super_admin role to joel.frade@gmail.com';
    ELSE
      RAISE NOTICE 'joel.frade@gmail.com already has super_admin role';
    END IF;
  END IF;

  -- Log final roles
  SELECT roles INTO joel_roles FROM users WHERE id = joel_user_id;
  RAISE NOTICE 'joel.frade@gmail.com roles: %', joel_roles;
END $$;

-- ============================================================================
-- PART 2: Create index on roles array for efficient permission checking
-- ============================================================================

-- Index already exists from previous migration, but ensure it's there
CREATE INDEX IF NOT EXISTS idx_users_roles_gin ON users USING gin(roles);

-- ============================================================================
-- PART 3: Document role hierarchy and permissions
-- ============================================================================

DO $$
DECLARE
  super_admin_rec RECORD;
BEGIN
  RAISE NOTICE '====================================';
  RAISE NOTICE 'Role Hierarchy Established';
  RAISE NOTICE '====================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Super Admin (super_admin role):';
  RAISE NOTICE '  - Manages clients (create, edit, activate/deactivate)';
  RAISE NOTICE '  - Assigns client admins to clients';
  RAISE NOTICE '  - NO access to workshop data or operational dashboards';
  RAISE NOTICE '  - Separate interface from client admin console';
  RAISE NOTICE '';
  RAISE NOTICE 'Client Admin (admin role + client_admins link):';
  RAISE NOTICE '  - Manages workshops for assigned client(s)';
  RAISE NOTICE '  - Views operational dashboards scoped to client';
  RAISE NOTICE '  - Manages users and participations for client';
  RAISE NOTICE '  - NO access to other clients or client management';
  RAISE NOTICE '';
  RAISE NOTICE 'Regular User (participant role):';
  RAISE NOTICE '  - Participates in workshops';
  RAISE NOTICE '  - May have workshop animation permissions (FDFP_*, HD_*)';
  RAISE NOTICE '  - NO admin access';
  RAISE NOTICE '';
  RAISE NOTICE 'Current super admins:';

  -- List all super admins
  FOR super_admin_rec IN
    SELECT email, first_name, last_name
    FROM users
    WHERE 'super_admin' = ANY(roles)
  LOOP
    RAISE NOTICE '  - % (% %)', super_admin_rec.email, super_admin_rec.first_name, super_admin_rec.last_name;
  END LOOP;
END $$;
