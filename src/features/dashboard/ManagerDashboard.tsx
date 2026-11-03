import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { PageHeader } from '@/components/common/PageHeader';
import { StatCard } from '@/components/common/StatCard';
import { LoadingSpinner } from '@/components/common/EmptyState';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { formatCurrency, formatNumber } from '@/lib/utils';
import { IndianRupee, Target, Users, TrendingUp, AlertCircle, CheckCircle2 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

export function ManagerDashboard() {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(false);

  const teamMetrics = {
    teamName: profile?.team?.name || 'Team',
    revenue: 0,
    target: 0,
    achievement: 0,
    activeReps: 0,
    dealsClosed: 0,
    avgDeal: 0,
  };

  const repPerformance: { name: string; deals: number; revenue: number; target: number; pct: number; status: string }[] = [];

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Team Dashboard — ${teamMetrics.teamName}`}
        subtitle={`Welcome back, ${profile?.first_name || 'Manager'}. Here is your squad's monthly momentum.`}
      />

      {/* Team KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Team Revenue"
          value={formatCurrency(teamMetrics.revenue)}
          trend={{ value: 14.5, isPositive: true, label: 'vs last month' }}
          icon={<IndianRupee className="w-5 h-5" />}
          variant="success"
        />
        <StatCard
          title="Team Target"
          value={`${teamMetrics.achievement}%`}
          description={`${formatCurrency(teamMetrics.revenue)} / ${formatCurrency(teamMetrics.target)}`}
          icon={<Target className="w-5 h-5" />}
          variant="primary"
        />
        <StatCard
          title="Deals Closed"
          value={teamMetrics.dealsClosed}
          description="Across 4 active reps"
          icon={<TrendingUp className="w-5 h-5" />}
          variant="purple"
        />
        <StatCard
          title="Avg Deal Size"
          value={formatCurrency(teamMetrics.avgDeal)}
          description="High margin pipeline"
          icon={<Users className="w-5 h-5" />}
          variant="default"
        />
      </div>

      {/* Team Target Progress Card */}
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

      {/* Rep Performance Breakdown Table */}
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
    </div>
  );
}
