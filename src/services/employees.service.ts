// ============================================================================
// SalesOS — Employees Service
// ============================================================================

import { supabase } from '@/lib/supabase';
import { localDb, isLocalStorageMode, generateUUID } from '@/lib/localDb';
import { saveLocalCredential, removeLocalCredential } from '@/lib/localCredentials';
import type { Profile, Team, Organization, EmployeeInvitation, PaginatedResponse } from '@/types';
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

  async invite(orgId: string, input: EmployeeInput): Promise<{ invitation_id: string }> {
    let newId = generateUUID();

    // 1. If remote Supabase is configured, try invoking the invite-employee edge function
    if (!isLocalStorageMode()) {
      try {
        const { data, error } = await supabase.functions.invoke('invite-employee', {
          body: {
            organization_id: orgId,
            email: input.email,
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
        } else {
          await supabase
            .from('employee_invitations')
            .insert({
              organization_id: orgId,
              email: input.email,
              first_name: input.first_name,
              last_name: input.last_name,
              role: input.role,
              team_id: input.team_id || null,
              manager_id: input.manager_id || null,
              phone: input.phone || null,
              employee_id_str: input.employee_id || null,
            });
        }
      } catch (err) {
        console.warn('[employeesService] Remote invitation sync notice:', err);
      }
    }

    const newProfile: Profile = {
      id: newId,
      organization_id: orgId,
      first_name: input.first_name,
      last_name: input.last_name,
      email: input.email,
      phone: input.phone || null,
      username: input.username || input.email.split('@')[0],
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

    // Always persist to local database first
    localDb.insert<Profile>('profiles', newProfile);

    // Save local credential so the employee can log in immediately
    if (input.password) {
      await saveLocalCredential(newId, input.email, input.password);
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
