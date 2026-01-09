/*
  # Add 'workshop' Type to Workshops Table

  1. Changes
    - Add 'workshop' as a new allowed value to the workshops.type CHECK constraint
    - This allows non-training workshop sessions to be properly categorized

  2. Notes
    - Existing formation types remain valid: formation, formation_pro_1, formation_pro_2, formation_formateur, formation_retex
    - The 'workshop' type represents all standard workshop sessions (non-training)
*/

-- Drop the existing CHECK constraint on type
ALTER TABLE workshops DROP CONSTRAINT IF EXISTS workshops_type_check;

-- Add new CHECK constraint with 'workshop' included
ALTER TABLE workshops ADD CONSTRAINT workshops_type_check 
  CHECK (type IN ('workshop', 'formation', 'formation_pro_1', 'formation_pro_2', 'formation_formateur', 'formation_retex'));