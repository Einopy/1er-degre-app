/*
  # Add Unique Constraint to client_admins

  ## Overview
  Ensures a user cannot be assigned as admin to the same client multiple times.

  ## Changes
  1. Clean up any existing duplicate (user_id, client_id) pairs
  2. Add unique constraint on (user_id, client_id)

  ## Security
  Prevents duplicate admin assignments at the database level.
*/

-- =====================================================
-- 1. REMOVE DUPLICATE ADMIN ASSIGNMENTS
-- =====================================================

-- Keep only the oldest record for each (user_id, client_id) pair
DELETE FROM client_admins
WHERE id NOT IN (
  SELECT DISTINCT ON (user_id, client_id) id
  FROM client_admins
  ORDER BY user_id, client_id, created_at ASC
);

-- =====================================================
-- 2. ADD UNIQUE CONSTRAINT
-- =====================================================

CREATE UNIQUE INDEX IF NOT EXISTS client_admins_user_client_unique 
  ON client_admins(user_id, client_id);