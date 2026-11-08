import type { Team, Profile } from '@/types';

export interface TeamActivityItem {
  id: string;
  team_id: string;
  team_name: string;
  type: 'member_added' | 'member_removed' | 'member_transferred' | 'lead_assigned' | 'target_updated' | 'target_achieved' | 'sale_closed' | 'call_completed';
  title: string;
  description: string;
  actor_name: string;
  actor_id?: string;
  timestamp: string;
  badge?: string;
}

export interface TelecallingMetrics {
  totalCalls: number;
  leadsContacted: number;
  qualifiedLeads: number;
  followUpsCompleted: number;
  appointmentsScheduled: number;
  firstCallConversionsRate: number; // percentage
  targetQualifiedLeads: number;
  achievementRate: number;
}

export interface SalesClosingMetrics {
  leadsReceived: number;
  consultationsCompleted: number;
  demonstrationsConducted: number;
  followUpsCompleted: number;
  successfulSales: number;
  lostOpportunities: number;
  revenueGenerated: number;
  closeRate: number; // percentage
  targetRevenue: number;
  achievementRate: number;
}

export interface TeamTargetRecord {
  id: string;
  team_id: string;
  team_name: string;
  user_id?: string | null;
  user_name?: string | null;
  scope: 'TEAM' | 'INDIVIDUAL';
  period: 'DAILY' | 'WEEKLY' | 'MONTHLY';
  type: 'REVENUE' | 'QUALIFIED_LEADS' | 'CLOSURES' | 'CALLS';
  target_value: number;
  current_value: number;
  unit: string;
  start_date: string;
  end_date: string;
}

