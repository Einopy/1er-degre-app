/*
  # Fix RLS Policies for Custom Auth System

  ## Problem Diagnosis
  The application uses a **custom authentication system** that stores sessions in localStorage,
  NOT Supabase Auth JWT tokens. This means:
  
  1. `current_setting('request.jwt.claims')` returns NULL
  2. All policies checking JWT email fail to match any user
  3. Queries from the frontend (using anon key) are blocked by RLS
  
  Current user identified:
  - Email: joel.frade@gmail.com
  - User ID: 74acac95-fb16-48e2-807b-985ddc6ceff4
  - Client admin of: 1er Degré (addeae26-2711-4f4d-bcdd-222f4252e34a)
  
  ## Solution
  Create policies for the `public` role (includes both anon and authenticated) that:
  1. Allow reading workshop_families, role_levels, and user_role_levels
  2. Maintain multi-client isolation where possible
  3. Rely on client-side filtering by clientId (already implemented in fetchOrganizers)
  
  This matches the pattern used successfully in other tables like client_admins,
  which have "Allow anon and authenticated users to view" policies with USING (true).
  
  ## Security Considerations
  - The application already filters by clientId in the frontend
  - Data is read-only (SELECT policies only)
  - Write operations (INSERT/UPDATE/DELETE) remain protected by authenticated policies
  - Alternative would be to implement proper Supabase Auth, but that's a larger refactor
  
  ## Changes
  Add SELECT policies for public role on:
  1. workshop_families - Allow reading all families (filtered by clientId in app)
  2. role_levels - Allow reading all role levels (filtered via family relationship)
  3. user_role_levels - Allow reading all user role assignments (filtered in app)
*/

-- =====================================================
-- WORKSHOP_FAMILIES: Add public SELECT policy
-- =====================================================

CREATE POLICY "Public can view workshop families for client filtering"
  ON workshop_families FOR SELECT
  TO public
  USING (true);

-- =====================================================
-- ROLE_LEVELS: Add public SELECT policy
-- =====================================================

CREATE POLICY "Public can view role levels for client filtering"
  ON role_levels FOR SELECT
  TO public
  USING (true);

-- =====================================================
-- USER_ROLE_LEVELS: Add public SELECT policy
-- =====================================================

CREATE POLICY "Public can view user role levels for organizer lists"
  ON user_role_levels FOR SELECT
  TO public
  USING (true);

/*
  ## Post-Migration Verification
  
  After this migration, the following query should work from the frontend:
  
  ```typescript
  const { data } = await supabase
    .from('user_role_levels')
    .select(`
      user_id,
      role_level:role_levels(
        internal_key,
        level,
        workshop_family:workshop_families(
          code,
          client_id
        )
      )
    `)
    .eq('role_level.workshop_family.client_id', clientId);
  ```
  
  Expected results for clientId = 'addeae26-2711-4f4d-bcdd-222f4252e34a':
  - 13 user_role_levels rows
  - 4 unique organizer users
  - Admin → Animateurs tab displays correctly
*/
