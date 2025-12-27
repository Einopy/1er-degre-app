import { createContext, useContext, useState, useEffect } from 'react';
import type { User } from '@/lib/database.types';
import { getUserFromSession, signOut as authSignOut } from '@/services/auth';
import { getUserPermissions, type UserPermissions } from '@/services/user-permissions';
import { supabase } from '@/lib/supabase';

interface AuthContextType {
  profile: User | null;
  permissions: UserPermissions | null;
  loading: boolean;
  permissionsLoading: boolean;
  signIn: (user: User) => void;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  refreshPermissions: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<User | null>(null);
  const [permissions, setPermissions] = useState<UserPermissions | null>(null);
  const [loading, setLoading] = useState(true);
  const [permissionsLoading, setPermissionsLoading] = useState(false);

  useEffect(() => {
    loadUserFromSession();

    // Listen for auth state changes from Supabase Auth
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state changed:', event, session?.user?.email);

      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        await loadUserFromSession();
      } else if (event === 'SIGNED_OUT') {
        setProfile(null);
        setPermissions(null);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (profile?.id) {
      loadPermissions(profile.id);
    } else {
      setPermissions(null);
    }
  }, [profile?.id]);

  const loadUserFromSession = async () => {
    try {
      setLoading(true);
      const user = await getUserFromSession();
      setProfile(user);
    } catch (error) {
      console.error('Error loading user from session:', error);
      setProfile(null);
    } finally {
      setLoading(false);
    }
  };

  const loadPermissions = async (userId: string) => {
    try {
      setPermissionsLoading(true);
      const perms = await getUserPermissions(userId);
      setPermissions(perms);
    } catch (error) {
      console.error('Error loading user permissions:', error);
      setPermissions(null);
    } finally {
      setPermissionsLoading(false);
    }
  };

  const signIn = (user: User) => {
    // Auth is handled by Supabase Auth, just update local state
    setProfile(user);
  };

  const signOut = async () => {
    await authSignOut();
    setProfile(null);
    setPermissions(null);
  };

  const refreshProfile = async () => {
    await loadUserFromSession();
  };

  const refreshPermissions = async () => {
    if (profile?.id) {
      await loadPermissions(profile.id);
    }
  };

  const value = {
    profile,
    permissions,
    loading,
    permissionsLoading,
    signIn,
    signOut,
    refreshProfile,
    refreshPermissions,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
