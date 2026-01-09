/*
  # Add card illustration URL to workshops

  1. Changes
    - Add `card_illustration_url` column to workshops table
      - Stores the Supabase Storage path to the workshop's card illustration image
      - Nullable to allow workshops without custom images
      - Type: text to store storage paths like 'workshop-images/uuid.jpg'

  2. Notes
    - Images will be uploaded to Supabase Storage bucket 'workshop-images'
    - If null, the workshop will fallback to its family's default image
    - URL generation will be done dynamically from the path at runtime
*/

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'workshops' AND column_name = 'card_illustration_url'
  ) THEN
    ALTER TABLE workshops 
    ADD COLUMN card_illustration_url text;
  END IF;
END $$;
