/*
  # Add Email Subject Columns to Workshops Table

  1. Changes
    - Add `mail_pre_subject` column to workshops table for pre-workshop email subject
    - Add `mail_post_subject` column to workshops table for post-workshop email subject

  2. Details
    - Both columns are nullable text fields
    - These columns will store the email subjects alongside the existing mail_pre_html and mail_post_html
    - When workshops are created, these will be auto-populated from templates
*/

-- Add email subject columns to workshops table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'workshops' AND column_name = 'mail_pre_subject'
  ) THEN
    ALTER TABLE workshops ADD COLUMN mail_pre_subject text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'workshops' AND column_name = 'mail_post_subject'
  ) THEN
    ALTER TABLE workshops ADD COLUMN mail_post_subject text;
  END IF;
END $$;