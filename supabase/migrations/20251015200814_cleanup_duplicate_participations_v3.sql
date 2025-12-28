/*
  # Cleanup Duplicate Participations (v3)

  ## Problem
  Some users have duplicate participation records for the same workshop.
  We need to keep only one record per user-workshop combination.

  ## Solution
  Use ROW_NUMBER() to identify duplicates and keep only the first one
  (ordered by created_at, then id for deterministic results).

  ## Changes
  1. Use a CTE with ROW_NUMBER to identify duplicates
  2. Keep row_num = 1 for each user-workshop combination
  3. Delete all other rows (row_num > 1)
*/

-- Delete duplicate participations using ROW_NUMBER
WITH ranked_participations AS (
  SELECT 
    id,
    ROW_NUMBER() OVER (
      PARTITION BY user_id, workshop_id 
      ORDER BY created_at ASC, id::text ASC
    ) as row_num
  FROM participations
  WHERE status NOT IN ('annule', 'rembourse')
)
DELETE FROM participations
WHERE id IN (
  SELECT id 
  FROM ranked_participations 
  WHERE row_num > 1
);

-- Log how many duplicates were removed
DO $$
DECLARE
  remaining_duplicates INTEGER;
BEGIN
  SELECT COUNT(*) INTO remaining_duplicates
  FROM (
    SELECT user_id, workshop_id
    FROM participations
    WHERE status NOT IN ('annule', 'rembourse')
    GROUP BY user_id, workshop_id
    HAVING COUNT(*) > 1
  ) dups;
  
  RAISE NOTICE 'Duplicate participations remaining: %', remaining_duplicates;
  
  IF remaining_duplicates > 0 THEN
    RAISE EXCEPTION 'Failed to remove all duplicate participations';
  END IF;
END $$;
