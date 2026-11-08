import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/lib/auth';
import { PageHeader } from '@/components/common/PageHeader';
import { LoadingSpinner, EmptyState } from '@/components/common/EmptyState';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatCurrency } from '@/lib/utils';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';
import { leadsService } from '@/services/leads.service';
import { salesService } from '@/services/sales.service';
import type { Lead, Sale } from '@/types';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4'];

export function AnalyticsPage() {
  const { organization } = useAuth();
  const orgId = organization?.id || '11111111-1111-1111-1111-111111111111';

  const [timeRange, setTimeRange] = useState('6m');
  const [loading, setLoading] = useState(true);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);

  useEffect(() => {
    let cancelled = false;
    async function loadData() {
      try {
        setLoading(true);
        const [leadsRes, salesRes] = await Promise.allSettled([
          leadsService.list(orgId, { pageSize: 1000 }),
          salesService.list(orgId, { pageSize: 1000 }),
        ]);

        if (cancelled) return;
        if (leadsRes.status === 'fulfilled') {
          setLeads(leadsRes.value.data || []);
        }
        if (salesRes.status === 'fulfilled') {
          setSales(salesRes.value.data || []);
        }
      } catch (err) {
        console.error('Error loading analytics:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadData();
    return () => {
      cancelled = true;
    };
  }, [orgId]);

  // Real monthly sales revenue trend
  const monthlyTrend = useMemo(() => {
    if (sales.length === 0) return [];
    const map = new Map<string, number>();

    sales.forEach((s) => {
      const d = s.created_at ? new Date(s.created_at) : new Date();
      const key = d.toLocaleDateString(undefined, { month: 'short', year: 'numeric' });
      map.set(key, (map.get(key) || 0) + (Number(s.total) || 0));
    });

    return Array.from(map.entries()).map(([month, revenue]) => ({
      month,
      revenue,
      deals: sales.filter((s) => {
        const d = s.created_at ? new Date(s.created_at) : new Date();
        return d.toLocaleDateString(undefined, { month: 'short', year: 'numeric' }) === month;
      }).length,
    }));
  }, [sales]);

  // Real sales funnel data
  const { funnelData, winRate } = useMemo(() => {
    const total = leads.length;
    const wonCount = leads.filter((l) => String(l.stage) === 'WON').length + sales.length;
    const calculatedWinRate = total > 0 ? ((wonCount / total) * 100).toFixed(1) : '0.0';

    const stages = [
      { key: 'NEW', label: 'New Inquiries' },
      { key: 'CONTACTED', label: 'Contacted' },
      { key: 'QUALIFIED', label: 'Qualified' },
      { key: 'DEMO', label: 'Demo / Pitch' },
      { key: 'NEGOTIATION', label: 'Negotiation' },
      { key: 'WON', label: 'Closed Won' },
      { key: 'LOST', label: 'Closed Lost' },
    ];

    const data = stages
      .map((st) => {
        const count =
          st.key === 'WON'
            ? leads.filter((l) => String(l.stage) === 'WON').length + sales.length
            : leads.filter((l) => String(l.stage) === st.key).length;
        const pct = total > 0 ? `${((count / total) * 100).toFixed(1)}%` : '0%';
        return { stage: st.label, count, pct };
      })
      .filter((st) => st.count > 0 || total === 0);

    return { funnelData: data, winRate: calculatedWinRate };
  }, [leads, sales]);

  // Real marketing acquisition channel breakdown
  const sourceData = useMemo(() => {
    const map = new Map<string, number>();

    leads.forEach((l) => {
      const src = l.source || 'Direct Inbound';
      map.set(src, (map.get(src) || 0) + 1);
    });

    if (map.size === 0) return [];

    return Array.from(map.entries()).map(([name, value], idx) => ({
      name,
      value,
      color: COLORS[idx % COLORS.length],
    }));
  }, [leads]);

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
          <CardTitle className="text-base font-semibold">Revenue Acceleration &amp; Deals Closed</CardTitle>
          <CardDescription>Monthly verified gross deal revenue from closed transactions</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="h-[240px] flex items-center justify-center">
              <LoadingSpinner text="Computing revenue analytics..." />
            </div>
          ) : monthlyTrend.length === 0 ? (
            <div className="h-[240px] flex flex-col items-center justify-center text-center p-6 text-muted-foreground text-xs">
              <p className="font-semibold text-foreground text-sm mb-1">No transaction history yet</p>
              <p>Revenue velocity charts will populate here as deals are closed by sales squads.</p>
            </div>
          ) : (
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
          )}
        </CardContent>
      </Card>

      {/* Funnel + Acquisition Channels */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Conversion Funnel */}
        <Card className="border-border/60">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Lead Conversion Funnel</CardTitle>
            <CardDescription>
              Progression across sales cycle stages (Overall Win Rate: {winRate}%)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {loading ? (
              <div className="py-8">
                <LoadingSpinner text="Analyzing funnel stages..." />
              </div>
            ) : leads.length === 0 ? (
              <div className="py-8 text-center text-xs text-muted-foreground">
                No leads recorded yet. Capture leads to view stage progression.
              </div>
            ) : (
              funnelData.map((f) => {
                const widthPct = Math.max(15, Math.min(100, Math.round((f.count / Math.max(1, leads.length)) * 100)));
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
              })
            )}
          </CardContent>
        </Card>

        {/* Acquisition Channel Breakdown */}
        <Card className="border-border/60">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Lead Acquisition Channels</CardTitle>
            <CardDescription>Channel distribution for incoming inquiries</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="py-8">
                <LoadingSpinner text="Cataloging acquisition sources..." />
              </div>
            ) : sourceData.length === 0 ? (
              <div className="py-8 text-center text-xs text-muted-foreground">
                No channel data available yet.
              </div>
            ) : (
              <>
                <div className="h-[200px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={sourceData} cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={4} dataKey="value">
                        {sourceData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(val: any) => [`${val} Leads`, 'Volume']}
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
                      <div className="font-bold text-foreground mt-0.5">{s.value} Inquiries</div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
