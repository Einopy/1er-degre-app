/*
  # Fix Storage Bucket RLS Policies for Custom Authentication

  ## Problem
  The existing RLS policies on the storage.objects table for client-logos bucket
  use JWT claims to identify users, which doesn't work with the custom authentication
  system used by the application.

  ## Solution
  Simplify the RLS policies to allow authenticated users to perform operations,
  with role verification handled in the application layer (similar to clients table).

  ## Changes
  1. Drop existing RLS policies on storage.objects for client-logos bucket
  2. Create new simplified policies that work with custom authentication
  3. Allow authenticated users to perform all operations on client-logos bucket
  
  ## Security Notes
  - The application layer enforces super_admin role checks before upload/delete
  - This matches the pattern used for clients and client_admins tables
*/

-- ============================================================================
-- PART 1: Drop existing policies on storage.objects for client-logos
-- ============================================================================

DROP POLICY IF EXISTS "Super admins can upload client logos" ON storage.objects;
DROP POLICY IF EXISTS "Super admins can update client logos" ON storage.objects;
DROP POLICY IF EXISTS "Super admins can delete client logos" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view client logos" ON storage.objects;

-- ============================================================================
-- PART 2: Create new simplified policies for client-logos bucket
-- ============================================================================

-- Allow authenticated users to view client logos
CREATE POLICY "Allow authenticated users to view client logos"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'client-logos');

-- Allow authenticated users to insert client logos
-- The application layer verifies super_admin role before calling
CREATE POLICY "Allow authenticated users to insert client logos"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'client-logos');

-- Allow authenticated users to update client logos
-- The application layer verifies super_admin role before calling
CREATE POLICY "Allow authenticated users to update client logos"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'client-logos')
  WITH CHECK (bucket_id = 'client-logos');

-- Allow authenticated users to delete client logos
-- The application layer verifies super_admin role before calling
CREATE POLICY "Allow authenticated users to delete client logos"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'client-logos');

-- ============================================================================
-- PART 3: Verification
-- ============================================================================

DO $$
DECLARE
  storage_policy_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO storage_policy_count 
  FROM pg_policies 
  WHERE schemaname = 'storage' 
    AND tablename = 'objects'
    AND policyname LIKE '%client logos%';
  
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Storage RLS Policies Updated';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Client-logos bucket policies: %', storage_policy_count;
  RAISE NOTICE '';
  RAISE NOTICE 'IMPORTANT: Super admin role verification is handled in the application layer';
END $$;
