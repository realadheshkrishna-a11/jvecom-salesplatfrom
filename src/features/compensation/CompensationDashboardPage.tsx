import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/lib/auth';
import { PageHeader } from '@/components/common/PageHeader';
import { StatCard } from '@/components/common/StatCard';
import { LoadingSpinner, EmptyState } from '@/components/common/EmptyState';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/utils';
import { IndianRupee, Award, Flame, Download, Clock } from 'lucide-react';
import { commissionsService } from '@/services/commissions.service';
import { bonusesService } from '@/services/bonuses.service';
import { reportsService } from '@/services/reports.service';
import { CompensationStatus } from '@/types';

export function CompensationDashboardPage() {
  const { organization } = useAuth();
  const orgId = organization?.id || '11111111-1111-1111-1111-111111111111';

  const [loading, setLoading] = useState(true);
  const [commissions, setCommissions] = useState<any[]>([]);
  const [bonuses, setBonuses] = useState<any[]>([]);

  useEffect(() => {
    let cancelled = false;
    async function loadData() {
      try {
        setLoading(true);
        const [cRes, bRes] = await Promise.allSettled([
          commissionsService.listRecords(orgId, { pageSize: 1000 }),
          bonusesService.listRecords(orgId, { pageSize: 1000 }),
        ]);

        if (cancelled) return;
        if (cRes.status === 'fulfilled') {
          setCommissions(cRes.value.data || []);
        }
        if (bRes.status === 'fulfilled') {
          setBonuses(bRes.value.data || []);
        }
      } catch (err) {
        console.error('Error loading compensation data:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadData();
    return () => {
      cancelled = true;
    };
  }, [orgId]);

  // Combined itemized statements
  const statements = useMemo(() => {
    const list: any[] = [];

    commissions.forEach((c) => {
      const repName = c.user ? `${c.user.first_name || ''} ${c.user.last_name || ''}`.trim() : 'Sales Rep';
      const period = c.created_at ? new Date(c.created_at).toLocaleDateString(undefined, { month: 'short', year: 'numeric' }) : 'Current Cycle';
      const amt = Number(c.commission_amount || c.amount) || 0;
      list.push({
        id: c.id,
        period,
        rep: repName,
        type: 'Commission',
        grossSales: Number(c.sale?.total) || 0,
        commission: amt,
        bonus: 0,
        adjustments: 0,
        totalPayable: amt,
        status: c.status || CompensationStatus.PENDING,
      });
    });

    bonuses.forEach((b) => {
      const repName = b.user ? `${b.user.first_name || ''} ${b.user.last_name || ''}`.trim() : 'Sales Rep';
      const period = b.created_at ? new Date(b.created_at).toLocaleDateString(undefined, { month: 'short', year: 'numeric' }) : 'Current Cycle';
      const amt = Number(b.amount) || 0;
      list.push({
        id: b.id,
        period,
        rep: repName,
        type: 'Bonus',
        grossSales: 0,
        commission: 0,
        bonus: amt,
        adjustments: 0,
        totalPayable: amt,
        status: b.status || CompensationStatus.PENDING,
      });
    });

    return list;
  }, [commissions, bonuses]);

  // Real aggregate financial metrics
  const totalCommissionLiability = commissions.reduce((sum, c) => sum + (Number(c.commission_amount || c.amount) || 0), 0);
  const totalBonuses = bonuses.reduce((sum, b) => sum + (Number(b.amount) || 0), 0);
  const netDisbursed =
    commissions.filter((c) => c.status === CompensationStatus.PAID).reduce((sum, c) => sum + (Number(c.commission_amount || c.amount) || 0), 0) +
    bonuses.filter((b) => b.status === CompensationStatus.PAID).reduce((sum, b) => sum + (Number(b.amount) || 0), 0);
  const pendingApproval =
    commissions.filter((c) => c.status === CompensationStatus.PENDING).reduce((sum, c) => sum + (Number(c.commission_amount || c.amount) || 0), 0) +
    bonuses.filter((b) => b.status === CompensationStatus.PENDING).reduce((sum, b) => sum + (Number(b.amount) || 0), 0);

  const handleExport = () => {
    reportsService.exportCSV(statements, 'compensation-statements');
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Compensation &amp; Payroll Statements"
        subtitle="Transparent earnings breakdown: gross closed sales, earned commission, bonuses, adjustments, and payable sums."
      >
        <Button variant="outline" size="sm" onClick={handleExport} disabled={statements.length === 0} className="gap-2">
          <Download className="w-4 h-4" /> Export CSV
        </Button>
      </PageHeader>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Commission Liability"
          value={formatCurrency(totalCommissionLiability)}
          icon={<Award className="w-5 h-5" />}
          variant="primary"
          description="Accrued from deal closures"
        />
        <StatCard
          title="Total Performance Bonuses"
          value={formatCurrency(totalBonuses)}
          icon={<Flame className="w-5 h-5" />}
          variant="warning"
          description="Sprint & target incentives"
        />
        <StatCard
          title="Net Disbursed"
          value={formatCurrency(netDisbursed)}
          icon={<IndianRupee className="w-5 h-5" />}
          variant="success"
          description="Settled compensation"
        />
        <StatCard
          title="Pending Approval"
          value={formatCurrency(pendingApproval)}
          icon={<Clock className="w-5 h-5 text-amber-500" />}
          description="In review cycle"
          variant="purple"
        />
      </div>

      {/* Statements Table */}
      <Card className="border-border/60">
        <CardHeader>
          <CardTitle className="text-base">Monthly Compensation Ledger</CardTitle>
          <CardDescription>Itemized statements ready for payroll disbursement</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8">
              <LoadingSpinner text="Loading compensation ledger..." />
            </div>
          ) : statements.length === 0 ? (
            <div className="p-8">
              <EmptyState
                title="No compensation statements"
                description="Earnings will appear here automatically when sales reps close deals and earn commission or bonus awards."
              />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cycle</TableHead>
                  <TableHead>Sales Rep</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Gross Sales</TableHead>
                  <TableHead className="text-right">Commission</TableHead>
                  <TableHead className="text-right">Bonus</TableHead>
                  <TableHead className="text-right">Adjustments</TableHead>
                  <TableHead className="text-right font-bold">Total Payable</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {statements.map((st) => (
                  <TableRow key={st.id}>
                    <TableCell className="font-semibold text-xs text-foreground">{st.period}</TableCell>
                    <TableCell className="text-sm font-medium">{st.rep}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[10px]">
                        {st.type}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right text-xs text-muted-foreground">{formatCurrency(st.grossSales)}</TableCell>
                    <TableCell className="text-right font-medium text-xs">{formatCurrency(st.commission)}</TableCell>
                    <TableCell className="text-right font-medium text-xs text-amber-600 dark:text-amber-400">
                      +{formatCurrency(st.bonus)}
                    </TableCell>
                    <TableCell className="text-right text-xs text-muted-foreground">{formatCurrency(st.adjustments)}</TableCell>
                    <TableCell className="text-right font-bold text-sm text-foreground">
                      {formatCurrency(st.totalPayable)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={st.status === CompensationStatus.PAID ? 'success' : 'outline'} className="text-[10px]">
                        {st.status ? String(st.status).replace(/_/g, ' ') : 'PENDING'}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
