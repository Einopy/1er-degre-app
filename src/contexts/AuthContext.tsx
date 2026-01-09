import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { User } from '@/lib/database.types';
import { signOut as authSignOut } from '@/services/auth';
import { getUserPermissions, type UserPermissions } from '@/services/user-permissions';
import { supabase } from '@/lib/supabase';
import { USER_COLUMNS_COMPACT } from '@/lib/user-columns';

// ============================================================================
// GLOBAL STATE - Persists across component remounts
// ============================================================================
let cachedProfile: User | null = null;
let cachedPermissions: UserPermissions | null = null;
let isInitialized = false;
let initPromise: Promise<void> | null = null;

/**
 * Initialize auth state from Supabase session - called once on app start
 */
async function initializeAuth(): Promise<{ profile: User | null; permissions: UserPermissions | null }> {
  if (isInitialized) {
    return { profile: cachedProfile, permissions: cachedPermissions };
  }

  // Get current session
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session?.user) {
    isInitialized = true;
    return { profile: null, permissions: null };
  }

  // Get user profile from public.users table
  const { data: userData } = await supabase
    .from('users')
    .select(USER_COLUMNS_COMPACT)
    .eq('auth_user_id', session.user.id)
    .maybeSingle();

  cachedProfile = userData as User | null;
  
  // Load permissions if we have a profile
  if (cachedProfile?.id) {
    cachedPermissions = await getUserPermissions(cachedProfile.id);
  }

  isInitialized = true;
  return { profile: cachedProfile, permissions: cachedPermissions };
}

// ============================================================================
// CONTEXT
// ============================================================================
interface AuthContextType {
  profile: User | null;
  permissions: UserPermissions | null;
  loading: boolean;
  permissionsLoading: boolean;
  prepareForLogin: () => void;
  signIn: (user: User) => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  refreshPermissions: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  // Initialize state from cache (instant if already loaded)
  const [profile, setProfile] = useState<User | null>(cachedProfile);
  const [permissions, setPermissions] = useState<UserPermissions | null>(cachedPermissions);
  const [loading, setLoading] = useState(!isInitialized);
  const [permissionsLoading, setPermissionsLoading] = useState(false);

  // Initialize auth on mount
  useEffect(() => {
    // If already initialized, sync state from cache
    if (isInitialized) {
      setProfile(cachedProfile);
      setPermissions(cachedPermissions);
      setLoading(false);
      return;
    }

    // Start initialization (only once)
    if (!initPromise) {
      initPromise = initializeAuth().then(({ profile, permissions }) => {
        cachedProfile = profile;
        cachedPermissions = permissions;
        setProfile(profile);
        setPermissions(permissions);
        setLoading(false);
      }).catch(err => {
        console.error('Auth initialization failed:', err);
        setLoading(false);
      });
    } else {
      // Wait for existing initialization
      initPromise.then(() => {
        setProfile(cachedProfile);
        setPermissions(cachedPermissions);
        setLoading(false);
      });
    }
  }, []);

  // Listen for auth state changes (sign out, token refresh, etc.)
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth event:', event);
      
      if (event === 'SIGNED_OUT') {
        cachedProfile = null;
        cachedPermissions = null;
        setProfile(null);
        setPermissions(null);
      } else if (event === 'TOKEN_REFRESHED' && session?.user && !cachedProfile) {
        // If we don't have a profile but got a token refresh, try to load it
        const { data: userData } = await supabase
          .from('users')
          .select(USER_COLUMNS_COMPACT)
          .eq('auth_user_id', session.user.id)
          .maybeSingle();
        
        if (userData) {
          cachedProfile = userData as User;
          setProfile(cachedProfile);
          
          if (cachedProfile.id) {
            cachedPermissions = await getUserPermissions(cachedProfile.id);
            setPermissions(cachedPermissions);
          }
        }
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const prepareForLogin = useCallback(() => {
    // No-op - we don't need this flag anymore with the new approach
  }, []);

  const signIn = useCallback(async (user: User): Promise<void> => {
    cachedProfile = user;
    setProfile(user);
    setLoading(false);
    isInitialized = true;
    
    // Load permissions
    setPermissionsLoading(true);
    try {
      cachedPermissions = await getUserPermissions(user.id);
      setPermissions(cachedPermissions);
    } finally {
      setPermissionsLoading(false);
    }
  }, []);

  const signOut = useCallback(async () => {
    await authSignOut();
    cachedProfile = null;
    cachedPermissions = null;
    isInitialized = false;
    initPromise = null;
    setProfile(null);
    setPermissions(null);
  }, []);

  const refreshProfile = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return;

    const { data: userData } = await supabase
      .from('users')
      .select(USER_COLUMNS_COMPACT)
      .eq('auth_user_id', session.user.id)
      .maybeSingle();

    if (userData) {
      cachedProfile = userData as User;
      setProfile(cachedProfile);
    }
  }, []);

  const refreshPermissions = useCallback(async () => {
    if (!profile?.id) return;
    
    setPermissionsLoading(true);
    try {
      cachedPermissions = await getUserPermissions(profile.id);
      setPermissions(cachedPermissions);
    } finally {
      setPermissionsLoading(false);
    }
  }, [profile?.id]);

  return (
    <AuthContext.Provider value={{
      profile,
      permissions,
      loading,
      permissionsLoading,
      prepareForLogin,
      signIn,
      signOut,
      refreshProfile,
      refreshPermissions,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
