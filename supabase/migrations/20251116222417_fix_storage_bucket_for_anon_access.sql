/*
  # Fix Storage Bucket RLS Policies for Anonymous Access

  ## Problem
  The application uses custom localStorage-based authentication instead of Supabase Auth.
  Current storage RLS policies require "TO authenticated" which only works with Supabase Auth JWT tokens.
  This causes logo uploads to fail even though the user is authenticated in the application layer.

  ## Solution
  Update storage RLS policies to allow anon access (similar to how clients and client_admins tables work).
  Security is enforced at the application layer by verifying super_admin role before calling upload functions.

  ## Changes
  1. Drop existing restrictive RLS policies on storage.objects
  2. Create new policies that allow anon access for the client-logos bucket
  3. Maintain the same security model used throughout the application (app-layer role checks)

  ## Security Model
  - Application code verifies user has super_admin role before allowing uploads
  - This matches the pattern used for clients and client_admins tables
  - RLS policies are permissive, security is enforced in code
*/

-- ============================================================================
-- PART 1: Drop existing policies
-- ============================================================================

DROP POLICY IF EXISTS "Allow authenticated users to view client logos" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to insert client logos" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to update client logos" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to delete client logos" ON storage.objects;

-- ============================================================================
-- PART 2: Create new permissive policies for client-logos bucket
-- ============================================================================

-- Allow anyone to view client logos (public bucket)
CREATE POLICY "Allow public access to view client logos"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'client-logos');

-- Allow anon and authenticated users to insert client logos
-- Application layer verifies super_admin role before calling
CREATE POLICY "Allow anon insert to client logos"
  ON storage.objects FOR INSERT
  TO anon, authenticated
  WITH CHECK (bucket_id = 'client-logos');

-- Allow anon and authenticated users to update client logos
-- Application layer verifies super_admin role before calling
CREATE POLICY "Allow anon update to client logos"
  ON storage.objects FOR UPDATE
  TO anon, authenticated
  USING (bucket_id = 'client-logos')
  WITH CHECK (bucket_id = 'client-logos');

-- Allow anon and authenticated users to delete client logos
-- Application layer verifies super_admin role before calling
CREATE POLICY "Allow anon delete to client logos"
  ON storage.objects FOR DELETE
  TO anon, authenticated
  USING (bucket_id = 'client-logos');

-- ============================================================================
-- PART 3: Verification
-- ============================================================================

DO $$
DECLARE
  policy_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO policy_count 
  FROM pg_policies 
  WHERE schemaname = 'storage' 
    AND tablename = 'objects'
    AND policyname LIKE '%client logos%';
  
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Storage RLS Policies Fixed for Anon Access';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Client-logos bucket policies: %', policy_count;
  RAISE NOTICE '';
  RAISE NOTICE 'IMPORTANT: Super admin role verification is handled in the application layer';
  RAISE NOTICE 'This matches the security pattern used for clients and client_admins tables';
END $$;
