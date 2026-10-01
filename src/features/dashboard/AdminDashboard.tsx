import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { PageHeader } from '@/components/common/PageHeader';
import { StatCard } from '@/components/common/StatCard';
import { LoadingSpinner } from '@/components/common/EmptyState';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatCurrency, formatNumber } from '@/lib/utils';
import { salesService } from '@/services/sales.service';
import { gamificationService } from '@/services/gamification.service';
import { leadsService } from '@/services/leads.service';
import {
  IndianRupee, ShoppingBag, Users, Target, Award,
  Flame, TrendingUp, Calendar, ArrowUpRight
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar
} from 'recharts';

export function AdminDashboard() {
  const { organization } = useAuth();
  const orgId = organization?.id || '11111111-1111-1111-1111-111111111111';

  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalRevenue: 2450000,
    paidSalesCount: 48,
    avgDealSize: 51041,
    activeLeads: 62,
    conversionRate: 28.4,
    commissionPayable: 122500,
  });

  const [recentSales, setRecentSales] = useState<any[]>([]);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);

  // Demo trend data for charts
  const revenueTrend = [
    { month: 'Jan', revenue: 1400000, target: 1200000 },
    { month: 'Feb', revenue: 1650000, target: 1400000 },
    { month: 'Mar', revenue: 1900000, target: 1600000 },
    { month: 'Apr', revenue: 1750000, target: 1800000 },
    { month: 'May', revenue: 2100000, target: 1900000 },
    { month: 'Jun', revenue: 2450000, target: 2000000 },
  ];

  const productDistribution = [
    { name: 'AI & GenAI Masterclass', value: 975000, color: '#3b82f6' },
    { name: 'Python Bootcamp', value: 525000, color: '#10b981' },
    { name: 'Web Dev Executive', value: 450000, color: '#8b5cf6' },
    { name: 'Business Analytics', value: 500000, color: '#f59e0b' },
  ];

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const [salesRes, lbRes, statsRes] = await Promise.allSettled([
          salesService.list(orgId, { pageSize: 5 }),
          gamificationService.getLeaderboard(orgId, 'REVENUE', 5),
          salesService.getStats(orgId),
        ]);

        if (salesRes.status === 'fulfilled' && salesRes.value.data.length > 0) {
          setRecentSales(salesRes.value.data);
        } else {
          // Fallback realistic sales
          setRecentSales([
            { id: '1', invoice_number: 'INV-2026-0041', customer: { first_name: 'Rahul', last_name: 'Mehta' }, total: 65000, payment_status: 'PAID', sale_date: '2026-09-16' },
            { id: '2', invoice_number: 'INV-2026-0040', customer: { first_name: 'Ananya', last_name: 'Roy' }, total: 35000, payment_status: 'PAID', sale_date: '2026-09-15' },
            { id: '3', invoice_number: 'INV-2026-0039', customer: { first_name: 'Vikram', last_name: 'Joshi' }, total: 45000, payment_status: 'PAID', sale_date: '2026-09-15' },
            { id: '4', invoice_number: 'INV-2026-0038', customer: { first_name: 'Deepak', last_name: 'Gupta' }, total: 25000, payment_status: 'PAID', sale_date: '2026-09-14' },
            { id: '5', invoice_number: 'INV-2026-0037', customer: { first_name: 'Neha', last_name: 'Singh' }, total: 65000, payment_status: 'PAID', sale_date: '2026-09-13' },
          ]);
        }

        if (lbRes.status === 'fulfilled' && lbRes.value.length > 0) {
          const sorted = [...lbRes.value]
            .map((u) => {
              const rev = Number(u.revenue ?? u.total_revenue ?? 0);
              const deals = Number(u.sales_count ?? u.total_sales ?? 0);
              return {
                ...u,
                revenue: rev,
                total_revenue: rev,
                sales_count: deals,
                total_sales: deals,
              };
            })
            .sort((a, b) => b.revenue - a.revenue)
            .map((u, idx) => ({ ...u, rank: idx + 1 }));
          setLeaderboard(sorted);
        } else {
          setLeaderboard([
            { rank: 1, first_name: 'Arjun', last_name: 'Nair', team_name: 'Alpha Squad (North)', revenue: 650000, total_revenue: 650000, sales_count: 11, total_sales: 11, xp: 3400 },
            { rank: 2, first_name: 'Kavita', last_name: 'Menon', team_name: 'Beta Sharks (West)', revenue: 520000, total_revenue: 520000, sales_count: 9, total_sales: 9, xp: 2900 },
            { rank: 3, first_name: 'Suresh', last_name: 'Iyer', team_name: 'Alpha Squad (North)', revenue: 440000, total_revenue: 440000, sales_count: 8, total_sales: 8, xp: 2450 },
            { rank: 4, first_name: 'Pooja', last_name: 'Deshmukh', team_name: 'Beta Sharks (West)', revenue: 380000, total_revenue: 380000, sales_count: 7, total_sales: 7, xp: 2100 },
          ]);
        }

        if (statsRes.status === 'fulfilled' && statsRes.value.totalRevenue > 0) {
          setStats(prev => ({
            ...prev,
            totalRevenue: statsRes.value.totalRevenue,
            paidSalesCount: statsRes.value.paidSalesCount,
            avgDealSize: statsRes.value.avgDealSize,
          }));
        }
      } catch (err) {
        console.error('Error loading admin dashboard:', err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [orgId]);

  if (loading) {
    return <LoadingSpinner text="Aggregating sales and organizational analytics..." />;
  }

  return (
    <div className="space-y-8 pb-6">
      <header className="flex flex-col gap-5 border-b border-border/70 pb-7 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">September 2026 · Performance</p>
          <h1 className="text-3xl font-semibold tracking-[-0.04em] text-foreground">Business at a glance</h1>
          <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">A focused view of revenue, momentum, and team performance for {organization?.name || 'Acme Learning'}.</p>
        </div>
        <Button variant="outline" size="sm" className="h-9 gap-2 rounded-lg border-border/80 bg-card px-3.5 text-xs font-medium">
          <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
          This month
        </Button>
      </header>

      <section className="grid overflow-hidden rounded-2xl border border-border/80 bg-border/80 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          className="rounded-none border-0 bg-card shadow-none hover:shadow-none"
          title="Revenue"
          value={formatCurrency(stats.totalRevenue)}
          trend={{ value: 18.2, isPositive: true, label: 'from last month' }}
          icon={<IndianRupee className="h-4 w-4" />}
          variant="primary"
        />
        <StatCard
          className="rounded-none border-0 bg-card shadow-none hover:shadow-none"
          title="Closed deals"
          value={formatNumber(stats.paidSalesCount)}
          trend={{ value: 12.5, isPositive: true, label: 'from last month' }}
          icon={<ShoppingBag className="h-4 w-4" />}
          variant="default"
        />
        <StatCard
          className="rounded-none border-0 bg-card shadow-none hover:shadow-none"
          title="Average deal"
          value={formatCurrency(stats.avgDealSize)}
          trend={{ value: 5.1, isPositive: true, label: 'deal velocity' }}
          icon={<TrendingUp className="h-4 w-4" />}
          variant="default"
        />
        <StatCard
          className="rounded-none border-0 bg-card shadow-none hover:shadow-none"
          title="Target progress"
          value="114.2%"
          description="₹24.5L of ₹21.5L target"
          icon={<Target className="h-4 w-4" />}
          variant="success"
        />
      </section>

      <section className="grid grid-cols-1 gap-5 xl:grid-cols-12">
        <Card className="overflow-hidden border-border/80 xl:col-span-8">
          <CardHeader className="flex flex-row items-start justify-between border-b border-border/70 pb-5">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Revenue</p>
              <CardTitle className="mt-1 text-lg font-semibold tracking-[-0.025em]">Monthly performance</CardTitle>
              <CardDescription className="mt-1">Actual revenue against plan</CardDescription>
            </div>
            <span className="rounded-full bg-emerald-500/10 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">+22.5% YoY</span>
          </CardHeader>
          <CardContent className="px-2 pb-3 pt-5 sm:px-4">
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={revenueTrend} margin={{ top: 8, right: 12, left: -8, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#1d4ed8" stopOpacity={0.16} />
                      <stop offset="95%" stopColor="#1d4ed8" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="2 6" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(value) => `₹${value / 100000}L`} />
                  <Tooltip formatter={(value: any) => [formatCurrency(Number(value)), 'Revenue']} contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '12px', boxShadow: '0 12px 30px rgba(15, 23, 42, 0.10)' }} />
                  <Area type="monotone" dataKey="revenue" stroke="#1d4ed8" strokeWidth={2.25} fillOpacity={1} fill="url(#colorRev)" />
                  <Area type="monotone" dataKey="target" stroke="#94a3b8" strokeWidth={1.5} strokeDasharray="4 5" fill="none" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/80 xl:col-span-4">
          <CardHeader className="border-b border-border/70 pb-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Portfolio</p>
            <CardTitle className="mt-1 text-lg font-semibold tracking-[-0.025em]">Product mix</CardTitle>
            <CardDescription className="mt-1">Share of total revenue</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5 pt-5">
            <div>
              <p className="text-3xl font-semibold tracking-[-0.04em]">{formatCurrency(stats.totalRevenue)}</p>
              <p className="mt-1 text-xs text-muted-foreground">Qualified revenue this month</p>
            </div>
            <div className="space-y-4">
              {productDistribution.map((item) => {
                const share = Math.round((item.value / stats.totalRevenue) * 100);
                return (
                  <div key={item.name}>
                    <div className="mb-2 flex items-center justify-between gap-3 text-xs">
                      <span className="truncate font-medium text-foreground">{item.name}</span>
                      <span className="shrink-0 text-muted-foreground">{share}%</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                      <div className="h-full rounded-full bg-primary" style={{ width: `${share}%`, opacity: 0.45 + share / 100 }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="grid grid-cols-1 gap-5 xl:grid-cols-12">
        <Card className="overflow-hidden border-border/80 xl:col-span-8">
          <CardHeader className="flex flex-row items-center justify-between border-b border-border/70 pb-5">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Sales</p>
              <CardTitle className="mt-1 text-lg font-semibold tracking-[-0.025em]">Recent transactions</CardTitle>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <a href="/sales" className="text-xs font-medium text-primary">View all <ArrowUpRight className="h-3.5 w-3.5" /></a>
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Invoice</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentSales.map((sale) => (
                  <TableRow key={sale.id} className="border-border/60">
                    <TableCell className="font-mono text-xs font-medium">{sale.invoice_number}</TableCell>
                    <TableCell className="font-medium text-sm">{sale.customer ? `${sale.customer.first_name} ${sale.customer.last_name}` : 'Direct customer'}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{sale.sale_date ? new Date(sale.sale_date).toLocaleDateString() : 'Today'}</TableCell>
                    <TableCell><Badge variant="success" className="rounded-full px-2 py-0.5 text-[10px]">{sale.payment_status}</Badge></TableCell>
                    <TableCell className="text-right text-sm font-semibold">{formatCurrency(sale.total)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card className="border-border/80 xl:col-span-4">
          <CardHeader className="flex flex-row items-center justify-between border-b border-border/70 pb-5">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Team</p>
              <CardTitle className="mt-1 text-lg font-semibold tracking-[-0.025em]">Top performers</CardTitle>
            </div>
            <Button variant="ghost" size="sm" asChild><a href="/leaderboard" className="text-xs font-medium text-primary">All ranks</a></Button>
          </CardHeader>
          <CardContent className="pt-3">
            <div className="divide-y divide-border/60">
              {leaderboard.map((user) => {
                const deals = user.sales_count ?? user.total_sales ?? 0;
                const revenue = user.revenue ?? user.total_revenue ?? 0;
                return (
                  <div key={user.user_id || user.rank} className="flex items-center justify-between py-3.5 first:pt-1">
                    <div className="flex items-center gap-3">
                      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-muted text-[11px] font-semibold text-muted-foreground">
                        {String(user.rank).padStart(2, '0')}
                      </span>
                      <div>
                        <p className="text-sm font-medium">{user.first_name} {user.last_name}</p>
                        <p className="mt-0.5 text-[11px] text-muted-foreground">
                          {user.team_name || 'Sales team'} · {deals} {deals === 1 ? 'deal' : 'deals'}
                        </p>
                      </div>
                    </div>
                    <p className="text-sm font-semibold">{formatCurrency(revenue)}</p>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
