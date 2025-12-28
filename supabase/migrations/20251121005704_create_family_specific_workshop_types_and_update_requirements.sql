/*
  # Create Family-Specific Workshop Types and Update Role Requirements

  ## Overview
  This migration creates family-specific workshop types (12 total: 6 for FDFP + 6 for HD)
  and updates role requirements with proper prerequisites.

  ## New Workshop Types
  
  ### FDFP Types (linked to FDFP family)
  1. fdfp_workshop - Atelier FDFP (180 min)
  2. fdfp_formation - Formation FDFP (480 min / 8h)
  3. fdfp_formation_pro_1 - Formation Pro 1 FDFP (120 min / 2h)
  4. fdfp_formation_pro_2 - Formation Pro 2 FDFP (150 min / 2.5h)
  5. fdfp_formation_formateur - Formation Formateur FDFP (960 min / 16h)
  6. fdfp_formation_retex - Formation RETEX FDFP (90 min / 1.5h)

  ### HD Types (linked to HD family)
  1. hd_workshop - Atelier HD (180 min)
  2. hd_formation - Formation HD (480 min / 8h)
  3. hd_formation_pro_1 - Formation Pro 1 HD (120 min / 2h)
  4. hd_formation_pro_2 - Formation Pro 2 HD (150 min / 2.5h)
  5. hd_formation_formateur - Formation Formateur HD (960 min / 16h)
  6. hd_formation_retex - Formation RETEX HD (90 min / 1.5h)

  ## Role Requirements Updates
  
  For each family (FDFP and HD):
  - Level 1 (Animateur): No requirements
  - Level 2 (Animateur Pro): Requires Pro 1 + Pro 2 formations, 3 workshops min
  - Level 3 (Formateur): Requires Formation Formateur, 10 workshops min
  - Level 4 (Instructeur): Requires Formation Formateur + RETEX, 25 workshops min

  ## Security
  - Uses client_id: addeae26-2711-4f4d-bcdd-222f4252e34a
  - All entries active by default
*/

DO $$
DECLARE
  v_client_id UUID := 'addeae26-2711-4f4d-bcdd-222f4252e34a';
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
  
  -- Role level IDs
  v_fdfp_level1_id UUID := 'f817d90d-de9a-44c1-943c-92c0d126da11';
  v_fdfp_level2_id UUID := '6990a7ca-5a15-4f85-98b7-0f5c013521c5';
  v_fdfp_level3_id UUID := 'd8efb0f2-b5a6-4c40-bff6-0c3ed4caab46';
  v_fdfp_level4_id UUID := '3eff8586-5f8e-41f5-ac51-afd70569b18e';
  v_hd_level1_id UUID := 'f4f6f03a-ad46-446c-bb0c-c6b893c493e4';
  v_hd_level2_id UUID := 'ba7c38c9-8b49-42e1-aafa-b179cf02333f';
  v_hd_level3_id UUID := '43a38f5a-4768-4ea3-97c7-f952311e3328';
  v_hd_level4_id UUID := '8ce158c5-b6b7-4c7f-9669-31047faf2963';
BEGIN

  -- ========================================
  -- 1. CREATE FDFP WORKSHOP TYPES
  -- ========================================

  INSERT INTO workshop_types (
    client_id,
    workshop_family_id,
    code,
    label,
    default_duration_minutes,
    is_formation,
    is_active,
    display_order
  ) VALUES 
    (v_client_id, v_fdfp_family_id, 'fdfp_workshop', 'Atelier FDFP', 180, false, true, 10),
    (v_client_id, v_fdfp_family_id, 'fdfp_formation', 'Formation FDFP', 480, true, true, 11),
    (v_client_id, v_fdfp_family_id, 'fdfp_formation_pro_1', 'Formation Pro 1 FDFP', 120, true, true, 12),
    (v_client_id, v_fdfp_family_id, 'fdfp_formation_pro_2', 'Formation Pro 2 FDFP', 150, true, true, 13),
    (v_client_id, v_fdfp_family_id, 'fdfp_formation_formateur', 'Formation Formateur FDFP', 960, true, true, 14),
    (v_client_id, v_fdfp_family_id, 'fdfp_formation_retex', 'Formation RETEX FDFP', 90, true, true, 15);

  -- Get FDFP type IDs
  SELECT id INTO v_fdfp_workshop_id FROM workshop_types 
    WHERE client_id = v_client_id AND code = 'fdfp_workshop';
  SELECT id INTO v_fdfp_formation_id FROM workshop_types 
    WHERE client_id = v_client_id AND code = 'fdfp_formation';
  SELECT id INTO v_fdfp_pro1_id FROM workshop_types 
    WHERE client_id = v_client_id AND code = 'fdfp_formation_pro_1';
  SELECT id INTO v_fdfp_pro2_id FROM workshop_types 
    WHERE client_id = v_client_id AND code = 'fdfp_formation_pro_2';
  SELECT id INTO v_fdfp_formateur_id FROM workshop_types 
    WHERE client_id = v_client_id AND code = 'fdfp_formation_formateur';
  SELECT id INTO v_fdfp_retex_id FROM workshop_types 
    WHERE client_id = v_client_id AND code = 'fdfp_formation_retex';

  -- ========================================
  -- 2. CREATE HD WORKSHOP TYPES
  -- ========================================

  INSERT INTO workshop_types (
    client_id,
    workshop_family_id,
    code,
    label,
    default_duration_minutes,
    is_formation,
    is_active,
    display_order
  ) VALUES 
    (v_client_id, v_hd_family_id, 'hd_workshop', 'Atelier HD', 180, false, true, 20),
    (v_client_id, v_hd_family_id, 'hd_formation', 'Formation HD', 480, true, true, 21),
    (v_client_id, v_hd_family_id, 'hd_formation_pro_1', 'Formation Pro 1 HD', 120, true, true, 22),
    (v_client_id, v_hd_family_id, 'hd_formation_pro_2', 'Formation Pro 2 HD', 150, true, true, 23),
    (v_client_id, v_hd_family_id, 'hd_formation_formateur', 'Formation Formateur HD', 960, true, true, 24),
    (v_client_id, v_hd_family_id, 'hd_formation_retex', 'Formation RETEX HD', 90, true, true, 25);

  -- Get HD type IDs
  SELECT id INTO v_hd_workshop_id FROM workshop_types 
    WHERE client_id = v_client_id AND code = 'hd_workshop';
  SELECT id INTO v_hd_formation_id FROM workshop_types 
    WHERE client_id = v_client_id AND code = 'hd_formation';
  SELECT id INTO v_hd_pro1_id FROM workshop_types 
    WHERE client_id = v_client_id AND code = 'hd_formation_pro_1';
  SELECT id INTO v_hd_pro2_id FROM workshop_types 
    WHERE client_id = v_client_id AND code = 'hd_formation_pro_2';
  SELECT id INTO v_hd_formateur_id FROM workshop_types 
    WHERE client_id = v_client_id AND code = 'hd_formation_formateur';
  SELECT id INTO v_hd_retex_id FROM workshop_types 
    WHERE client_id = v_client_id AND code = 'hd_formation_retex';

  -- ========================================
  -- 3. UPDATE ROLE REQUIREMENTS FOR FDFP
  -- ========================================

  -- Level 2 (Animateur Pro) - requires Pro 1 + Pro 2
  UPDATE role_requirements
  SET 
    required_workshop_types = jsonb_build_array(v_fdfp_pro1_id, v_fdfp_pro2_id),
    min_workshops_total = 3,
    min_workshops_online = 1,
    min_workshops_in_person = 1,
    min_feedback_count = 6,
    min_feedback_avg = 3.0,
    updated_at = now()
  WHERE role_level_id = v_fdfp_level2_id;

  -- Level 3 (Formateur) - requires Formation Formateur
  UPDATE role_requirements
  SET 
    required_workshop_types = jsonb_build_array(v_fdfp_formateur_id),
    min_workshops_total = 10,
    min_workshops_online = 3,
    min_workshops_in_person = 3,
    min_feedback_count = 20,
    min_feedback_avg = 4.0,
    updated_at = now()
  WHERE role_level_id = v_fdfp_level3_id;

  -- Level 4 (Instructeur) - requires Formation Formateur + RETEX
  UPDATE role_requirements
  SET 
    required_workshop_types = jsonb_build_array(v_fdfp_formateur_id, v_fdfp_retex_id),
    min_workshops_total = 25,
    min_workshops_online = 10,
    min_workshops_in_person = 10,
    min_feedback_count = 50,
    min_feedback_avg = 4.5,
    updated_at = now()
  WHERE role_level_id = v_fdfp_level4_id;

  -- ========================================
  -- 4. UPDATE ROLE REQUIREMENTS FOR HD
  -- ========================================

  -- Level 2 (Animateur Pro) - requires Pro 1 + Pro 2
  UPDATE role_requirements
  SET 
    required_workshop_types = jsonb_build_array(v_hd_pro1_id, v_hd_pro2_id),
    min_workshops_total = 3,
    min_workshops_online = 1,
    min_workshops_in_person = 1,
    min_feedback_count = 6,
    min_feedback_avg = 3.0,
    updated_at = now()
  WHERE role_level_id = v_hd_level2_id;

  -- Level 3 (Formateur) - requires Formation Formateur
  UPDATE role_requirements
  SET 
    required_workshop_types = jsonb_build_array(v_hd_formateur_id),
    min_workshops_total = 10,
    min_workshops_online = 3,
    min_workshops_in_person = 3,
    min_feedback_count = 20,
    min_feedback_avg = 4.0,
    updated_at = now()
  WHERE role_level_id = v_hd_level3_id;

  -- Level 4 (Instructeur) - requires Formation Formateur + RETEX
  UPDATE role_requirements
  SET 
    required_workshop_types = jsonb_build_array(v_hd_formateur_id, v_hd_retex_id),
    min_workshops_total = 25,
    min_workshops_online = 10,
    min_workshops_in_person = 10,
    min_feedback_count = 50,
    min_feedback_avg = 4.5,
    updated_at = now()
  WHERE role_level_id = v_hd_level4_id;

END $$;
