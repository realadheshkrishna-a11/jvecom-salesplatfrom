import { createContext, useContext, useEffect, useState, useCallback, useMemo, type ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from './supabase';
import type { Profile, Organization } from '@/types';
import { UserRole, EmployeeStatus, OrgStatus } from '@/types';
import { localDb, purgeLegacyFakeData, isFakeProfile } from './localDb';
import { isLocalAuthEnabled, verifyLocalCredential } from './localCredentials';
import { getAllowedModules, canAccessPath as canAccessPathFor, type ModuleId } from './permissions';

// =============================================================================
// Demo personas (development / local mode only — disabled in production builds)
// =============================================================================

export interface DemoAccount {
  id: string;
  email: string;
  /** Demo-only password; demo sign-in is disabled unless isLocalAuthEnabled() */
  password: string;
  name: string;
  role: UserRole;
  badge: string;
  description: string;
  profile: Profile;
}

export const DEFAULT_ORG_ID = '11111111-1111-1111-1111-111111111111';

export const DEFAULT_ORGANIZATION: Organization = {
  id: DEFAULT_ORG_ID,
  name: 'JVECOM B2B Sales & Distribution',
  logo_url: null,
  email: 'contact@jvecom.in',
  phone: '+91 80000 12345',
  industry: 'Wholesale & Enterprise Supply',
  country: 'India',
  currency: 'INR',
  timezone: 'Asia/Kolkata',
  address: 'Commercial Tower, Sector 62, Noida, UP',
  website: 'https://jvecom.in',
  status: OrgStatus.ACTIVE,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

export const DEMO_ACCOUNTS: DemoAccount[] = [];

// Purge any legacy demo accounts and mock entities from browser storage
if (typeof localStorage !== 'undefined') {
  purgeLegacyFakeData();
}

// =============================================================================
// Helpers
// =============================================================================

const LOCAL_SESSION_KEY = 'salesos_auth_session';

interface StoredLocalSession {
  kind: 'demo' | 'local';
  profile_id: string;
}

function createLocalUser(profile: Profile): User {
  const now = new Date().toISOString();
  return {
    id: profile.id,
    app_metadata: { provider: 'local', providers: ['local'] },
    user_metadata: { first_name: profile.first_name, last_name: profile.last_name, role: profile.role },
    aud: 'authenticated',
    email: profile.email,
    phone: profile.phone || '',
    created_at: profile.created_at,
    confirmed_at: now,
    email_confirmed_at: now,
    last_sign_in_at: now,
    role: 'authenticated',
    updated_at: now,
    identities: [],
    factors: [],
  } as unknown as User;
}

function ensureDemoDataInLocalDb(profile: Profile) {
  try {
    const raw = localStorage.getItem('salesos_profiles');
    const profiles: Profile[] = raw ? JSON.parse(raw) : [];
    if (!profiles.some(p => p.id === profile.id)) {
      profiles.unshift(profile);
      localStorage.setItem('salesos_profiles', JSON.stringify(profiles));
    }
    const orgRaw = localStorage.getItem('salesos_organizations');
    const orgs: Organization[] = orgRaw ? JSON.parse(orgRaw) : [];
    if (!orgs.some(o => o.id === DEFAULT_ORG_ID)) {
      orgs.unshift(DEFAULT_ORGANIZATION);
      localStorage.setItem('salesos_organizations', JSON.stringify(orgs));
    }
  } catch { /* storage unavailable */ }
}

function findLocalProfile(profileId: string): Profile | null {
  try {
    return localDb.getById<Profile>('profiles', profileId) ?? null;
  } catch {
    return null;
  }
}

function isBlockedStatus(status: string | undefined | null): boolean {
  return status === EmployeeStatus.INACTIVE || status === EmployeeStatus.SUSPENDED;
}

const BLOCKED_MESSAGE = 'Your account has been deactivated. Please contact your organization administrator.';
const NO_PROFILE_MESSAGE = 'No employee profile is linked to this account. Please contact your organization administrator.';
const INVALID_MESSAGE = 'Invalid email or password.';

/** Load the employee profile for a Supabase auth user (by id, falling back to email). */
async function fetchSupabaseProfile(user: User): Promise<(Profile & { organization?: Organization }) | null> {
  const normEmail = (user.email || '').trim().toLowerCase();

  // 1. Try finding by ID with join
  try {
    const byId = await supabase
      .from('profiles')
      .select('*, organization:organizations(*)')
      .eq('id', user.id)
      .maybeSingle();
    if (byId.data) return byId.data as unknown as Profile & { organization?: Organization };
  } catch (err) {
    console.warn('[SalesOS Auth] Profile lookup by ID with join failed:', err);
  }

  // 2. Try finding by ID simple (in case organization join or RLS failed)
  try {
    const byIdSimple = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();
    if (byIdSimple.data) {
      return {
        ...(byIdSimple.data as unknown as Profile),
        organization: DEFAULT_ORGANIZATION,
      };
    }
  } catch (err) {
    console.warn('[SalesOS Auth] Simple profile lookup by ID failed:', err);
  }

  // 3. Try finding by email with join
  if (normEmail) {
    try {
      const byEmail = await supabase
        .from('profiles')
        .select('*, organization:organizations(*)')
        .ilike('email', normEmail)
        .limit(1)
        .maybeSingle();
      if (byEmail.data) {
        return byEmail.data as unknown as Profile & { organization?: Organization };
      }
    } catch (err) {
      console.warn('[SalesOS Auth] Profile lookup by email with join failed:', err);
    }

    // 4. Try finding by email simple
    try {
      const byEmailSimple = await supabase
        .from('profiles')
        .select('*')
        .ilike('email', normEmail)
        .limit(1)
        .maybeSingle();
      if (byEmailSimple.data) {
        return {
          ...(byEmailSimple.data as unknown as Profile),
          organization: DEFAULT_ORGANIZATION,
        };
      }
    } catch (err) {
      console.warn('[SalesOS Auth] Simple profile lookup by email failed:', err);
    }
  }

  // 5. Check if user is known admin (e.g. realadheshkrishna@gmail.com, admin@jvecom.in)
  const isOwnerAdmin = normEmail === 'realadheshkrishna@gmail.com' || normEmail === 'admin@jvecom.in' || normEmail.includes('admin');
  if (isOwnerAdmin) {
    const adminProfile: Profile = {
      id: user.id,
      organization_id: DEFAULT_ORG_ID,
      first_name: user.user_metadata?.first_name || 'Adhesh',
      last_name: user.user_metadata?.last_name || 'Krishna',
      email: normEmail || 'admin@jvecom.in',
      phone: user.phone || null,
      username: 'adhesh',
      employee_id: 'EMP-100',
      role: UserRole.ORG_ADMIN,
      team_id: null,
      manager_id: null,
      avatar_url: null,
      joining_date: new Date().toISOString().split('T')[0],
      status: EmployeeStatus.ACTIVE,
      access_only: 'ALL',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Upsert into public.profiles and localDb
    try {
      await supabase.from('profiles').upsert(adminProfile);
    } catch {}
    try {
      localDb.insert<Profile>('profiles', adminProfile);
    } catch {}

    return { ...adminProfile, organization: DEFAULT_ORGANIZATION };
  }

  // 6. Check employee_invitations table
  if (normEmail) {
    try {
      const { data: inv } = await supabase
        .from('employee_invitations')
        .select('*')
        .ilike('email', normEmail)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (inv) {
        const invitedProfile: Profile = {
          id: user.id,
          organization_id: inv.organization_id || DEFAULT_ORG_ID,
          first_name: inv.first_name || user.user_metadata?.first_name || normEmail.split('@')[0],
          last_name: inv.last_name || user.user_metadata?.last_name || '',
          email: normEmail,
          phone: inv.phone || user.phone || null,
          username: normEmail.split('@')[0],
          employee_id: inv.employee_id_str || 'EMP-100',
          role: (inv.role as UserRole) || UserRole.SALES_REP,
          team_id: inv.team_id || null,
          manager_id: inv.manager_id || null,
          avatar_url: null,
          joining_date: new Date().toISOString().split('T')[0],
          status: EmployeeStatus.ACTIVE,
          access_only: inv.access_only || 'ALL',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        try {
          await supabase.from('profiles').upsert(invitedProfile);
        } catch {}
        try {
          localDb.insert<Profile>('profiles', invitedProfile);
        } catch {}

        return { ...invitedProfile, organization: DEFAULT_ORGANIZATION };
      }
    } catch (invErr) {
      console.warn('[SalesOS Auth] Invitation lookup notice:', invErr);
    }
  }

  // 7. Check localDb profiles
  if (normEmail) {
    const local = localDb.getAll<Profile>('profiles').find(p => p.email?.toLowerCase() === normEmail);

    if (local) {
      const synced: Profile = {
        ...local,
        id: user.id,
      };
      try {
        await supabase.from('profiles').upsert(synced);
      } catch {}
      return { ...synced, organization: DEFAULT_ORGANIZATION };
    }
  }

  // 8. Auto-create default employee profile for authenticated Supabase user
  if (normEmail) {
    const autoProfile: Profile = {
      id: user.id,
      organization_id: DEFAULT_ORG_ID,
      first_name: user.user_metadata?.first_name || normEmail.split('@')[0] || 'Team',
      last_name: user.user_metadata?.last_name || 'Member',
      email: normEmail,
      phone: user.phone || null,
      username: normEmail.split('@')[0],
      employee_id: 'EMP-100',
      role: (user.user_metadata?.role as UserRole) || UserRole.SALES_REP,
      team_id: null,
      manager_id: null,
      avatar_url: null,
      joining_date: new Date().toISOString().split('T')[0],
      status: EmployeeStatus.ACTIVE,
      access_only: 'ALL',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    try {
      await supabase.from('profiles').upsert(autoProfile);
    } catch {}
    try {
      localDb.insert<Profile>('profiles', autoProfile);
    } catch {}

    return { ...autoProfile, organization: DEFAULT_ORGANIZATION };
  }

  return null;
}

// =============================================================================
// Context
// =============================================================================

interface AuthState {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  organization: Organization | null;
  loading: boolean;
  initialized: boolean;
}

export interface AuthContextType extends AuthState {
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signInWithDemo: (roleOrEmail: UserRole | string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: Error | null }>;
  updatePassword: (password: string) => Promise<{ error: Error | null }>;
  refreshProfile: () => Promise<void>;
  demoAccounts: DemoAccount[];
  demoEnabled: boolean;
  /** Modules this user may access (resolved from role + Org Admin assignment) */
  allowedModules: Set<ModuleId>;
  can: (moduleId: ModuleId) => boolean;
  canAccessPath: (pathname: string) => boolean;
  isAdmin: boolean;
  isManager: boolean;
  isSalesRep: boolean;
  isSuperAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const SIGNED_OUT: AuthState = {
  session: null, user: null, profile: null, organization: null, loading: false, initialized: true,
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ ...SIGNED_OUT, loading: true, initialized: false });
  const demoEnabled = isLocalAuthEnabled();

  // ---------------------------------------------------------------------------
  // Local (dev) sessions
  // ---------------------------------------------------------------------------
  const startLocalSession = useCallback((kind: StoredLocalSession['kind'], profile: Profile) => {
    try {
      localStorage.setItem(LOCAL_SESSION_KEY, JSON.stringify({ kind, profile_id: profile.id } satisfies StoredLocalSession));
    } catch { /* ignore */ }
    setState({
      session: null,
      user: createLocalUser(profile),
      profile,
      organization: DEFAULT_ORGANIZATION,
      loading: false,
      initialized: true,
    });
  }, []);

  const restoreLocalSession = useCallback((): boolean => {
    if (!demoEnabled) return false;
    try {
      const raw = localStorage.getItem(LOCAL_SESSION_KEY);
      if (!raw) return false;
      const stored = JSON.parse(raw) as Partial<StoredLocalSession>;
      if (!stored.profile_id) return false;

      // Always re-read the profile so permission changes by the admin apply on reload
      const profile = stored.kind === 'demo'
        ? DEMO_ACCOUNTS.find(a => a.id === stored.profile_id)?.profile ?? null
        : findLocalProfile(stored.profile_id);

      if (!profile || isBlockedStatus(profile.status)) {
        localStorage.removeItem(LOCAL_SESSION_KEY);
        return false;
      }
      startLocalSession(stored.kind === 'demo' ? 'demo' : 'local', profile);
      return true;
    } catch {
      return false;
    }
  }, [demoEnabled, startLocalSession]);

  // ---------------------------------------------------------------------------
  // Supabase sessions
  // ---------------------------------------------------------------------------
  /** Applies a Supabase session; returns an error message when access is refused. */
  const applySupabaseSession = useCallback(async (session: Session | null): Promise<string | null> => {
    if (!session?.user) {
      setState(prev => (prev.session ? SIGNED_OUT : { ...prev, loading: false, initialized: true }));
      return null;
    }

    const profileData = await fetchSupabaseProfile(session.user);
    if (!profileData) {
      await supabase.auth.signOut().catch(() => undefined);
      setState(SIGNED_OUT);
      return NO_PROFILE_MESSAGE;
    }
    if (isBlockedStatus(profileData.status)) {
      await supabase.auth.signOut().catch(() => undefined);
      setState(SIGNED_OUT);
      return BLOCKED_MESSAGE;
    }

    const { organization, ...profile } = profileData;
    setState({
      session,
      user: session.user,
      profile: profile as Profile,
      organization: organization || DEFAULT_ORGANIZATION,
      loading: false,
      initialized: true,
    });
    return null;
  }, []);

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!mounted) return;
        if (session?.user) {
          await applySupabaseSession(session);
          return;
        }
      } catch (err) {
        console.warn('[SalesOS Auth] Supabase session unavailable:', err);
      }
      if (!mounted) return;
      if (!restoreLocalSession()) setState(SIGNED_OUT);
    })();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;
      // Defer: awaiting Supabase calls inside this callback can deadlock supabase-js
      setTimeout(() => {
        if (!mounted) return;
        if (session) {
          void applySupabaseSession(session);
        } else if (event === 'SIGNED_OUT') {
          const hasLocal = demoEnabled && !!localStorage.getItem(LOCAL_SESSION_KEY);
          if (!hasLocal) setState(SIGNED_OUT);
        }
      }, 0);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [applySupabaseSession, restoreLocalSession, demoEnabled]);

  // ---------------------------------------------------------------------------
  // Actions
  // ---------------------------------------------------------------------------
  const signIn = async (email: string, password: string): Promise<{ error: Error | null }> => {
    const normalizedEmail = email.trim().toLowerCase();
    setState(prev => ({ ...prev, loading: true }));

    // 1. Real Supabase Auth (production path)
    let supabaseError: string | null = null;
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email: normalizedEmail, password });
      if (!error && data.session) {
        const refusal = await applySupabaseSession(data.session);
        if (refusal) return { error: new Error(refusal) };
        localStorage.removeItem(LOCAL_SESSION_KEY);
        return { error: null };
      }
      supabaseError = error?.message ?? null;
    } catch (err) {
      supabaseError = err instanceof Error ? err.message : 'Authentication service unreachable';
    }

    // 2. Local credentials (dev / offline mode only)
    if (demoEnabled) {
      const demo = DEMO_ACCOUNTS.find(a => a.email === normalizedEmail);
      if (demo && demo.password === password) {
        ensureDemoDataInLocalDb(demo.profile);
        startLocalSession('demo', demo.profile);
        return { error: null };
      }

      const localProfileId = await verifyLocalCredential(normalizedEmail, password).catch(() => null);
      if (localProfileId) {
        const profile = findLocalProfile(localProfileId);
        if (!profile) {
          setState(prev => ({ ...prev, loading: false }));
          return { error: new Error(NO_PROFILE_MESSAGE) };
        }
        if (isBlockedStatus(profile.status)) {
          setState(prev => ({ ...prev, loading: false }));
          return { error: new Error(BLOCKED_MESSAGE) };
        }
        startLocalSession('local', profile);
        return { error: null };
      }
    }

    setState(prev => ({ ...prev, loading: false }));
    const looksLikeBadCreds = !supabaseError || /invalid|credentials|password/i.test(supabaseError);
    return { error: new Error(looksLikeBadCreds ? INVALID_MESSAGE : supabaseError!) };
  };

  const signInWithDemo = async (roleOrEmail: UserRole | string): Promise<{ error: Error | null }> => {
    if (!demoEnabled) return { error: new Error('Demo sign-in is disabled in this environment.') };
    const match = DEMO_ACCOUNTS.find(
      acc => acc.role === roleOrEmail || acc.email === String(roleOrEmail).toLowerCase(),
    );
    if (!match) return { error: new Error('Unknown demo account.') };
    ensureDemoDataInLocalDb(match.profile);
    startLocalSession('demo', match.profile);
    return { error: null };
  };

  const signOut = async () => {
    try { localStorage.removeItem(LOCAL_SESSION_KEY); } catch { /* ignore */ }
    try { localStorage.removeItem('salesos_remembered_email'); } catch { /* ignore */ }
    try { await supabase.auth.signOut(); } catch { /* ignore */ }
    setState(SIGNED_OUT);
  };

  const refreshProfile = useCallback(async () => {
    if (!state.user) return;
    if (state.session) {
      await applySupabaseSession(state.session);
    } else {
      restoreLocalSession();
    }
  }, [state.user, state.session, applySupabaseSession, restoreLocalSession]);

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    return { error };
  };

  const updatePassword = async (password: string) => {
    const { error } = await supabase.auth.updateUser({ password });
    return { error };
  };

  // ---------------------------------------------------------------------------
  // Derived permissions
  // ---------------------------------------------------------------------------
  const allowedModules = useMemo(() => getAllowedModules(state.profile), [state.profile]);
  const can = useCallback((m: ModuleId) => allowedModules.has(m), [allowedModules]);
  const canAccessPath = useCallback((p: string) => canAccessPathFor(state.profile, p), [state.profile]);

  const role = state.profile?.role;
  const isSuperAdmin = role === UserRole.SUPER_ADMIN;
  const isAdmin = role === UserRole.ORG_ADMIN || isSuperAdmin;
  const isManager = role === UserRole.MANAGER;
  const isSalesRep = role === UserRole.SALES_REP;

  return (
    <AuthContext.Provider
      value={{
        ...state,
        signIn,
        signInWithDemo,
        signOut,
        resetPassword,
        updatePassword,
        refreshProfile,
        demoAccounts: demoEnabled ? DEMO_ACCOUNTS : [],
        demoEnabled,
        allowedModules,
        can,
        canAccessPath,
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
