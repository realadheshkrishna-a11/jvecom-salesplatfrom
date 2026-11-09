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

    // Get member counts across both profiles and employee_invitations
    const memberCounts: Record<string, number> = {};
    const countedUserKeys = new Set<string>();

    try {
      const { data: counts } = await supabase
        .from('profiles')
        .select('id, email, team_id')
        .eq('organization_id', orgId)
        .not('team_id', 'is', null);

      counts?.forEach(p => {
        const teamId = p.team_id as string;
        memberCounts[teamId] = (memberCounts[teamId] || 0) + 1;
        const key = (p.email || p.id).toLowerCase();
        countedUserKeys.add(key);
      });
    } catch (countErr) {
      console.warn('[teamsService] Member count query notice:', countErr);
    }

    try {
      const { data: invCounts } = await supabase
        .from('employee_invitations')
        .select('id, user_id, email, team_id')
        .eq('organization_id', orgId)
        .not('team_id', 'is', null)
        .neq('status', 'REVOKED');

      invCounts?.forEach(inv => {
        const key = (inv.email || inv.user_id || inv.id).toLowerCase();
        if (!countedUserKeys.has(key)) {
          const teamId = inv.team_id as string;
          memberCounts[teamId] = (memberCounts[teamId] || 0) + 1;
          countedUserKeys.add(key);
        }
      });
    } catch {}

    const result = (data || []).map(t => ({
      ...t,
      member_count: memberCounts[t.id] || 0,
    })) as unknown as Team[];

    // Sync to localDb cache for resilient offline and synchronous retrieval
    try {
      result.forEach(team => {
        if (localDb.getById<Team>('teams', team.id)) {
          localDb.update<Team>('teams', team.id, team as any);
        } else {
          localDb.insert<Team>('teams', team as any);
        }
      });
    } catch {}

    return result;
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
    const list = ((data || []) as unknown as Profile[]).slice();

    // Include invited employees assigned to this squad who have not yet finished sign up
    try {
      const { data: invs } = await supabase
        .from('employee_invitations')
        .select('*')
        .eq('team_id', teamId)
        .neq('status', 'REVOKED');

      if (invs && invs.length > 0) {
        const existingEmails = new Set(list.map(p => (p.email || '').toLowerCase()));
        const existingIds = new Set(list.map(p => p.id));
        invs.forEach((inv: any) => {
          const email = (inv.email || '').toLowerCase();
          const uid = inv.user_id || inv.id;
          if (!existingEmails.has(email) && !existingIds.has(uid)) {
            list.push({
              id: uid,
              organization_id: inv.organization_id,
              first_name: inv.first_name || '',
              last_name: inv.last_name || '',
              email: inv.email,
              phone: inv.phone || null,
              username: inv.email ? inv.email.split('@')[0] : 'employee',
              employee_id: inv.employee_id_str || null,
              role: inv.role || 'SALES_REP',
              team_id: inv.team_id,
              status: 'ACTIVE',
              access_only: inv.access_only || 'ALL',
              joining_date: inv.created_at ? new Date(inv.created_at).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
              created_at: inv.created_at || new Date().toISOString(),
              updated_at: inv.updated_at || new Date().toISOString(),
            } as any);
          }
        });
      }
    } catch (invErr) {
      console.warn('[teamsService] getMembers remote invitations notice:', invErr);
    }

    return list;
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

    // Assign members if selected (updating profiles, employee_invitations, team_members, and localDb)
    if (input.member_ids && input.member_ids.length > 0) {
      try {
        await supabase
          .from('profiles')
          .update({ team_id: data.id })
          .in('id', input.member_ids);
      } catch (err) {
        console.warn('[teamsService] Assigning initial members to profiles:', err);
      }

      try {
        await supabase
          .from('employee_invitations')
          .update({ team_id: data.id })
          .in('user_id', input.member_ids);
        await supabase
          .from('employee_invitations')
          .update({ team_id: data.id })
          .in('id', input.member_ids);
      } catch (err) {
        console.warn('[teamsService] Assigning initial members to invitations:', err);
      }

      try {
        const historyRows = input.member_ids.map(uid => ({
          organization_id: orgId,
          team_id: data.id,
          user_id: uid,
        }));
        await supabase.from('team_members').insert(historyRows);
      } catch {}

      input.member_ids.forEach(uid => {
        try {
          localDb.update<Profile>('profiles', uid, { team_id: data.id } as any);
        } catch {}
      });
    }

    return data as unknown as Team;
  },

  async update(id: string, input: Partial<TeamInput>) {
    const clean: Record<string, unknown> = { ...input, updated_at: new Date().toISOString() };
    if (clean.manager_id === 'none' || clean.manager_id === '') {
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
          await supabase.from('employee_invitations').update({ team_id: null }).eq('team_id', id);
          try {
            await supabase.from('team_members').update({ left_at: new Date().toISOString() }).eq('team_id', id).is('left_at', null);
          } catch {}
        } else {
          // Unassign excluded members
          await supabase.from('profiles').update({ team_id: null }).eq('team_id', id).not('id', 'in', `(${memberIds.join(',')})`);
          await supabase.from('employee_invitations').update({ team_id: null }).eq('team_id', id).not('user_id', 'in', `(${memberIds.join(',')})`).not('id', 'in', `(${memberIds.join(',')})`);

          // Assign selected members
          await supabase.from('profiles').update({ team_id: id }).in('id', memberIds);
          await supabase.from('employee_invitations').update({ team_id: id }).in('user_id', memberIds);
          await supabase.from('employee_invitations').update({ team_id: id }).in('id', memberIds);
        }
      } catch (err) {
        console.warn('[teamsService] Syncing team members in update:', err);
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

    // Close team_members audit rows
    try {
      await supabase.from('team_members').update({ left_at: new Date().toISOString() }).eq('team_id', id).is('left_at', null);
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
    let profileUpdated = false;
    try {
      const { data, error } = await supabase
        .from('profiles')
        .update({ team_id: teamId })
        .eq('id', userId)
        .select('id');
      profileUpdated = !error && Array.isArray(data) && data.length > 0;
    } catch (profileError) {
      console.warn('[teamsService] addMember profile update notice:', profileError);
    }

    // Also update employee_invitations for pending/invited users
    let invitationUpdated = false;
    try {
      const { data: invRows, error: invError } = await supabase
        .from('employee_invitations')
        .update({ team_id: teamId })
        .or(`user_id.eq.${userId},id.eq.${userId}`)
        .select('id');
      invitationUpdated = !invError && Array.isArray(invRows) && invRows.length > 0;
    } catch (invErr) {
      console.warn('[teamsService] addMember invitation update notice:', invErr);
    }

    if (!profileUpdated && !invitationUpdated) {
      // Attempt fallback direct profile update by ID
      const { error: directErr } = await supabase
        .from('profiles')
        .update({ team_id: teamId })
        .eq('id', userId);
      if (directErr && !invitationUpdated) {
        console.warn('[teamsService] addMember fallback warning:', directErr.message);
      }
    }

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
    try {
      await supabase
        .from('profiles')
        .update({ team_id: null })
        .eq('id', userId)
        .eq('team_id', teamId);
    } catch (profileError) {
      console.warn('[teamsService] removeMember profile notice:', profileError);
    }

    // Remove from invitation
    try {
      await supabase
        .from('employee_invitations')
        .update({ team_id: null })
        .or(`user_id.eq.${userId},id.eq.${userId}`)
        .eq('team_id', teamId);
    } catch (invError) {
      console.warn('[teamsService] removeMember invitation notice:', invError);
    }

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
        try {
          await supabase.from('profiles').update({ team_id: null }).eq('id', userId);
        } catch {}
        try {
          await supabase.from('employee_invitations').update({ team_id: null }).or(`user_id.eq.${userId},id.eq.${userId}`);
        } catch {}
        try {
          await supabase
            .from('team_members')
            .update({ left_at: new Date().toISOString() })
            .eq('user_id', userId)
            .is('left_at', null);
        } catch {}
      }
      return;
    }
    return this.addMember(targetTeamId, userId, orgId);
  },
};
