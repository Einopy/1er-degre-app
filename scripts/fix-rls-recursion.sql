-- =============================================================================
-- FIX RLS RECURSION - Correction des politiques avec récursion infinie
-- =============================================================================
-- Ce script corrige l'erreur "infinite recursion detected in policy for relation"
-- en utilisant des fonctions SECURITY DEFINER qui contournent les politiques RLS.

-- -----------------------------------------------------------------------------
-- 1. FONCTIONS HELPER SECURITY DEFINER
-- -----------------------------------------------------------------------------
-- Ces fonctions s'exécutent avec les privilèges du propriétaire (bypass RLS)

-- Fonction pour obtenir les client_ids dont l'utilisateur est admin
CREATE OR REPLACE FUNCTION get_user_admin_client_ids(p_auth_user_id uuid)
RETURNS SETOF uuid
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT ca.client_id
  FROM client_admins ca
  JOIN users u ON u.id = ca.user_id
  WHERE u.auth_user_id = p_auth_user_id;
$$;

-- Fonction pour vérifier si l'utilisateur est super admin
CREATE OR REPLACE FUNCTION is_super_admin(p_auth_user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT COALESCE(
    (SELECT is_super_admin FROM users WHERE auth_user_id = p_auth_user_id),
    false
  );
$$;

-- Fonction pour obtenir le user_id à partir de auth_user_id
CREATE OR REPLACE FUNCTION get_user_id(p_auth_user_id uuid)
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT id FROM users WHERE auth_user_id = p_auth_user_id;
$$;

-- -----------------------------------------------------------------------------
-- 2. SUPPRIMER LES ANCIENNES POLITIQUES PROBLÉMATIQUES
-- -----------------------------------------------------------------------------

-- Client admins policies
DROP POLICY IF EXISTS "client_admins_select_own" ON client_admins;
DROP POLICY IF EXISTS "client_admins_all_super_admin" ON client_admins;
DROP POLICY IF EXISTS "client_admins_select_co_admins" ON client_admins;

-- Clients policies
DROP POLICY IF EXISTS "clients_select_admin" ON clients;
DROP POLICY IF EXISTS "clients_all_super_admin" ON clients;

-- Workshop families policies
DROP POLICY IF EXISTS "workshop_families_all_client_admin" ON workshop_families;
DROP POLICY IF EXISTS "workshop_families_all_super_admin" ON workshop_families;
DROP POLICY IF EXISTS "workshop_families_select_public" ON workshop_families;

-- Workshop types policies
DROP POLICY IF EXISTS "workshop_types_all_client_admin" ON workshop_types;
DROP POLICY IF EXISTS "workshop_types_all_super_admin" ON workshop_types;
DROP POLICY IF EXISTS "workshop_types_select_public" ON workshop_types;

-- Role levels policies
DROP POLICY IF EXISTS "role_levels_all_client_admin" ON role_levels;
DROP POLICY IF EXISTS "role_levels_all_super_admin" ON role_levels;
DROP POLICY IF EXISTS "role_levels_select_public" ON role_levels;

-- User role levels policies
DROP POLICY IF EXISTS "user_role_levels_select_own" ON user_role_levels;
DROP POLICY IF EXISTS "user_role_levels_all_client_admin" ON user_role_levels;
DROP POLICY IF EXISTS "user_role_levels_all_super_admin" ON user_role_levels;
DROP POLICY IF EXISTS "user_role_levels_select_public" ON user_role_levels;

-- Workshops policies (TOUTES les anciennes)
DROP POLICY IF EXISTS "workshops_all_client_admin" ON workshops;
DROP POLICY IF EXISTS "workshops_all_super_admin" ON workshops;
DROP POLICY IF EXISTS "workshops_insert_with_role_level" ON workshops;
DROP POLICY IF EXISTS "workshops_select_public" ON workshops;
DROP POLICY IF EXISTS "workshops_all_organizer" ON workshops;
DROP POLICY IF EXISTS "workshops_select_co_organizer" ON workshops;
DROP POLICY IF EXISTS "workshops_update_co_organizer" ON workshops;
DROP POLICY IF EXISTS "workshops_service_role" ON workshops;

-- -----------------------------------------------------------------------------
-- 3. NOUVELLES POLITIQUES SANS RÉCURSION
-- -----------------------------------------------------------------------------

-- =============================================================================
-- CLIENT_ADMINS POLICIES
-- =============================================================================

-- Users can view their own admin assignments
CREATE POLICY "client_admins_select_own"
  ON client_admins FOR SELECT
  TO authenticated
  USING (user_id = get_user_id(auth.uid()));

-- Users can view co-admins of their clients (sans récursion)
CREATE POLICY "client_admins_select_co_admins"
  ON client_admins FOR SELECT
  TO authenticated
  USING (client_id IN (SELECT get_user_admin_client_ids(auth.uid())));

-- Super admins can manage all client admins
CREATE POLICY "client_admins_all_super_admin"
  ON client_admins FOR ALL
  TO authenticated
  USING (is_super_admin(auth.uid()))
  WITH CHECK (is_super_admin(auth.uid()));

-- =============================================================================
-- CLIENTS POLICIES
-- =============================================================================

-- Admins can view their clients
CREATE POLICY "clients_select_admin"
  ON clients FOR SELECT
  TO authenticated
  USING (id IN (SELECT get_user_admin_client_ids(auth.uid())));

-- Super admins can manage all clients
CREATE POLICY "clients_all_super_admin"
  ON clients FOR ALL
  TO authenticated
  USING (is_super_admin(auth.uid()))
  WITH CHECK (is_super_admin(auth.uid()));

-- =============================================================================
-- WORKSHOP_FAMILIES POLICIES
-- =============================================================================

-- Public can view workshop families
CREATE POLICY "workshop_families_select_public"
  ON workshop_families FOR SELECT
  TO public
  USING (true);

-- Client admins can manage their families
CREATE POLICY "workshop_families_all_client_admin"
  ON workshop_families FOR ALL
  TO authenticated
  USING (client_id IN (SELECT get_user_admin_client_ids(auth.uid())))
  WITH CHECK (client_id IN (SELECT get_user_admin_client_ids(auth.uid())));

-- Super admins can manage all families
CREATE POLICY "workshop_families_all_super_admin"
  ON workshop_families FOR ALL
  TO authenticated
  USING (is_super_admin(auth.uid()))
  WITH CHECK (is_super_admin(auth.uid()));

-- =============================================================================
-- WORKSHOP_TYPES POLICIES
-- =============================================================================

-- Public can view workshop types
CREATE POLICY "workshop_types_select_public"
  ON workshop_types FOR SELECT
  TO public
  USING (true);

-- Client admins can manage their types
CREATE POLICY "workshop_types_all_client_admin"
  ON workshop_types FOR ALL
  TO authenticated
  USING (client_id IN (SELECT get_user_admin_client_ids(auth.uid())))
  WITH CHECK (client_id IN (SELECT get_user_admin_client_ids(auth.uid())));

-- Super admins can manage all types
CREATE POLICY "workshop_types_all_super_admin"
  ON workshop_types FOR ALL
  TO authenticated
  USING (is_super_admin(auth.uid()))
  WITH CHECK (is_super_admin(auth.uid()));

-- =============================================================================
-- ROLE_LEVELS POLICIES
-- =============================================================================

-- Public can view role levels
CREATE POLICY "role_levels_select_public"
  ON role_levels FOR SELECT
  TO public
  USING (true);

-- Client admins can manage their role levels
CREATE POLICY "role_levels_all_client_admin"
  ON role_levels FOR ALL
  TO authenticated
  USING (client_id IN (SELECT get_user_admin_client_ids(auth.uid())))
  WITH CHECK (client_id IN (SELECT get_user_admin_client_ids(auth.uid())));

-- Super admins can manage all role levels
CREATE POLICY "role_levels_all_super_admin"
  ON role_levels FOR ALL
  TO authenticated
  USING (is_super_admin(auth.uid()))
  WITH CHECK (is_super_admin(auth.uid()));

-- =============================================================================
-- USER_ROLE_LEVELS POLICIES
-- =============================================================================

-- Users can view their own role levels
CREATE POLICY "user_role_levels_select_own"
  ON user_role_levels FOR SELECT
  TO authenticated
  USING (user_id = get_user_id(auth.uid()));

-- Client admins can manage role levels for their client's roles
CREATE POLICY "user_role_levels_all_client_admin"
  ON user_role_levels FOR ALL
  TO authenticated
  USING (
    role_level_id IN (
      SELECT rl.id FROM role_levels rl
      WHERE rl.client_id IN (SELECT get_user_admin_client_ids(auth.uid()))
    )
  )
  WITH CHECK (
    role_level_id IN (
      SELECT rl.id FROM role_levels rl
      WHERE rl.client_id IN (SELECT get_user_admin_client_ids(auth.uid()))
    )
  );

-- Super admins can manage all user role levels
CREATE POLICY "user_role_levels_all_super_admin"
  ON user_role_levels FOR ALL
  TO authenticated
  USING (is_super_admin(auth.uid()))
  WITH CHECK (is_super_admin(auth.uid()));

-- Public can view user role levels (for organizer lists)
CREATE POLICY "user_role_levels_select_public"
  ON user_role_levels FOR SELECT
  TO public
  USING (true);

-- =============================================================================
-- WORKSHOPS POLICIES
-- =============================================================================

-- Public can view active workshops
CREATE POLICY "workshops_select_public"
  ON workshops FOR SELECT
  TO public
  USING (lifecycle_status = 'active');

-- Organizers can manage their own workshops (using SECURITY DEFINER function)
CREATE POLICY "workshops_all_organizer"
  ON workshops FOR ALL
  TO authenticated
  USING (organizer = get_user_id(auth.uid()))
  WITH CHECK (organizer = get_user_id(auth.uid()));

-- Client admins can manage workshops of their client
CREATE POLICY "workshops_all_client_admin"
  ON workshops FOR ALL
  TO authenticated
  USING (client_id IN (SELECT get_user_admin_client_ids(auth.uid())))
  WITH CHECK (client_id IN (SELECT get_user_admin_client_ids(auth.uid())));

-- Super admins can manage all workshops
CREATE POLICY "workshops_all_super_admin"
  ON workshops FOR ALL
  TO authenticated
  USING (is_super_admin(auth.uid()))
  WITH CHECK (is_super_admin(auth.uid()));

-- Service role can do everything
CREATE POLICY "workshops_service_role"
  ON workshops FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- =============================================================================
-- USERS POLICIES (allow organizers to create participants)
-- =============================================================================

-- Drop existing users policies that might prevent insertion
DROP POLICY IF EXISTS "users_insert_organizer" ON users;

-- Allow organizers (users with role_levels) to insert new users (participants)
CREATE POLICY "users_insert_organizer"
  ON users FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Allow if the authenticated user has at least one role_level (is an organizer)
    EXISTS (
      SELECT 1 FROM user_role_levels
      WHERE user_id = get_user_id(auth.uid())
    )
    OR
    -- Or if they are a client admin
    EXISTS (
      SELECT 1 FROM client_admins
      WHERE user_id = get_user_id(auth.uid())
    )
    OR
    -- Or if they are a super admin
    is_super_admin(auth.uid())
  );

-- =============================================================================
-- PARTICIPATIONS POLICIES (re-create without recursion)
-- =============================================================================

-- Drop all existing participations policies
DROP POLICY IF EXISTS "participations_select_own" ON participations;
DROP POLICY IF EXISTS "participations_insert_own" ON participations;
DROP POLICY IF EXISTS "participations_update_own" ON participations;
DROP POLICY IF EXISTS "participations_all_organizer" ON participations;
DROP POLICY IF EXISTS "participations_all_client_admin" ON participations;
DROP POLICY IF EXISTS "participations_insert_public" ON participations;
DROP POLICY IF EXISTS "participations_service_role" ON participations;

-- Users can view their own participations
CREATE POLICY "participations_select_own"
  ON participations FOR SELECT
  TO authenticated
  USING (user_id = get_user_id(auth.uid()));

-- Users can insert their own participations
CREATE POLICY "participations_insert_own"
  ON participations FOR INSERT
  TO authenticated
  WITH CHECK (user_id = get_user_id(auth.uid()));

-- Users can update their own participations
CREATE POLICY "participations_update_own"
  ON participations FOR UPDATE
  TO authenticated
  USING (user_id = get_user_id(auth.uid()))
  WITH CHECK (user_id = get_user_id(auth.uid()));

-- Organizers can manage participations for their workshops (using SECURITY DEFINER function)
CREATE POLICY "participations_all_organizer"
  ON participations FOR ALL
  TO authenticated
  USING (
    workshop_id IN (
      SELECT id FROM workshops WHERE organizer = get_user_id(auth.uid())
    )
  )
  WITH CHECK (
    workshop_id IN (
      SELECT id FROM workshops WHERE organizer = get_user_id(auth.uid())
    )
  );

-- Client admins can manage participations for their client workshops (using SECURITY DEFINER function)
CREATE POLICY "participations_all_client_admin"
  ON participations FOR ALL
  TO authenticated
  USING (
    workshop_id IN (
      SELECT w.id FROM workshops w
      WHERE w.client_id IN (SELECT get_user_admin_client_ids(auth.uid()))
    )
  )
  WITH CHECK (
    workshop_id IN (
      SELECT w.id FROM workshops w
      WHERE w.client_id IN (SELECT get_user_admin_client_ids(auth.uid()))
    )
  );

-- Super admins can manage all participations
CREATE POLICY "participations_all_super_admin"
  ON participations FOR ALL
  TO authenticated
  USING (is_super_admin(auth.uid()))
  WITH CHECK (is_super_admin(auth.uid()));

-- Public can insert participations (for anonymous registration)
CREATE POLICY "participations_insert_public"
  ON participations FOR INSERT
  TO public
  WITH CHECK (
    EXISTS (SELECT 1 FROM users WHERE id = user_id) AND
    EXISTS (SELECT 1 FROM workshops WHERE id = workshop_id AND lifecycle_status = 'active')
  );

-- Service role has full access
CREATE POLICY "participations_service_role"
  ON participations FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- =============================================================================
-- DONE
-- =============================================================================
SELECT 'RLS recursion fix completed successfully!' as status;
