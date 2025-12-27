/*
  # Add extra_duration_minutes field to workshops table

  ## Changes
  1. New Columns
    - `extra_duration_minutes` (integer, nullable, default 0)
      - Allows organizers to add extra time beyond the default workshop duration
      - Value in minutes
      - Defaults to 0 (no extra time)
  
  ## Notes
  - This field enables flexibility for organizers while maintaining type-based default durations
  - Used in conjunction with workshop type to calculate end_at time
  - Safe to run multiple times with IF NOT EXISTS check
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'workshops' AND column_name = 'extra_duration_minutes'
  ) THEN
    ALTER TABLE workshops ADD COLUMN extra_duration_minutes integer DEFAULT 0;
  END IF;
END $$;