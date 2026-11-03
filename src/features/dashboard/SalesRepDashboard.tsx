import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { PageHeader } from '@/components/common/PageHeader';
import { StatCard } from '@/components/common/StatCard';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { formatCurrency, formatNumber } from '@/lib/utils';
import { Link } from 'react-router-dom';
import {
  IndianRupee, Flame, Target, Trophy, Award, Zap,
  CheckCircle2, Clock, Plus, ArrowRight, ShieldAlert
} from 'lucide-react';

export function SalesRepDashboard() {
  const { profile } = useAuth();

  const repStats = {
    revenue: 0,
    target: 0,
    achievement: 0,
    dealsClosed: 0,
    commissionEarned: 0,
    bonusPending: 0,
    currentXP: 0,
    nextLevelXP: 0,
    levelName: '',
    levelRank: 0,
    nextLevelName: '',
    rank: 0,
  };

  const todayFollowUps: { id: string; customer: string; time: string; type: string; notes: string }[] = [];
  const recentAchievements: { title: string; desc: string; icon: typeof Zap; color: string }[] = [];

  const xpProgress = Math.round((repStats.currentXP / repStats.nextLevelXP) * 100);

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Hello, ${profile?.first_name || 'Champion'}!`}
        subtitle="Here is your personal pipeline, quota progress, and gamification rewards."
      >
        <Button asChild size="sm" className="gap-2">
          <Link to="/sales/create">
            <Plus className="w-4 h-4" /> New Sale
          </Link>
        </Button>
        <Button asChild variant="outline" size="sm" className="gap-2">
          <Link to="/leads">
            <Plus className="w-4 h-4" /> New Lead
          </Link>
        </Button>
      </PageHeader>

      {/* Gamification Level Banner */}
      <Card className="bg-gradient-to-r from-blue-950/40 via-indigo-950/30 to-purple-950/40 border-blue-800/40">
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
                  <span className="text-xs text-muted-foreground">Rank #{repStats.rank} Leaderboard</span>
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

      {/* Rep Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Revenue Generated"
          value={formatCurrency(repStats.revenue)}
          description={`${repStats.dealsClosed} deals closed`}
          icon={<IndianRupee className="w-5 h-5" />}
          variant="success"
        />
        <StatCard
          title="Target Quota"
          value={`${repStats.achievement}%`}
          description={`${formatCurrency(repStats.revenue)} / ${formatCurrency(repStats.target)}`}
          icon={<Target className="w-5 h-5" />}
          variant="primary"
        />
        <StatCard
          title="Commission Earned"
          value={formatCurrency(repStats.commissionEarned)}
          description="Ready for payout"
          icon={<Award className="w-5 h-5" />}
          variant="purple"
        />
        <StatCard
          title="Bonus Target"
          value={formatCurrency(repStats.bonusPending)}
          description="Eligible at 100% quota"
          icon={<Flame className="w-5 h-5" />}
          variant="warning"
        />
      </div>

      {/* Main Grid: Follow-ups + Quota Progress + Badges */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Today's Follow-ups */}
        <Card className="lg:col-span-2 border-border/60">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Clock className="w-4 h-4 text-primary" />
                Today's Scheduled Follow-ups
              </CardTitle>
              <CardDescription>Don't let hot opportunities go cold</CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/leads" className="text-xs text-primary">View CRM Board</Link>
            </Button>
          </CardHeader>
          <CardContent className="pt-2">
            <div className="space-y-3">
              {todayFollowUps.map((fu) => (
                <div
                  key={fu.id}
                  className="flex items-center justify-between p-3.5 rounded-xl bg-card border border-border/60 hover:border-primary/40 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-500/10 text-blue-500 flex items-center justify-center font-bold text-xs">
                      {fu.type[0]}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">{fu.customer}</p>
                      <p className="text-xs text-muted-foreground">{fu.notes}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className="text-xs font-mono">
                      {fu.time}
                    </Badge>
                    <Button size="sm" variant="outline" className="h-8 text-xs">
                      Complete
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Unlocked Badges */}
        <Card className="border-border/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Award className="w-4 h-4 text-purple-500" />
              Achievements
            </CardTitle>
            <CardDescription>Badges earned this month</CardDescription>
          </CardHeader>
          <CardContent className="pt-2">
            <div className="space-y-3">
              {recentAchievements.map((badge) => {
                const Icon = badge.icon;
                return (
                  <div key={badge.title} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-muted/40 transition-colors">
                    <div className="p-2 rounded-lg bg-neutral-100 dark:bg-neutral-800">
                      <Icon className={`w-5 h-5 ${badge.color}`} />
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-foreground leading-tight">{badge.title}</h4>
                      <p className="text-xs text-muted-foreground">{badge.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>
            <Button variant="ghost" className="w-full mt-4 text-xs" asChild>
              <Link to="/achievements">View All 15 Badges</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
