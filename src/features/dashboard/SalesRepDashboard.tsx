import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { PageHeader } from '@/components/common/PageHeader';
import { StatCard } from '@/components/common/StatCard';
import { LoadingSpinner } from '@/components/common/EmptyState';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { formatCurrency, formatNumber } from '@/lib/utils';
import { MODULES } from '@/lib/permissions';
import { Link } from 'react-router-dom';
import {
  IndianRupee, Target, Trophy, Award, Zap,
  Clock, Plus, ArrowRight, ShieldCheck, Mail, Users,
  ShoppingCart, Truck, Package, UserCircle, Briefcase,
  BarChart3, CheckCircle2,
} from 'lucide-react';
import { salesService } from '@/services/sales.service';
import { targetsService } from '@/services/targets.service';
import { leadsService } from '@/services/leads.service';
import { customersService } from '@/services/customers.service';
import { gamificationService } from '@/services/gamification.service';
import type { FollowUp, UserAchievement } from '@/types';

export function SalesRepDashboard() {
  const { profile, can, organization } = useAuth();
  const orgId = organization?.id || profile?.organization_id || '11111111-1111-1111-1111-111111111111';

  const [loading, setLoading] = useState(true);
  const [revenue, setRevenue] = useState(0);
  const [dealsClosed, setDealsClosed] = useState(0);
  const [targetAmount, setTargetAmount] = useState(0);
  const [targetAchievement, setTargetAchievement] = useState(0);
  const [activePipelineCount, setActivePipelineCount] = useState(0);
  const [activeCustomersCount, setActiveCustomersCount] = useState(0);
  const [followUps, setFollowUps] = useState<FollowUp[]>([]);
  const [achievements, setAchievements] = useState<UserAchievement[]>([]);
  const [userXP, setUserXP] = useState(0);
  const [userRank, setUserRank] = useState<number | null>(null);

  useEffect(() => {
    let isMounted = true;
    async function loadRealData() {
      if (!profile?.id) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const [
          salesRes,
          targetRes,
          leadsRes,
          custRes,
          followUpsRes,
          achieveRes,
          xpRes,
          lbRes,
        ] = await Promise.allSettled([
          salesService.getStats(orgId, profile.id),
          targetsService.list(orgId, { user_id: profile.id, is_active: true }),
          leadsService.list(orgId, { assigned_to: profile.id }),
          customersService.list(orgId),
          leadsService.getFollowUps(orgId, { userId: profile.id, filter: 'today' }),
          gamificationService.getUserAchievements(profile.id),
          gamificationService.getUserXP(profile.id),
          gamificationService.getLeaderboard(orgId, 'XP', 20),
        ]);

        if (!isMounted) return;

        // Sales & Revenue
        if (salesRes.status === 'fulfilled' && salesRes.value) {
          setRevenue(Number(salesRes.value.totalRevenue) || 0);
          setDealsClosed(Number(salesRes.value.paidSalesCount) || 0);
        }

        // Target Quota
        if (targetRes.status === 'fulfilled' && targetRes.value?.data?.length > 0) {
          const activeTarget = targetRes.value.data[0];
          const amt = Number((activeTarget as any).target_value || (activeTarget as any).target_amount) || 0;
          setTargetAmount(amt);
          const currentProgress = Number((activeTarget as any).current_value || (activeTarget as any).current_amount) || (salesRes.status === 'fulfilled' ? Number(salesRes.value.totalRevenue) : 0);
          setTargetAchievement(amt > 0 ? Math.round((currentProgress / amt) * 100) : 0);
        } else {
          setTargetAmount(0);
          setTargetAchievement(0);
        }

        // CRM Leads
        if (leadsRes.status === 'fulfilled' && leadsRes.value) {
          setActivePipelineCount(Number(leadsRes.value.total) || leadsRes.value.data?.length || 0);
        }

        // Customers
        if (custRes.status === 'fulfilled' && custRes.value) {
          setActiveCustomersCount(Number(custRes.value.total) || custRes.value.data?.length || 0);
        }

        // Today Follow-ups
        if (followUpsRes.status === 'fulfilled' && Array.isArray(followUpsRes.value)) {
          setFollowUps(followUpsRes.value);
        }

        // Achievements
        if (achieveRes.status === 'fulfilled' && Array.isArray(achieveRes.value)) {
          setAchievements(achieveRes.value);
        }

        // XP
        if (xpRes.status === 'fulfilled') {
          setUserXP(Number(xpRes.value) || 0);
        } else if ((profile as any)?.xp) {
          setUserXP(Number((profile as any).xp) || 0);
        }

        // Leaderboard Rank
        if (lbRes.status === 'fulfilled' && Array.isArray(lbRes.value)) {
          const entry = lbRes.value.find((e: any) => e.user_id === profile.id);
          if (entry) {
            setUserRank(entry.rank);
          }
        }
      } catch (err) {
        console.error('Error fetching real employee stats:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadRealData();
    return () => { isMounted = false; };
  }, [profile?.id, orgId]);

  // Level progression derived dynamically from actual userXP
  const getLevelInfo = (xp: number) => {
    if (xp >= 10000) return { rank: 5, name: 'Grandmaster Closer', nextName: 'Legendary Partner', nextXP: 25000, minXP: 10000 };
    if (xp >= 5000) return { rank: 4, name: 'Master Closer', nextName: 'Grandmaster Closer', nextXP: 10000, minXP: 5000 };
    if (xp >= 2500) return { rank: 3, name: 'Senior Closer', nextName: 'Master Closer', nextXP: 5000, minXP: 2500 };
    if (xp >= 1000) return { rank: 2, name: 'Sales Specialist', nextName: 'Senior Closer', nextXP: 2500, minXP: 1000 };
    return { rank: 1, name: 'Sales Associate', nextName: 'Sales Specialist', nextXP: 1000, minXP: 0 };
  };

  const currentLevel = getLevelInfo(userXP);
  const xpSpan = currentLevel.nextXP - currentLevel.minXP;
  const xpIntoLevel = Math.max(0, userXP - currentLevel.minXP);
  const xpProgress = xpSpan > 0 ? Math.min(100, Math.round((xpIntoLevel / xpSpan) * 100)) : 0;

  // Filter modules assigned to this user (excluding dashboard itself)
  const myAssignedModules = MODULES.filter(m => m.id !== 'dashboard' && can(m.id));

  if (loading) {
    return <LoadingSpinner text="Loading your personal sales workspace..." />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Hello, ${profile?.first_name || 'Champion'}!`}
        subtitle="Here is your personalized sales workspace, customized to your assigned role and modules."
      >
        <div className="flex items-center gap-2 flex-wrap">
          {can('sales') && (
            <Button asChild size="sm" className="gap-2 shadow-sm">
              <Link to="/sales/create">
                <Plus className="w-4 h-4" /> New Sale
              </Link>
            </Button>
          )}
          {can('crm') && (
            <Button asChild variant="outline" size="sm" className="gap-2">
              <Link to="/leads">
                <Plus className="w-4 h-4" /> New Lead
              </Link>
            </Button>
          )}
          {can('b2b-orders') && (
            <Button asChild variant="outline" size="sm" className="gap-2">
              <Link to="/b2b-orders">
                <Truck className="w-4 h-4" /> B2B Orders
              </Link>
            </Button>
          )}
          {can('mail') && (
            <Button asChild variant="outline" size="sm" className="gap-2">
              <Link to="/mail">
                <Mail className="w-4 h-4" /> Inbox
              </Link>
            </Button>
          )}
        </div>
      </PageHeader>

      {/* Gamification Level Banner (Only shown if gamification / leaderboard is granted) */}
      {(can('gamification') || can('leaderboard')) && (
        <Card className="bg-gradient-to-r from-blue-950/40 via-indigo-950/30 to-purple-950/40 border-blue-800/40 shadow-sm">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white shadow-lg shadow-blue-500/30 shrink-0">
                  <Trophy className="w-7 h-7" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-blue-500/20 text-blue-400 border border-blue-500/30">
                      Level {currentLevel.rank} • {currentLevel.name}
                    </span>
                    {can('leaderboard') && (
                      <span className="text-xs text-muted-foreground">
                        {userRank ? `Rank #${userRank} Leaderboard` : 'Unranked'}
                      </span>
                    )}
                  </div>
                  <h3 className="text-xl font-bold text-foreground mt-1">
                    {formatNumber(userXP)} XP Total
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Only <span className="text-primary font-bold">{Math.max(0, currentLevel.nextXP - userXP)} XP</span> to reach Level {currentLevel.rank + 1}: {currentLevel.nextName}
                  </p>
                </div>
              </div>

              <div className="w-full md:w-64 space-y-2">
                <div className="flex justify-between text-xs font-semibold">
                  <span>Progress to {currentLevel.nextName}</span>
                  <span>{xpProgress}%</span>
                </div>
                <Progress value={xpProgress} className="h-2.5" />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Dynamic KPI Cards — Real data from live services */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {can('sales') && (
          <StatCard
            title="Revenue Generated"
            value={formatCurrency(revenue)}
            description={`${dealsClosed} deals closed`}
            icon={<IndianRupee className="w-5 h-5" />}
            variant="success"
          />
        )}
        {can('targets') && (
          <StatCard
            title="Target Quota"
            value={`${targetAchievement}%`}
            description={targetAmount > 0 ? `${formatCurrency(revenue)} / ${formatCurrency(targetAmount)}` : 'No active target set'}
            icon={<Target className="w-5 h-5" />}
            variant="primary"
          />
        )}
        {can('crm') && !can('sales') && (
          <StatCard
            title="Active Pipeline"
            value={`${activePipelineCount} ${activePipelineCount === 1 ? 'Lead' : 'Leads'}`}
            description="Assigned in CRM"
            icon={<Target className="w-5 h-5" />}
            variant="primary"
          />
        )}
        {can('customers') && (
          <StatCard
            title="Active Accounts"
            value={`${activeCustomersCount} ${activeCustomersCount === 1 ? 'Client' : 'Clients'}`}
            description="All business accounts"
            icon={<UserCircle className="w-5 h-5" />}
            variant="default"
          />
        )}
      </div>

      {/* Main Grid: Modules Launcher + Follow-ups / Badges */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Permitted Modules Launcher */}
        <Card className="lg:col-span-2 border-border/60">
          <CardHeader className="pb-3 border-b border-border/60">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-primary" />
                  Your Permitted Workspace Modules
                </CardTitle>
                <CardDescription>
                  Access granted by your Organization Administrator
                </CardDescription>
              </div>
              <Badge variant="outline" className="text-xs font-mono">
                {myAssignedModules.length} Modules Active
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {myAssignedModules.map((mod) => (
                <Link
                  key={mod.id}
                  to={mod.path}
                  className="group flex items-start gap-3 p-3.5 rounded-xl border border-border/70 hover:border-primary/50 hover:bg-primary/5 transition-all bg-card"
                >
                  <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0 group-hover:bg-primary group-hover:text-white transition-colors">
                    {mod.id === 'crm' && <Target className="w-4 h-4" />}
                    {mod.id === 'sales' && <ShoppingCart className="w-4 h-4" />}
                    {mod.id === 'b2b-orders' && <Truck className="w-4 h-4" />}
                    {mod.id === 'products' && <Package className="w-4 h-4" />}
                    {mod.id === 'customers' && <UserCircle className="w-4 h-4" />}
                    {mod.id === 'mail' && <Mail className="w-4 h-4" />}
                    {mod.id === 'targets' && <Target className="w-4 h-4" />}
                    {mod.id === 'leaderboard' && <Trophy className="w-4 h-4" />}
                    {mod.id === 'gamification' && <Zap className="w-4 h-4" />}
                    {mod.id === 'employees' && <Users className="w-4 h-4" />}
                    {mod.id === 'teams' && <Briefcase className="w-4 h-4" />}
                    {!['crm', 'sales', 'b2b-orders', 'products', 'customers', 'mail', 'targets', 'leaderboard', 'gamification', 'employees', 'teams'].includes(mod.id) && (
                      <ShieldCheck className="w-4 h-4" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
                        {mod.label}
                      </span>
                      <ArrowRight className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">
                      {mod.description}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Side Column: Real Follow-ups or Achievements */}
        <div className="space-y-6">
          {can('crm') && (
            <Card className="border-border/60">
              <CardHeader className="pb-2 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <Clock className="w-4 h-4 text-primary" />
                    Today's Follow-ups
                  </CardTitle>
                  <CardDescription>Scheduled prospect calls</CardDescription>
                </div>
                <Button variant="ghost" size="sm" asChild>
                  <Link to="/leads" className="text-xs text-primary">View Board</Link>
                </Button>
              </CardHeader>
              <CardContent className="pt-2">
                {followUps.length > 0 ? (
                  <div className="space-y-2.5">
                    {followUps.slice(0, 3).map((fu) => {
                      const custName = (fu.lead as any)?.customer
                        ? `${(fu.lead as any).customer.first_name} ${(fu.lead as any).customer.last_name || ''}`
                        : (fu.lead as any)?.title || 'Scheduled Prospect';
                      const timeStr = fu.due_date ? new Date(fu.due_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Today';
                      return (
                        <div
                          key={fu.id}
                          className="p-3 rounded-lg bg-card border border-border/60 space-y-1"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold truncate">{custName}</span>
                            <Badge variant="outline" className="text-[10px] shrink-0">{timeStr}</Badge>
                          </div>
                          <p className="text-[11px] text-muted-foreground line-clamp-1">{fu.notes || 'Prospect follow-up'}</p>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="py-6 px-3 text-center border border-dashed border-border/70 rounded-lg">
                    <CheckCircle2 className="w-7 h-7 text-emerald-500/80 mx-auto mb-1.5" />
                    <p className="text-xs font-semibold text-foreground">No Follow-ups Pending</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      You are all caught up on scheduled calls and prospect meetings.
                    </p>
                    <Button variant="ghost" size="sm" asChild className="mt-2 h-7 text-xs text-primary">
                      <Link to="/leads">Open CRM Leads</Link>
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {can('gamification') && (
            <Card className="border-border/60">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <Award className="w-4 h-4 text-purple-500" />
                  Recent Badges
                </CardTitle>
                <CardDescription>Milestones unlocked</CardDescription>
              </CardHeader>
              <CardContent className="pt-2">
                {achievements.length > 0 ? (
                  <div className="space-y-2">
                    {achievements.slice(0, 3).map((a) => (
                      <div key={a.id} className="flex items-center gap-2.5 p-2 rounded-lg bg-muted/30">
                        <Award className="w-4 h-4 text-purple-500 shrink-0" />
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-semibold text-foreground truncate">
                            {(a.achievement as any)?.name || 'Achievement Unlocked'}
                          </p>
                          <p className="text-[10px] text-muted-foreground truncate">
                            {(a.achievement as any)?.description || 'Milestone achieved'}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-6 px-3 text-center border border-dashed border-border/70 rounded-lg">
                    <Trophy className="w-7 h-7 text-muted-foreground/40 mx-auto mb-1.5" />
                    <p className="text-xs font-semibold text-foreground">No Badges Unlocked Yet</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      Close sales deals and achieve target milestones to earn achievement badges.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

export default SalesRepDashboard;
