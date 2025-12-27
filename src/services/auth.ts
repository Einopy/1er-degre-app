import { supabase } from '@/lib/supabase';
import type { User } from '@/lib/database.types';

export interface EmailCheckResult {
  exists: boolean;
  authenticated: boolean;
  user: User | null;
}

export async function checkEmail(email: string): Promise<EmailCheckResult> {
  try {
    const normalizedEmail = email.trim().toLowerCase();

    // Check if user exists in our custom users table
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', normalizedEmail)
      .maybeSingle();

    if (error) {
      console.error('Error checking email:', error);
      throw new Error('Failed to check email');
    }

    if (!data) {
      return {
        exists: false,
        authenticated: false,
        user: null,
      };
    }

    const user = data as User;

    // Check if user has auth_user_id (linked to Supabase Auth)
    const authenticated = !!user.auth_user_id;

    return {
      exists: true,
      authenticated,
      user: user,
    };
  } catch (error) {
    console.error('Error in checkEmail:', error);
    throw error;
  }
}

export async function createPassword(userId: string, password: string): Promise<User> {
  try {
    // Get the user's email
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('email')
      .eq('id', userId)
      .maybeSingle();

    if (userError || !userData) {
      console.error('Error fetching user:', userError);
      throw new Error('User not found');
    }

    const userEmail = (userData as { email: string }).email;

    // Create auth user in Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: userEmail,
      password: password,
      options: {
        emailRedirectTo: undefined, // Disable email confirmation
        data: {
          user_id: userId, // Store our custom user ID in metadata
        },
      },
    });

    if (authError) {
      console.error('Error creating auth user:', authError);
      throw new Error('Failed to create authentication');
    }

    if (!authData.user) {
      throw new Error('Failed to create auth user');
    }

    // Update our users table with auth_user_id
    const { data, error } = await (supabase
      .from('users') as any)
      .update({
        auth_user_id: authData.user.id,
        authenticated: true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId)
      .select()
      .maybeSingle();

    if (error) {
      console.error('Error updating user with auth_user_id:', error);
      throw new Error('Failed to link authentication');
    }

    if (!data) {
      throw new Error('User not found after update');
    }

    return data as User;
  } catch (error) {
    console.error('Error in createPassword:', error);
    throw error;
  }
}

export async function signIn(email: string, password: string): Promise<User | null> {
  try {
    const normalizedEmail = email.trim().toLowerCase();

    // Sign in with Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password: password,
    });

    if (authError || !authData.user) {
      console.error('Error signing in:', authError);
      return null;
    }

    // Get our custom user data using auth_user_id
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('auth_user_id', authData.user.id)
      .maybeSingle();

    if (userError || !user) {
      console.error('Error fetching user data:', userError);
      return null;
    }

    return user as User;
  } catch (error) {
    console.error('Error in signIn:', error);
    throw error;
  }
}

export async function signOut(): Promise<void> {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Error signing out:', error);
      throw error;
    }
  } catch (error) {
    console.error('Error in signOut:', error);
    throw error;
  }
}

export async function getUserFromSession(): Promise<User | null> {
  try {
    // Get current Supabase Auth session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();

    if (sessionError || !session?.user) {
      return null;
    }

    // Get our custom user data using auth_user_id
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('auth_user_id', session.user.id)
      .maybeSingle();

    if (error || !data) {
      console.error('Error fetching user from session:', error);
      return null;
    }

    return data as User;
  } catch (error) {
    console.error('Error in getUserFromSession:', error);
    return null;
  }
}

export async function getCurrentAuthUser() {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error) {
    console.error('Error getting current auth user:', error);
    return null;
  }
  return user;
}
