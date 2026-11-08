// ============================================================================
// SalesOS — Teams Service
// ============================================================================

import { supabase } from '@/lib/supabase';
import { localDb, isLocalStorageMode } from '@/lib/localDb';
import type { Team, Profile } from '@/types';
import type { TeamInput } from '@/schemas';

export const teamsService = {
  async list(orgId: string, options: { includeInactive?: boolean } = { includeInactive: true }) {
    if (isLocalStorageMode()) {
      const teams = localDb.getTeams(orgId);
      return options.includeInactive ? teams : teams.filter(t => t.status === 'ACTIVE');
    }

    let query = supabase
      .from('teams')
      .select('*, manager:profiles!teams_manager_id_fkey(id, first_name, last_name, avatar_url, email)')
      .eq('organization_id', orgId)
      .order('name');

    if (!options.includeInactive) {
      query = query.neq('status', 'INACTIVE');
    }

    const { data, error } = await query;
    if (error) throw error;

    // Get member counts
    const { data: counts } = await supabase
      .from('profiles')
      .select('team_id')
      .eq('organization_id', orgId)
      .not('team_id', 'is', null);

    const memberCounts: Record<string, number> = {};
    counts?.forEach(p => {
      const teamId = p.team_id as string;
      memberCounts[teamId] = (memberCounts[teamId] || 0) + 1;
    });

    return (data || []).map(t => ({
      ...t,
      member_count: memberCounts[t.id] || 0,
    })) as unknown as Team[];
  },

  async getById(id: string) {
    if (isLocalStorageMode()) {
      return localDb.getById<Team>('teams', id);
    }

    const { data, error } = await supabase
      .from('teams')
      .select('*, manager:profiles!teams_manager_id_fkey(id, first_name, last_name, avatar_url, email)')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data as unknown as Team;
  },

  async getMembers(teamId: string) {
    if (isLocalStorageMode()) {
      return localDb.getAll<Profile>('profiles').filter(p => p.team_id === teamId);
    }

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('team_id', teamId)
      .order('first_name');

    if (error) throw error;
    return (data || []) as unknown as Profile[];
  },

  async create(orgId: string, input: TeamInput) {
    const clean: Record<string, unknown> = {
      organization_id: orgId,
      name: input.name,
      description: input.description || null,
      manager_id: input.manager_id && input.manager_id !== 'none' ? input.manager_id : null,
      team_type: input.team_type || 'General Sales',
      status: input.status || 'ACTIVE',
      target_value: input.target_value ?? null,
      target_type: input.target_type || null,
      target_period: input.target_period || 'MONTHLY',
    };

    if (isLocalStorageMode()) {
      const created = localDb.createTeam(orgId, clean as any);
      if (input.member_ids && input.member_ids.length > 0) {
        input.member_ids.forEach(uid => {
          localDb.update<Profile>('profiles', uid, { team_id: created.id } as any);
        });
      }
      return created;
    }

    const { data, error } = await supabase
      .from('teams')
      .insert(clean)
      .select()
      .single();

    if (error) throw error;

    // Assign members if selected
    if (input.member_ids && input.member_ids.length > 0) {
      try {
        await supabase
          .from('profiles')
          .update({ team_id: data.id })
          .in('id', input.member_ids);
      } catch (err) {
        console.warn('Assigning initial members:', err);
      }
    }

    return data as unknown as Team;
  },

  async update(id: string, input: Partial<TeamInput>) {
    const clean: Record<string, unknown> = { ...input, updated_at: new Date().toISOString() };
    if (clean.manager_id === 'none') {
      clean.manager_id = null;
    }
    const memberIds = input.member_ids;
    delete clean.member_ids;

    try {
      if (localDb.getById<Team>('teams', id)) {
        localDb.update<Team>('teams', id, clean as any);
      }
      if (memberIds) {
        localDb.getAll<Profile>('profiles').forEach(p => {
          if (p.team_id === id && !memberIds.includes(p.id)) {
            localDb.update<Profile>('profiles', p.id, { team_id: null } as any);
          } else if (memberIds.includes(p.id)) {
            localDb.update<Profile>('profiles', p.id, { team_id: id } as any);
          }
        });
      }
    } catch {}

    if (isLocalStorageMode()) {
      const local = localDb.getById<Team>('teams', id);
      if (!local) throw new Error('Team not found');
      return local;
    }

    const { data, error } = await supabase
      .from('teams')
      .update(clean)
      .eq('id', id)
      .select()
      .maybeSingle();

    if (error) {
      console.warn('[teamsService] Supabase team update notice:', error);
      const local = localDb.getById<Team>('teams', id);
      if (local) return local;
      throw error;
    }

    if (memberIds) {
      try {
        if (memberIds.length === 0) {
          await supabase.from('profiles').update({ team_id: null }).eq('team_id', id);
        } else {
          // Unassign excluded members
          await supabase.from('profiles').update({ team_id: null }).eq('team_id', id).not('id', 'in', `(${memberIds.join(',')})`);
          // Assign selected members
          await supabase.from('profiles').update({ team_id: id }).in('id', memberIds);
        }
      } catch (err) {
        console.warn('Syncing team members in update:', err);
      }
    }

    return data as unknown as Team;
  },

  async toggleStatus(id: string, status: 'ACTIVE' | 'INACTIVE') {
    return this.update(id, { status } as any);
  },

  async delete(id: string) {
    // 1. Local storage cleanup
    try {
      localDb.delete('teams', id);
      const profiles = localDb.getAll<Profile>('profiles');
      profiles.forEach(p => {
        if (p.team_id === id) {
          localDb.update<Profile>('profiles', p.id, { team_id: null } as any);
        }
      });
    } catch (localErr) {
      console.warn('[teamsService] Local team delete notice:', localErr);
    }

    if (isLocalStorageMode()) {
      return;
    }

    // 2. Unassign team members in remote Supabase
    try {
      await supabase.from('profiles').update({ team_id: null }).eq('team_id', id);
    } catch (unassignErr) {
      console.warn('[teamsService] Profiles team unassign notice:', unassignErr);
    }

    try {
      await supabase.from('employee_invitations').update({ team_id: null }).eq('team_id', id);
    } catch {}

    // 3. Delete or deactivate remote team
    const { error: deleteErr } = await supabase
      .from('teams')
      .delete()
      .eq('id', id);

    if (deleteErr) {
      console.warn('[teamsService] Direct team delete error, falling back to soft deactivate:', deleteErr.message);
      const { error: updateErr } = await supabase
        .from('teams')
        .update({ status: 'INACTIVE' })
        .eq('id', id);

      if (updateErr) throw updateErr;
    }
  },

  async addMember(teamId: string, userId: string, orgId: string) {
    try {
      localDb.update<Profile>('profiles', userId, { team_id: teamId } as any);
    } catch {}

    if (isLocalStorageMode()) {
      return;
    }

    // Update profile's team
    const { error: profileError } = await supabase
      .from('profiles')
      .update({ team_id: teamId })
      .eq('id', userId);

    if (profileError) throw profileError;

    // Add team member history record
    try {
      await supabase
        .from('team_members')
        .insert({
          organization_id: orgId,
          team_id: teamId,
          user_id: userId,
        });
    } catch {}
  },

  async removeMember(teamId: string, userId: string) {
    try {
      localDb.update<Profile>('profiles', userId, { team_id: null } as any);
    } catch {}

    if (isLocalStorageMode()) {
      return;
    }

    // Remove from profile
    const { error: profileError } = await supabase
      .from('profiles')
      .update({ team_id: null })
      .eq('id', userId)
      .eq('team_id', teamId);

    if (profileError) throw profileError;

    // Update team member history
    try {
      await supabase
        .from('team_members')
        .update({ left_at: new Date().toISOString() })
        .eq('team_id', teamId)
        .eq('user_id', userId)
        .is('left_at', null);
    } catch {}
  },

  async transferMember(targetTeamId: string | null, userId: string, orgId: string) {
    if (!targetTeamId || targetTeamId === 'none') {
      try {
        localDb.update<Profile>('profiles', userId, { team_id: null } as any);
      } catch {}
      if (!isLocalStorageMode()) {
        await supabase.from('profiles').update({ team_id: null }).eq('id', userId);
      }
      return;
    }
    return this.addMember(targetTeamId, userId, orgId);
  },
};
