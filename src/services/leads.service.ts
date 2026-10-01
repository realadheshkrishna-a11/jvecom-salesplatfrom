// ============================================================================
// SalesOS — Leads Service
// CRM Pipeline, Activities, Follow-ups, and Sources
// ============================================================================

import { supabase } from '@/lib/supabase';
import { localDb, isLocalStorageMode } from '@/lib/localDb';
import type { Lead, LeadActivity, FollowUp, LeadSource, PaginatedResponse } from '@/types';
import { LeadStage, FollowUpStatus, LeadActivityType } from '@/types';
import type { LeadInput, LeadActivityInput, FollowUpInput } from '@/schemas';

interface LeadFilters {
  search?: string;
  stage?: LeadStage | string;
  assigned_to?: string;
  product_id?: string;
  source?: string;
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortDir?: 'asc' | 'desc';
}

export const leadsService = {
  async list(orgId: string, filters: LeadFilters = {}): Promise<PaginatedResponse<Lead>> {
    if (isLocalStorageMode()) {
      const items = localDb.getLeads(orgId, {
        stage: filters.stage,
        assigned_to: filters.assigned_to,
        search: filters.search,
      });
      return {
        data: items,
        total: items.length,
        page: filters.page || 1,
        pageSize: filters.pageSize || 25,
        totalPages: 1,
      };
    }

    const {
      search, stage, assigned_to, product_id, source,
      page = 1, pageSize = 25,
      sortBy = 'created_at', sortDir = 'desc'
    } = filters;

    let query = supabase
      .from('leads')
      .select(`
        *,
        customer:customers(*),
        assigned_salesperson:profiles!leads_assigned_to_fkey(id, first_name, last_name, email, avatar_url),
        product:products(*)
      `, { count: 'exact' })
      .eq('organization_id', orgId);

    if (stage) query = query.eq('stage', stage);
    if (assigned_to) query = query.eq('assigned_to', assigned_to);
    if (product_id) query = query.eq('product_id', product_id);
    if (source) query = query.eq('source', source);

    if (search) {
      query = query.or(`title.ilike.%${search}%,notes.ilike.%${search}%`);
    }

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    query = query.order(sortBy, { ascending: sortDir === 'asc' }).range(from, to);

    const { data, count, error } = await query;
    if (error) throw error;

    return {
      data: (data || []) as unknown as Lead[],
      total: count || 0,
      page,
      pageSize,
      totalPages: Math.ceil((count || 0) / pageSize),
    };
  },

  async getAllForBoard(orgId: string, assignedTo?: string): Promise<Lead[]> {
    if (isLocalStorageMode()) {
      return localDb.getLeads(orgId, { assigned_to: assignedTo });
    }

    let query = supabase
      .from('leads')
      .select(`
        *,
        customer:customers(*),
        assigned_salesperson:profiles!leads_assigned_to_fkey(id, first_name, last_name, email, avatar_url),
        product:products(*)
      `)
      .eq('organization_id', orgId)
      .order('created_at', { ascending: false });

    if (assignedTo) {
      query = query.eq('assigned_to', assignedTo);
    }

    const { data, error } = await query;
    if (error) throw error;
    return (data || []) as unknown as Lead[];
  },

  async getById(id: string): Promise<Lead> {
    if (isLocalStorageMode()) {
      const lead = localDb.getById<Lead>('leads', id);
      if (!lead) throw new Error('Lead not found');
      return lead;
    }

    const { data, error } = await supabase
      .from('leads')
      .select(`
        *,
        customer:customers(*),
        assigned_salesperson:profiles!leads_assigned_to_fkey(id, first_name, last_name, email, avatar_url),
        product:products(*)
      `)
      .eq('id', id)
      .single();

    if (error) throw error;
    return data as unknown as Lead;
  },

  async create(orgId: string, input: LeadInput & { title?: string }): Promise<Lead> {
    const title = input.title || `Opportunity - ${input.expected_value ? '₹' + input.expected_value : 'Lead'}`;
    if (isLocalStorageMode()) {
      return localDb.createLead(orgId, {
        customer_id: input.customer_id,
        assigned_to: input.assigned_to || null,
        product_id: input.product_id || null,
        title,
        stage: input.stage || LeadStage.NEW,
        expected_value: input.expected_value || 0,
        probability: input.probability ?? 20,
        expected_close_date: input.expected_close_date || null,
        source: input.lead_source || 'Website',
        lead_source: input.lead_source || 'Website',
        notes: input.notes || null,
      } as any);
    }

    const { data, error } = await supabase
      .from('leads')
      .insert({
        organization_id: orgId,
        customer_id: input.customer_id,
        assigned_to: input.assigned_to || null,
        product_id: input.product_id || null,
        title,
        stage: input.stage || LeadStage.NEW,
        expected_value: input.expected_value || 0,
        probability: input.probability ?? 20,
        expected_close_date: input.expected_close_date || null,
        source: input.lead_source || null,
        notes: input.notes || null,
      })
      .select(`
        *,
        customer:customers(*),
        assigned_salesperson:profiles!leads_assigned_to_fkey(id, first_name, last_name, email),
        product:products(*)
      `)
      .single();

    if (error) throw error;
    return data as unknown as Lead;
  },

  async delete(id: string): Promise<boolean> {
    if (isLocalStorageMode()) {
      return localDb.deleteLead(id);
    }
    const { error } = await supabase.from('leads').delete().eq('id', id);
    if (error) throw error;
    return true;
  },

  async update(id: string, input: Partial<LeadInput> & { title?: string }): Promise<Lead> {
    if (isLocalStorageMode()) {
      return localDb.update<Lead>('leads', id, input as any);
    }

    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };
    if (input.title !== undefined) updates.title = input.title;
    if (input.customer_id !== undefined) updates.customer_id = input.customer_id;
    if (input.assigned_to !== undefined) updates.assigned_to = input.assigned_to;
    if (input.product_id !== undefined) updates.product_id = input.product_id;
    if (input.stage !== undefined) updates.stage = input.stage;
    if (input.expected_value !== undefined) updates.expected_value = input.expected_value;
    if (input.probability !== undefined) updates.probability = input.probability;
    if (input.expected_close_date !== undefined) updates.expected_close_date = input.expected_close_date;
    if (input.lead_source !== undefined) updates.source = input.lead_source;
    if (input.notes !== undefined) updates.notes = input.notes;

    const { data, error } = await supabase
      .from('leads')
      .update(updates)
      .eq('id', id)
      .select(`
        *,
        customer:customers(*),
        assigned_salesperson:profiles!leads_assigned_to_fkey(id, first_name, last_name, email),
        product:products(*)
      `)
      .single();

    if (error) throw error;
    return data as unknown as Lead;
  },

  async updateStage(id: string, stage: LeadStage, userId: string, notes?: string): Promise<Lead> {
    if (isLocalStorageMode()) {
      const updated = localDb.updateLeadStage(id, stage);
      localDb.addLeadActivity(updated.organization_id, id, userId, {
        type: LeadActivityType.NOTE,
        description: `Stage moved to ${stage}${notes ? ': ' + notes : ''}`,
        outcome: 'STAGE_CHANGE',
      });
      return updated;
    }

    // 1. Get current lead
    const current = await this.getById(id);

    // 2. Update stage
    const { data, error } = await supabase
      .from('leads')
      .update({
        stage,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select(`
        *,
        customer:customers(*),
        assigned_salesperson:profiles!leads_assigned_to_fkey(id, first_name, last_name, email),
        product:products(*)
      `)
      .single();

    if (error) throw error;

    // 3. Log activity for stage transition
    await this.addActivity(current.organization_id, id, userId, {
      type: LeadActivityType.NOTE,
      description: `Stage changed from ${current.stage} to ${stage}${notes ? ': ' + notes : ''}`,
      outcome: 'STAGE_CHANGE',
      activity_date: new Date().toISOString(),
    });

    return data as unknown as Lead;
  },

  async getActivities(leadId: string): Promise<LeadActivity[]> {
    if (isLocalStorageMode()) {
      return localDb.getLeadActivities(leadId);
    }

    const { data, error } = await supabase
      .from('lead_activities')
      .select('*, user:profiles(id, first_name, last_name, avatar_url)')
      .eq('lead_id', leadId)
      .order('activity_date', { ascending: false });

    if (error) throw error;
    return (data || []) as unknown as LeadActivity[];
  },

  async addActivity(orgId: string, leadId: string, userId: string, input: LeadActivityInput): Promise<LeadActivity> {
    if (isLocalStorageMode()) {
      return localDb.addLeadActivity(orgId, leadId, userId, input);
    }

    const { data, error } = await supabase
      .from('lead_activities')
      .insert({
        organization_id: orgId,
        lead_id: leadId,
        user_id: userId,
        type: input.type,
        description: input.description || null,
        outcome: input.outcome || null,
        activity_date: input.activity_date || new Date().toISOString(),
      })
      .select('*, user:profiles(id, first_name, last_name, avatar_url)')
      .single();

    if (error) throw error;
    return data as unknown as LeadActivity;
  },

  async getFollowUps(orgId: string, filters: { leadId?: string; userId?: string; status?: FollowUpStatus; filter?: 'today' | 'overdue' | 'upcoming' } = {}): Promise<FollowUp[]> {
    if (isLocalStorageMode()) {
      return localDb.getFollowUps(orgId, filters);
    }

    let query = supabase
      .from('follow_ups')
      .select('*, lead:leads(id, title, customer:customers(first_name, last_name, phone)), user:profiles(id, first_name, last_name)')
      .eq('organization_id', orgId);

    if (filters.leadId) query = query.eq('lead_id', filters.leadId);
    if (filters.userId) query = query.eq('user_id', filters.userId);
    if (filters.status) query = query.eq('status', filters.status);

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999).toISOString();

    if (filters.filter === 'today') {
      query = query.gte('due_date', todayStart).lte('due_date', todayEnd).eq('status', FollowUpStatus.PENDING);
    } else if (filters.filter === 'overdue') {
      query = query.lt('due_date', todayStart).eq('status', FollowUpStatus.PENDING);
    } else if (filters.filter === 'upcoming') {
      query = query.gt('due_date', todayEnd).eq('status', FollowUpStatus.PENDING);
    }

    query = query.order('due_date', { ascending: true });

    const { data, error } = await query;
    if (error) throw error;
    return (data || []) as unknown as FollowUp[];
  },

  async createFollowUp(orgId: string, userId: string, input: FollowUpInput): Promise<FollowUp> {
    if (isLocalStorageMode()) {
      return localDb.createFollowUp(orgId, userId, input);
    }

    const { data, error } = await supabase
      .from('follow_ups')
      .insert({
        organization_id: orgId,
        lead_id: input.lead_id,
        user_id: userId,
        due_date: input.due_date,
        due_time: input.due_time || null,
        reminder: input.reminder || false,
        notes: input.notes || null,
        status: FollowUpStatus.PENDING,
      })
      .select('*, lead:leads(id, title), user:profiles(id, first_name, last_name)')
      .single();

    if (error) throw error;
    return data as unknown as FollowUp;
  },

  async updateFollowUpStatus(id: string, status: FollowUpStatus, completionNotes?: string): Promise<FollowUp> {
    if (isLocalStorageMode()) {
      return localDb.updateFollowUpStatus(id, status, completionNotes);
    }

    const updates: Record<string, unknown> = {
      status,
      updated_at: new Date().toISOString(),
    };
    if (status === FollowUpStatus.COMPLETED) {
      updates.completed_at = new Date().toISOString();
      if (completionNotes) updates.completion_notes = completionNotes;
    }

    const { data, error } = await supabase
      .from('follow_ups')
      .update(updates)
      .eq('id', id)
      .select('*, lead:leads(id, title), user:profiles(id, first_name, last_name)')
      .single();

    if (error) throw error;
    return data as unknown as FollowUp;
  },

  async getLeadSources(orgId: string): Promise<LeadSource[]> {
    if (isLocalStorageMode()) {
      return [
        { id: '1', organization_id: orgId, name: 'Website', is_active: true, created_at: '2026-01-01' },
        { id: '2', organization_id: orgId, name: 'WhatsApp Campaign', is_active: true, created_at: '2026-01-01' },
        { id: '3', organization_id: orgId, name: 'Direct Call', is_active: true, created_at: '2026-01-01' },
        { id: '4', organization_id: orgId, name: 'Referral', is_active: true, created_at: '2026-01-01' },
        { id: '5', organization_id: orgId, name: 'Meta Ads', is_active: true, created_at: '2026-01-01' },
        { id: '6', organization_id: orgId, name: 'Google Search', is_active: true, created_at: '2026-01-01' },
        { id: '7', organization_id: orgId, name: 'Campus Event', is_active: true, created_at: '2026-01-01' },
      ];
    }

    const { data, error } = await supabase
      .from('lead_sources')
      .select('*')
      .eq('organization_id', orgId)
      .eq('is_active', true)
      .order('name');

    if (error) throw error;
    return (data || []) as unknown as LeadSource[];
  },

  async createLeadSource(orgId: string, name: string): Promise<LeadSource> {
    const { data, error } = await supabase
      .from('lead_sources')
      .insert({
        organization_id: orgId,
        name,
        is_active: true,
      })
      .select('*')
      .single();

    if (error) throw error;
    return data as unknown as LeadSource;
  }
};
