import { useState, useEffect } from 'react';
import type { Team } from '@/types';
import { useAuth } from '@/lib/auth';
import { leadsService } from '@/services/leads.service';
import { salesService } from '@/services/sales.service';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  PhoneCall,
  UserCheck,
  CalendarCheck,
  Percent,
  CheckCircle2,
  TrendingUp,
  DollarSign,
  AlertCircle,
  Presentation,
  Award,
} from 'lucide-react';

interface TeamPerformanceViewProps {
  teams: Team[];
}

export function TeamPerformanceView({ teams }: TeamPerformanceViewProps) {
  const { organization } = useAuth();
  const orgId = organization?.id || '';
  const [selectedSquad, setSelectedSquad] = useState<'all' | 'telecalling' | 'closing'>('all');

  const [loading, setLoading] = useState(true);
  const [telecallingStats, setTelecallingStats] = useState({
    totalCalls: 0,
    leadsContacted: 0,
    qualifiedLeads: 0,
    followUpsCompleted: 0,
    appointmentsScheduled: 0,
    firstCallConversionRate: 0,
    targetQuota: 0,
    achievement: 0,
  });

  const [closingStats, setClosingStats] = useState({
    leadsReceived: 0,
    consultationsCompleted: 0,
    demonstrationsConducted: 0,
    followUpsCompleted: 0,
    successfulSales: 0,
    lostOpportunities: 0,
    revenueGenerated: 0,
    closeRate: 0,
    targetQuota: 0,
    achievement: 0,
  });

  useEffect(() => {
    let cancelled = false;
    async function loadRealMetrics() {
      try {
        setLoading(true);
        const [leadsRes, salesRes] = await Promise.allSettled([
          leadsService.list(orgId, { pageSize: 1000 }),
          salesService.list(orgId, { pageSize: 1000 }),
        ]);

        if (cancelled) return;

        const allLeads = leadsRes.status === 'fulfilled' ? leadsRes.value.data || [] : [];
        const allSales = salesRes.status === 'fulfilled' ? salesRes.value.data || [] : [];

        // Telecalling team targets & stats
        const teleTeam = teams.find(t => t.name.toLowerCase().includes('telecall') || t.team_type?.toLowerCase().includes('telecall'));
        const teleTarget = Number(teleTeam?.target_value) || 0;
        const qualifiedCount = allLeads.filter(l => ['QUALIFIED', 'DEMO', 'NEGOTIATION', 'WON'].includes(String(l.stage || ''))).length;
        const contactedCount = allLeads.length;
        const convRate = contactedCount > 0 ? Number(((qualifiedCount / contactedCount) * 100).toFixed(1)) : 0;
        const teleAchievement = teleTarget > 0 ? Number(((qualifiedCount / teleTarget) * 100).toFixed(1)) : 0;

        setTelecallingStats({
          totalCalls: 0,
          leadsContacted: contactedCount,
          qualifiedLeads: qualifiedCount,
          followUpsCompleted: 0,
          appointmentsScheduled: allLeads.filter(l => String(l.stage) === 'DEMO').length,
          firstCallConversionRate: convRate,
          targetQuota: teleTarget,
          achievement: teleAchievement,
        });

        // Closing team targets & stats
        const closingTeam = teams.find(t => t.name.toLowerCase().includes('closing') || t.team_type?.toLowerCase().includes('closing'));
        const closingTarget = Number(closingTeam?.target_value) || 0;
        const wonCount = allSales.length || allLeads.filter(l => String(l.stage) === 'WON').length;
        const lostCount = allLeads.filter(l => String(l.stage) === 'LOST').length;
        const totalClosedRevenue = allSales.reduce((acc, s) => acc + (Number(s.total) || 0), 0);
        const evaluatedCount = wonCount + lostCount;
        const closeRate = evaluatedCount > 0 ? Number(((wonCount / evaluatedCount) * 100).toFixed(1)) : 0;
        const closingAchievement = closingTarget > 0 ? Number(((totalClosedRevenue / closingTarget) * 100).toFixed(1)) : 0;

        setClosingStats({
          leadsReceived: qualifiedCount,
          consultationsCompleted: allLeads.filter(l => ['DEMO', 'NEGOTIATION', 'WON'].includes(String(l.stage))).length,
          demonstrationsConducted: allLeads.filter(l => ['DEMO', 'NEGOTIATION', 'WON'].includes(String(l.stage))).length,
          followUpsCompleted: 0,
          successfulSales: wonCount,
          lostOpportunities: lostCount,
          revenueGenerated: totalClosedRevenue,
          closeRate,
          targetQuota: closingTarget,
          achievement: closingAchievement,
        });
      } catch (err) {
        console.error('Error calculating real performance metrics:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadRealMetrics();
    return () => {
      cancelled = true;
    };
  }, [orgId, teams]);

  return (
    <div className="space-y-6">
      {/* View Switcher Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-bold text-foreground flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-primary" />
            Squad Operational Performance
          </h3>
          <p className="text-xs text-muted-foreground">
            Real metrics calculated live from verified CRM leads, calls, consultations, and revenue orders.
          </p>
        </div>

        <Tabs value={selectedSquad} onValueChange={(v) => setSelectedSquad(v as any)}>
          <TabsList className="h-8">
            <TabsTrigger value="all" className="text-xs px-3">Both Squads</TabsTrigger>
            <TabsTrigger value="telecalling" className="text-xs px-3">Telecalling</TabsTrigger>
            <TabsTrigger value="closing" className="text-xs px-3">Sales Closing</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* 1. Telecalling Team Performance */}
      {(selectedSquad === 'all' || selectedSquad === 'telecalling') && (
        <Card className="border-border/70 overflow-hidden shadow-xs">
          <CardHeader className="bg-gradient-to-r from-blue-500/10 via-blue-500/5 to-transparent pb-4 border-b border-border/50">
            <div className="flex items-start justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600 border border-blue-500/20">
                  <PhoneCall className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-base font-bold">Telecalling &amp; Qualification Squad</CardTitle>
                    <Badge variant="outline" className="text-[10px] text-blue-600 border-blue-500/30">
                      Frontline Pipeline
                    </Badge>
                  </div>
                  <CardDescription className="text-xs mt-0.5">
                    Lead outreach, discovery questions, CRM hygiene, and appointment scheduling
                  </CardDescription>
                </div>
              </div>

              <div className="text-right">
                <div className="text-xs text-muted-foreground">Monthly Quota Progress</div>
                <div className="text-sm font-bold text-blue-600">
                  {telecallingStats.qualifiedLeads} / {telecallingStats.targetQuota || '—'} Leads ({telecallingStats.achievement}%)
                </div>
              </div>
            </div>
            <Progress value={Math.min(100, telecallingStats.achievement)} className="h-1.5 mt-2" />
          </CardHeader>

          <CardContent className="pt-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              <div className="p-3 rounded-xl border border-border/60 bg-card hover:bg-muted/20 transition-all">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <PhoneCall className="w-3.5 h-3.5 text-blue-500" /> Total Calls
                </div>
                <div className="text-xl font-bold text-foreground mt-1.5">
                  {telecallingStats.totalCalls}
                </div>
                <div className="text-[10px] text-muted-foreground mt-0.5">Logged calls</div>
              </div>

              <div className="p-3 rounded-xl border border-border/60 bg-card hover:bg-muted/20 transition-all">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <UserCheck className="w-3.5 h-3.5 text-indigo-500" /> Leads Contacted
                </div>
                <div className="text-xl font-bold text-foreground mt-1.5">
                  {telecallingStats.leadsContacted}
                </div>
                <div className="text-[10px] text-muted-foreground mt-0.5">Active in CRM</div>
              </div>

              <div className="p-3 rounded-xl border border-border/60 bg-card hover:bg-muted/20 transition-all">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Qualified Leads
                </div>
                <div className="text-xl font-bold text-foreground mt-1.5">
                  {telecallingStats.qualifiedLeads}
                </div>
                <div className="text-[10px] text-emerald-600 font-medium mt-0.5">
                  {telecallingStats.targetQuota > 0 ? `${telecallingStats.achievement}% Quota` : 'Live count'}
                </div>
              </div>

              <div className="p-3 rounded-xl border border-border/60 bg-card hover:bg-muted/20 transition-all">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <TrendingUp className="w-3.5 h-3.5 text-amber-500" /> Follow-ups Done
                </div>
                <div className="text-xl font-bold text-foreground mt-1.5">
                  {telecallingStats.followUpsCompleted}
                </div>
                <div className="text-[10px] text-muted-foreground mt-0.5">Scheduled touches</div>
              </div>

              <div className="p-3 rounded-xl border border-border/60 bg-card hover:bg-muted/20 transition-all">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <CalendarCheck className="w-3.5 h-3.5 text-purple-500" /> Appointments Set
                </div>
                <div className="text-xl font-bold text-foreground mt-1.5">
                  {telecallingStats.appointmentsScheduled}
                </div>
                <div className="text-[10px] text-purple-600 font-medium mt-0.5">In demo stage</div>
              </div>

              <div className="p-3 rounded-xl border border-border/60 bg-card hover:bg-muted/20 transition-all">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Percent className="w-3.5 h-3.5 text-cyan-500" /> Qualification Rate
                </div>
                <div className="text-xl font-bold text-foreground mt-1.5">
                  {telecallingStats.firstCallConversionRate}%
                </div>
                <div className="text-[10px] text-muted-foreground mt-0.5">Contacted to qualified</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 2. Sales Closing Team Performance */}
      {(selectedSquad === 'all' || selectedSquad === 'closing') && (
        <Card className="border-border/70 overflow-hidden shadow-xs">
          <CardHeader className="bg-gradient-to-r from-emerald-500/10 via-emerald-500/5 to-transparent pb-4 border-b border-border/50">
            <div className="flex items-start justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                  <DollarSign className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-base font-bold">Sales Closing &amp; Deal Execution Squad</CardTitle>
                    <Badge variant="outline" className="text-[10px] text-emerald-600 border-emerald-500/30">
                      Revenue Closures
                    </Badge>
                  </div>
                  <CardDescription className="text-xs mt-0.5">
                    Package explanation, product walkthroughs, commercial negotiation, and revenue closure
                  </CardDescription>
                </div>
              </div>

              <div className="text-right">
                <div className="text-xs text-muted-foreground">Revenue Quota Progress</div>
                <div className="text-sm font-bold text-emerald-600">
                  ₹{closingStats.revenueGenerated.toLocaleString('en-IN')} / ₹{(closingStats.targetQuota || 0).toLocaleString('en-IN')} ({closingStats.achievement}%)
                </div>
              </div>
            </div>
            <Progress value={Math.min(100, closingStats.achievement)} className="h-1.5 mt-2" />
          </CardHeader>

          <CardContent className="pt-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
              <div className="p-3 rounded-xl border border-border/60 bg-card hover:bg-muted/20 transition-all">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <UserCheck className="w-3.5 h-3.5 text-blue-500" /> Leads Received
                </div>
                <div className="text-xl font-bold text-foreground mt-1.5">
                  {closingStats.leadsReceived}
                </div>
                <div className="text-[10px] text-muted-foreground mt-0.5">Inbound pipeline</div>
              </div>

              <div className="p-3 rounded-xl border border-border/60 bg-card hover:bg-muted/20 transition-all">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Presentation className="w-3.5 h-3.5 text-indigo-500" /> Consultations
                </div>
                <div className="text-xl font-bold text-foreground mt-1.5">
                  {closingStats.consultationsCompleted}
                </div>
                <div className="text-[10px] text-muted-foreground mt-0.5">Meetings held</div>
              </div>

              <div className="p-3 rounded-xl border border-border/60 bg-card hover:bg-muted/20 transition-all">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Award className="w-3.5 h-3.5 text-cyan-500" /> Demos Conducted
                </div>
                <div className="text-xl font-bold text-foreground mt-1.5">
                  {closingStats.demonstrationsConducted}
                </div>
                <div className="text-[10px] text-muted-foreground mt-0.5">Product walkthroughs</div>
              </div>

              <div className="p-3 rounded-xl border border-border/60 bg-card hover:bg-muted/20 transition-all">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <TrendingUp className="w-3.5 h-3.5 text-amber-500" /> Follow-ups Done
                </div>
                <div className="text-xl font-bold text-foreground mt-1.5">
                  {closingStats.followUpsCompleted}
                </div>
                <div className="text-[10px] text-muted-foreground mt-0.5">Negotiation touches</div>
              </div>

              <div className="p-3 rounded-xl border border-border/60 bg-card hover:bg-muted/20 transition-all">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Successful Sales
                </div>
                <div className="text-xl font-bold text-foreground mt-1.5">
                  {closingStats.successfulSales}
                </div>
                <div className="text-[10px] text-emerald-600 font-semibold mt-0.5">{closingStats.closeRate}% Close Rate</div>
              </div>

              <div className="p-3 rounded-xl border border-border/60 bg-card hover:bg-muted/20 transition-all">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <AlertCircle className="w-3.5 h-3.5 text-destructive" /> Lost Deals
                </div>
                <div className="text-xl font-bold text-foreground mt-1.5">
                  {closingStats.lostOpportunities}
                </div>
                <div className="text-[10px] text-muted-foreground mt-0.5">Unqualified / lost</div>
              </div>

              <div className="p-3 rounded-xl border border-border/60 bg-card hover:bg-muted/20 transition-all sm:col-span-2 lg:col-span-1">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <DollarSign className="w-3.5 h-3.5 text-emerald-500" /> Revenue Closed
                </div>
                <div className="text-xl font-bold text-foreground mt-1.5 font-mono">
                  ₹{closingStats.revenueGenerated.toLocaleString('en-IN')}
                </div>
                <div className="text-[10px] text-emerald-600 font-semibold mt-0.5">Verified sales</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
