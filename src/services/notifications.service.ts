// ============================================================================
// SalesOS — Notifications Service
// Real-time alerts, reminders, milestone announcements, and unread counts
// ============================================================================

import { supabase } from '@/lib/supabase';
import { localDb, isLocalStorageMode } from '@/lib/localDb';
import type { Notification } from '@/types';
import { NotificationType } from '@/types';

export const notificationsService = {
  async list(userId: string, limit = 50): Promise<Notification[]> {
    if (isLocalStorageMode()) {
      return localDb.getAll<Notification>('notifications')
        .filter(n => n.user_id === userId)
        .slice(0, limit);
    }

    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return (data || []) as unknown as Notification[];
  },

  async getUnreadCount(userId: string): Promise<number> {
    if (isLocalStorageMode()) {
      return localDb.getAll<Notification>('notifications')
        .filter(n => n.user_id === userId && !n.is_read && !n.read).length;
    }
    const { count, error } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('is_read', false);

    if (error) return 0;
    return count || 0;
  },

  async markAsRead(id: string): Promise<void> {
    const { error } = await supabase
      .from('notifications')
      .update({
        is_read: true,
        read_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (error) throw error;
  },

  async markAllAsRead(userId: string): Promise<void> {
    const { error } = await supabase
      .from('notifications')
      .update({
        is_read: true,
        read_at: new Date().toISOString(),
      })
      .eq('user_id', userId)
      .eq('is_read', false);

    if (error) throw error;
  },

  async create(orgId: string, userId: string, payload: {
    type: NotificationType;
    title: string;
    message: string;
    link_url?: string;
    entity_type?: string;
    entity_id?: string;
  }): Promise<Notification> {
    if (isLocalStorageMode()) {
      const newNotif = {
        id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        organization_id: orgId,
        user_id: userId,
        type: payload.type,
        title: payload.title,
        message: payload.message,
        link_url: payload.link_url || null,
        entity_type: payload.entity_type || null,
        entity_id: payload.entity_id || null,
        is_read: false,
        created_at: new Date().toISOString(),
      };
      return localDb.insert<Notification>('notifications', newNotif as any);
    }

    const { data, error } = await supabase
      .from('notifications')
      .insert({
        organization_id: orgId,
        user_id: userId,
        type: payload.type,
        title: payload.title,
        message: payload.message,
        link_url: payload.link_url || null,
        entity_type: payload.entity_type || null,
        entity_id: payload.entity_id || null,
        is_read: false,
      })
      .select()
      .single();

    if (error) throw error;
    return data as unknown as Notification;
  }
};
