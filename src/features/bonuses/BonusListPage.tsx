import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { bonusesService } from '@/services/bonuses.service';
import { reportsService } from '@/services/reports.service';
import type { BonusRecord, BonusRule } from '@/types';
import { CompensationStatus, BonusConditionType, TargetPeriod } from '@/types';
import { PageHeader } from '@/components/common/PageHeader';
import { StatCard } from '@/components/common/StatCard';
import { LoadingSpinner, EmptyState } from '@/components/common/EmptyState';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/toast';
import { formatCurrency, formatNumber } from '@/lib/utils';
import {
  Gift, CheckCircle2, Clock, Plus, Download, Trophy,
  Flame, Award, ShieldCheck, CheckCheck, RefreshCw, Zap
} from 'lucide-react';

export function BonusListPage() {
  const { organization } = useAuth();
  const orgId = organization?.id || '11111111-1111-1111-1111-111111111111';
  const { success, error: toastError } = useToast();

  const [loading, setLoading] = useState(true);
  const [records, setRecords] = useState<BonusRecord[]>([]);
  const [rules, setRules] = useState<BonusRule[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [activeTab, setActiveTab] = useState('records');
  const [ruleModalOpen, setRuleModalOpen] = useState(false);

  // New Rule Form State
  const [name, setName] = useState('');
  const [conditionType, setConditionType] = useState<BonusConditionType>(BonusConditionType.REVENUE);
  const [conditionValue, setConditionValue] = useState<number>(250000);
  const [bonusAmount, setBonusAmount] = useState<number>(15000);
  const [period, setPeriod] = useState<TargetPeriod>(TargetPeriod.MONTHLY);
  const [submitting, setSubmitting] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const [recordsRes, rulesRes] = await Promise.all([
        bonusesService.getRecords(orgId, { status: statusFilter === 'ALL' ? undefined : statusFilter }),
        bonusesService.getRules(orgId),
      ]);
      setRecords(recordsRes.data || []);
      setRules(rulesRes || []);
    } catch (err) {
      console.error('Failed to load bonus data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [orgId, statusFilter]);

  const handleApprove = async (id: string) => {
    try {
      await bonusesService.updateStatus(id, CompensationStatus.APPROVED);
      success('Bonus Approved', 'The performance bonus has been approved.');
      loadData();
    } catch (err) {
      toastError('Action Failed', 'Could not approve bonus.');
    }
  };

  const handleMarkPaid = async (id: string) => {
    try {
      await bonusesService.updateStatus(id, CompensationStatus.PAID);
      success('Bonus Disbursed', 'The performance bonus has been marked as disbursed.');
      loadData();
    } catch (err) {
      toastError('Action Failed', 'Could not disburse bonus.');
    }
  };

  const handleCreateRule = async () => {
    if (!name.trim()) {
      toastError('Name required', 'Please provide an incentive scheme name.');
      return;
    }
    setSubmitting(true);
    try {
      await bonusesService.createRule(orgId, {
        name: name.trim(),
        condition_type: conditionType,
        condition_value: Number(conditionValue),
        bonus_amount: Number(bonusAmount),
        period,
      });
      success('Incentive Scheme Added', `Scheme "${name}" is now live for all sales reps.`);
      setRuleModalOpen(false);
      setName('');
      setConditionValue(250000);
      setBonusAmount(15000);
      loadData();
    } catch (err) {
      toastError('Error', 'Failed to create incentive scheme.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleExportCSV = () => {
    const exportData = records.map(r => ({
      ID: r.id,
      Employee: r.user ? `${r.user.first_name} ${r.user.last_name}` : 'Sales Rep',
      BonusAmount: r.amount,
      Status: r.status,
      ApprovedAt: r.approved_at ? new Date(r.approved_at).toLocaleDateString() : 'N/A',
      Date: new Date(r.created_at).toLocaleDateString(),
    }));
    reportsService.exportCSV(exportData, 'bonus-ledger');
  };

  const totalDistributed = records.reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
  const totalApproved = records.filter(r => r.status === CompensationStatus.APPROVED).reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
  const totalPaid = records.filter(r => r.status === CompensationStatus.PAID).reduce((sum, r) => sum + (Number(r.amount) || 0), 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Performance Bonuses &amp; Incentives"
        subtitle="Target-linked milestone bonuses, revenue incentives, and sales sprint awards."
      >
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleExportCSV} className="gap-1.5 text-xs">
            <Download className="h-3.5 w-3.5" /> Export Ledger
          </Button>
          <Button size="sm" onClick={() => setRuleModalOpen(true)} className="gap-1.5 text-xs">
            <Plus className="h-3.5 w-3.5" /> New Incentive Scheme
          </Button>
        </div>
      </PageHeader>

      {/* KPI Stat Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Incentive Pool"
          value={formatCurrency(totalDistributed)}
          icon={<Gift className="h-5 w-5 text-primary" />}
          description="Cumulative bonus awards"
        />
        <StatCard
          title="Approved For Payout"
          value={formatCurrency(totalApproved)}
          icon={<CheckCircle2 className="h-5 w-5 text-emerald-500" />}
          description="Ready for payroll credit"
        />
        <StatCard
          title="Disbursed Sum"
          value={formatCurrency(totalPaid)}
          icon={<ShieldCheck className="h-5 w-5 text-indigo-500" />}
          description="Completed disbursements"
        />
        <StatCard
          title="Active Programs"
          value={rules.length}
          icon={<Trophy className="h-5 w-5 text-amber-500" />}
          description="Competitive incentive schemes"
        />
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <TabsList className="grid w-full sm:w-auto grid-cols-2">
            <TabsTrigger value="records">Bonus Payout Ledger ({records.length})</TabsTrigger>
            <TabsTrigger value="rules">Incentive Schemes ({rules.length})</TabsTrigger>
          </TabsList>

          {activeTab === 'records' && (
            <div className="flex items-center gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-36 h-8 text-xs bg-card">
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Statuses</SelectItem>
                  <SelectItem value={CompensationStatus.APPROVED}>Approved</SelectItem>
                  <SelectItem value={CompensationStatus.PENDING}>Pending</SelectItem>
                  <SelectItem value={CompensationStatus.PAID}>Paid</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={loadData}>
                <RefreshCw className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}
        </div>

        {/* Tab 1: Bonus Ledger */}
        <TabsContent value="records" className="space-y-4">
          <Card>
            <CardContent className="p-0">
              {loading ? (
                <div className="py-16">
                  <LoadingSpinner />
                </div>
              ) : records.length === 0 ? (
                <EmptyState
                  title="No bonus payouts recorded"
                  description="When sales reps hit their target thresholds, bonus payouts are triggered here."
                  icon={<Gift className="h-10 w-10 text-muted-foreground" />}
                />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Employee</TableHead>
                      <TableHead>Milestone Program</TableHead>
                      <TableHead>Bonus Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Approved Date</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {records.map(record => {
                      const repName = record.user ? `${record.user.first_name} ${record.user.last_name}` : 'Sales Representative';
                      return (
                        <TableRow key={record.id}>
                          <TableCell>
                            <div className="font-semibold text-foreground text-xs">{repName}</div>
                            <div className="text-[11px] text-muted-foreground">{record.user?.email || 'salesrep@crm.io'}</div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Award className="h-4 w-4 text-amber-500" />
                              <span className="font-medium text-xs text-foreground">
                                {record.rule?.name || 'Performance Quota Sprint'}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="font-bold text-sm text-foreground">
                              {formatCurrency(record.amount)}
                            </span>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                record.status === CompensationStatus.APPROVED
                                  ? 'default'
                                  : record.status === CompensationStatus.PAID
                                  ? 'secondary'
                                  : 'outline'
                              }
                              className="text-[11px] capitalize"
                            >
                              {record.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {record.approved_at
                              ? new Date(record.approved_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
                              : 'Pending Verification'}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {record.status === CompensationStatus.PENDING && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-7 text-xs text-emerald-600 border-emerald-500/30 hover:bg-emerald-500/10"
                                  onClick={() => handleApprove(record.id)}
                                >
                                  <CheckCheck className="h-3.5 w-3.5 mr-1" /> Approve
                                </Button>
                              )}
                              {record.status === CompensationStatus.APPROVED && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-7 text-xs text-indigo-600 border-indigo-500/30 hover:bg-indigo-500/10"
                                  onClick={() => handleMarkPaid(record.id)}
                                >
                                  <ShieldCheck className="h-3.5 w-3.5 mr-1" /> Disburse
                                </Button>
                              )}
                              {record.status === CompensationStatus.PAID && (
                                <span className="text-[11px] text-emerald-600 font-medium flex items-center gap-1">
                                  <CheckCircle2 className="h-3.5 w-3.5" /> Disbursed
                                </span>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 2: Incentive Schemes */}
        <TabsContent value="rules" className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {rules.map(rule => (
              <Card key={rule.id} className="relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 to-rose-500" />
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-sm font-bold text-foreground">
                        {rule.name}
                      </CardTitle>
                      <CardDescription className="text-xs mt-0.5 capitalize">
                        {rule.period.toLowerCase()} bonus cycle
                      </CardDescription>
                    </div>
                    <Badge variant={rule.is_active ? 'default' : 'secondary'} className="text-[10px]">
                      {rule.is_active ? 'ACTIVE' : 'INACTIVE'}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3 pt-0">
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-black text-amber-500">
                      {formatCurrency(rule.bonus_amount)}
                    </span>
                    <span className="text-xs text-muted-foreground">cash reward</span>
                  </div>
                  <div className="rounded-lg bg-muted/40 p-2.5 text-xs space-y-1">
                    <div className="flex justify-between text-muted-foreground">
                      <span>Condition:</span>
                      <span className="font-semibold text-foreground">
                        {rule.condition_type === BonusConditionType.REVENUE
                          ? `Achieve ${formatCurrency(rule.condition_value)} Revenue`
                          : `Close ${rule.condition_value} Won Deals`}
                      </span>
                    </div>
                    <div className="flex justify-between text-muted-foreground">
                      <span>Eligibility:</span>
                      <span className="font-medium text-foreground">All Sales Reps</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* New Scheme Modal Dialog */}
      <Dialog open={ruleModalOpen} onOpenChange={setRuleModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create Performance Incentive Scheme</DialogTitle>
            <DialogDescription>
              Launch milestone rewards to accelerate closing velocity and quota overachievement.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-3 text-xs">
            <div className="space-y-1.5">
              <Label htmlFor="scheme-name">Program Title</Label>
              <Input
                id="scheme-name"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="e.g. Q3 Closer MasterSprint"
                className="text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Milestone Metric</Label>
                <Select value={conditionType} onValueChange={(v: BonusConditionType) => setConditionType(v)}>
                  <SelectTrigger className="text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={BonusConditionType.REVENUE}>Total Revenue (₹)</SelectItem>
                    <SelectItem value={BonusConditionType.SALES_COUNT}>Number of Deals</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>Target Value</Label>
                <Input
                  type="number"
                  value={conditionValue}
                  onChange={e => setConditionValue(Number(e.target.value))}
                  placeholder="250000"
                  className="text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Bonus Reward (₹)</Label>
                <Input
                  type="number"
                  value={bonusAmount}
                  onChange={e => setBonusAmount(Number(e.target.value))}
                  placeholder="15000"
                  className="text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Evaluation Period</Label>
                <Select value={period} onValueChange={(v: TargetPeriod) => setPeriod(v)}>
                  <SelectTrigger className="text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={TargetPeriod.MONTHLY}>Monthly</SelectItem>
                    <SelectItem value={TargetPeriod.QUARTERLY}>Quarterly</SelectItem>
                    <SelectItem value={TargetPeriod.YEARLY}>Yearly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setRuleModalOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleCreateRule} disabled={submitting}>
              {submitting ? 'Creating...' : 'Activate Incentive Scheme'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
export default BonusListPage;
