import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { PageHeader } from '@/components/common/PageHeader';
import { StatCard } from '@/components/common/StatCard';
import { LoadingSpinner } from '@/components/common/EmptyState';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib/utils';
import { MODULES } from '@/lib/permissions';
import { Link } from 'react-router-dom';
import {
  IndianRupee, Target, Users, TrendingUp,
  ShieldCheck, ArrowRight, ShoppingCart, Truck, Package, UserCircle,
  Mail, Trophy, Zap, BarChart3, Briefcase, Users2,
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { salesService } from '@/services/sales.service';
import { targetsService } from '@/services/targets.service';
import { teamsService } from '@/services/teams.service';
import { employeesService } from '@/services/employees.service';
import type { Profile, Sale } from '@/types';

interface RepMetric {
  name: string;
  deals: number;
  revenue: number;
  target: number;
  pct: number;
  status: string;
}

export function ManagerDashboard() {
  const { profile, can, organization } = useAuth();
  const orgId = organization?.id || profile?.organization_id || '11111111-1111-1111-1111-111111111111';

  const [loading, setLoading] = useState(true);
  const [teamName, setTeamName] = useState(profile?.team?.name || 'Your Sales Team');
  const [revenue, setRevenue] = useState(0);
  const [targetAmount, setTargetAmount] = useState(0);
  const [achievement, setAchievement] = useState(0);
  const [activeRepsCount, setActiveRepsCount] = useState(0);
  const [dealsClosed, setDealsClosed] = useState(0);
  const [repPerformance, setRepPerformance] = useState<RepMetric[]>([]);

  useEffect(() => {
    let isMounted = true;

    async function loadTeamData() {
      try {
        setLoading(true);

        const teamId = profile?.team_id;

        const [teamRes, targetsRes, salesRes, empsRes] = await Promise.allSettled([
          teamId ? teamsService.getById(teamId) : Promise.resolve(null),
          teamId ? targetsService.list(orgId, { team_id: teamId, is_active: true }) : Promise.resolve({ data: [] }),
          teamId ? salesService.list(orgId, { team_id: teamId, pageSize: 100 }) : salesService.list(orgId, { pageSize: 100 }),
          teamId ? employeesService.list(orgId, { team_id: teamId }) : employeesService.list(orgId, { role: 'SALES_REP' }),
        ]);

        if (!isMounted) return;

        // Team info
        if (teamRes.status === 'fulfilled' && teamRes.value) {
          setTeamName(teamRes.value.name);
        } else if (profile?.team?.name) {
          setTeamName(profile.team.name);
        }

        // Team Target
        let tAmt = 0;
        if (targetsRes.status === 'fulfilled' && targetsRes.value?.data && targetsRes.value.data.length > 0) {
          const t0 = targetsRes.value.data[0] as any;
          tAmt = Number(t0.target_value || t0.target_amount) || 0;
          setTargetAmount(tAmt);
        } else {
          setTargetAmount(0);
        }

        // Team Sales
        const sales: Sale[] = (salesRes.status === 'fulfilled' && salesRes.value?.data) ? salesRes.value.data : [];
        const paidSales = sales.filter(s => s.payment_status === 'PAID');
        const totRev = paidSales.reduce((sum, s) => sum + (Number(s.total) || 0), 0);
        setRevenue(totRev);
        setDealsClosed(paidSales.length);

        if (tAmt > 0) {
          setAchievement(Math.round((totRev / tAmt) * 100));
        } else {
          setAchievement(0);
        }

        // Team Members
        const members: Profile[] = (empsRes.status === 'fulfilled' && empsRes.value?.data) ? empsRes.value.data : [];
        setActiveRepsCount(members.length);

        // Calculate individual rep breakdown
        const metrics: RepMetric[] = members.map(m => {
          const mSales = paidSales.filter(s => s.user_id === m.id);
          const mRev = mSales.reduce((sum, s) => sum + (Number(s.total) || 0), 0);
          const mDeals = mSales.length;
          const repTarget = tAmt > 0 && members.length > 0 ? Math.round(tAmt / members.length) : 0;
          const pct = repTarget > 0 ? Math.round((mRev / repTarget) * 100) : (mRev > 0 ? 100 : 0);
          const status = pct >= 100 ? 'Target Met' : pct >= 70 ? 'On Track' : mDeals > 0 ? 'In Progress' : 'Pending';

          return {
            name: `${m.first_name} ${m.last_name}`.trim() || m.email,
            deals: mDeals,
            revenue: mRev,
            target: repTarget,
            pct,
            status,
          };
        });

        setRepPerformance(metrics);
      } catch (err) {
        console.error('Error loading manager dashboard:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadTeamData();
    return () => { isMounted = false; };
  }, [profile?.team_id, profile?.team?.name, orgId]);

  const myAssignedModules = MODULES.filter(m => m.id !== 'dashboard' && can(m.id));

  if (loading) {
    return <LoadingSpinner text="Loading squad metrics..." />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Team Dashboard — ${teamName}`}
        subtitle={`Welcome back, ${profile?.first_name || 'Manager'}. Here is your live squad performance and momentum.`}
      >
        <div className="flex items-center gap-2 flex-wrap">
          {can('crm') && (
            <Button asChild size="sm" className="gap-2">
              <Link to="/leads">
                <Target className="w-4 h-4" /> Pipeline
              </Link>
            </Button>
          )}
          {can('teams') && (
            <Button asChild variant="outline" size="sm" className="gap-2">
              <Link to="/teams">
                <Briefcase className="w-4 h-4" /> Team Roster
              </Link>
            </Button>
          )}
        </div>
      </PageHeader>

      {/* Team KPI Cards — Real data */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {can('sales') && (
          <StatCard
            title="Team Revenue"
            value={formatCurrency(revenue)}
            description={`${dealsClosed} closed deals`}
            icon={<IndianRupee className="w-5 h-5" />}
            variant="success"
          />
        )}
        {can('targets') && (
          <StatCard
            title="Team Target"
            value={`${achievement}%`}
            description={targetAmount > 0 ? `${formatCurrency(revenue)} / ${formatCurrency(targetAmount)}` : 'No team target set'}
            icon={<Target className="w-5 h-5" />}
            variant="primary"
          />
        )}
        {(can('sales') || can('crm')) && (
          <StatCard
            title="Deals Closed"
            value={dealsClosed}
            description="Across active squad members"
            icon={<TrendingUp className="w-5 h-5" />}
            variant="purple"
          />
        )}
        {(can('teams') || can('employees')) && (
          <StatCard
            title="Active Closers"
            value={`${activeRepsCount} ${activeRepsCount === 1 ? 'Rep' : 'Reps'}`}
            description="Assigned to squad"
            icon={<Users className="w-5 h-5" />}
            variant="default"
          />
        )}
      </div>

      {/* Permitted Modules Quick Launcher Card */}
      <Card className="border-border/60">
        <CardHeader className="pb-3 border-b border-border/60">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-primary" />
                Your Permitted Manager Modules
              </CardTitle>
              <CardDescription>
                Direct access to modules assigned to you by the Organization Administrator
              </CardDescription>
            </div>
            <Badge variant="outline" className="text-xs font-mono">
              {myAssignedModules.length} Modules Granted
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
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

      {/* Team Target Progress Card (Shown if targets permitted) */}
      {can('targets') && (
        <Card className="border-border/60">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-semibold">Team Milestone Progress</CardTitle>
                <CardDescription>
                  {targetAmount > 0
                    ? `Target: ${formatCurrency(targetAmount)} | Current: ${formatCurrency(revenue)} (Remaining: ${formatCurrency(Math.max(0, targetAmount - revenue))})`
                    : 'No active quota target currently configured for this squad'}
                </CardDescription>
              </div>
              <span className="text-sm font-bold text-primary">{achievement}% achieved</span>
            </div>
          </CardHeader>
          <CardContent className="pt-2">
            <Progress value={Math.min(achievement, 100)} className="h-3" />
            <div className="flex justify-between text-xs text-muted-foreground mt-2">
              <span>₹0 (0%)</span>
              {targetAmount > 0 ? (
                <>
                  <span className="font-semibold text-primary">{formatCurrency(revenue)} (Current)</span>
                  <span>{formatCurrency(targetAmount)} (Goal)</span>
                </>
              ) : (
                <span>No target</span>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Rep Performance Breakdown Table (Shown if sales or teams permitted) */}
      {(can('sales') || can('teams')) && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2 border-border/60">
            <CardHeader>
              <CardTitle className="text-base font-semibold">Squad Performance Breakdown</CardTitle>
              <CardDescription>Individual quota attainment and deal contribution</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {repPerformance.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Sales Rep</TableHead>
                      <TableHead>Deals</TableHead>
                      <TableHead>Revenue</TableHead>
                      <TableHead>Target</TableHead>
                      <TableHead>Attainment</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {repPerformance.map((rep) => (
                      <TableRow key={rep.name}>
                        <TableCell className="font-semibold text-sm">{rep.name}</TableCell>
                        <TableCell>{rep.deals}</TableCell>
                        <TableCell className="font-bold">{formatCurrency(rep.revenue)}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {rep.target > 0 ? formatCurrency(rep.target) : '—'}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-xs w-10">{rep.pct}%</span>
                            <Progress value={Math.min(rep.pct, 100)} className="h-1.5 w-16" />
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={rep.pct >= 100 ? 'success' : rep.pct >= 70 ? 'default' : 'secondary'}
                            className="text-[10px]"
                          >
                            {rep.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="py-10 text-center text-muted-foreground text-sm">
                  <Users2 className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
                  <p className="font-semibold text-foreground">No Sales Reps in Team</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Assign sales representatives to this team in the Employee Directory to track squad metrics.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Rep Revenue Chart */}
          <Card className="border-border/60">
            <CardHeader>
              <CardTitle className="text-base font-semibold">Revenue Distribution</CardTitle>
              <CardDescription>By team member</CardDescription>
            </CardHeader>
            <CardContent className="pt-2">
              {repPerformance.some(r => r.revenue > 0) ? (
                <div className="h-[240px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={repPerformance} layout="vertical" margin={{ left: 10, right: 20 }}>
                      <XAxis type="number" tickFormatter={(v) => `₹${v / 1000}k`} fontSize={10} />
                      <YAxis type="category" dataKey="name" fontSize={11} width={80} tickLine={false} />
                      <Tooltip
                        formatter={(val: any) => [formatCurrency(Number(val)), 'Revenue']}
                        contentStyle={{ backgroundColor: 'hsl(var(--card))', borderRadius: '8px' }}
                      />
                      <Bar dataKey="revenue" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-[240px] flex flex-col items-center justify-center text-center p-4 text-muted-foreground">
                  <BarChart3 className="w-8 h-8 text-muted-foreground/40 mb-2" />
                  <p className="text-xs font-semibold text-foreground">No Revenue Recorded Yet</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Revenue graph will populate automatically as team members close deals.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

export default ManagerDashboard;
