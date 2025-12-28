/*
  # Remove co_organizers Column from Workshops

  1. Changes
    - Remove co_organizers column from workshops table using CASCADE
    - This will also drop any dependent policies
    - Co-organizer functionality has been completely removed

  2. Data Safety
    - No data loss - just removing unused column
    - Dependent policies will be automatically dropped
*/

-- Remove co_organizers column from workshops table with CASCADE
ALTER TABLE workshops DROP COLUMN IF EXISTS co_organizers CASCADE;
