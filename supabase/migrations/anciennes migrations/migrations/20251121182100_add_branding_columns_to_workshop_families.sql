/*
  # Add Branding and Theme Columns to Workshop Families

  1. Changes to `workshop_families` table
    - Add `primary_color` (text) - Main brand color for UI elements (hex format)
    - Add `secondary_color` (text) - Background/secondary color for UI (hex format)
    - Add `badge_emoji` (text) - Emoji representation for badges and buttons
    - Add `description_short` (text) - Short tagline for the family
    - Add `description_long` (text) - Full description for formation pages

  2. Data Population
    - Set colors for existing FDFP family (green theme)
    - Set colors for existing HD family (blue/purple theme)

  3. Purpose
    - Enable dynamic UI theming per workshop family
    - Remove hardcoded color logic from frontend
    - Support multi-tenant branding requirements
*/

-- Add branding columns to workshop_families
DO $$
BEGIN
  -- Add primary_color column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'workshop_families' AND column_name = 'primary_color'
  ) THEN
    ALTER TABLE workshop_families ADD COLUMN primary_color text;
  END IF;

  -- Add secondary_color column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'workshop_families' AND column_name = 'secondary_color'
  ) THEN
    ALTER TABLE workshop_families ADD COLUMN secondary_color text;
  END IF;

  -- Add badge_emoji column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'workshop_families' AND column_name = 'badge_emoji'
  ) THEN
    ALTER TABLE workshop_families ADD COLUMN badge_emoji text;
  END IF;

  -- Add description_short column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'workshop_families' AND column_name = 'description_short'
  ) THEN
    ALTER TABLE workshop_families ADD COLUMN description_short text;
  END IF;

  -- Add description_long column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'workshop_families' AND column_name = 'description_long'
  ) THEN
    ALTER TABLE workshop_families ADD COLUMN description_long text;
  END IF;
END $$;

-- Populate branding data for FDFP (green theme)
UPDATE workshop_families 
SET 
  primary_color = '#008E45',
  secondary_color = '#E6F4ED',
  badge_emoji = '🌱',
  description_short = 'Fresque du Facteur Humain de la Production',
  description_long = 'Découvrez et comprenez les enjeux du facteur humain dans la production industrielle'
WHERE code = 'FDFP';

-- Populate branding data for HD (blue/purple theme)
UPDATE workshop_families 
SET 
  primary_color = '#2D2B6B',
  secondary_color = '#E8E7F0',
  badge_emoji = '🌊',
  description_short = 'Halle au Développement',
  description_long = 'Explorez les pratiques de développement durable et responsable'
WHERE code = 'HD';
