/*
  # Add Consent Management and Enhanced Refund Logic

  1. Schema Changes
    - Add consent tracking fields to users table:
      - `consent_transactional` (boolean, required, default true) - Required consent for transactional emails
      - `consent_marketing` (boolean, optional, default false) - Optional consent for marketing emails
      - `consent_updated_at` (timestamptz) - Timestamp when consent preferences were last updated
    
  2. Enhancements
    - Create function to compute can_refund based on:
      - 72-hour rule (now <= start_at - 72 hours)
      - Workshop date modified after participation purchase
      - Workshop location modified after participation purchase
    
  3. Indexes
    - Add index on participations.user_id for faster user queries
    - Add index on participations.workshop_id for workshop-related queries
    - Add index on workshops.start_at for time-based queries
  
  4. Notes
    - Transactional consent is always true and cannot be disabled
    - Marketing consent is optional and can be toggled by users
    - can_refund computation considers both time window and modification flags
*/

-- Add consent fields to users table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'consent_transactional'
  ) THEN
    ALTER TABLE users ADD COLUMN consent_transactional boolean DEFAULT true NOT NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'consent_marketing'
  ) THEN
    ALTER TABLE users ADD COLUMN consent_marketing boolean DEFAULT false NOT NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'consent_updated_at'
  ) THEN
    ALTER TABLE users ADD COLUMN consent_updated_at timestamptz DEFAULT now();
  END IF;
END $$;

-- Create function to compute can_refund for a participation
CREATE OR REPLACE FUNCTION can_refund_participation(
  p_participation_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_workshop_start timestamptz;
  v_workshop_lifecycle_status text;
  v_participation_created_at timestamptz;
  v_participation_status text;
  v_modified_date_flag boolean;
  v_modified_location_flag boolean;
  v_hours_until_workshop numeric;
BEGIN
  -- Get participation and workshop data
  SELECT 
    w.start_at,
    w.lifecycle_status,
    w.modified_date_flag,
    w.modified_location_flag,
    p.created_at,
    p.status
  INTO 
    v_workshop_start,
    v_workshop_lifecycle_status,
    v_modified_date_flag,
    v_modified_location_flag,
    v_participation_created_at,
    v_participation_status
  FROM participations p
  JOIN workshops w ON p.workshop_id = w.id
  WHERE p.id = p_participation_id;

  -- Cannot refund if already cancelled or refunded
  IF v_participation_status IN ('annule', 'rembourse') THEN
    RETURN false;
  END IF;

  -- Can refund if workshop is cancelled
  IF v_workshop_lifecycle_status = 'canceled' THEN
    RETURN true;
  END IF;

  -- Can refund if date or location was modified after purchase
  IF v_modified_date_flag OR v_modified_location_flag THEN
    RETURN true;
  END IF;

  -- Calculate hours until workshop
  v_hours_until_workshop := EXTRACT(EPOCH FROM (v_workshop_start - now())) / 3600;

  -- Can refund if 72+ hours before workshop start
  IF v_hours_until_workshop >= 72 THEN
    RETURN true;
  END IF;

  -- Otherwise cannot refund
  RETURN false;
END;
$$;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_participations_user_id ON participations(user_id);
CREATE INDEX IF NOT EXISTS idx_participations_workshop_id ON participations(workshop_id);
CREATE INDEX IF NOT EXISTS idx_workshops_start_at ON workshops(start_at);
CREATE INDEX IF NOT EXISTS idx_participations_status ON participations(status);
CREATE INDEX IF NOT EXISTS idx_workshops_lifecycle_status ON workshops(lifecycle_status);

-- Update trigger to automatically update consent_updated_at
CREATE OR REPLACE FUNCTION update_consent_timestamp()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF (NEW.consent_transactional IS DISTINCT FROM OLD.consent_transactional) OR
     (NEW.consent_marketing IS DISTINCT FROM OLD.consent_marketing) THEN
    NEW.consent_updated_at = now();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_update_consent_timestamp ON users;
CREATE TRIGGER trigger_update_consent_timestamp
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_consent_timestamp();