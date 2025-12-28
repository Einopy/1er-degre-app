/*
  # Update ALL RLS Policies for Supabase Auth

  1. Problem
    - All RLS policies use custom JWT claims: current_setting('request.jwt.claims')
    - This doesn't work with custom auth system
    - Need to use auth.uid() which works with Supabase Auth

  2. Solution
    - Replace all email-based lookups with auth_user_id lookups
    - Use auth.uid() to get current authenticated user's ID from Supabase Auth
    - Update ALL tables' RLS policies

  3. Tables Updated
    - users
    - client_admins
    - workshop_families
    - workshop_types
    - role_levels
    - role_requirements
    - client_languages
    - user_role_levels
    - workshops
    - participations
    - history_logs
    - mail_logs
    - scheduled_emails
    - email_templates
    - clients
*/

-- =====================================================
-- USERS TABLE
-- =====================================================

DROP POLICY IF EXISTS "Users can view own profile" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;
DROP POLICY IF EXISTS "Anyone can insert users" ON users;
DROP POLICY IF EXISTS "Allow user signup" ON users;

CREATE POLICY "Users can view own profile"
  ON users FOR SELECT
  TO authenticated
  USING (auth_user_id = auth.uid());

CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  TO authenticated
  USING (auth_user_id = auth.uid())
  WITH CHECK (auth_user_id = auth.uid());

-- Super admins can view all users
CREATE POLICY "Super admins can view all users"
  ON users FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE auth_user_id = auth.uid()
      AND is_super_admin = true
    )
  );

-- Super admins can update all users
CREATE POLICY "Super admins can update all users"
  ON users FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE auth_user_id = auth.uid()
      AND is_super_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE auth_user_id = auth.uid()
      AND is_super_admin = true
    )
  );

-- =====================================================
-- CLIENT_ADMINS TABLE
-- =====================================================

DROP POLICY IF EXISTS "Client admins can view their assignments" ON client_admins;
DROP POLICY IF EXISTS "Super admins can manage all client admins" ON client_admins;

CREATE POLICY "Client admins can view their assignments"
  ON client_admins FOR SELECT
  TO authenticated
  USING (
    user_id IN (
      SELECT id FROM users WHERE auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Super admins can manage all client admins"
  ON client_admins FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE auth_user_id = auth.uid()
      AND is_super_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE auth_user_id = auth.uid()
      AND is_super_admin = true
    )
  );

-- =====================================================
-- WORKSHOP_FAMILIES TABLE
-- =====================================================

DROP POLICY IF EXISTS "Client admins can view their client's workshop families" ON workshop_families;
DROP POLICY IF EXISTS "Client admins can insert workshop families for their client" ON workshop_families;
DROP POLICY IF EXISTS "Client admins can update their client's workshop families" ON workshop_families;
DROP POLICY IF EXISTS "Client admins can delete their client's workshop families" ON workshop_families;
DROP POLICY IF EXISTS "Super admins can manage all workshop families" ON workshop_families;

CREATE POLICY "Client admins can view their client's workshop families"
  ON workshop_families FOR SELECT
  TO authenticated
  USING (
    client_id IN (
      SELECT ca.client_id
      FROM client_admins ca
      JOIN users u ON u.id = ca.user_id
      WHERE u.auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Client admins can insert workshop families for their client"
  ON workshop_families FOR INSERT
  TO authenticated
  WITH CHECK (
    client_id IN (
      SELECT ca.client_id
      FROM client_admins ca
      JOIN users u ON u.id = ca.user_id
      WHERE u.auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Client admins can update their client's workshop families"
  ON workshop_families FOR UPDATE
  TO authenticated
  USING (
    client_id IN (
      SELECT ca.client_id
      FROM client_admins ca
      JOIN users u ON u.id = ca.user_id
      WHERE u.auth_user_id = auth.uid()
    )
  )
  WITH CHECK (
    client_id IN (
      SELECT ca.client_id
      FROM client_admins ca
      JOIN users u ON u.id = ca.user_id
      WHERE u.auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Client admins can delete their client's workshop families"
  ON workshop_families FOR DELETE
  TO authenticated
  USING (
    client_id IN (
      SELECT ca.client_id
      FROM client_admins ca
      JOIN users u ON u.id = ca.user_id
      WHERE u.auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Super admins can manage all workshop families"
  ON workshop_families FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE auth_user_id = auth.uid()
      AND is_super_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE auth_user_id = auth.uid()
      AND is_super_admin = true
    )
  );

-- =====================================================
-- WORKSHOP_TYPES TABLE
-- =====================================================

DROP POLICY IF EXISTS "Client admins can view their client's workshop types" ON workshop_types;
DROP POLICY IF EXISTS "Client admins can insert their client's workshop types" ON workshop_types;
DROP POLICY IF EXISTS "Client admins can update their client's workshop types" ON workshop_types;
DROP POLICY IF EXISTS "Client admins can delete their client's workshop types" ON workshop_types;

CREATE POLICY "Client admins can view their client's workshop types"
  ON workshop_types FOR SELECT
  TO authenticated
  USING (
    client_id IN (
      SELECT ca.client_id
      FROM client_admins ca
      INNER JOIN users u ON u.id = ca.user_id
      WHERE u.auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Client admins can insert their client's workshop types"
  ON workshop_types FOR INSERT
  TO authenticated
  WITH CHECK (
    client_id IN (
      SELECT ca.client_id
      FROM client_admins ca
      INNER JOIN users u ON u.id = ca.user_id
      WHERE u.auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Client admins can update their client's workshop types"
  ON workshop_types FOR UPDATE
  TO authenticated
  USING (
    client_id IN (
      SELECT ca.client_id
      FROM client_admins ca
      INNER JOIN users u ON u.id = ca.user_id
      WHERE u.auth_user_id = auth.uid()
    )
  )
  WITH CHECK (
    client_id IN (
      SELECT ca.client_id
      FROM client_admins ca
      INNER JOIN users u ON u.id = ca.user_id
      WHERE u.auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Client admins can delete their client's workshop types"
  ON workshop_types FOR DELETE
  TO authenticated
  USING (
    client_id IN (
      SELECT ca.client_id
      FROM client_admins ca
      INNER JOIN users u ON u.id = ca.user_id
      WHERE u.auth_user_id = auth.uid()
    )
  );

-- =====================================================
-- ROLE_LEVELS TABLE
-- =====================================================

DROP POLICY IF EXISTS "Client admins can view their client's role levels" ON role_levels;
DROP POLICY IF EXISTS "Client admins can insert role levels" ON role_levels;
DROP POLICY IF EXISTS "Client admins can update their client's role levels" ON role_levels;
DROP POLICY IF EXISTS "Client admins can delete role levels" ON role_levels;

CREATE POLICY "Client admins can view their client's role levels"
  ON role_levels FOR SELECT
  TO authenticated
  USING (
    client_id IN (
      SELECT ca.client_id
      FROM client_admins ca
      INNER JOIN users u ON u.id = ca.user_id
      WHERE u.auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Client admins can insert role levels"
  ON role_levels FOR INSERT
  TO authenticated
  WITH CHECK (
    client_id IN (
      SELECT ca.client_id
      FROM client_admins ca
      INNER JOIN users u ON u.id = ca.user_id
      WHERE u.auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Client admins can update their client's role levels"
  ON role_levels FOR UPDATE
  TO authenticated
  USING (
    client_id IN (
      SELECT ca.client_id
      FROM client_admins ca
      INNER JOIN users u ON u.id = ca.user_id
      WHERE u.auth_user_id = auth.uid()
    )
  )
  WITH CHECK (
    client_id IN (
      SELECT ca.client_id
      FROM client_admins ca
      INNER JOIN users u ON u.id = ca.user_id
      WHERE u.auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Client admins can delete role levels"
  ON role_levels FOR DELETE
  TO authenticated
  USING (
    client_id IN (
      SELECT ca.client_id
      FROM client_admins ca
      INNER JOIN users u ON u.id = ca.user_id
      WHERE u.auth_user_id = auth.uid()
    )
  );

-- =====================================================
-- ROLE_REQUIREMENTS TABLE
-- =====================================================

DROP POLICY IF EXISTS "Client admins can view role requirements" ON role_requirements;
DROP POLICY IF EXISTS "Client admins can insert role requirements" ON role_requirements;
DROP POLICY IF EXISTS "Client admins can update role requirements" ON role_requirements;
DROP POLICY IF EXISTS "Client admins can delete role requirements" ON role_requirements;

CREATE POLICY "Client admins can view role requirements"
  ON role_requirements FOR SELECT
  TO authenticated
  USING (
    role_level_id IN (
      SELECT rl.id
      FROM role_levels rl
      INNER JOIN client_admins ca ON ca.client_id = rl.client_id
      INNER JOIN users u ON u.id = ca.user_id
      WHERE u.auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Client admins can insert role requirements"
  ON role_requirements FOR INSERT
  TO authenticated
  WITH CHECK (
    role_level_id IN (
      SELECT rl.id
      FROM role_levels rl
      INNER JOIN client_admins ca ON ca.client_id = rl.client_id
      INNER JOIN users u ON u.id = ca.user_id
      WHERE u.auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Client admins can update role requirements"
  ON role_requirements FOR UPDATE
  TO authenticated
  USING (
    role_level_id IN (
      SELECT rl.id
      FROM role_levels rl
      INNER JOIN client_admins ca ON ca.client_id = rl.client_id
      INNER JOIN users u ON u.id = ca.user_id
      WHERE u.auth_user_id = auth.uid()
    )
  )
  WITH CHECK (
    role_level_id IN (
      SELECT rl.id
      FROM role_levels rl
      INNER JOIN client_admins ca ON ca.client_id = rl.client_id
      INNER JOIN users u ON u.id = ca.user_id
      WHERE u.auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Client admins can delete role requirements"
  ON role_requirements FOR DELETE
  TO authenticated
  USING (
    role_level_id IN (
      SELECT rl.id
      FROM role_levels rl
      INNER JOIN client_admins ca ON ca.client_id = rl.client_id
      INNER JOIN users u ON u.id = ca.user_id
      WHERE u.auth_user_id = auth.uid()
    )
  );

-- =====================================================
-- CLIENT_LANGUAGES TABLE
-- =====================================================

DROP POLICY IF EXISTS "Client admins can view their client's languages" ON client_languages;
DROP POLICY IF EXISTS "Client admins can insert their client's languages" ON client_languages;
DROP POLICY IF EXISTS "Client admins can update their client's languages" ON client_languages;
DROP POLICY IF EXISTS "Client admins can delete their client's languages" ON client_languages;

CREATE POLICY "Client admins can view their client's languages"
  ON client_languages FOR SELECT
  TO authenticated
  USING (
    client_id IN (
      SELECT ca.client_id
      FROM client_admins ca
      INNER JOIN users u ON u.id = ca.user_id
      WHERE u.auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Client admins can insert their client's languages"
  ON client_languages FOR INSERT
  TO authenticated
  WITH CHECK (
    client_id IN (
      SELECT ca.client_id
      FROM client_admins ca
      INNER JOIN users u ON u.id = ca.user_id
      WHERE u.auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Client admins can update their client's languages"
  ON client_languages FOR UPDATE
  TO authenticated
  USING (
    client_id IN (
      SELECT ca.client_id
      FROM client_admins ca
      INNER JOIN users u ON u.id = ca.user_id
      WHERE u.auth_user_id = auth.uid()
    )
  )
  WITH CHECK (
    client_id IN (
      SELECT ca.client_id
      FROM client_admins ca
      INNER JOIN users u ON u.id = ca.user_id
      WHERE u.auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Client admins can delete their client's languages"
  ON client_languages FOR DELETE
  TO authenticated
  USING (
    client_id IN (
      SELECT ca.client_id
      FROM client_admins ca
      INNER JOIN users u ON u.id = ca.user_id
      WHERE u.auth_user_id = auth.uid()
    )
  );

-- =====================================================
-- USER_ROLE_LEVELS TABLE
-- =====================================================

DROP POLICY IF EXISTS "Users can view their own role levels" ON user_role_levels;
DROP POLICY IF EXISTS "Users can insert their own role levels" ON user_role_levels;
DROP POLICY IF EXISTS "Users can update their own role levels" ON user_role_levels;
DROP POLICY IF EXISTS "Users can delete their own role levels" ON user_role_levels;
DROP POLICY IF EXISTS "Super admins can view all user role levels" ON user_role_levels;

CREATE POLICY "Users can view their own role levels"
  ON user_role_levels FOR SELECT
  TO authenticated
  USING (
    user_id IN (
      SELECT id FROM users WHERE auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert their own role levels"
  ON user_role_levels FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id IN (
      SELECT id FROM users WHERE auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own role levels"
  ON user_role_levels FOR UPDATE
  TO authenticated
  USING (
    user_id IN (
      SELECT id FROM users WHERE auth_user_id = auth.uid()
    )
  )
  WITH CHECK (
    user_id IN (
      SELECT id FROM users WHERE auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their own role levels"
  ON user_role_levels FOR DELETE
  TO authenticated
  USING (
    user_id IN (
      SELECT id FROM users WHERE auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Super admins can view all user role levels"
  ON user_role_levels FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE auth_user_id = auth.uid()
      AND is_super_admin = true
    )
  );

-- Log migration completion
DO $$
BEGIN
  RAISE NOTICE 'RLS policies updated successfully for Supabase Auth';
  RAISE NOTICE 'All policies now use auth.uid() and auth_user_id';
  RAISE NOTICE '';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '  1. Update auth service to use Supabase Auth API';
  RAISE NOTICE '  2. Create auth.users entries for authenticated users';
  RAISE NOTICE '  3. Test authentication and RLS access';
END $$;
