import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { commissionsService } from '@/services/commissions.service';
import { reportsService } from '@/services/reports.service';
import type { CommissionRecord, CommissionRule } from '@/types';
import { CompensationStatus, CommissionRuleType } from '@/types';
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
import { formatCurrency } from '@/lib/utils';
import {
  DollarSign, CheckCircle2, Clock, Plus, Download, ShieldCheck,
  TrendingUp, RefreshCw, CheckCheck, XCircle, ArrowUpRight, Percent
} from 'lucide-react';

export function CommissionListPage() {
  const { organization, isAdmin } = useAuth();
  const orgId = organization?.id || '11111111-1111-1111-1111-111111111111';
  const { success, error: toastError } = useToast();

  const [loading, setLoading] = useState(true);
  const [records, setRecords] = useState<CommissionRecord[]>([]);
  const [rules, setRules] = useState<CommissionRule[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [activeTab, setActiveTab] = useState('records');
  const [ruleModalOpen, setRuleModalOpen] = useState(false);

  // New Rule Form State
  const [ruleName, setRuleName] = useState('');
  const [ruleType, setRuleType] = useState<CommissionRuleType>(CommissionRuleType.PERCENTAGE);
  const [ruleRate, setRuleRate] = useState<number>(5.0);
  const [minTier, setMinTier] = useState<string>('');
  const [maxTier, setMaxTier] = useState<string>('');
  const [submittingRule, setSubmittingRule] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const [recordsRes, rulesRes] = await Promise.all([
        commissionsService.getRecords(orgId, { status: statusFilter === 'ALL' ? undefined : statusFilter }),
        commissionsService.getRules(orgId),
      ]);
      setRecords(recordsRes.data || []);
      setRules(rulesRes || []);
    } catch (err) {
      console.error('Failed to load commissions:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [orgId, statusFilter]);

  const handleApprove = async (id: string) => {
    try {
      await commissionsService.updateStatus(id, CompensationStatus.APPROVED);
      success('Commission Approved', 'The commission record has been marked as approved for payout.');
      loadData();
    } catch (err) {
      toastError('Action Failed', 'Could not approve commission.');
    }
  };

  const handleMarkPaid = async (id: string) => {
    try {
      await commissionsService.updateStatus(id, CompensationStatus.PAID);
      success('Commission Paid', 'The commission record has been marked as paid.');
      loadData();
    } catch (err) {
      toastError('Action Failed', 'Could not mark as paid.');
    }
  };

  const handleCreateRule = async () => {
    if (!ruleName.trim()) {
      toastError('Name required', 'Please give this commission rule a name.');
      return;
    }
    setSubmittingRule(true);
    try {
      await commissionsService.createRule(orgId, {
        name: ruleName.trim(),
        type: ruleType,
        rate: Number(ruleRate),
        tier_min: minTier ? Number(minTier) : undefined,
        tier_max: maxTier ? Number(maxTier) : undefined,
      });
      success('Rule Created', `Commission rule "${ruleName}" is now active.`);
      setRuleModalOpen(false);
      setRuleName('');
      setRuleRate(5.0);
      setMinTier('');
      setMaxTier('');
      loadData();
    } catch (err) {
      toastError('Error', 'Failed to create commission rule.');
    } finally {
      setSubmittingRule(false);
    }
  };

  const handleExportCSV = () => {
    const exportData = records.map(r => ({
      ID: r.id,
      Rep: r.user ? `${r.user.first_name} ${r.user.last_name}` : 'Sales Rep',
      BaseAmount: r.base_amount,
      Rate: `${r.commission_rate}%`,
      CommissionEarned: r.commission_amount || r.amount,
      Status: r.status,
      CreatedDate: new Date(r.created_at).toLocaleDateString(),
    }));
    reportsService.exportCSV(exportData, 'commissions-ledger');
  };

  // Metrics
  const totalAccrued = records.reduce((sum, r) => sum + (Number(r.commission_amount || r.amount) || 0), 0);
  const totalApproved = records.filter(r => r.status === CompensationStatus.APPROVED).reduce((sum, r) => sum + (Number(r.commission_amount || r.amount) || 0), 0);
  const totalPaid = records.filter(r => r.status === CompensationStatus.PAID).reduce((sum, r) => sum + (Number(r.commission_amount || r.amount) || 0), 0);
  const pendingCount = records.filter(r => r.status === CompensationStatus.PENDING).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Commission & Incentive Engine"
        subtitle="Automated deal earnings calculation, tiered bonus schemes, and payroll approval workflows."
      >
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleExportCSV} className="gap-1.5 text-xs">
            <Download className="h-3.5 w-3.5" /> Export Ledger
          </Button>
          <Button size="sm" onClick={() => setRuleModalOpen(true)} className="gap-1.5 text-xs">
            <Plus className="h-3.5 w-3.5" /> New Commission Rule
          </Button>
        </div>
      </PageHeader>

      {/* KPI Stat Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Accrued"
          value={formatCurrency(totalAccrued)}
          icon={<DollarSign className="h-5 w-5 text-primary" />}
          trend={{ value: 14.8, isPositive: true }}
          description="Cumulative deal commission"
        />
        <StatCard
          title="Approved For Payout"
          value={formatCurrency(totalApproved)}
          icon={<CheckCircle2 className="h-5 w-5 text-emerald-500" />}
          description="Ready for disbursement"
        />
        <StatCard
          title="Total Disbursed"
          value={formatCurrency(totalPaid)}
          icon={<ShieldCheck className="h-5 w-5 text-indigo-500" />}
          description="Processed payouts"
        />
        <StatCard
          title="Pending Review"
          value={pendingCount}
          icon={<Clock className="h-5 w-5 text-amber-500" />}
          description={`${rules.length} active commission rules`}
        />
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <TabsList className="grid w-full sm:w-auto grid-cols-2">
            <TabsTrigger value="records">Commission Ledger ({records.length})</TabsTrigger>
            <TabsTrigger value="rules">Commission Rules ({rules.length})</TabsTrigger>
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
                  <SelectItem value={CompensationStatus.REVERSED}>Reversed</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={loadData}>
                <RefreshCw className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}
        </div>

        {/* Tab 1: Commission Records */}
        <TabsContent value="records" className="space-y-4">
          <Card>
            <CardContent className="p-0">
              {loading ? (
                <div className="py-16">
                  <LoadingSpinner />
                </div>
              ) : records.length === 0 ? (
                <EmptyState
                  title="No commission records found"
                  description="Commissions are automatically accrued whenever a new sale is created and closed."
                  icon={<DollarSign className="h-10 w-10 text-muted-foreground" />}
                />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Sales Representative</TableHead>
                      <TableHead>Deal / Invoice</TableHead>
                      <TableHead>Base Deal Value</TableHead>
                      <TableHead>Rate</TableHead>
                      <TableHead>Commission Earned</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Accrued Date</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {records.map(record => {
                      const repName = record.user ? `${record.user.first_name} ${record.user.last_name}` : 'Sales Representative';
                      const amount = record.commission_amount || record.amount;
                      return (
                        <TableRow key={record.id}>
                          <TableCell>
                            <div className="font-semibold text-foreground text-xs">{repName}</div>
                            <div className="text-[11px] text-muted-foreground">{record.rule?.rule_name || 'Standard Commission'}</div>
                          </TableCell>
                          <TableCell>
                            <span className="font-mono text-xs font-medium text-foreground">
                              {record.sale?.invoice_number || `#INV-${record.id.slice(0, 8)}`}
                            </span>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {formatCurrency(record.base_amount)}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs font-semibold gap-1">
                              <Percent className="h-3 w-3" /> {record.commission_rate || record.rule?.rate || 5}%
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <span className="font-bold text-sm text-foreground">
                              {formatCurrency(amount)}
                            </span>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                record.status === CompensationStatus.APPROVED
                                  ? 'default'
                                  : record.status === CompensationStatus.PAID
                                  ? 'secondary'
                                  : record.status === CompensationStatus.REVERSED
                                  ? 'destructive'
                                  : 'outline'
                              }
                              className="text-[11px] capitalize"
                            >
                              {record.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {new Date(record.created_at).toLocaleDateString('en-IN', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric'
                            })}
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
                                  <ShieldCheck className="h-3.5 w-3.5 mr-1" /> Mark Paid
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

        {/* Tab 2: Commission Rules */}
        <TabsContent value="rules" className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {rules.map(rule => (
              <Card key={rule.id} className="relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary to-indigo-500" />
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-sm font-bold text-foreground">
                        {rule.rule_name || rule.name}
                      </CardTitle>
                      <CardDescription className="text-xs mt-0.5">
                        {rule.type === CommissionRuleType.PERCENTAGE ? 'Percentage of Closed Deal' : 'Fixed Flat Sum per Sale'}
                      </CardDescription>
                    </div>
                    <Badge variant={rule.is_active ? 'default' : 'secondary'} className="text-[10px]">
                      {rule.is_active ? 'ACTIVE' : 'INACTIVE'}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3 pt-0">
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-black text-primary">
                      {rule.rate}{rule.type === CommissionRuleType.PERCENTAGE ? '%' : ' INR'}
                    </span>
                    <span className="text-xs text-muted-foreground">commission payout</span>
                  </div>
                  <div className="rounded-lg bg-muted/40 p-2.5 text-xs space-y-1">
                    <div className="flex justify-between text-muted-foreground">
                      <span>Scope:</span>
                      <span className="font-medium text-foreground">Organization-wide</span>
                    </div>
                    {rule.tier_min && (
                      <div className="flex justify-between text-muted-foreground">
                        <span>Min Threshold:</span>
                        <span className="font-medium text-foreground">{formatCurrency(rule.tier_min)}</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* New Rule Modal Dialog */}
      <Dialog open={ruleModalOpen} onOpenChange={setRuleModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Configure Commission Rule</DialogTitle>
            <DialogDescription>
              Define new incentive percentage formulas or flat bonuses tied to deals.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-3 text-xs">
            <div className="space-y-1.5">
              <Label htmlFor="rule-name">Rule Name</Label>
              <Input
                id="rule-name"
                value={ruleName}
                onChange={e => setRuleName(e.target.value)}
                placeholder="e.g. Enterprise Accelerator (8%)"
                className="text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Rule Type</Label>
                <Select value={ruleType} onValueChange={(v: CommissionRuleType) => setRuleType(v)}>
                  <SelectTrigger className="text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={CommissionRuleType.PERCENTAGE}>Percentage (%)</SelectItem>
                    <SelectItem value={CommissionRuleType.FIXED}>Fixed Amount (₹)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="rule-rate">Rate / Amount</Label>
                <Input
                  id="rule-rate"
                  type="number"
                  step="0.5"
                  value={ruleRate}
                  onChange={e => setRuleRate(Number(e.target.value))}
                  className="text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="tier-min">Min Deal Value (Optional)</Label>
                <Input
                  id="tier-min"
                  type="number"
                  value={minTier}
                  onChange={e => setMinTier(e.target.value)}
                  placeholder="₹ 50,000"
                  className="text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="tier-max">Max Deal Value (Optional)</Label>
                <Input
                  id="tier-max"
                  type="number"
                  value={maxTier}
                  onChange={e => setMaxTier(e.target.value)}
                  placeholder="₹ 5,00,000"
                  className="text-xs"
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setRuleModalOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleCreateRule} disabled={submittingRule}>
              {submittingRule ? 'Saving...' : 'Save & Activate Rule'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
export default CommissionListPage;
