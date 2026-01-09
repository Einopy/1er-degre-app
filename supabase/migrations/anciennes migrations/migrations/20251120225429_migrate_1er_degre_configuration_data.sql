/*
  # Migrate 1er Degré Configuration Data

  ## Overview
  Migrates existing hardcoded FDFP and HD configuration into the new
  flexible client configuration tables for the "1er Degré" client.

  ## Data Migration

  1. Workshop Families (FDFP, HD)
  2. Workshop Types (workshop, formation, formation_pro_1, formation_pro_2, formation_formateur, formation_retex)
  3. Role Levels (4 levels × 2 families = 8 roles)
  4. Role Requirements (prerequisites for each role level)
  5. Client Languages (fr, en, de, es, etc.)
  6. Link existing workshops to new IDs

  ## Important Notes

  - Preserves all existing functionality for 1er Degré
  - Keeps old columns (workshop, type) in workshops table for backward compatibility
  - Creates exact mappings to maintain current behavior
*/

-- =====================================================
-- 1. GET CLIENT ID FOR "1er Degré"
-- =====================================================

DO $$
DECLARE
  v_client_id uuid;
  v_fdfp_family_id uuid;
  v_hd_family_id uuid;
  v_fdfp_public_role_id uuid;
  v_fdfp_pro_role_id uuid;
  v_fdfp_trainer_role_id uuid;
  v_fdfp_instructor_role_id uuid;
  v_hd_public_role_id uuid;
  v_hd_pro_role_id uuid;
  v_hd_trainer_role_id uuid;
  v_hd_instructor_role_id uuid;
  v_workshop_type_id uuid;
  v_formation_type_id uuid;
  v_formation_pro_1_type_id uuid;
  v_formation_pro_2_type_id uuid;
  v_formation_formateur_type_id uuid;
  v_formation_retex_type_id uuid;
BEGIN
  -- Get 1er Degré client ID
  SELECT id INTO v_client_id FROM clients WHERE slug = '1erdegre' LIMIT 1;

  IF v_client_id IS NULL THEN
    RAISE EXCEPTION '1er Degré client not found';
  END IF;

  -- =====================================================
  -- 2. CREATE WORKSHOP FAMILIES (FDFP, HD)
  -- =====================================================

  -- Insert FDFP family
  INSERT INTO workshop_families (
    client_id,
    code,
    name,
    description,
    default_duration_minutes,
    is_active,
    display_order
  ) VALUES (
    v_client_id,
    'FDFP',
    'Fresque du Faire ensemble',
    'La Fresque du Faire ensemble est un atelier collaboratif qui explore les dynamiques de participation citoyenne et de dialogue démocratique.',
    180,
    true,
    1
  )
  ON CONFLICT (client_id, code) DO NOTHING
  RETURNING id INTO v_fdfp_family_id;

  -- Get FDFP family ID if already exists
  IF v_fdfp_family_id IS NULL THEN
    SELECT id INTO v_fdfp_family_id
    FROM workshop_families
    WHERE client_id = v_client_id AND code = 'FDFP';
  END IF;

  -- Insert HD family
  INSERT INTO workshop_families (
    client_id,
    code,
    name,
    description,
    default_duration_minutes,
    is_active,
    display_order
  ) VALUES (
    v_client_id,
    'HD',
    'Hackons le Débat',
    'Hackons le Débat est un atelier collaboratif qui permet d''explorer et d''améliorer les pratiques de débat et de délibération collective.',
    180,
    true,
    2
  )
  ON CONFLICT (client_id, code) DO NOTHING
  RETURNING id INTO v_hd_family_id;

  -- Get HD family ID if already exists
  IF v_hd_family_id IS NULL THEN
    SELECT id INTO v_hd_family_id
    FROM workshop_families
    WHERE client_id = v_client_id AND code = 'HD';
  END IF;

  -- =====================================================
  -- 3. CREATE WORKSHOP TYPES
  -- =====================================================

  -- Workshop type (generic, can be for both families)
  INSERT INTO workshop_types (
    client_id,
    workshop_family_id,
    code,
    label,
    default_duration_minutes,
    is_formation,
    is_active,
    display_order
  ) VALUES (
    v_client_id,
    NULL, -- Transversal
    'workshop',
    'Atelier',
    180,
    false,
    true,
    1
  )
  ON CONFLICT (client_id, code) DO NOTHING
  RETURNING id INTO v_workshop_type_id;

  IF v_workshop_type_id IS NULL THEN
    SELECT id INTO v_workshop_type_id
    FROM workshop_types WHERE client_id = v_client_id AND code = 'workshop';
  END IF;

  -- Formation type
  INSERT INTO workshop_types (
    client_id,
    workshop_family_id,
    code,
    label,
    default_duration_minutes,
    is_formation,
    is_active,
    display_order
  ) VALUES (
    v_client_id,
    NULL, -- Transversal
    'formation',
    'Formation',
    180,
    true,
    true,
    2
  )
  ON CONFLICT (client_id, code) DO NOTHING
  RETURNING id INTO v_formation_type_id;

  IF v_formation_type_id IS NULL THEN
    SELECT id INTO v_formation_type_id
    FROM workshop_types WHERE client_id = v_client_id AND code = 'formation';
  END IF;

  -- Formation Pro 1
  INSERT INTO workshop_types (
    client_id,
    workshop_family_id,
    code,
    label,
    default_duration_minutes,
    is_formation,
    is_active,
    display_order
  ) VALUES (
    v_client_id,
    NULL, -- Transversal
    'formation_pro_1',
    'Formation Pro 1',
    120,
    true,
    true,
    3
  )
  ON CONFLICT (client_id, code) DO NOTHING
  RETURNING id INTO v_formation_pro_1_type_id;

  IF v_formation_pro_1_type_id IS NULL THEN
    SELECT id INTO v_formation_pro_1_type_id
    FROM workshop_types WHERE client_id = v_client_id AND code = 'formation_pro_1';
  END IF;

  -- Formation Pro 2
  INSERT INTO workshop_types (
    client_id,
    workshop_family_id,
    code,
    label,
    default_duration_minutes,
    is_formation,
    is_active,
    display_order
  ) VALUES (
    v_client_id,
    NULL, -- Transversal
    'formation_pro_2',
    'Formation Pro 2',
    150,
    true,
    true,
    4
  )
  ON CONFLICT (client_id, code) DO NOTHING
  RETURNING id INTO v_formation_pro_2_type_id;

  IF v_formation_pro_2_type_id IS NULL THEN
    SELECT id INTO v_formation_pro_2_type_id
    FROM workshop_types WHERE client_id = v_client_id AND code = 'formation_pro_2';
  END IF;

  -- Formation Formateur
  INSERT INTO workshop_types (
    client_id,
    workshop_family_id,
    code,
    label,
    default_duration_minutes,
    is_formation,
    is_active,
    display_order
  ) VALUES (
    v_client_id,
    NULL, -- Transversal
    'formation_formateur',
    'Formation Formateur',
    240,
    true,
    true,
    5
  )
  ON CONFLICT (client_id, code) DO NOTHING
  RETURNING id INTO v_formation_formateur_type_id;

  IF v_formation_formateur_type_id IS NULL THEN
    SELECT id INTO v_formation_formateur_type_id
    FROM workshop_types WHERE client_id = v_client_id AND code = 'formation_formateur';
  END IF;

  -- Formation Retex
  INSERT INTO workshop_types (
    client_id,
    workshop_family_id,
    code,
    label,
    default_duration_minutes,
    is_formation,
    is_active,
    display_order
  ) VALUES (
    v_client_id,
    NULL, -- Transversal
    'formation_retex',
    'Formation Retex',
    90,
    true,
    true,
    6
  )
  ON CONFLICT (client_id, code) DO NOTHING
  RETURNING id INTO v_formation_retex_type_id;

  IF v_formation_retex_type_id IS NULL THEN
    SELECT id INTO v_formation_retex_type_id
    FROM workshop_types WHERE client_id = v_client_id AND code = 'formation_retex';
  END IF;

  -- =====================================================
  -- 4. CREATE ROLE LEVELS (4 levels × 2 families = 8 roles)
  -- =====================================================

  -- FDFP Roles
  INSERT INTO role_levels (client_id, workshop_family_id, level, internal_key, label, description)
  VALUES
    (v_client_id, v_fdfp_family_id, 1, 'public', 'Animateur', 'Peut animer des ateliers FDFP pour le grand public')
  ON CONFLICT (client_id, workshop_family_id, level) DO NOTHING
  RETURNING id INTO v_fdfp_public_role_id;

  IF v_fdfp_public_role_id IS NULL THEN
    SELECT id INTO v_fdfp_public_role_id
    FROM role_levels WHERE client_id = v_client_id AND workshop_family_id = v_fdfp_family_id AND level = 1;
  END IF;

  INSERT INTO role_levels (client_id, workshop_family_id, level, internal_key, label, description)
  VALUES
    (v_client_id, v_fdfp_family_id, 2, 'pro', 'Animateur Pro', 'Peut animer des ateliers FDFP pour les professionnels')
  ON CONFLICT (client_id, workshop_family_id, level) DO NOTHING
  RETURNING id INTO v_fdfp_pro_role_id;

  IF v_fdfp_pro_role_id IS NULL THEN
    SELECT id INTO v_fdfp_pro_role_id
    FROM role_levels WHERE client_id = v_client_id AND workshop_family_id = v_fdfp_family_id AND level = 2;
  END IF;

  INSERT INTO role_levels (client_id, workshop_family_id, level, internal_key, label, description)
  VALUES
    (v_client_id, v_fdfp_family_id, 3, 'trainer', 'Formateur', 'Peut animer des formations FDFP')
  ON CONFLICT (client_id, workshop_family_id, level) DO NOTHING
  RETURNING id INTO v_fdfp_trainer_role_id;

  IF v_fdfp_trainer_role_id IS NULL THEN
    SELECT id INTO v_fdfp_trainer_role_id
    FROM role_levels WHERE client_id = v_client_id AND workshop_family_id = v_fdfp_family_id AND level = 3;
  END IF;

  INSERT INTO role_levels (client_id, workshop_family_id, level, internal_key, label, description)
  VALUES
    (v_client_id, v_fdfp_family_id, 4, 'instructor', 'Instructeur', 'Peut former des formateurs FDFP')
  ON CONFLICT (client_id, workshop_family_id, level) DO NOTHING
  RETURNING id INTO v_fdfp_instructor_role_id;

  IF v_fdfp_instructor_role_id IS NULL THEN
    SELECT id INTO v_fdfp_instructor_role_id
    FROM role_levels WHERE client_id = v_client_id AND workshop_family_id = v_fdfp_family_id AND level = 4;
  END IF;

  -- HD Roles
  INSERT INTO role_levels (client_id, workshop_family_id, level, internal_key, label, description)
  VALUES
    (v_client_id, v_hd_family_id, 1, 'public', 'Animateur', 'Peut animer des ateliers HD pour le grand public')
  ON CONFLICT (client_id, workshop_family_id, level) DO NOTHING
  RETURNING id INTO v_hd_public_role_id;

  IF v_hd_public_role_id IS NULL THEN
    SELECT id INTO v_hd_public_role_id
    FROM role_levels WHERE client_id = v_client_id AND workshop_family_id = v_hd_family_id AND level = 1;
  END IF;

  INSERT INTO role_levels (client_id, workshop_family_id, level, internal_key, label, description)
  VALUES
    (v_client_id, v_hd_family_id, 2, 'pro', 'Animateur Pro', 'Peut animer des ateliers HD pour les professionnels')
  ON CONFLICT (client_id, workshop_family_id, level) DO NOTHING
  RETURNING id INTO v_hd_pro_role_id;

  IF v_hd_pro_role_id IS NULL THEN
    SELECT id INTO v_hd_pro_role_id
    FROM role_levels WHERE client_id = v_client_id AND workshop_family_id = v_hd_family_id AND level = 2;
  END IF;

  INSERT INTO role_levels (client_id, workshop_family_id, level, internal_key, label, description)
  VALUES
    (v_client_id, v_hd_family_id, 3, 'trainer', 'Formateur', 'Peut animer des formations HD')
  ON CONFLICT (client_id, workshop_family_id, level) DO NOTHING
  RETURNING id INTO v_hd_trainer_role_id;

  IF v_hd_trainer_role_id IS NULL THEN
    SELECT id INTO v_hd_trainer_role_id
    FROM role_levels WHERE client_id = v_client_id AND workshop_family_id = v_hd_family_id AND level = 3;
  END IF;

  INSERT INTO role_levels (client_id, workshop_family_id, level, internal_key, label, description)
  VALUES
    (v_client_id, v_hd_family_id, 4, 'instructor', 'Instructeur', 'Peut former des formateurs HD')
  ON CONFLICT (client_id, workshop_family_id, level) DO NOTHING
  RETURNING id INTO v_hd_instructor_role_id;

  IF v_hd_instructor_role_id IS NULL THEN
    SELECT id INTO v_hd_instructor_role_id
    FROM role_levels WHERE client_id = v_client_id AND workshop_family_id = v_hd_family_id AND level = 4;
  END IF;

  -- =====================================================
  -- 5. CREATE ROLE REQUIREMENTS
  -- =====================================================

  -- FDFP Pro requirements (based on existing 1er Degré logic)
  INSERT INTO role_requirements (
    role_level_id,
    required_workshop_types,
    min_workshops_total,
    min_workshops_online,
    min_workshops_in_person,
    min_feedback_count,
    min_feedback_avg
  ) VALUES (
    v_fdfp_pro_role_id,
    jsonb_build_array(v_formation_pro_1_type_id::text, v_formation_pro_2_type_id::text),
    3,
    1,
    1,
    6,
    3.0
  )
  ON CONFLICT (role_level_id) DO NOTHING;

  -- Other role requirements (placeholders for now)
  INSERT INTO role_requirements (role_level_id) VALUES (v_fdfp_public_role_id) ON CONFLICT DO NOTHING;
  INSERT INTO role_requirements (role_level_id) VALUES (v_fdfp_trainer_role_id) ON CONFLICT DO NOTHING;
  INSERT INTO role_requirements (role_level_id) VALUES (v_fdfp_instructor_role_id) ON CONFLICT DO NOTHING;
  INSERT INTO role_requirements (role_level_id) VALUES (v_hd_public_role_id) ON CONFLICT DO NOTHING;
  INSERT INTO role_requirements (role_level_id) VALUES (v_hd_pro_role_id) ON CONFLICT DO NOTHING;
  INSERT INTO role_requirements (role_level_id) VALUES (v_hd_trainer_role_id) ON CONFLICT DO NOTHING;
  INSERT INTO role_requirements (role_level_id) VALUES (v_hd_instructor_role_id) ON CONFLICT DO NOTHING;

  -- =====================================================
  -- 6. CREATE CLIENT LANGUAGES
  -- =====================================================

  INSERT INTO client_languages (client_id, workshop_family_id, language_code, language_name, display_order)
  VALUES
    (v_client_id, NULL, 'fr', 'Français', 1),
    (v_client_id, NULL, 'en', 'English', 2),
    (v_client_id, NULL, 'de', 'Deutsch', 3),
    (v_client_id, NULL, 'es', 'Español', 4),
    (v_client_id, NULL, 'it', 'Italiano', 5)
  ON CONFLICT DO NOTHING;

  -- =====================================================
  -- 7. LINK EXISTING WORKSHOPS TO NEW IDS
  -- =====================================================

  -- Update FDFP workshops
  UPDATE workshops
  SET workshop_family_id = v_fdfp_family_id
  WHERE workshop = 'FDFP' AND workshop_family_id IS NULL;

  -- Update HD workshops
  UPDATE workshops
  SET workshop_family_id = v_hd_family_id
  WHERE workshop = 'HD' AND workshop_family_id IS NULL;

  -- Map workshop types
  UPDATE workshops SET workshop_type_id = v_workshop_type_id
  WHERE type = 'workshop' AND workshop_type_id IS NULL;

  UPDATE workshops SET workshop_type_id = v_formation_type_id
  WHERE type = 'formation' AND workshop_type_id IS NULL;

  UPDATE workshops SET workshop_type_id = v_formation_pro_1_type_id
  WHERE type = 'formation_pro_1' AND workshop_type_id IS NULL;

  UPDATE workshops SET workshop_type_id = v_formation_pro_2_type_id
  WHERE type = 'formation_pro_2' AND workshop_type_id IS NULL;

  UPDATE workshops SET workshop_type_id = v_formation_formateur_type_id
  WHERE type = 'formation_formateur' AND workshop_type_id IS NULL;

  UPDATE workshops SET workshop_type_id = v_formation_retex_type_id
  WHERE type = 'formation_retex' AND workshop_type_id IS NULL;

END $$;
