// ============================================================================
// SalesOS — Gamification Service
// XP, Levels, Achievements, and Live Leaderboard
// ============================================================================

import { supabase } from '@/lib/supabase';
import { localDb, isLocalStorageMode } from '@/lib/localDb';
import type { XPTransaction, Level, Achievement, UserAchievement, LeaderboardEntry } from '@/types';
import { XPSourceType } from '@/types';

export const gamificationService = {
  async getXPTransactions(userId: string, limit = 20): Promise<XPTransaction[]> {
    if (isLocalStorageMode()) {
      return localDb.getAll<XPTransaction>('xp_transactions')
        .filter(t => t.user_id === userId)
        .slice(0, limit);
    }

    const { data, error } = await supabase
      .from('xp_transactions')
      .select('*')
      .eq('user_id', userId)
      .is('reversed_at', null)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return (data || []) as unknown as XPTransaction[];
  },

  async getUserXP(userId: string): Promise<number> {
    if (isLocalStorageMode()) {
      const txs = localDb.getAll<XPTransaction>('xp_transactions')
        .filter(t => t.user_id === userId);
      return txs.reduce((sum, tx) => sum + (Number((tx as any).amount || (tx as any).points) || 0), 0);
    }

    const { data, error } = await supabase
      .from('xp_transactions')
      .select('points')
      .eq('user_id', userId)
      .is('reversed_at', null);

    if (error) throw error;
    return (data || []).reduce((sum, tx) => sum + Number(tx.points || 0), 0);
  },

  async getLevels(orgId: string): Promise<Level[]> {
    if (isLocalStorageMode()) {
      return localDb.getAll<Level>('levels');
    }

    const { data, error } = await supabase
      .from('levels')
      .select('*')
      .eq('organization_id', orgId)
      .order('level_order', { ascending: true });

    if (error) throw error;
    return (data || []) as unknown as Level[];
  },

  async getAchievements(orgId: string): Promise<Achievement[]> {
    if (isLocalStorageMode()) {
      return localDb.getAll<Achievement>('achievements');
    }
    const { data, error } = await supabase
      .from('achievements')
      .select('*')
      .eq('organization_id', orgId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return (data || []) as unknown as Achievement[];
  },

  async getUserAchievements(userId: string): Promise<UserAchievement[]> {
    const { data, error } = await supabase
      .from('user_achievements')
      .select('*, achievement:achievements(*)')
      .eq('user_id', userId)
      .order('unlocked_at', { ascending: false });

    if (error) throw error;
    return (data || []) as unknown as UserAchievement[];
  },

  async getLeaderboard(
    orgId: string,
    metric: 'REVENUE' | 'SALES_COUNT' | 'XP' = 'REVENUE',
    limit = 20
  ): Promise<LeaderboardEntry[]> {
    if (isLocalStorageMode()) {
      return localDb.getLeaderboard(orgId, metric, limit);
    }

    try {
      const { data, error } = await supabase.rpc('get_leaderboard', {
        p_org_id: orgId,
        p_metric: metric,
        p_limit: limit,
      });
      if (!error && data) {
        return data as LeaderboardEntry[];
      }
    } catch (rpcErr) {
      console.warn('RPC get_leaderboard fallback to query calculation:', rpcErr);
    }

    // Client-side fallback if RPC is not yet executed in Supabase DB
    const { data: sales } = await supabase
      .from('sales')
      .select('user_id, total, payment_status, user:profiles(id, first_name, last_name, avatar_url, team:teams(name))')
      .eq('organization_id', orgId)
      .eq('payment_status', 'PAID');

    const userMap = new Map<string, {
      user_id: string;
      first_name: string;
      last_name: string;
      avatar_url: string | null;
      team_name: string | null;
      revenue: number;
      sales_count: number;
    }>();

    (sales || []).forEach(s => {
      const u = s.user as unknown as { id: string; first_name: string; last_name: string; avatar_url: string | null; team?: { name: string } };
      if (!u) return;
      const current = userMap.get(u.id) || {
        user_id: u.id,
        first_name: u.first_name,
        last_name: u.last_name,
        avatar_url: u.avatar_url,
        team_name: u.team?.name || null,
        revenue: 0,
        sales_count: 0,
      };
      current.revenue += Number(s.total || 0);
      current.sales_count += 1;
      userMap.set(u.id, current);
    });

    const entries = Array.from(userMap.values());
    if (metric === 'REVENUE') {
      entries.sort((a, b) => b.revenue - a.revenue);
    } else {
      entries.sort((a, b) => b.sales_count - a.sales_count);
    }

    return entries.slice(0, limit).map((e, idx) => ({
      rank: idx + 1,
      user_id: e.user_id,
      first_name: e.first_name,
      last_name: e.last_name,
      avatar_url: e.avatar_url,
      team_name: e.team_name,
      sales_count: e.sales_count,
      total_sales: e.sales_count,
      revenue: e.revenue,
      total_revenue: e.revenue,
      target_achievement: 100,
      xp: 0,
      total_xp: 0,
    }));
  },

  async awardXP(orgId: string, userId: string, points: number, description: string): Promise<XPTransaction> {
    const { data, error } = await supabase
      .from('xp_transactions')
      .insert({
        organization_id: orgId,
        user_id: userId,
        points,
        source_type: XPSourceType.MANUAL,
        description,
      })
      .select()
      .single();

    if (error) throw error;
    return data as unknown as XPTransaction;
  }
};
