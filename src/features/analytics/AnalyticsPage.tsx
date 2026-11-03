import { useState } from 'react';
import { PageHeader } from '@/components/common/PageHeader';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatCurrency, formatNumber } from '@/lib/utils';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell
} from 'recharts';
import { TrendingUp, Users, Target, IndianRupee, PieChart as PieIcon, ArrowUpRight } from 'lucide-react';

export function AnalyticsPage() {
  const [timeRange, setTimeRange] = useState('6m');

  const monthlyTrend: { month: string; revenue: number; deals: number; aov: number }[] = [];
  const sourceData: { name: string; value: number; color: string }[] = [];
  const funnelData: { stage: string; count: number; pct: string }[] = [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Sales Analytics &amp; Funnel Intelligence"
        subtitle="Deep dive into lead conversion velocity, revenue distribution, and customer acquisition channels."
      >
        <Select value={timeRange} onValueChange={setTimeRange}>
          <SelectTrigger className="w-36 bg-card text-xs">
            <SelectValue placeholder="Period" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="30d">Last 30 Days</SelectItem>
            <SelectItem value="90d">Last Quarter</SelectItem>
            <SelectItem value="6m">Last 6 Months</SelectItem>
            <SelectItem value="1y">Year to Date</SelectItem>
          </SelectContent>
        </Select>
      </PageHeader>

      {/* Top Velocity Chart */}
      <Card className="border-border/60">
        <CardHeader>
          <CardTitle className="text-base font-semibold">Revenue Acceleration &amp; Average Order Value</CardTitle>
          <CardDescription>Monthly qualified gross deal value</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlyTrend} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" opacity={0.5} />
                <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} />
                <YAxis
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={11}
                  tickLine={false}
                  tickFormatter={(val) => `₹${val / 100000}L`}
                />
                <Tooltip
                  formatter={(val: any) => [formatCurrency(Number(val)), 'Gross Revenue']}
                  contentStyle={{ backgroundColor: 'hsl(var(--card))', borderRadius: '8px' }}
                />
                <Area type="monotone" dataKey="revenue" stroke="#3b82f6" strokeWidth={2.5} fill="url(#colorRev)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Funnel + Acquisition Channels */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Conversion Funnel */}
        <Card className="border-border/60">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Lead Conversion Funnel</CardTitle>
            <CardDescription>Attrition across sales cycle stages (Overall Win Rate: 21.7%)</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {funnelData.map((f, idx) => {
              const widthPct = Math.max(20, Math.round((f.count / 280) * 100));
              return (
                <div key={f.stage} className="space-y-1">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-foreground">{f.stage}</span>
                    <span className="text-muted-foreground">{f.count} leads ({f.pct})</span>
                  </div>
                  <div className="h-6 w-full bg-muted/40 rounded-lg overflow-hidden flex items-center">
                    <div
                      className="h-full bg-blue-600 dark:bg-blue-500 rounded-lg transition-all flex items-center justify-end pr-2 text-[10px] font-bold text-white"
                      style={{ width: `${widthPct}%` }}
                    >
                      {f.count}
                    </div>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Acquisition Channel Breakdown */}
        <Card className="border-border/60">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Revenue by Marketing Channel</CardTitle>
            <CardDescription>Channel attribution for closed deals</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[200px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={sourceData} cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={4} dataKey="value">
                    {sourceData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(val: any) => [formatCurrency(Number(val)), 'Revenue']}
                    contentStyle={{ backgroundColor: 'hsl(var(--card))', borderRadius: '8px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="grid grid-cols-2 gap-2 mt-4">
              {sourceData.map((s) => (
                <div key={s.name} className="p-2 rounded-lg bg-muted/30 border border-border/40 text-xs">
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color }} />
                    <span className="truncate">{s.name}</span>
                  </div>
                  <div className="font-bold text-foreground mt-0.5">{formatCurrency(s.value)}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
