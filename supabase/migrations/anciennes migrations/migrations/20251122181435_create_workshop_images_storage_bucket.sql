/*
  # Create workshop images storage bucket

  1. New Storage Bucket
    - Create 'workshop-images' bucket for storing workshop card illustrations
    - Public bucket for easy image access
    - File size limit: 2MB
    - Allowed MIME types: image/jpeg, image/png, image/webp

  2. Security
    - Public read access for all users
    - Authenticated users can upload images (admins/organizers)
    - Only the uploader or admins can delete images
*/

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'workshop-images',
  'workshop-images',
  true,
  2097152,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public read access for workshop images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'workshop-images');

CREATE POLICY "Authenticated users can upload workshop images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'workshop-images');

CREATE POLICY "Users can update their own workshop images"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'workshop-images');

CREATE POLICY "Users can delete their own workshop images"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'workshop-images');
