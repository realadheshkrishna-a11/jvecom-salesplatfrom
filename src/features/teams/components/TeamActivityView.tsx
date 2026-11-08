import { useState, useEffect, useMemo } from 'react';
import type { TeamActivityItem } from '../types';
import { useAuth } from '@/lib/auth';
import { auditService } from '@/services/audit.service';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Activity,
  UserPlus,
  ArrowRightLeft,
  Target,
  PhoneCall,
  DollarSign,
  Clock,
  Search,
} from 'lucide-react';

export function TeamActivityView() {
  const { organization } = useAuth();
  const orgId = organization?.id || '';

  const [filterType, setFilterType] = useState<string>('ALL');
  const [search, setSearch] = useState('');
  const [activities, setActivities] = useState<TeamActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function loadActivities() {
      try {
        setLoading(true);
        const res = await auditService.list(orgId, { pageSize: 50 });
        if (cancelled) return;
        const mapped: TeamActivityItem[] = (res.data || []).map((log: any) => ({
          id: log.id,
          team_id: log.details?.team_id || '',
          team_name: log.details?.team_name || 'Team Action',
          type: log.action === 'CREATE' ? 'member_added' : log.action === 'UPDATE' ? 'target_updated' : 'member_transferred',
          title: log.entity_name ? `${log.action} on ${log.entity_name}` : `${log.action} on ${log.entity_type}`,
          description: log.details?.description || `Action ${log.action} performed on ${log.entity_type}`,
          actor_name: log.actor_name || 'Team Member',
          timestamp: new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          badge: log.entity_type,
        }));
        setActivities(mapped);
      } catch (err) {
        console.warn('Loading audit activities notice:', err);
        setActivities([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadActivities();
    return () => {
      cancelled = true;
    };
  }, [orgId]);

  const filteredActivities = useMemo(() => {
    return activities.filter((act) => {
      const matchType = filterType === 'ALL' || act.type === filterType;
      const q = search.toLowerCase();
      const matchSearch =
        act.title.toLowerCase().includes(q) ||
        act.description.toLowerCase().includes(q) ||
        act.actor_name.toLowerCase().includes(q) ||
        act.team_name.toLowerCase().includes(q);
      return matchType && matchSearch;
    });
  }, [activities, filterType, search]);

  const getIcon = (type: TeamActivityItem['type']) => {
    switch (type) {
      case 'sale_closed':
        return <DollarSign className="w-4 h-4 text-emerald-500" />;
      case 'lead_assigned':
      case 'member_transferred':
        return <ArrowRightLeft className="w-4 h-4 text-blue-500" />;
      case 'call_completed':
        return <PhoneCall className="w-4 h-4 text-cyan-500" />;
      case 'target_achieved':
      case 'target_updated':
        return <Target className="w-4 h-4 text-purple-500" />;
      case 'member_added':
      case 'member_removed':
        return <UserPlus className="w-4 h-4 text-amber-500" />;
      default:
        return <Activity className="w-4 h-4 text-primary" />;
    }
  };

  return (
    <div className="space-y-4">
      {/* Header and Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-bold text-foreground flex items-center gap-2">
            <Activity className="w-4 h-4 text-primary" />
            Squad Activity &amp; Audit Stream
          </h3>
          <p className="text-xs text-muted-foreground">
            Live feed of verified employee achievements, roster assignments, target updates, and lead flow.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative w-48 sm:w-64">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-muted-foreground" />
            <Input
              placeholder="Search feed..."
              className="pl-8 h-8 text-xs bg-card"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-40 h-8 text-xs bg-card">
              <SelectValue placeholder="All Activities" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Event Types</SelectItem>
              <SelectItem value="sale_closed">Deals Closed</SelectItem>
              <SelectItem value="lead_assigned">Lead Transfers</SelectItem>
              <SelectItem value="call_completed">Calls &amp; Outreach</SelectItem>
              <SelectItem value="target_achieved">Target Milestones</SelectItem>
              <SelectItem value="member_added">Roster Updates</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Activity Timeline List */}
      <div className="space-y-3">
        {filteredActivities.length === 0 ? (
          <Card className="p-8 text-center space-y-2 border-border/70">
            <Activity className="w-8 h-8 text-muted-foreground mx-auto opacity-50" />
            <p className="text-sm font-semibold text-foreground">No recent team activities</p>
            <p className="text-xs text-muted-foreground">
              Roster changes, lead allocations, and closed deals will automatically appear here as reps work in the CRM.
            </p>
          </Card>
        ) : (
          filteredActivities.map((act) => (
            <Card key={act.id} className="border-border/60 hover:shadow-xs transition-all">
              <CardContent className="p-4 flex items-start gap-3.5">
                <div className="p-2 rounded-xl bg-muted shrink-0 mt-0.5">
                  {getIcon(act.type)}
                </div>

                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm text-foreground">
                        {act.title}
                      </span>
                      {act.badge && (
                        <Badge variant="outline" className="text-[10px] py-0 px-1.5">
                          {act.badge}
                        </Badge>
                      )}
                    </div>
                    <span className="text-[11px] text-muted-foreground flex items-center gap-1 font-mono">
                      <Clock className="w-3 h-3" /> {act.timestamp}
                    </span>
                  </div>

                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {act.description}
                  </p>

                  <div className="flex items-center gap-3 pt-1 text-[11px] text-muted-foreground flex-wrap">
                    <span>
                      Actor: <strong className="text-foreground">{act.actor_name}</strong>
                    </span>
                    <span>•</span>
                    <span>
                      Squad: <span className="font-medium text-primary">{act.team_name}</span>
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
