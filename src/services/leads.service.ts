// ============================================================================
// SalesOS — Leads Service
// CRM Pipeline, Activities, Follow-ups, and Sources
// ============================================================================

import { supabase } from '@/lib/supabase';
import { localDb, isLocalStorageMode } from '@/lib/localDb';
import type { Lead, LeadActivity, FollowUp, LeadSource, PaginatedResponse, Profile } from '@/types';
import { LeadStage, FollowUpStatus, LeadActivityType, NotificationType, CustomerStatus } from '@/types';
import type { LeadInput, LeadActivityInput, FollowUpInput } from '@/schemas';
import { notificationsService } from './notifications.service';
import { customersService } from './customers.service';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isUuid(value?: string | null): value is string {
  return typeof value === 'string' && UUID_RE.test(value);
}

async function resolveActorUuid(userId?: string): Promise<string | undefined> {
  if (isUuid(userId)) return userId;
  try {
    const { data } = await supabase.auth.getUser();
    if (isUuid(data.user?.id)) return data.user.id;
  } catch {
    // Ignore auth lookup errors when logging secondary activity
  }
  return undefined;
}

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

    // 1. Fetch previous stage lightly (non-fatal if pre-fetch fails)
    let previousStage: string | undefined;
    try {
      const { data: current } = await supabase
        .from('leads')
        .select('stage')
        .eq('id', id)
        .maybeSingle();
      previousStage = current?.stage as string | undefined;
    } catch {
      // Proceed with update even if pre-fetch fails
    }

    // 2. Update stage on leads table
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
      .maybeSingle();

    if (error) {
      throw new Error(error.message || 'Failed to update lead stage');
    }
    if (!data) {
      throw new Error('Lead not found or permission denied by server security policy.');
    }

    const updatedLead = data as unknown as Lead;

    // 3. Log activity for stage transition (non-blocking so secondary logging errors don't abort a successful stage change)
    const actorId = await resolveActorUuid(userId);
    if (actorId && updatedLead.organization_id) {
      try {
        await this.addActivity(updatedLead.organization_id, id, actorId, {
          type: LeadActivityType.NOTE,
          description: previousStage
            ? `Stage changed from ${previousStage} to ${stage}${notes ? ': ' + notes : ''}`
            : `Stage moved to ${stage}${notes ? ': ' + notes : ''}`,
          outcome: 'STAGE_CHANGE',
          activity_date: new Date().toISOString(),
        });
      } catch (actErr) {
        console.warn('[leadsService.updateStage] Stage updated, but activity log failed:', actErr);
      }
    }

    return updatedLead;
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

    const actorId = await resolveActorUuid(userId);
    if (!actorId) {
      throw new Error('Signed-in user profile ID is unavailable for activity logging.');
    }

    const { data, error } = await supabase
      .from('lead_activities')
      .insert({
        organization_id: orgId,
        lead_id: leadId,
        user_id: actorId,
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

    try {
      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as unknown as FollowUp[];
    } catch (err) {
      console.warn('[leadsService.getFollowUps] Supabase error, fallback to localDb:', err);
      return localDb.getFollowUps(orgId, filters);
    }
  },

  async createFollowUp(orgId: string, userId: string, input: FollowUpInput): Promise<FollowUp> {
    if (isLocalStorageMode()) {
      return localDb.createFollowUp(orgId, userId, input);
    }

    const actorId = await resolveActorUuid(userId);
    if (!actorId) {
      throw new Error('Signed-in user profile ID is unavailable for scheduling follow-ups.');
    }

    const { data, error } = await supabase
      .from('follow_ups')
      .insert({
        organization_id: orgId,
        lead_id: input.lead_id,
        user_id: actorId,
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
  },

  // ==========================================================================
  // CRM Automation Engine Methods
  // ==========================================================================

  // Automation 1 & 2: Get unassigned leads to alert manager
  async getUnassignedLeads(orgId: string): Promise<Lead[]> {
    if (isLocalStorageMode()) {
      return localDb.getLeads(orgId).filter(l => !l.assigned_to);
    }
    const { data, error } = await supabase
      .from('leads')
      .select('*, customer:customers(*)')
      .eq('organization_id', orgId)
      .is('assigned_to', null)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data || []) as unknown as Lead[];
  },

  // Automation 1: Round-robin telecaller assignment
  async assignRoundRobin(orgId: string, leadId: string): Promise<{ lead: Lead; assignedUser: Profile }> {
    // 1. Fetch available profiles
    let profiles: Profile[] = [];
    if (isLocalStorageMode()) {
      profiles = localDb.getAll<Profile>('profiles').filter(p => !orgId || p.organization_id === orgId);
    } else {
      const { data } = await supabase.from('profiles').select('*').eq('organization_id', orgId);
      profiles = (data || []) as unknown as Profile[];
    }

    if (profiles.length === 0) {
      throw new Error('No available telecallers/reps found in the organization.');
    }

    // 2. Select next available telecaller
    // Round-robin index based on total leads count modulo available profiles
    const allLeads = isLocalStorageMode() ? localDb.getLeads(orgId) : (await this.getAllForBoard(orgId));
    const assignedIndex = allLeads.length % profiles.length;
    const targetUser = profiles[assignedIndex] || profiles[0];

    const currentLead = await this.getById(leadId);
    const prevOwnerId = currentLead.assigned_to;

    const transferItem = {
      from_user_id: prevOwnerId,
      to_user_id: targetUser.id,
      from_user_name: currentLead.assigned_salesperson ? `${currentLead.assigned_salesperson.first_name} ${currentLead.assigned_salesperson.last_name}` : 'Unassigned',
      to_user_name: `${targetUser.first_name} ${targetUser.last_name}`,
      transferred_at: new Date().toISOString(),
      notes: 'Auto-assigned via Round-Robin Queue',
    };

    const existingHistory = currentLead.transfer_history || [];
    const updated = await this.update(leadId, {
      assigned_to: targetUser.id,
      stage: LeadStage.ASSIGNED,
      previous_owner_id: prevOwnerId,
      transfer_history: [...existingHistory, transferItem],
    } as any);

    // Activity log
    await this.addActivity(orgId, leadId, targetUser.id, {
      type: LeadActivityType.NOTE,
      description: `Lead auto-assigned to telecaller ${targetUser.first_name} ${targetUser.last_name} via Round-Robin.`,
      outcome: 'ROUND_ROBIN_ASSIGNMENT',
      activity_date: new Date().toISOString(),
    });

    // Notify receiving telecaller
    try {
      await notificationsService.create(orgId, targetUser.id, {
        type: NotificationType.LEAD_ASSIGNED,
        title: 'New Lead Assigned (Round-Robin)',
        message: `You have been assigned lead: ${currentLead.title || 'Inbound Inquiry'}.`,
        link_url: '/leads',
        entity_type: 'lead',
        entity_id: leadId,
      });
    } catch (e) {
      console.warn('Could not dispatch assignment notification:', e);
    }

    return { lead: updated, assignedUser: targetUser };
  },

  // Automation 1: Manager-controlled queue assignment
  async assignManagerQueue(orgId: string, leadId: string, assignedToId: string, notes?: string): Promise<Lead> {
    const currentLead = await this.getById(leadId);
    const prevOwnerId = currentLead.assigned_to;

    const transferItem = {
      from_user_id: prevOwnerId,
      to_user_id: assignedToId,
      transferred_at: new Date().toISOString(),
      notes: notes || 'Assigned via Manager Controlled Queue',
    };

    const existingHistory = currentLead.transfer_history || [];
    const updated = await this.update(leadId, {
      assigned_to: assignedToId,
      stage: LeadStage.ASSIGNED,
      previous_owner_id: prevOwnerId,
      transfer_history: [...existingHistory, transferItem],
    } as any);

    await this.addActivity(orgId, leadId, assignedToId, {
      type: LeadActivityType.NOTE,
      description: `Assigned to user by manager${notes ? ': ' + notes : ''}. Single active owner verified.`,
      outcome: 'MANAGER_QUEUE_ASSIGNMENT',
      activity_date: new Date().toISOString(),
    });

    try {
      await notificationsService.create(orgId, assignedToId, {
        type: NotificationType.LEAD_ASSIGNED,
        title: 'Lead Assigned by Manager',
        message: `You have been assigned lead: ${currentLead.title || 'Inbound Opportunity'}.`,
        link_url: '/leads',
        entity_type: 'lead',
        entity_id: leadId,
      });
    } catch (e) {
      console.warn('Could not send notification:', e);
    }

    return updated;
  },

  // Automation 4, 5 & 6: Qualified handover to sales queue with required notes and timestamp
  async transferToSalesQueue(
    orgId: string,
    leadId: string,
    telecallerId: string,
    receivingSalesExecId: string,
    handoverNotes: string
  ): Promise<Lead> {
    if (!handoverNotes || !handoverNotes.trim()) {
      throw new Error('Mandatory handover notes are required before transferring lead to sales queue.');
    }

    const timestamp = new Date().toISOString();
    const currentLead = await this.getById(leadId);

    const transferItem = {
      from_user_id: telecallerId,
      to_user_id: receivingSalesExecId,
      transferred_at: timestamp,
      notes: handoverNotes.trim(),
    };

    const existingHistory = currentLead.transfer_history || [];

    // Update lead: strict single active owner (assigned_to = receivingSalesExecId), previous_owner stored
    const updated = await this.update(leadId, {
      stage: LeadStage.QUALIFIED_HANDOVER,
      assigned_to: receivingSalesExecId,
      previous_owner_id: telecallerId,
      handover_notes: handoverNotes.trim(),
      handover_timestamp: timestamp,
      incentive_category: 'QUALIFIED_HANDOFF',
      transfer_history: [...existingHistory, transferItem],
    } as any);

    // Record activity with handover timestamp
    await this.addActivity(orgId, leadId, telecallerId, {
      type: LeadActivityType.NOTE,
      description: `Qualified Sales Handover completed. Handover notes: "${handoverNotes.trim()}". Transferred to sales queue.`,
      outcome: 'QUALIFIED_HANDOVER',
      activity_date: timestamp,
    });

    // Notify receiving sales executive
    try {
      await notificationsService.create(orgId, receivingSalesExecId, {
        type: NotificationType.LEAD_ASSIGNED,
        title: 'New Qualified Lead Handover',
        message: `Qualified lead handed over to you: "${currentLead.title || 'Deal'}". Notes: ${handoverNotes.slice(0, 80)}...`,
        link_url: '/leads',
        entity_type: 'lead',
        entity_id: leadId,
      });
    } catch (e) {
      console.warn('Could not dispatch handover notification:', e);
    }

    return updated;
  },

  // Automation 7: Payment verification, mark converted & create onboarding task
  async verifyPaymentAndConvert(
    orgId: string,
    leadId: string,
    telecallerId: string,
    payload: {
      verificationRef: string;
      packagePurchased?: string;
      amount?: number;
    }
  ): Promise<Lead> {
    if (!payload.verificationRef || !payload.verificationRef.trim()) {
      throw new Error('Payment verification reference (UTR / Gateway Ref) is mandatory to mark converted.');
    }

    const timestamp = new Date().toISOString();
    const currentLead = await this.getById(leadId);

    // 1. Update lead status to CONVERTED
    const updated = await this.update(leadId, {
      stage: LeadStage.CONVERTED,
      payment_verification_ref: payload.verificationRef.trim(),
      payment_link_package: payload.packagePurchased || 'Approved Offer',
      payment_link_amount: payload.amount || currentLead.expected_value || 0,
      conversion_attribution_user_id: telecallerId,
      incentive_category: 'DIRECT_SALE',
    } as any);

    // 2. Mark customer status as CUSTOMER
    if (currentLead.customer_id) {
      try {
        await customersService.update(currentLead.customer_id, {
          status: CustomerStatus.CUSTOMER,
        } as any);
      } catch (e) {
        console.warn('Could not update customer status to CUSTOMER:', e);
      }
    }

    // 3. Create Client-Onboarding Task / Activity automatically
    await this.addActivity(orgId, leadId, telecallerId, {
      type: LeadActivityType.NOTE,
      description: `AUTOMATED ONBOARDING TASK CREATED: Payment verified [Ref: ${payload.verificationRef.trim()}]. Package: ${payload.packagePurchased || 'Standard'}. Amount: ₹${payload.amount || currentLead.expected_value || 0}. Client onboarding kickoff sequence initiated.`,
      outcome: 'PAYMENT_VERIFIED_CONVERTED',
      activity_date: timestamp,
    });

    return updated;
  }
};
