/*
  # Migrate Workshops to Family-Specific Types

  ## Overview
  This migration converts all existing workshops from using transversal workshop types
  to using family-specific workshop types (fdfp_*, hd_*).

  ## Current State
  - 19 workshops exist with both old fields (workshop, type) and new fields (workshop_family_id, workshop_type_id)
  - All 19 workshops currently reference transversal types (without workshop_family_id)
  - Old fields values: workshop = 'FDFP' or 'HD', type = 'formation', 'workshop', etc.

  ## Migration Strategy
  1. Update workshop_type_id for all workshops to point to family-specific types
  2. The mapping is: old_type + family -> new family-specific type
     - FDFP + workshop -> fdfp_workshop
     - FDFP + formation -> fdfp_formation
     - HD + workshop -> hd_workshop
     - etc.

  ## Data Safety
  - Uses UPDATE statements, no data deletion
  - Validates that all workshops have been migrated
  - Maintains all workshop data intact

  ## After This Migration
  - All workshops will use family-specific types
  - Transversal types can be safely removed (next migration)
  - Old columns (workshop, type) can be dropped (subsequent migration)
*/

DO $$
DECLARE
  v_fdfp_family_id UUID := 'f9dce025-f4dc-4c5b-9527-a3a961480916';
  v_hd_family_id UUID := '9f6791b1-4dc0-40ff-9a81-22150f2ab522';
  
  -- FDFP type IDs
  v_fdfp_workshop_id UUID;
  v_fdfp_formation_id UUID;
  v_fdfp_pro1_id UUID;
  v_fdfp_pro2_id UUID;
  v_fdfp_formateur_id UUID;
  v_fdfp_retex_id UUID;
  
  -- HD type IDs
  v_hd_workshop_id UUID;
  v_hd_formation_id UUID;
  v_hd_pro1_id UUID;
  v_hd_pro2_id UUID;
  v_hd_formateur_id UUID;
  v_hd_retex_id UUID;
  
  v_updated_count INTEGER;
BEGIN

  -- Get FDFP type IDs
  SELECT id INTO v_fdfp_workshop_id FROM workshop_types WHERE code = 'fdfp_workshop';
  SELECT id INTO v_fdfp_formation_id FROM workshop_types WHERE code = 'fdfp_formation';
  SELECT id INTO v_fdfp_pro1_id FROM workshop_types WHERE code = 'fdfp_formation_pro_1';
  SELECT id INTO v_fdfp_pro2_id FROM workshop_types WHERE code = 'fdfp_formation_pro_2';
  SELECT id INTO v_fdfp_formateur_id FROM workshop_types WHERE code = 'fdfp_formation_formateur';
  SELECT id INTO v_fdfp_retex_id FROM workshop_types WHERE code = 'fdfp_formation_retex';

  -- Get HD type IDs
  SELECT id INTO v_hd_workshop_id FROM workshop_types WHERE code = 'hd_workshop';
  SELECT id INTO v_hd_formation_id FROM workshop_types WHERE code = 'hd_formation';
  SELECT id INTO v_hd_pro1_id FROM workshop_types WHERE code = 'hd_formation_pro_1';
  SELECT id INTO v_hd_pro2_id FROM workshop_types WHERE code = 'hd_formation_pro_2';
  SELECT id INTO v_hd_formateur_id FROM workshop_types WHERE code = 'hd_formation_formateur';
  SELECT id INTO v_hd_retex_id FROM workshop_types WHERE code = 'hd_formation_retex';

  -- ========================================
  -- 1. MIGRATE FDFP WORKSHOPS
  -- ========================================

  -- FDFP + workshop -> fdfp_workshop
  UPDATE workshops
  SET workshop_type_id = v_fdfp_workshop_id, updated_at = now()
  WHERE workshop = 'FDFP' AND type = 'workshop';
  GET DIAGNOSTICS v_updated_count = ROW_COUNT;
  RAISE NOTICE 'Updated % FDFP workshops (type=workshop)', v_updated_count;

  -- FDFP + formation -> fdfp_formation
  UPDATE workshops
  SET workshop_type_id = v_fdfp_formation_id, updated_at = now()
  WHERE workshop = 'FDFP' AND type = 'formation';
  GET DIAGNOSTICS v_updated_count = ROW_COUNT;
  RAISE NOTICE 'Updated % FDFP workshops (type=formation)', v_updated_count;

  -- FDFP + formation_pro_1 -> fdfp_formation_pro_1
  UPDATE workshops
  SET workshop_type_id = v_fdfp_pro1_id, updated_at = now()
  WHERE workshop = 'FDFP' AND type = 'formation_pro_1';
  GET DIAGNOSTICS v_updated_count = ROW_COUNT;
  RAISE NOTICE 'Updated % FDFP workshops (type=formation_pro_1)', v_updated_count;

  -- FDFP + formation_pro_2 -> fdfp_formation_pro_2
  UPDATE workshops
  SET workshop_type_id = v_fdfp_pro2_id, updated_at = now()
  WHERE workshop = 'FDFP' AND type = 'formation_pro_2';
  GET DIAGNOSTICS v_updated_count = ROW_COUNT;
  RAISE NOTICE 'Updated % FDFP workshops (type=formation_pro_2)', v_updated_count;

  -- FDFP + formation_formateur -> fdfp_formation_formateur
  UPDATE workshops
  SET workshop_type_id = v_fdfp_formateur_id, updated_at = now()
  WHERE workshop = 'FDFP' AND type = 'formation_formateur';
  GET DIAGNOSTICS v_updated_count = ROW_COUNT;
  RAISE NOTICE 'Updated % FDFP workshops (type=formation_formateur)', v_updated_count;

  -- FDFP + formation_retex -> fdfp_formation_retex
  UPDATE workshops
  SET workshop_type_id = v_fdfp_retex_id, updated_at = now()
  WHERE workshop = 'FDFP' AND type = 'formation_retex';
  GET DIAGNOSTICS v_updated_count = ROW_COUNT;
  RAISE NOTICE 'Updated % FDFP workshops (type=formation_retex)', v_updated_count;

  -- ========================================
  -- 2. MIGRATE HD WORKSHOPS
  -- ========================================

  -- HD + workshop -> hd_workshop
  UPDATE workshops
  SET workshop_type_id = v_hd_workshop_id, updated_at = now()
  WHERE workshop = 'HD' AND type = 'workshop';
  GET DIAGNOSTICS v_updated_count = ROW_COUNT;
  RAISE NOTICE 'Updated % HD workshops (type=workshop)', v_updated_count;

  -- HD + formation -> hd_formation
  UPDATE workshops
  SET workshop_type_id = v_hd_formation_id, updated_at = now()
  WHERE workshop = 'HD' AND type = 'formation';
  GET DIAGNOSTICS v_updated_count = ROW_COUNT;
  RAISE NOTICE 'Updated % HD workshops (type=formation)', v_updated_count;

  -- HD + formation_pro_1 -> hd_formation_pro_1
  UPDATE workshops
  SET workshop_type_id = v_hd_pro1_id, updated_at = now()
  WHERE workshop = 'HD' AND type = 'formation_pro_1';
  GET DIAGNOSTICS v_updated_count = ROW_COUNT;
  RAISE NOTICE 'Updated % HD workshops (type=formation_pro_1)', v_updated_count;

  -- HD + formation_pro_2 -> hd_formation_pro_2
  UPDATE workshops
  SET workshop_type_id = v_hd_pro2_id, updated_at = now()
  WHERE workshop = 'HD' AND type = 'formation_pro_2';
  GET DIAGNOSTICS v_updated_count = ROW_COUNT;
  RAISE NOTICE 'Updated % HD workshops (type=formation_pro_2)', v_updated_count;

  -- HD + formation_formateur -> hd_formation_formateur
  UPDATE workshops
  SET workshop_type_id = v_hd_formateur_id, updated_at = now()
  WHERE workshop = 'HD' AND type = 'formation_formateur';
  GET DIAGNOSTICS v_updated_count = ROW_COUNT;
  RAISE NOTICE 'Updated % HD workshops (type=formation_formateur)', v_updated_count;

  -- HD + formation_retex -> hd_formation_retex
  UPDATE workshops
  SET workshop_type_id = v_hd_retex_id, updated_at = now()
  WHERE workshop = 'HD' AND type = 'formation_retex';
  GET DIAGNOSTICS v_updated_count = ROW_COUNT;
  RAISE NOTICE 'Updated % HD workshops (type=formation_retex)', v_updated_count;

  -- ========================================
  -- 3. VALIDATION
  -- ========================================

  -- Check that all workshops now use family-specific types
  SELECT COUNT(*) INTO v_updated_count
  FROM workshops w
  INNER JOIN workshop_types wt ON w.workshop_type_id = wt.id
  WHERE wt.workshop_family_id IS NOT NULL;

  RAISE NOTICE 'Total workshops now using family-specific types: %', v_updated_count;

  -- Check for any workshops still using transversal types
  SELECT COUNT(*) INTO v_updated_count
  FROM workshops w
  INNER JOIN workshop_types wt ON w.workshop_type_id = wt.id
  WHERE wt.workshop_family_id IS NULL;

  IF v_updated_count > 0 THEN
    RAISE WARNING 'WARNING: % workshops still using transversal types!', v_updated_count;
  ELSE
    RAISE NOTICE 'SUCCESS: All workshops migrated to family-specific types';
  END IF;

END $$;
