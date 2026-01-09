/*
  # Add 'formation' to classification_status CHECK constraint

  1. Changes
    - Drop existing CHECK constraint on workshops.classification_status
    - Add new CHECK constraint that includes 'formation' as a valid value
    - This allows training workshops to use 'formation' as their classification

  2. Notes
    - Formation types (formation, formation_pro_1, formation_pro_2, etc.) use 'formation' as classification
    - Regular workshops continue to use the audience-based classifications
    - This is a non-breaking change that extends the allowed values
*/

-- Drop the existing CHECK constraint on classification_status
ALTER TABLE workshops DROP CONSTRAINT IF EXISTS workshops_classification_status_check;

-- Add new CHECK constraint with 'formation' included
ALTER TABLE workshops ADD CONSTRAINT workshops_classification_status_check 
  CHECK (classification_status IN (
    'formation',
    'benevole_grand_public', 
    'interne_asso', 
    'interne_entreprise', 
    'interne_profs',
    'interne_etudiants_alumnis', 
    'interne_elus', 
    'interne_agents', 
    'externe_asso',
    'externe_entreprise', 
    'externe_profs', 
    'externe_etudiants_alumnis', 
    'externe_elus', 
    'externe_agents'
  ));
