// ============================================================================
// SalesOS — Employees Service
// ============================================================================

import { createClient } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { localDb, isLocalStorageMode, generateUUID } from '@/lib/localDb';
import { saveLocalCredential, removeLocalCredential } from '@/lib/localCredentials';
import type { Profile, Team, Organization, PaginatedResponse } from '@/types';
import { UserRole, EmployeeStatus } from '@/types';
import type { EmployeeInput } from '@/schemas';

interface EmployeeFilters {
  search?: string;
  role?: string;
  team_id?: string;
  status?: string;
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortDir?: 'asc' | 'desc';
}

export const employeesService = {
  async list(orgId: string, filters: EmployeeFilters = {}): Promise<PaginatedResponse<Profile>> {
    const {
      search, role, team_id, status,
      page = 1, pageSize = 25,
      sortBy = 'created_at', sortDir = 'desc'
    } = filters;

    // Collect all profiles across Supabase, employee invitations, and local storage
    const profileMap = new Map<string, Profile>();

    // 1. Fetch remote Supabase profiles if not forced local
    if (!isLocalStorageMode()) {
      const normalizeProfile = (p: any): Profile | null => {
        const rawEmail = p.email || (p.full_name && p.full_name.includes('@') ? p.full_name : '');
        const email = rawEmail ? rawEmail.trim().toLowerCase() : '';
        const rawName = p.full_name && !p.full_name.includes('@') ? p.full_name.trim() : '';
        const firstName = p.first_name || (rawName ? rawName.split(' ')[0] : '') || (email ? email.split('@')[0] : '');
        const lastName = p.last_name || (rawName ? rawName.split(' ').slice(1).join(' ') : '');
        
        // Discard broken ghost rows that have no name, email, or employee id
        if (!email && !firstName && !p.employee_id) return null;

        return {
          ...p,
          email: email || p.email,
          first_name: firstName,
          last_name: lastName,
          username: p.username || (email ? email.split('@')[0] : 'employee'),
          employee_id: p.employee_id || (p.id ? `EMP-${p.id.slice(0, 6)}` : null),
          role: p.role || UserRole.SALES_REP,
          status: p.status || EmployeeStatus.ACTIVE,
          access_only: p.access_only || 'ALL',
        };
      };

      try {
        let query = supabase
          .from('profiles')
          .select('*, team:teams(id, name)')
          .neq('role', 'SUPER_ADMIN');

        if (orgId) {
          query = query.or(`organization_id.eq.${orgId},organization_id.is.null`);
        }

        const { data, error } = await query;
        if (!error && Array.isArray(data)) {
          data.forEach((p: any) => {
            const normalized = normalizeProfile(p);
            if (!normalized) return;
            const key = (normalized.email || normalized.id).toLowerCase();
            profileMap.set(key, normalized);
          });
        } else {
          // Resilient fallback without nested join
          const fallback = await supabase
            .from('profiles')
            .select('*')
            .neq('role', 'SUPER_ADMIN');
          if (fallback.data && Array.isArray(fallback.data)) {
            fallback.data.forEach((p: any) => {
              const normalized = normalizeProfile(p);
              if (!normalized) return;
              const key = (normalized.email || normalized.id).toLowerCase();
              profileMap.set(key, normalized);
            });
          }
        }
      } catch (remoteErr) {
        console.warn('[employeesService] Supabase profile query notice:', remoteErr);
      }

      // Also query remote employee_invitations to ensure newly invited members are present
      try {
        const { data: invs } = await supabase
          .from('employee_invitations')
          .select('*')
          .neq('status', 'REVOKED');
        if (invs && Array.isArray(invs)) {
          invs.forEach((inv: any) => {
            const emailKey = (inv.email || '').toLowerCase();
            if (emailKey && !profileMap.has(emailKey)) {
              profileMap.set(emailKey, {
                id: inv.user_id || inv.id,
                organization_id: inv.organization_id || orgId,
                first_name: inv.first_name || '',
                last_name: inv.last_name || '',
                email: inv.email,
                phone: inv.phone || null,
                username: inv.email ? inv.email.split('@')[0] : 'employee',
                employee_id: inv.employee_id_str || `EMP-${(inv.id || '').slice(0, 6)}`,
                role: (inv.role as UserRole) || UserRole.SALES_REP,
                team_id: inv.team_id || null,
                manager_id: inv.manager_id || null,
                avatar_url: null,
                joining_date: inv.created_at ? new Date(inv.created_at).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
                status: EmployeeStatus.ACTIVE,
                access_only: inv.access_only || 'ALL',
                created_at: inv.created_at || new Date().toISOString(),
                updated_at: inv.updated_at || new Date().toISOString(),
              });
            }
          });
        }
      } catch (invErr) {
        console.warn('[employeesService] Remote invitations query notice:', invErr);
      }
    }

    // 2. Merge localDb profiles (guarantees local creations and offline invites appear immediately)
    try {
      const localProfiles = localDb.getAll<Profile>('profiles');
      localProfiles.forEach(lp => {
        const email = lp.email?.toLowerCase();
        // Ignore any residual demo accounts
        if (email === 'manager@jvecom.in' || email === 'rep@jvecom.in' || email === 'admin@jvecom.in' || lp.employee_id === 'MGR001' || lp.employee_id === 'REP001') {
          return;
        }

        const key = (lp.email || lp.id).toLowerCase();
        const existing = profileMap.get(key);
        if (existing) {
          profileMap.set(key, {
            ...existing,
            ...lp,
            first_name: lp.first_name || existing.first_name,
            last_name: lp.last_name || existing.last_name,
            access_only: lp.access_only || existing.access_only || 'ALL',
            employee_id: lp.employee_id || existing.employee_id,
            username: lp.username || existing.username,
          });
        } else {
          profileMap.set(key, {
            ...lp,
            role: lp.role || UserRole.SALES_REP,
            status: lp.status || EmployeeStatus.ACTIVE,
            access_only: lp.access_only || 'ALL',
          });
        }
      });
    } catch {}

    // 4. Enrich teams and managers
    let teams: Team[] = [];
    try {
      teams = localDb.getAll<Team>('teams');
    } catch {}

    let list = Array.from(profileMap.values()).map(p => ({
      ...p,
      team: p.team || teams.find(t => t.id === p.team_id),
    }));

    // 5. Apply filters
    if (search) {
      const s = search.toLowerCase();
      list = list.filter(p =>
        `${p.first_name || ''} ${p.last_name || ''}`.toLowerCase().includes(s) ||
        (p.email || '').toLowerCase().includes(s) ||
        (p.employee_id || '').toLowerCase().includes(s) ||
        (p.username || '').toLowerCase().includes(s) ||
        (p.phone || '').toLowerCase().includes(s)
      );
    }
    if (role && role !== 'ALL') {
      list = list.filter(p => p.role === role);
    }
    if (team_id) {
      list = list.filter(p => p.team_id === team_id);
    }
    if (status) {
      list = list.filter(p => p.status === status);
    }

    // Sort
    list.sort((a: any, b: any) => {
      const valA = a[sortBy] ?? '';
      const valB = b[sortBy] ?? '';
      if (sortDir === 'asc') {
        return valA > valB ? 1 : -1;
      }
      return valA < valB ? 1 : -1;
    });

    const total = list.length;
    const from = (page - 1) * pageSize;
    const paginated = list.slice(from, from + pageSize);

    return {
      data: paginated,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize) || 1,
    };
  },

  async getById(id: string): Promise<Profile> {
    const teams = localDb.getAll<Team>('teams');
    const profiles = localDb.getAll<Profile>('profiles');
    const orgs = localDb.getAll<Organization>('organization');

    if (!isLocalStorageMode()) {
      try {
        const { data } = await supabase
          .from('profiles')
          .select('*, team:teams(id, name), organization:organizations(*)')
          .eq('id', id)
          .maybeSingle();

        if (data) {
          return {
            ...(data as unknown as Profile),
            role: data.role || UserRole.SALES_REP,
            status: data.status || EmployeeStatus.ACTIVE,
            access_only: data.access_only || 'ALL',
            team: data.team || teams.find(t => t.id === data.team_id),
          };
        }
      } catch (err) {
        console.warn('[employeesService] Supabase getById notice:', err);
      }
    }

    // Check localDb
    const local = localDb.getById<Profile>('profiles', id)
      || profiles.find(p => p.id === id || p.email === id);

    if (local) {
      return {
        ...local,
        role: local.role || UserRole.SALES_REP,
        status: local.status || EmployeeStatus.ACTIVE,
        access_only: local.access_only || 'ALL',
        team: teams.find(t => t.id === local.team_id),
        manager: profiles.find(m => m.id === local.manager_id),
        organization: orgs.find(o => o.id === local.organization_id),
      };
    }

    throw new Error('Employee not found');
  },

  /**
   * Invites and creates an employee account with real authentication.
   * Creates the user in Supabase Cloud Auth (usable across any remote device/browser)
   * and stores their assigned RBAC module permissions in Supabase profiles.
   */
  async invite(orgId: string, input: EmployeeInput): Promise<{ invitation_id: string }> {
    let newId = generateUUID();
    const normalizedEmail = input.email.trim().toLowerCase();

    // 1. If remote Supabase is configured, create cloud user
    if (!isLocalStorageMode()) {
      let provisioned = false;

      // 1A. Primary: Call create_employee_account RPC (directly provisions auth.users, identities, and profiles with confirmed email)
      try {
        const { data: rpcData, error: rpcErr } = await supabase.rpc('create_employee_account', {
          p_email: normalizedEmail,
          p_password: input.password,
          p_first_name: input.first_name || '',
          p_last_name: input.last_name || '',
          p_role: input.role || 'SALES_REP',
          p_org_id: orgId,
          p_access_only: input.access_only || 'ALL',
          p_phone: input.phone || null,
          p_employee_id: input.employee_id || null,
          p_team_id: input.team_id || null,
          p_manager_id: input.manager_id || null,
        });

        if (!rpcErr && rpcData?.user_id) {
          newId = rpcData.user_id;
          provisioned = true;
          console.log('[employeesService] Cloud employee provisioned via RPC:', newId);
        } else if (rpcErr) {
          console.warn('[employeesService] RPC provision notice:', rpcErr);
        }
      } catch (rpcCatch) {
        console.warn('[employeesService] RPC call exception:', rpcCatch);
      }

      // 1B. Fallback: Edge function or secondary client signUp
      if (!provisioned) {
        // Attempt edge function
        try {
          const { data, error } = await supabase.functions.invoke('invite-employee', {
            body: {
              organization_id: orgId,
              email: normalizedEmail,
              password: input.password,
              first_name: input.first_name,
              last_name: input.last_name,
              username: input.username,
              employee_id: input.employee_id,
              role: input.role,
              team_id: input.team_id || null,
              manager_id: input.manager_id || null,
              phone: input.phone || null,
              access_only: input.access_only || 'ALL',
            },
          });
          if (!error && data?.profile_id) {
            newId = data.profile_id;
            provisioned = true;
          }
        } catch (err) {
          console.warn('[employeesService] Edge function invoke notice:', err);
        }

        // Secondary client signUp fallback
        if (!provisioned) {
          const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://qkwxsiezhyarpcfnbjja.supabase.co';
          const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFrd3hzaWV6aHlhcnBjZm5iamphIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI1NTE2NjcsImV4cCI6MjEwODEyNzY2N30.BZiI_00l9WhA80IFTs0ovIxW5VZI3DhUGkpWIYGMzOc';

          if (supabaseUrl && supabaseAnonKey) {
            try {
              const cloudAuthClient = createClient(supabaseUrl, supabaseAnonKey, {
                auth: {
                  persistSession: false,
                  autoRefreshToken: false,
                  detectSessionInUrl: false,
                },
              });

              const { data: signUpData, error: signUpErr } = await cloudAuthClient.auth.signUp({
                email: normalizedEmail,
                password: input.password,
                options: {
                  data: {
                    organization_id: orgId,
                    first_name: input.first_name,
                    last_name: input.last_name,
                    role: input.role,
                  },
                },
              });

              if (signUpData?.user?.id) {
                newId = signUpData.user.id;
              } else if (signUpErr) {
                console.warn('[employeesService] Cloud signup notice:', signUpErr.message);
              }
            } catch (authErr) {
              console.warn('[employeesService] Cloud signup client error:', authErr);
            }
          }

          // Upsert the employee profile with RBAC permissions in Supabase
          try {
            await supabase.from('profiles').upsert({
              id: newId,
              organization_id: orgId,
              first_name: input.first_name,
              last_name: input.last_name,
              email: normalizedEmail,
              phone: input.phone || null,
              username: input.username || normalizedEmail.split('@')[0],
              employee_id: input.employee_id || null,
              role: input.role,
              team_id: input.team_id || null,
              manager_id: input.manager_id || null,
              joining_date: new Date().toISOString().slice(0, 10),
              status: 'ACTIVE',
              access_only: input.access_only || 'ALL',
              updated_at: new Date().toISOString(),
            });
          } catch (profErr) {
            console.warn('[employeesService] Remote profile upsert notice:', profErr);
          }
        }
      }

      // Always insert invitation log in Supabase
      try {
        await supabase.from('employee_invitations').insert({
          organization_id: orgId,
          email: normalizedEmail,
          first_name: input.first_name,
          last_name: input.last_name,
          role: input.role,
          team_id: input.team_id || null,
          manager_id: input.manager_id || null,
          phone: input.phone || null,
          employee_id_str: input.employee_id || null,
          access_only: input.access_only || 'ALL',
          status: 'ACCEPTED',
          user_id: newId,
        });
      } catch (invErr) {
        console.warn('[employeesService] Remote invitation log notice:', invErr);
      }
    }

    const newProfile: Profile = {
      id: newId,
      organization_id: orgId,
      first_name: input.first_name,
      last_name: input.last_name,
      email: normalizedEmail,
      phone: input.phone || null,
      username: input.username || normalizedEmail.split('@')[0],
      employee_id: input.employee_id || `EMP-${Date.now().toString().slice(-4)}`,
      role: (input.role as UserRole) || UserRole.SALES_REP,
      team_id: input.team_id || null,
      manager_id: input.manager_id || null,
      avatar_url: null,
      joining_date: new Date().toISOString().split('T')[0],
      status: EmployeeStatus.ACTIVE,
      access_only: input.access_only || 'ALL',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Always persist to local database as well
    const existingProfiles = localDb.getAll<Profile>('profiles');
    const existingIdx = existingProfiles.findIndex(p => p.email?.toLowerCase() === normalizedEmail || p.id === newId);
    if (existingIdx >= 0) {
      localDb.update<Profile>('profiles', existingProfiles[existingIdx].id, newProfile);
    } else {
      localDb.insert<Profile>('profiles', newProfile);
    }

    // Save local credential for fallback
    if (input.password) {
      await saveLocalCredential(newId, normalizedEmail, input.password);
    }

    return { invitation_id: newId };
  },

  async create(orgId: string, input: EmployeeInput): Promise<{ invitation_id: string }> {
    return this.invite(orgId, input);
  },

  async update(id: string, updates: Partial<Profile>): Promise<Profile> {
    if (isLocalStorageMode()) {
      return localDb.update<Profile>('profiles', id, updates);
    }

    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as unknown as Profile;
  },

  async delete(id: string): Promise<void> {
    localDb.delete('profiles', id);
    removeLocalCredential(id);

    if (!isLocalStorageMode()) {
      try {
        await supabase.from('profiles').delete().eq('id', id);
      } catch (err) {
        console.warn('[employeesService] Remote profile delete notice:', err);
      }
      try {
        await supabase.from('employee_invitations').delete().or(`user_id.eq.${id},id.eq.${id}`);
      } catch (err) {
        console.warn('[employeesService] Remote invitation delete notice:', err);
      }
    }
  },

  async deactivate(id: string): Promise<void> {
    if (isLocalStorageMode()) {
      localDb.update<Profile>('profiles', id, { status: EmployeeStatus.INACTIVE });
      return;
    }

    const { error } = await supabase
      .from('profiles')
      .update({ status: 'INACTIVE' })
      .eq('id', id);

    if (error) throw error;
  },

  async activate(id: string): Promise<void> {
    if (isLocalStorageMode()) {
      localDb.update<Profile>('profiles', id, { status: EmployeeStatus.ACTIVE });
      return;
    }

    const { error } = await supabase
      .from('profiles')
      .update({ status: 'ACTIVE' })
      .eq('id', id);

    if (error) throw error;
  },

  async getInvitations(orgId: string) {
    if (isLocalStorageMode()) {
      return [];
    }

    const { data, error } = await supabase
      .from('employee_invitations')
      .select('*')
      .eq('organization_id', orgId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  },

  async getInvitationByToken(token: string) {
    if (isLocalStorageMode()) {
      return null;
    }

    const { data, error } = await supabase
      .from('employee_invitations')
      .select('*, organization:organizations(name, logo_url)')
      .eq('token', token)
      .eq('status', 'PENDING')
      .gt('expires_at', new Date().toISOString())
      .single();

    if (error) throw error;
    return data;
  },

  async resendInvitation(invitationId: string): Promise<void> {
    if (isLocalStorageMode()) {
      return;
    }

    const { error } = await supabase
      .from('employee_invitations')
      .update({
        status: 'PENDING',
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        token: crypto.randomUUID(),
      })
      .eq('id', invitationId);

    if (error) throw error;
  },
};
