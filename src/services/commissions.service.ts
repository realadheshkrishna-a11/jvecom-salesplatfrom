// ============================================================================
// SalesOS — Commissions Service
// Commission rules, auto-calculation, and approval/payment workflows
// ============================================================================

import { supabase } from '@/lib/supabase';
import { localDb, isLocalStorageMode, generateUUID } from '@/lib/localDb';
import type { CommissionRule, CommissionRecord, PaginatedResponse } from '@/types';
import { CompensationStatus, CommissionRuleType } from '@/types';
import type { CommissionRuleInput } from '@/schemas';

interface CommissionFilters {
  user_id?: string;
  status?: CompensationStatus | string;
  page?: number;
  pageSize?: number;
}

export const commissionsService = {
  async getRules(orgId: string): Promise<CommissionRule[]> {
    if (isLocalStorageMode()) {
      return localDb.getAll<CommissionRule>('commission_rules');
    }

    const { data, error } = await supabase
      .from('commission_rules')
      .select('*, product:products(id, name), user:profiles(id, first_name, last_name), team:teams(id, name)')
      .eq('organization_id', orgId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []) as unknown as CommissionRule[];
  },

  async createRule(orgId: string, input: CommissionRuleInput): Promise<CommissionRule> {
    if (isLocalStorageMode()) {
      const newRule: CommissionRule = {
        id: generateUUID(),
        organization_id: orgId,
        rule_name: input.name,
        name: input.name,
        type: input.type as CommissionRuleType,
        rate: input.rate,
        product_id: input.product_id || null,
        user_id: input.user_id || null,
        team_id: input.team_id || null,
        tier_min: input.tier_min || null,
        tier_max: input.tier_max || null,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      return localDb.insert<CommissionRule>('commission_rules', newRule);
    }

    const { data, error } = await supabase
      .from('commission_rules')
      .insert({
        organization_id: orgId,
        rule_name: input.name,
        type: input.type,
        rate: input.rate,
        product_id: input.product_id || null,
        user_id: input.user_id || null,
        team_id: input.team_id || null,
        tier_min: input.tier_min || null,
        tier_max: input.tier_max || null,
        is_active: true,
      })
      .select('*, product:products(id, name)')
      .single();

    if (error) throw error;
    return data as unknown as CommissionRule;
  },

  async updateRule(id: string, input: Partial<CommissionRuleInput>): Promise<CommissionRule> {
    if (isLocalStorageMode()) {
      return localDb.update<CommissionRule>('commission_rules', id, {
        ...(input.name !== undefined ? { rule_name: input.name, name: input.name } : {}),
        ...(input.type !== undefined ? { type: input.type as CommissionRuleType } : {}),
        ...(input.rate !== undefined ? { rate: input.rate } : {}),
        ...(input.product_id !== undefined ? { product_id: input.product_id } : {}),
        ...(input.tier_min !== undefined ? { tier_min: input.tier_min } : {}),
        ...(input.tier_max !== undefined ? { tier_max: input.tier_max } : {}),
        updated_at: new Date().toISOString(),
      } as any);
    }

    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };
    if (input.name !== undefined) updates.rule_name = input.name;
    if (input.type !== undefined) updates.type = input.type;
    if (input.rate !== undefined) updates.rate = input.rate;
    if (input.product_id !== undefined) updates.product_id = input.product_id;
    if (input.tier_min !== undefined) updates.tier_min = input.tier_min;
    if (input.tier_max !== undefined) updates.tier_max = input.tier_max;

    const { data, error } = await supabase
      .from('commission_rules')
      .update(updates)
      .eq('id', id)
      .select('*, product:products(id, name)')
      .single();

    if (error) throw error;
    return data as unknown as CommissionRule;
  },

  async deleteRule(id: string): Promise<void> {
    if (isLocalStorageMode()) {
      localDb.delete('commission_rules', id);
      return;
    }

    const { error } = await supabase
      .from('commission_rules')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  async getRecords(orgId: string, filters: CommissionFilters = {}): Promise<PaginatedResponse<CommissionRecord>> {
    if (isLocalStorageMode()) {
      let list = localDb.getAll<CommissionRecord>('commission_records');
      if (filters.user_id) list = list.filter(c => c.user_id === filters.user_id);
      if (filters.status) list = list.filter(c => c.status === filters.status);
      return {
        data: list,
        total: list.length,
        page: filters.page || 1,
        pageSize: filters.pageSize || 25,
        totalPages: 1,
      };
    }

    const { user_id, status, page = 1, pageSize = 25 } = filters;

    let query = supabase
      .from('commission_records')
      .select(`
        *,
        user:profiles(id, first_name, last_name, avatar_url, team_id),
        sale:sales(id, invoice_number, total, sale_date, customer:customers(first_name, last_name)),
        rule:commission_rules(id, rule_name, type, rate)
      `, { count: 'exact' })
      .eq('organization_id', orgId);

    if (user_id) query = query.eq('user_id', user_id);
    if (status) query = query.eq('status', status);

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    query = query.order('created_at', { ascending: false }).range(from, to);

    const { data, count, error } = await query;
    if (error) throw error;

    return {
      data: (data || []) as unknown as CommissionRecord[],
      total: count || 0,
      page,
      pageSize,
      totalPages: Math.ceil((count || 0) / pageSize),
    };
  },

  async updateStatus(id: string, status: CompensationStatus): Promise<CommissionRecord> {
    if (isLocalStorageMode()) {
      const updates: Partial<CommissionRecord> = {
        status,
        updated_at: new Date().toISOString(),
        ...(status === CompensationStatus.PAID ? { paid_at: new Date().toISOString() } : {}),
        ...(status === CompensationStatus.APPROVED ? { approved_at: new Date().toISOString() } : {}),
      };
      return localDb.update<CommissionRecord>('commission_records', id, updates as any);
    }

    const updates: Record<string, unknown> = {
      status,
      updated_at: new Date().toISOString(),
    };
    if (status === CompensationStatus.PAID) {
      updates.paid_at = new Date().toISOString();
    }

    const { data, error } = await supabase
      .from('commission_records')
      .update(updates)
      .eq('id', id)
      .select('*, user:profiles(id, first_name, last_name), sale:sales(id, invoice_number, total)')
      .single();

    if (error) throw error;
    return data as unknown as CommissionRecord;
  }
};
