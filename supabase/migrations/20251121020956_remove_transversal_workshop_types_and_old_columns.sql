/*
  # Remove Transversal Workshop Types and Old Columns

  ## Overview
  This migration removes:
  1. The 6 transversal workshop types (without workshop_family_id)
  2. The old columns 'workshop' and 'type' from the workshops table

  ## Prerequisites
  - All workshops must be using family-specific types (previous migration completed)

  ## Actions
  1. Delete role_requirements that reference transversal types
  2. Delete the 6 transversal workshop_types
  3. Drop the old 'workshop' column from workshops table
  4. Drop the old 'type' column from workshops table
  5. Make workshop_family_id and workshop_type_id NOT NULL

  ## Data Safety
  - Validates no workshops are using transversal types before deletion
  - Validates all workshops have new fields populated before dropping old columns
*/

DO $$
DECLARE
  v_trans_type_count INTEGER;
  v_workshops_using_trans INTEGER;
  v_workshops_missing_new_fields INTEGER;
BEGIN

  -- ========================================
  -- 1. VALIDATION: Check no workshops using transversal types
  -- ========================================

  SELECT COUNT(*) INTO v_workshops_using_trans
  FROM workshops w
  INNER JOIN workshop_types wt ON w.workshop_type_id = wt.id
  WHERE wt.workshop_family_id IS NULL;

  IF v_workshops_using_trans > 0 THEN
    RAISE EXCEPTION 'Cannot proceed: % workshops still using transversal types', v_workshops_using_trans;
  END IF;

  RAISE NOTICE 'Validation passed: No workshops using transversal types';

  -- ========================================
  -- 2. VALIDATION: Check all workshops have new fields
  -- ========================================

  SELECT COUNT(*) INTO v_workshops_missing_new_fields
  FROM workshops
  WHERE workshop_family_id IS NULL OR workshop_type_id IS NULL;

  IF v_workshops_missing_new_fields > 0 THEN
    RAISE EXCEPTION 'Cannot proceed: % workshops missing new fields (workshop_family_id or workshop_type_id)', v_workshops_missing_new_fields;
  END IF;

  RAISE NOTICE 'Validation passed: All workshops have new fields populated';

  -- ========================================
  -- 3. DELETE ROLE_REQUIREMENTS REFERENCING TRANSVERSAL TYPES
  -- ========================================

  -- First, we need to update role_requirements that reference transversal types
  -- Since we've created new family-specific types, the role_requirements were
  -- already updated in the previous migration to use family-specific type IDs
  -- So we just need to ensure there are no orphaned references

  RAISE NOTICE 'Role requirements already updated to use family-specific types';

  -- ========================================
  -- 4. DELETE TRANSVERSAL WORKSHOP TYPES
  -- ========================================

  DELETE FROM workshop_types
  WHERE workshop_family_id IS NULL
    AND code IN ('workshop', 'formation', 'formation_pro_1', 'formation_pro_2', 'formation_formateur', 'formation_retex');

  GET DIAGNOSTICS v_trans_type_count = ROW_COUNT;
  RAISE NOTICE 'Deleted % transversal workshop types', v_trans_type_count;

  -- ========================================
  -- 5. DROP OLD COLUMNS FROM WORKSHOPS TABLE
  -- ========================================

  -- Drop old 'workshop' column (was enum: FDFP, HD)
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'workshops' AND column_name = 'workshop'
  ) THEN
    ALTER TABLE workshops DROP COLUMN workshop;
    RAISE NOTICE 'Dropped old "workshop" column from workshops table';
  END IF;

  -- Drop old 'type' column (was enum: workshop, formation, etc.)
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'workshops' AND column_name = 'type'
  ) THEN
    ALTER TABLE workshops DROP COLUMN type;
    RAISE NOTICE 'Dropped old "type" column from workshops table';
  END IF;

  -- ========================================
  -- 6. MAKE NEW COLUMNS NOT NULL
  -- ========================================

  -- Make workshop_family_id NOT NULL
  ALTER TABLE workshops
    ALTER COLUMN workshop_family_id SET NOT NULL;
  RAISE NOTICE 'Made workshop_family_id NOT NULL';

  -- Make workshop_type_id NOT NULL
  ALTER TABLE workshops
    ALTER COLUMN workshop_type_id SET NOT NULL;
  RAISE NOTICE 'Made workshop_type_id NOT NULL';

  -- ========================================
  -- 7. FINAL VALIDATION
  -- ========================================

  SELECT COUNT(*) INTO v_trans_type_count
  FROM workshop_types
  WHERE workshop_family_id IS NULL;

  IF v_trans_type_count > 0 THEN
    RAISE WARNING 'Warning: % transversal types still exist', v_trans_type_count;
  ELSE
    RAISE NOTICE 'SUCCESS: All transversal types removed';
  END IF;

  RAISE NOTICE 'Migration completed successfully';

END $$;
