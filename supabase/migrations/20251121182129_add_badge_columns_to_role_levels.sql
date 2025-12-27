/*
  # Add Badge and Display Columns to Role Levels

  1. Changes to `role_levels` table
    - Add `badge_emoji` (text) - Emoji for certification badges (🎯, ⭐, 🏆, 🎖️)
    - Add `badge_color_primary` (text) - Primary color for this level's badge (hex)
    - Add `badge_color_bg` (text) - Background color for this level's badge (hex)
    - Add `description_short` (text) - Short tooltip description
    - Add `description_long` (text) - Full description for eligibility details

  2. Data Population
    - Set badge data for existing FDFP role levels (public, pro, trainer, instructor)
    - Set badge data for existing HD role levels (public, pro, trainer, instructor)

  3. Purpose
    - Enable dynamic certification badge display
    - Remove hardcoded badge styling from components
    - Support flexible role level systems (2, 3, 4, 5, 6+ levels)
*/

-- Add badge columns to role_levels
DO $$
BEGIN
  -- Add badge_emoji column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'role_levels' AND column_name = 'badge_emoji'
  ) THEN
    ALTER TABLE role_levels ADD COLUMN badge_emoji text;
  END IF;

  -- Add badge_color_primary column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'role_levels' AND column_name = 'badge_color_primary'
  ) THEN
    ALTER TABLE role_levels ADD COLUMN badge_color_primary text;
  END IF;

  -- Add badge_color_bg column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'role_levels' AND column_name = 'badge_color_bg'
  ) THEN
    ALTER TABLE role_levels ADD COLUMN badge_color_bg text;
  END IF;

  -- Add description_short column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'role_levels' AND column_name = 'description_short'
  ) THEN
    ALTER TABLE role_levels ADD COLUMN description_short text;
  END IF;

  -- Add description_long column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'role_levels' AND column_name = 'description_long'
  ) THEN
    ALTER TABLE role_levels ADD COLUMN description_long text;
  END IF;
END $$;

-- Populate badge data for FDFP role levels
-- Level 1: Public/Animateur (green theme)
UPDATE role_levels 
SET 
  badge_emoji = '🎯',
  badge_color_primary = '#16a34a',
  badge_color_bg = 'from-green-50 to-green-100 border-green-400',
  description_short = 'Obtenue en complétant la formation FDFP initiale. Permet d''animer des ateliers grand public.',
  description_long = 'Certification de base pour animer des ateliers FDFP auprès du grand public. Obtenue après avoir suivi et validé la formation initiale.'
WHERE internal_key = 'public' 
  AND workshop_family_id IN (SELECT id FROM workshop_families WHERE code = 'FDFP');

-- Level 2: Pro/Animateur Pro (blue theme)
UPDATE role_levels 
SET 
  badge_emoji = '⭐',
  badge_color_primary = '#2563eb',
  badge_color_bg = 'from-blue-50 to-blue-100 border-blue-400',
  description_short = 'Obtenue après avoir complété Formation Pro 2. Nécessite 3 ateliers animés (présentiel + distanciel) et 6 retours positifs.',
  description_long = 'Certification avancée démontrant une expérience significative en animation. Requiert la validation de Formation Pro 2 ainsi qu''un historique d''animations réussies.'
WHERE internal_key = 'pro' 
  AND workshop_family_id IN (SELECT id FROM workshop_families WHERE code = 'FDFP');

-- Level 3: Trainer/Formateur (amber theme)
UPDATE role_levels 
SET 
  badge_emoji = '🏆',
  badge_color_primary = '#d97706',
  badge_color_bg = 'from-amber-50 to-amber-100 border-amber-400',
  description_short = 'Obtenue en complétant Formation Formateur. Permet de former les futurs animateurs FDFP.',
  description_long = 'Certification d''expert permettant de former de nouveaux animateurs. Requiert une expérience significative en tant qu''Animateur Pro et la validation de la Formation Formateur.'
WHERE internal_key = 'trainer' 
  AND workshop_family_id IN (SELECT id FROM workshop_families WHERE code = 'FDFP');

-- Level 4: Instructor/Instructeur (gray theme)
UPDATE role_levels 
SET 
  badge_emoji = '🎖️',
  badge_color_primary = '#4b5563',
  badge_color_bg = 'from-gray-50 to-gray-100 border-gray-400',
  description_short = 'Certification avancée pour les instructeurs principaux. Permet de former les formateurs FDFP.',
  description_long = 'Le plus haut niveau de certification. Les Instructeurs forment les Formateurs et supervisent la qualité des formations.'
WHERE internal_key = 'instructor' 
  AND workshop_family_id IN (SELECT id FROM workshop_families WHERE code = 'FDFP');

-- Populate badge data for HD role levels
-- Level 1: Public/Animateur (green theme)
UPDATE role_levels 
SET 
  badge_emoji = '🎯',
  badge_color_primary = '#16a34a',
  badge_color_bg = 'from-green-50 to-green-100 border-green-400',
  description_short = 'Obtenue en complétant la formation HD initiale. Permet d''animer des ateliers grand public.',
  description_long = 'Certification de base pour animer des ateliers HD auprès du grand public. Obtenue après avoir suivi et validé la formation initiale.'
WHERE internal_key = 'public' 
  AND workshop_family_id IN (SELECT id FROM workshop_families WHERE code = 'HD');

-- Level 2: Pro/Animateur Pro (blue theme)
UPDATE role_levels 
SET 
  badge_emoji = '⭐',
  badge_color_primary = '#2563eb',
  badge_color_bg = 'from-blue-50 to-blue-100 border-blue-400',
  description_short = 'Obtenue après avoir complété Formation Pro 2. Nécessite 3 ateliers animés (présentiel + distanciel) et 6 retours positifs.',
  description_long = 'Certification avancée démontrant une expérience significative en animation. Requiert la validation de Formation Pro 2 ainsi qu''un historique d''animations réussies.'
WHERE internal_key = 'pro' 
  AND workshop_family_id IN (SELECT id FROM workshop_families WHERE code = 'HD');

-- Level 3: Trainer/Formateur (amber theme)
UPDATE role_levels 
SET 
  badge_emoji = '🏆',
  badge_color_primary = '#d97706',
  badge_color_bg = 'from-amber-50 to-amber-100 border-amber-400',
  description_short = 'Obtenue en complétant Formation Formateur. Permet de former les futurs animateurs HD.',
  description_long = 'Certification d''expert permettant de former de nouveaux animateurs. Requiert une expérience significative en tant qu''Animateur Pro et la validation de la Formation Formateur.'
WHERE internal_key = 'trainer' 
  AND workshop_family_id IN (SELECT id FROM workshop_families WHERE code = 'HD');

-- Level 4: Instructor/Instructeur (gray theme)
UPDATE role_levels 
SET 
  badge_emoji = '🎖️',
  badge_color_primary = '#4b5563',
  badge_color_bg = 'from-gray-50 to-gray-100 border-gray-400',
  description_short = 'Certification avancée pour les instructeurs principaux. Permet de former les formateurs HD.',
  description_long = 'Le plus haut niveau de certification. Les Instructeurs forment les Formateurs et supervisent la qualité des formations.'
WHERE internal_key = 'instructor' 
  AND workshop_family_id IN (SELECT id FROM workshop_families WHERE code = 'HD');
