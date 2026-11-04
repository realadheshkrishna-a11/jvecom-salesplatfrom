import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from './supabase';
import type { Profile, Organization } from '@/types';
import { UserRole } from '@/types';

interface AuthState {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  organization: Organization | null;
  loading: boolean;
  initialized: boolean;
}

interface AuthContextType extends AuthState {
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: Error | null }>;
  updatePassword: (password: string) => Promise<{ error: Error | null }>;
  refreshProfile: () => Promise<void>;
  isAdmin: boolean;
  isManager: boolean;
  isSalesRep: boolean;
  isSuperAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    session: null,
    user: null,
    profile: null,
    organization: null,
    loading: true,
    initialized: false,
  });

  const fetchProfile = useCallback(async (userId: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*, organization:organizations(*)')
      .eq('id', userId)
      .single();

    if (error) return null;
    return data;
  }, []);

  const applySession = useCallback(async (session: Session | null) => {
    if (!session?.user) {
      setState({
        session: null,
        user: null,
        profile: null,
        organization: null,
        loading: false,
        initialized: true,
      });
      return;
    }

    const profileData = await fetchProfile(session.user.id);
    setState({
      session,
      user: session.user,
      profile: profileData as unknown as Profile | null,
      organization: profileData
        ? (profileData as unknown as { organization: Organization }).organization || null
        : null,
      loading: false,
      initialized: true,
    });
  }, [fetchProfile]);

  const refreshProfile = useCallback(async () => {
    if (!state.user) return;
    const profileData = await fetchProfile(state.user.id);
    if (profileData) {
      setState(prev => ({
        ...prev,
        profile: profileData as unknown as Profile,
        organization: (profileData as unknown as { organization: Organization }).organization || null,
      }));
    }
  }, [state.user, fetchProfile]);

  useEffect(() => {
    supabase.auth.getSession()
      .then(({ data: { session } }) => applySession(session))
      .catch(() => applySession(null));

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        void applySession(session);
      }
    );

    return () => subscription.unsubscribe();
  }, [applySession]);

  const signIn = async (email: string, password: string) => {
    setState(prev => ({ ...prev, loading: true }));
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setState(prev => ({ ...prev, loading: false }));
        return { error };
      }
      if (!data.session) {
        setState(prev => ({ ...prev, loading: false }));
        return { error: new Error('Authentication did not return a session') };
      }
      await applySession(data.session);
      return { error: null };
    } catch (error) {
      setState(prev => ({ ...prev, loading: false }));
      return { error: error instanceof Error ? error : new Error('Unable to sign in') };
    }
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    await applySession(null);
  };

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    return { error };
  };

  const updatePassword = async (password: string) => {
    const { error } = await supabase.auth.updateUser({ password });
    return { error };
  };

  const role = state.profile?.role;
  const isAdmin = !state.profile || role === UserRole.ORG_ADMIN || role === UserRole.SUPER_ADMIN;
  const isManager = role === UserRole.MANAGER;
  const isSalesRep = role === UserRole.SALES_REP;
  const isSuperAdmin = role === UserRole.SUPER_ADMIN;

  return (
    <AuthContext.Provider
      value={{
        ...state,
        signIn,
        signOut,
        resetPassword,
        updatePassword,
        refreshProfile,
        isAdmin,
        isManager,
        isSalesRep,
        isSuperAdmin,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}
