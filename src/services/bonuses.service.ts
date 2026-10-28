// ============================================================================
// SalesOS — Bonuses Service
// Performance Bonus Rules, Eligibility and Disbursement Records
// ============================================================================

import { supabase } from '@/lib/supabase';
import { localDb, isLocalStorageMode, generateUUID } from '@/lib/localDb';
import type { BonusRule, BonusRecord, PaginatedResponse } from '@/types';
import { CompensationStatus, BonusConditionType, TargetPeriod } from '@/types';
import type { BonusRuleInput } from '@/schemas';

interface BonusFilters {
  user_id?: string;
  status?: CompensationStatus | string;
  page?: number;
  pageSize?: number;
}

export const bonusesService = {
  async getRules(orgId: string): Promise<BonusRule[]> {
    if (isLocalStorageMode()) {
      return localDb.getAll<BonusRule>('bonus_rules');
    }

    const { data, error } = await supabase
      .from('bonus_rules')
      .select('*, product:products(id, name), team:teams(id, name)')
      .eq('organization_id', orgId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []) as unknown as BonusRule[];
  },

  async createRule(orgId: string, input: BonusRuleInput): Promise<BonusRule> {
    if (isLocalStorageMode()) {
      const newRule: BonusRule = {
        id: generateUUID(),
        organization_id: orgId,
        name: input.name,
        condition_type: input.condition_type as BonusConditionType,
        condition_value: input.condition_value,
        bonus_amount: input.bonus_amount,
        period: input.period as TargetPeriod,
        product_id: input.product_id || null,
        team_id: input.team_id || null,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      return localDb.insert<BonusRule>('bonus_rules', newRule);
    }

    const { data, error } = await supabase
      .from('bonus_rules')
      .insert({
        organization_id: orgId,
        name: input.name,
        condition_type: input.condition_type,
        condition_value: input.condition_value,
        bonus_amount: input.bonus_amount,
        period: input.period,
        product_id: input.product_id || null,
        team_id: input.team_id || null,
        is_active: true,
      })
      .select('*, product:products(id, name)')
      .single();

    if (error) throw error;
    return data as unknown as BonusRule;
  },

  async updateRule(id: string, input: Partial<BonusRuleInput>): Promise<BonusRule> {
    if (isLocalStorageMode()) {
      return localDb.update<BonusRule>('bonus_rules', id, {
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.condition_type !== undefined ? { condition_type: input.condition_type as BonusConditionType } : {}),
        ...(input.condition_value !== undefined ? { condition_value: input.condition_value } : {}),
        ...(input.bonus_amount !== undefined ? { bonus_amount: input.bonus_amount } : {}),
        ...(input.period !== undefined ? { period: input.period as TargetPeriod } : {}),
        updated_at: new Date().toISOString(),
      } as any);
    }

    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };
    if (input.name !== undefined) updates.name = input.name;
    if (input.condition_type !== undefined) updates.condition_type = input.condition_type;
    if (input.condition_value !== undefined) updates.condition_value = input.condition_value;
    if (input.bonus_amount !== undefined) updates.bonus_amount = input.bonus_amount;
    if (input.period !== undefined) updates.period = input.period;

    const { data, error } = await supabase
      .from('bonus_rules')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as unknown as BonusRule;
  },

  async deleteRule(id: string): Promise<void> {
    if (isLocalStorageMode()) {
      localDb.delete('bonus_rules', id);
      return;
    }

    const { error } = await supabase
      .from('bonus_rules')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  async getRecords(orgId: string, filters: BonusFilters = {}): Promise<PaginatedResponse<BonusRecord>> {
    if (isLocalStorageMode()) {
      let list = localDb.getAll<BonusRecord>('bonus_records');
      if (filters.user_id) list = list.filter(b => b.user_id === filters.user_id);
      if (filters.status) list = list.filter(b => b.status === filters.status);
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
      .from('bonus_records')
      .select(`
        *,
        user:profiles(id, first_name, last_name, avatar_url),
        rule:bonus_rules(id, name, condition_type, bonus_amount)
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
      data: (data || []) as unknown as BonusRecord[],
      total: count || 0,
      page,
      pageSize,
      totalPages: Math.ceil((count || 0) / pageSize),
    };
  },

  async updateStatus(id: string, status: CompensationStatus): Promise<BonusRecord> {
    if (isLocalStorageMode()) {
      const updates: Partial<BonusRecord> = {
        status,
        updated_at: new Date().toISOString(),
        ...(status === CompensationStatus.PAID ? { paid_at: new Date().toISOString() } : {}),
      };
      return localDb.update<BonusRecord>('bonus_records', id, updates as any);
    }

    const updates: Record<string, unknown> = {
      status,
      updated_at: new Date().toISOString(),
    };
    if (status === CompensationStatus.PAID) {
      updates.paid_at = new Date().toISOString();
    }

    const { data, error } = await supabase
      .from('bonus_records')
      .update(updates)
      .eq('id', id)
      .select('*, user:profiles(id, first_name, last_name)')
      .single();

    if (error) throw error;
    return data as unknown as BonusRecord;
  }
};
