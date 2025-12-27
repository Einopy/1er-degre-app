#!/bin/bash

# Script to delete edge functions directories

echo "Deleting edge functions..."

rm -rf supabase/functions/migrate-user-auth
rm -rf supabase/functions/check-email-status

echo "Edge function directories deleted successfully!"
echo ""
echo "Note: This only deletes local files."
echo "The deployed functions on Supabase remain active."
echo "To remove deployed functions, you need to:"
echo "1. Use Supabase CLI: supabase functions delete <function-name>"
echo "2. Or contact Supabase support to delete them"
