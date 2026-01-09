/*
  # Create Storage Bucket for Client Logos

  ## Overview
  Creates a Supabase Storage bucket for storing client logo images.
  This enables Super Admins to upload client logos directly instead of using external URLs.

  ## Changes

  1. Storage Bucket
    - Create `client-logos` bucket for storing client logo files
    - Configure bucket as public for easy access to logo images
    - Set file size limit to 5MB (reasonable for logos)
    - Allow common image formats: jpg, jpeg, png, webp, svg

  2. Security
    - Only Super Admins can upload/update/delete files
    - All authenticated users can view logos (public bucket)
    - RLS policies ensure proper access control

  ## Important Notes
  - File naming convention: {client_id}_{timestamp}.{extension}
  - Old logo files should be manually deleted when updating
  - Maximum file size: 5MB
  - Supported formats: image/jpeg, image/png, image/webp, image/svg+xml
*/

-- ============================================================================
-- PART 1: Create the storage bucket
-- ============================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'client-logos',
  'client-logos',
  true,
  5242880, -- 5MB in bytes
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/svg+xml']
)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- PART 2: Create RLS policies for the bucket
-- ============================================================================

-- Super admins can upload files
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Super admins can upload client logos'
  ) THEN
    CREATE POLICY "Super admins can upload client logos"
      ON storage.objects FOR INSERT
      TO authenticated
      WITH CHECK (
        bucket_id = 'client-logos'
        AND EXISTS (
          SELECT 1 FROM users
          WHERE users.id = (SELECT id FROM users WHERE email = current_setting('request.jwt.claims', true)::json->>'email')
          AND 'super_admin' = ANY(users.roles)
        )
      );
  END IF;
END $$;

-- Super admins can update files
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Super admins can update client logos'
  ) THEN
    CREATE POLICY "Super admins can update client logos"
      ON storage.objects FOR UPDATE
      TO authenticated
      USING (
        bucket_id = 'client-logos'
        AND EXISTS (
          SELECT 1 FROM users
          WHERE users.id = (SELECT id FROM users WHERE email = current_setting('request.jwt.claims', true)::json->>'email')
          AND 'super_admin' = ANY(users.roles)
        )
      )
      WITH CHECK (
        bucket_id = 'client-logos'
        AND EXISTS (
          SELECT 1 FROM users
          WHERE users.id = (SELECT id FROM users WHERE email = current_setting('request.jwt.claims', true)::json->>'email')
          AND 'super_admin' = ANY(users.roles)
        )
      );
  END IF;
END $$;

-- Super admins can delete files
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Super admins can delete client logos'
  ) THEN
    CREATE POLICY "Super admins can delete client logos"
      ON storage.objects FOR DELETE
      TO authenticated
      USING (
        bucket_id = 'client-logos'
        AND EXISTS (
          SELECT 1 FROM users
          WHERE users.id = (SELECT id FROM users WHERE email = current_setting('request.jwt.claims', true)::json->>'email')
          AND 'super_admin' = ANY(users.roles)
        )
      );
  END IF;
END $$;

-- All authenticated users can view logos (public bucket)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Anyone can view client logos'
  ) THEN
    CREATE POLICY "Anyone can view client logos"
      ON storage.objects FOR SELECT
      TO authenticated
      USING (bucket_id = 'client-logos');
  END IF;
END $$;

-- ============================================================================
-- PART 3: Log migration completion
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '======================================';
  RAISE NOTICE 'Client logos storage bucket created';
  RAISE NOTICE '======================================';
  RAISE NOTICE 'Bucket: client-logos';
  RAISE NOTICE 'Public: Yes';
  RAISE NOTICE 'Max file size: 5MB';
  RAISE NOTICE 'Allowed types: JPEG, PNG, WebP, SVG';
END $$;
