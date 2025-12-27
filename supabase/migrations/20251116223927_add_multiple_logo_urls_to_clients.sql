/*
  # Add Multiple Logo and Favicon URLs to Clients

  ## Overview
  Extends the clients table to support multiple branded assets:
  - Primary logo: displayed prominently on public pages (e.g., workshops list)
  - Secondary logo: displayed in the sidebar navigation
  - Favicon: displayed in browser tabs

  ## Changes

  1. New Columns Added to `clients` table:
    - `primary_logo_url` (text, nullable) - Main logo displayed on public pages
    - `secondary_logo_url` (text, nullable) - Compact logo for sidebar/navigation
    - `favicon_url` (text, nullable) - Browser favicon (supports .ico, .png)

  2. Data Migration:
    - Copy existing `logo_url` values to `secondary_logo_url` for backward compatibility
    - Keep `logo_url` column for gradual migration (will be deprecated later)

  ## Important Notes
  - All new columns are nullable to allow gradual adoption
  - Existing `logo_url` column is preserved for backward compatibility
  - Super Admins can upload these assets via the storage bucket 'client-logos'
  - Supported formats: JPG, PNG, WebP, SVG (for logos), ICO/PNG (for favicons)
*/

-- ============================================================================
-- PART 1: Add new logo columns to clients table
-- ============================================================================

-- Add primary_logo_url column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'clients' AND column_name = 'primary_logo_url'
  ) THEN
    ALTER TABLE clients ADD COLUMN primary_logo_url text;
    RAISE NOTICE 'Added primary_logo_url column to clients table';
  END IF;
END $$;

-- Add secondary_logo_url column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'clients' AND column_name = 'secondary_logo_url'
  ) THEN
    ALTER TABLE clients ADD COLUMN secondary_logo_url text;
    RAISE NOTICE 'Added secondary_logo_url column to clients table';
  END IF;
END $$;

-- Add favicon_url column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'clients' AND column_name = 'favicon_url'
  ) THEN
    ALTER TABLE clients ADD COLUMN favicon_url text;
    RAISE NOTICE 'Added favicon_url column to clients table';
  END IF;
END $$;

-- ============================================================================
-- PART 2: Migrate existing logo_url data to secondary_logo_url
-- ============================================================================

-- Copy existing logo_url values to secondary_logo_url for backward compatibility
UPDATE clients
SET secondary_logo_url = logo_url
WHERE logo_url IS NOT NULL AND secondary_logo_url IS NULL;

-- ============================================================================
-- PART 3: Create indexes for performance
-- ============================================================================

-- No indexes needed as these are simple nullable text columns used for display only

-- ============================================================================
-- PART 4: Log migration completion
-- ============================================================================

DO $$
DECLARE
  clients_with_primary INTEGER;
  clients_with_secondary INTEGER;
  clients_with_favicon INTEGER;
BEGIN
  SELECT COUNT(*) INTO clients_with_primary FROM clients WHERE primary_logo_url IS NOT NULL;
  SELECT COUNT(*) INTO clients_with_secondary FROM clients WHERE secondary_logo_url IS NOT NULL;
  SELECT COUNT(*) INTO clients_with_favicon FROM clients WHERE favicon_url IS NOT NULL;

  RAISE NOTICE '================================================';
  RAISE NOTICE 'Multi-logo system added to clients table';
  RAISE NOTICE '================================================';
  RAISE NOTICE 'New columns added:';
  RAISE NOTICE '  - primary_logo_url (main brand logo)';
  RAISE NOTICE '  - secondary_logo_url (sidebar logo)';
  RAISE NOTICE '  - favicon_url (browser favicon)';
  RAISE NOTICE '';
  RAISE NOTICE 'Current state:';
  RAISE NOTICE '  - Clients with primary logo: %', clients_with_primary;
  RAISE NOTICE '  - Clients with secondary logo: %', clients_with_secondary;
  RAISE NOTICE '  - Clients with favicon: %', clients_with_favicon;
  RAISE NOTICE '';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '1. Update TypeScript types for Client interface';
  RAISE NOTICE '2. Add upload functions in client-utils.ts';
  RAISE NOTICE '3. Update Super Admin Console UI';
  RAISE NOTICE '4. Update frontend components to use new logo fields';
END $$;