import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { PageHeader } from '@/components/common/PageHeader';
import { StatCard } from '@/components/common/StatCard';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatCurrency, formatNumber } from '@/lib/utils';
import { MODULES, type ModuleId } from '@/lib/permissions';
import { Link } from 'react-router-dom';
import {
  IndianRupee, Target, Users, TrendingUp, AlertCircle, CheckCircle2,
  ShieldCheck, ArrowRight, ShoppingCart, Truck, Package, UserCircle,
  Mail, Trophy, Zap, Award, Flame, BarChart3, Briefcase, FileText,
  Bell, Settings,
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

export function ManagerDashboard() {
  const { profile, can } = useAuth();

  const teamMetrics = {
    teamName: profile?.team?.name || 'Alpha Closers',
    revenue: 1250000,
    target: 1500000,
    achievement: 83,
    activeReps: 4,
    dealsClosed: 28,
    avgDeal: 44642,
  };

  const repPerformance = [
    { name: 'Priya Sharma', deals: 11, revenue: 520000, target: 500000, pct: 104, status: 'Target Met' },
    { name: 'Rahul Varma', deals: 8, revenue: 380000, target: 450000, pct: 84, status: 'On Track' },
    { name: 'Amit Singh', deals: 6, revenue: 230000, target: 350000, pct: 66, status: 'Needs Push' },
    { name: 'Kavita Iyer', deals: 3, revenue: 120000, target: 200000, pct: 60, status: 'In Progress' },
  ];

  const myAssignedModules = MODULES.filter(m => m.id !== 'dashboard' && can(m.id));

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Team Dashboard — ${teamMetrics.teamName}`}
        subtitle={`Welcome back, ${profile?.first_name || 'Manager'}. Here is your personalized squad performance & momentum.`}
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
          {can('reports') && (
            <Button asChild variant="outline" size="sm" className="gap-2">
              <Link to="/reports">
                <FileText className="w-4 h-4" /> Reports
              </Link>
            </Button>
          )}
        </div>
      </PageHeader>

      {/* Team KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {can('sales') && (
          <StatCard
            title="Team Revenue"
            value={formatCurrency(teamMetrics.revenue)}
            trend={{ value: 14.5, isPositive: true, label: 'vs last month' }}
            icon={<IndianRupee className="w-5 h-5" />}
            variant="success"
          />
        )}
        {can('targets') && (
          <StatCard
            title="Team Target"
            value={`${teamMetrics.achievement}%`}
            description={`${formatCurrency(teamMetrics.revenue)} / ${formatCurrency(teamMetrics.target)}`}
            icon={<Target className="w-5 h-5" />}
            variant="primary"
          />
        )}
        {(can('sales') || can('crm')) && (
          <StatCard
            title="Deals Closed"
            value={teamMetrics.dealsClosed}
            description="Across active squad members"
            icon={<TrendingUp className="w-5 h-5" />}
            variant="purple"
          />
        )}
        {(can('teams') || can('employees')) && (
          <StatCard
            title="Active Closers"
            value={`${teamMetrics.activeReps} Reps`}
            description="All active in current quota"
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
                  {mod.id === 'commissions' && <Award className="w-4 h-4" />}
                  {mod.id === 'bonuses' && <Flame className="w-4 h-4" />}
                  {mod.id === 'analytics' && <BarChart3 className="w-4 h-4" />}
                  {mod.id === 'employees' && <Users className="w-4 h-4" />}
                  {mod.id === 'teams' && <Briefcase className="w-4 h-4" />}
                  {mod.id === 'reports' && <FileText className="w-4 h-4" />}
                  {mod.id === 'notifications' && <Bell className="w-4 h-4" />}
                  {mod.id === 'settings' && <Settings className="w-4 h-4" />}
                  {!['crm', 'sales', 'b2b-orders', 'products', 'customers', 'mail', 'targets', 'leaderboard', 'gamification', 'commissions', 'bonuses', 'analytics', 'employees', 'teams', 'reports', 'notifications', 'settings'].includes(mod.id) && (
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
                <CardTitle className="text-base font-semibold">Monthly Team Milestone Progress</CardTitle>
                <CardDescription>Target: ₹15,00,000 | Current: ₹12,50,000 (Remaining: ₹2,50,000)</CardDescription>
              </div>
              <span className="text-sm font-bold text-primary">{teamMetrics.achievement}% achieved</span>
            </div>
          </CardHeader>
          <CardContent className="pt-2">
            <Progress value={teamMetrics.achievement} className="h-3" />
            <div className="flex justify-between text-xs text-muted-foreground mt-2">
              <span>₹0 (0%)</span>
              <span>₹7.5L (50%)</span>
              <span className="font-semibold text-primary">₹12.5L (Current)</span>
              <span>₹15L (Goal)</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Rep Performance Breakdown Table (Shown if sales or teams permitted) */}
      {(can('sales') || can('teams') || can('analytics')) && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2 border-border/60">
            <CardHeader>
              <CardTitle className="text-base font-semibold">Squad Performance Breakdown</CardTitle>
              <CardDescription>Individual quota attainment & deal contribution</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
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
                      <TableCell className="text-muted-foreground">{formatCurrency(rep.target)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-xs w-10">{rep.pct}%</span>
                          <Progress value={Math.min(rep.pct, 100)} className="h-1.5 w-16" />
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={rep.pct >= 100 ? 'success' : rep.pct >= 70 ? 'default' : 'destructive'}
                          className="text-[10px]"
                        >
                          {rep.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Rep Revenue Chart */}
          <Card className="border-border/60">
            <CardHeader>
              <CardTitle className="text-base font-semibold">Revenue Distribution</CardTitle>
              <CardDescription>By team member</CardDescription>
            </CardHeader>
            <CardContent className="pt-2">
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
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

export default ManagerDashboard;
