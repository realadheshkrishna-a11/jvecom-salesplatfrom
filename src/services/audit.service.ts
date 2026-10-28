// ============================================================================
// SalesOS — Audit Log Service
// Security, compliance, immutable activity log tracking
// ============================================================================

import { supabase } from '@/lib/supabase';
import { localDb, isLocalStorageMode, generateUUID } from '@/lib/localDb';
import type { AuditLog, PaginatedResponse } from '@/types';
import { AuditAction, EntityType } from '@/types';

interface AuditFilters {
  user_id?: string;
  action?: AuditAction | string;
  entity_type?: EntityType | string;
  date_from?: string;
  date_to?: string;
  page?: number;
  pageSize?: number;
}

export const auditService = {
  async list(orgId: string, filters: AuditFilters = {}): Promise<PaginatedResponse<AuditLog>> {
    if (isLocalStorageMode()) {
      let list = localDb.getAll<AuditLog>('audit_logs');
      return {
        data: list,
        total: list.length,
        page: filters.page || 1,
        pageSize: filters.pageSize || 25,
        totalPages: 1,
      };
    }

    const {
      user_id, action, entity_type, date_from, date_to,
      page = 1, pageSize = 25
    } = filters;

    let query = supabase
      .from('audit_logs')
      .select('*, actor:profiles(id, first_name, last_name, email, avatar_url)', { count: 'exact' })
      .eq('organization_id', orgId);

    if (user_id) query = query.eq('user_id', user_id);
    if (action) query = query.eq('action', action);
    if (entity_type) query = query.eq('entity_type', entity_type);
    if (date_from) query = query.gte('created_at', date_from);
    if (date_to) query = query.lte('created_at', date_to);

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    query = query.order('created_at', { ascending: false }).range(from, to);

    const { data, count, error } = await query;
    if (error) throw error;

    return {
      data: (data || []) as unknown as AuditLog[],
      total: count || 0,
      page,
      pageSize,
      totalPages: Math.ceil((count || 0) / pageSize),
    };
  },

  async log(orgId: string, userId: string, action: AuditAction, entityType: EntityType, entityId?: string, details?: Record<string, unknown>): Promise<void> {
    try {
      if (isLocalStorageMode()) {
        const newLog: AuditLog = {
          id: generateUUID(),
          organization_id: orgId,
          actor_id: userId,
          user_id: userId,
          action,
          entity_type: entityType,
          entity_id: entityId || '',
          details: details || {},
          ip_address: '127.0.0.1',
          created_at: new Date().toISOString(),
        };
        localDb.insert<AuditLog>('audit_logs', newLog);
        return;
      }

      await supabase
        .from('audit_logs')
        .insert({
          organization_id: orgId,
          user_id: userId,
          action,
          entity_type: entityType,
          entity_id: entityId || null,
          details: details || {},
        });
    } catch (err) {
      console.warn('Failed to insert audit log:', err);
    }
  }
};
