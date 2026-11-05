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
    if (isLocalStorageMode()) {
      let list = localDb.getAll<Profile>('profiles').filter(p => p.organization_id === orgId);
      const teams = localDb.getAll<Team>('teams');
      const profiles = localDb.getAll<Profile>('profiles');

      // Sanitize and attach relations
      list = list.map(p => ({
        ...p,
        role: p.role || UserRole.SALES_REP,
        status: p.status || EmployeeStatus.ACTIVE,
        team: teams.find(t => t.id === p.team_id),
        manager: profiles.find(m => m.id === p.manager_id),
      }));

      if (filters.search) {
        const s = filters.search.toLowerCase();
        list = list.filter(p =>
          `${p.first_name || ''} ${p.last_name || ''}`.toLowerCase().includes(s) ||
          (p.email || '').toLowerCase().includes(s) ||
          (p.employee_id || '').toLowerCase().includes(s)
        );
      }
      if (filters.role && filters.role !== 'ALL') list = list.filter(p => p.role === filters.role);
      if (filters.team_id) list = list.filter(p => p.team_id === filters.team_id);
      if (filters.status) list = list.filter(p => p.status === filters.status);

      return {
        data: list,
        total: list.length,
        page: filters.page || 1,
        pageSize: filters.pageSize || 25,
        totalPages: 1,
      };
    }

    const {
      search, role, team_id, status,
      page = 1, pageSize = 25,
      sortBy = 'created_at', sortDir = 'desc'
    } = filters;

    let query = supabase
      .from('profiles')
      .select('*, team:teams(id, name), manager:profiles!profiles_manager_id_fkey(id, first_name, last_name)', { count: 'exact' })
      .eq('organization_id', orgId)
      .neq('role', 'SUPER_ADMIN');

    if (search) {
      query = query.or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%,email.ilike.%${search}%,employee_id.ilike.%${search}%,phone.ilike.%${search}%`);
    }
    if (role) query = query.eq('role', role);
    if (team_id) query = query.eq('team_id', team_id);
    if (status) query = query.eq('status', status);

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    query = query.order(sortBy, { ascending: sortDir === 'asc' }).range(from, to);

    const { data, count, error } = await query;
    if (error) throw error;

    return {
      data: (data || []) as unknown as Profile[],
      total: count || 0,
      page,
      pageSize,
      totalPages: Math.ceil((count || 0) / pageSize),
    };
  },

  async getById(id: string): Promise<Profile> {
    if (isLocalStorageMode()) {
      const p = localDb.getById<Profile>('profiles', id);
      if (!p) throw new Error('Employee not found');
      const teams = localDb.getAll<Team>('teams');
      const profiles = localDb.getAll<Profile>('profiles');
      const orgs = localDb.getAll<Organization>('organization');
      return {
        ...p,
        role: p.role || UserRole.SALES_REP,
        status: p.status || EmployeeStatus.ACTIVE,
        team: teams.find(t => t.id === p.team_id),
        manager: profiles.find(m => m.id === p.manager_id),
        organization: orgs.find(o => o.id === p.organization_id),
      };
    }

    const { data, error } = await supabase
      .from('profiles')
      .select('*, team:teams(id, name), manager:profiles!profiles_manager_id_fkey(id, first_name, last_name), organization:organizations(*)')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data as unknown as Profile;
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
    localDb.insert<Profile>('profiles', newProfile);

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
