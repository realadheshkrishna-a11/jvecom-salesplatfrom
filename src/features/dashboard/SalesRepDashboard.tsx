import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { PageHeader } from '@/components/common/PageHeader';
import { StatCard } from '@/components/common/StatCard';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { formatCurrency, formatNumber } from '@/lib/utils';
import { MODULES, type ModuleId } from '@/lib/permissions';
import { Link } from 'react-router-dom';
import {
  IndianRupee, Flame, Target, Trophy, Award, Zap,
  Clock, Plus, ArrowRight, ShieldCheck, Mail, Users,
  ShoppingCart, Truck, Package, UserCircle, Briefcase,
  BarChart3, FileText, Bell, Settings,
} from 'lucide-react';

export function SalesRepDashboard() {
  const { profile, can, allowedModules } = useAuth();

  const repStats = {
    revenue: 345000,
    target: 500000,
    achievement: 69,
    dealsClosed: 8,
    commissionEarned: 17250,
    bonusPending: 25000,
    currentXP: 1850,
    nextLevelXP: 2500,
    levelName: 'Senior Closer',
    levelRank: 2,
    nextLevelName: 'Sales Specialist',
    rank: 3,
  };

  const todayFollowUps = [
    { id: '1', customer: 'Apex Retailers Mumbai', time: '11:30 AM', type: 'Call', notes: 'Discuss wholesale pricing contract' },
    { id: '2', customer: 'Kiran Mega Mart Bangalore', time: '02:00 PM', type: 'Meeting', notes: 'Product demo for monsoon collection' },
    { id: '3', customer: 'Zenith Logistics Delhi', time: '04:30 PM', type: 'Email', notes: 'Send revised quote with 5% bulk discount' },
  ];

  const recentAchievements = [
    { title: 'Deal Master', desc: 'Closed 5+ wholesale deals this week', icon: Zap, color: 'text-amber-500' },
    { title: 'Speedy Closer', desc: 'Converted lead in less than 24 hours', icon: Flame, color: 'text-rose-500' },
    { title: 'Target Crusher', desc: 'Achieved 60%+ monthly quota', icon: Trophy, color: 'text-blue-500' },
  ];

  const xpProgress = Math.round((repStats.currentXP / repStats.nextLevelXP) * 100);

  // Filter modules assigned to this user (excluding dashboard itself)
  const myAssignedModules = MODULES.filter(m => m.id !== 'dashboard' && can(m.id));

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
                      Level {repStats.levelRank} • {repStats.levelName}
                    </span>
                    {can('leaderboard') && (
                      <span className="text-xs text-muted-foreground">Rank #{repStats.rank} Leaderboard</span>
                    )}
                  </div>
                  <h3 className="text-xl font-bold text-foreground mt-1">
                    {formatNumber(repStats.currentXP)} XP Total
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Only <span className="text-primary font-bold">{repStats.nextLevelXP - repStats.currentXP} XP</span> to reach Level 3: {repStats.nextLevelName}
                  </p>
                </div>
              </div>

              <div className="w-full md:w-64 space-y-2">
                <div className="flex justify-between text-xs font-semibold">
                  <span>Progress to {repStats.nextLevelName}</span>
                  <span>{xpProgress}%</span>
                </div>
                <Progress value={xpProgress} className="h-2.5" />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Dynamic KPI Cards — adapts based on granted permissions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {can('sales') && (
          <StatCard
            title="Revenue Generated"
            value={formatCurrency(repStats.revenue)}
            description={`${repStats.dealsClosed} deals closed`}
            icon={<IndianRupee className="w-5 h-5" />}
            variant="success"
          />
        )}
        {can('targets') && (
          <StatCard
            title="Target Quota"
            value={`${repStats.achievement}%`}
            description={`${formatCurrency(repStats.revenue)} / ${formatCurrency(repStats.target)}`}
            icon={<Target className="w-5 h-5" />}
            variant="primary"
          />
        )}
        {can('commissions') && (
          <StatCard
            title="Commission Earned"
            value={formatCurrency(repStats.commissionEarned)}
            description="Ready for payout"
            icon={<Award className="w-5 h-5" />}
            variant="purple"
          />
        )}
        {can('bonuses') && (
          <StatCard
            title="Bonus Target"
            value={formatCurrency(repStats.bonusPending)}
            description="Eligible at 100% quota"
            icon={<Flame className="w-5 h-5" />}
            variant="warning"
          />
        )}
        {can('crm') && !can('sales') && (
          <StatCard
            title="Active Pipeline"
            value="14 Leads"
            description="3 ready to close"
            icon={<Target className="w-5 h-5" />}
            variant="primary"
          />
        )}
        {can('customers') && (
          <StatCard
            title="Active Accounts"
            value="32 B2B Clients"
            description="All regions"
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

        {/* Side Column: Follow-ups or Achievements */}
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
                <div className="space-y-2.5">
                  {todayFollowUps.slice(0, 2).map((fu) => (
                    <div
                      key={fu.id}
                      className="p-3 rounded-lg bg-card border border-border/60 space-y-1"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold">{fu.customer}</span>
                        <Badge variant="outline" className="text-[10px]">{fu.time}</Badge>
                      </div>
                      <p className="text-[11px] text-muted-foreground line-clamp-1">{fu.notes}</p>
                    </div>
                  ))}
                </div>
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
                <div className="space-y-2">
                  {recentAchievements.slice(0, 2).map((b) => {
                    const Icon = b.icon;
                    return (
                      <div key={b.title} className="flex items-center gap-2.5 p-2 rounded-lg bg-muted/30">
                        <Icon className={`w-4 h-4 ${b.color} shrink-0`} />
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-semibold text-foreground truncate">{b.title}</p>
                          <p className="text-[10px] text-muted-foreground truncate">{b.desc}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

export default SalesRepDashboard;
