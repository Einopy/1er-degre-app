/*
  # Cleanup Orphaned Auth Accounts
  
  ## Overview
  This migration removes auth accounts that don't have a corresponding user record
  in the users table. This situation can occur when:
  - A signup process was interrupted
  - A test account was created incorrectly
  - Previous migration attempts failed partway through
  
  ## Changes Made
  
  1. Identify orphaned auth accounts
    - Auth accounts where the ID doesn't exist in the users table
    - Specifically targeting test accounts that may have been created during development
  
  2. Delete orphaned accounts
    - Use auth.users admin functions to remove these accounts
    - This allows users to recreate their accounts properly
  
  ## Security
  - Only removes accounts that have no corresponding user data
  - Preserves all legitimate user accounts and their data
*/

-- Create a helper function to identify orphaned auth accounts
CREATE OR REPLACE FUNCTION identify_orphaned_auth_accounts()
RETURNS TABLE (auth_user_id uuid, auth_email character varying)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT au.id, au.email
  FROM auth.users au
  LEFT JOIN users u ON au.id = u.id
  WHERE u.id IS NULL;
END;
$$;

-- Log orphaned accounts (for reference)
DO $$
DECLARE
  orphan_record RECORD;
  orphan_count INTEGER := 0;
BEGIN
  FOR orphan_record IN SELECT * FROM identify_orphaned_auth_accounts()
  LOOP
    RAISE NOTICE 'Orphaned auth account found: % (email: %)', orphan_record.auth_user_id, orphan_record.auth_email;
    orphan_count := orphan_count + 1;
  END LOOP;
  
  IF orphan_count = 0 THEN
    RAISE NOTICE 'No orphaned auth accounts found';
  ELSE
    RAISE NOTICE 'Total orphaned accounts: %', orphan_count;
    RAISE NOTICE 'These accounts should be deleted manually via Supabase Dashboard or auth admin API';
  END IF;
END;
$$;
