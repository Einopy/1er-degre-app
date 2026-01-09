/*
  # Add is_present column to participations table

  1. Changes
    - Add `is_present` boolean column to `participations` table
    - Default value is false
    - Column indicates whether a participant actually attended the workshop
    - Used for tracking actual attendance vs registration/payment status

  2. Notes
    - This column complements the `status` field which tracks registration/payment
    - `is_present` specifically tracks physical/confirmed attendance
    - Useful for post-workshop analytics and completion tracking
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'participations' AND column_name = 'is_present'
  ) THEN
    ALTER TABLE participations ADD COLUMN is_present boolean DEFAULT false;
  END IF;
END $$;