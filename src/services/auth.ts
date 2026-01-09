import { supabase } from '@/lib/supabase';
import { USER_COLUMNS_COMPACT } from '@/lib/user-columns';
import type { User } from '@/lib/database.types';

export interface EmailCheckResult {
  exists: boolean;
  authenticated: boolean;
  user: User | null;
}

/**
 * Check if an email exists in public.users table
 */
export async function checkEmail(email: string): Promise<EmailCheckResult> {
  const normalizedEmail = email.trim().toLowerCase();

  // Use direct REST API call with anon key
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  
  const response = await fetch(
    `${supabaseUrl}/rest/v1/users?email=eq.${encodeURIComponent(normalizedEmail)}&select=id,auth_user_id,email,first_name,last_name,phone,birthdate,is_super_admin,consent_transactional,consent_marketing`,
    {
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error('Failed to check email');
  }

  const data = await response.json();
  
  if (!data || data.length === 0) {
    return { exists: false, authenticated: false, user: null };
  }

  const user = data[0] as User;
  return {
    exists: true,
    authenticated: !!user.auth_user_id,
    user,
  };
}

/**
 * Create password for existing user
 */
export async function createPassword(userId: string, password: string): Promise<User> {
  // Get user data
  const { data: userData, error: userError } = await supabase
    .from('users')
    .select(USER_COLUMNS_COMPACT)
    .eq('id', userId)
    .maybeSingle();

  if (userError || !userData) {
    throw new Error('User not found');
  }

  const existingUser = userData as User;

  if (existingUser.auth_user_id) {
    throw new Error('Account already exists');
  }

  // Create auth account
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email: existingUser.email,
    password,
  });

  if (authError || !authData.user) {
    throw new Error('Failed to create authentication');
  }

  // Link auth account to user
  const { data, error } = await (supabase.from('users') as any)
    .update({ auth_user_id: authData.user.id })
    .eq('id', userId)
    .select()
    .maybeSingle();

  if (error || !data) {
    throw new Error('Failed to link authentication');
  }

  return data as User;
}

/**
 * Sign in user and return their profile
 */
export async function signIn(email: string, password: string): Promise<User | null> {
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: email.trim().toLowerCase(),
    password,
  });

  if (authError || !authData.user) {
    console.error('Sign in error:', authError);
    return null;
  }

  const { data: user } = await supabase
    .from('users')
    .select(USER_COLUMNS_COMPACT)
    .eq('auth_user_id', authData.user.id)
    .maybeSingle();

  return user as User | null;
}

/**
 * Sign out user
 */
export async function signOut(): Promise<void> {
  await supabase.auth.signOut();
}

/**
 * Get user by auth ID - simple query without any timeouts or wrappers
 */
export async function getUserByAuthId(authUserId: string): Promise<User | null> {
  const { data } = await supabase
    .from('users')
    .select(USER_COLUMNS_COMPACT)
    .eq('auth_user_id', authUserId)
    .maybeSingle();

  return data as User | null;
}
