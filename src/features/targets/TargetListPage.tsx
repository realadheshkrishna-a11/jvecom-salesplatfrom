import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { targetsService } from '@/services/targets.service';
import type { Target } from '@/types';
import { TargetType, TargetScope, TargetPeriod } from '@/types';
import { PageHeader } from '@/components/common/PageHeader';
import { LoadingSpinner, EmptyState } from '@/components/common/EmptyState';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/toast';
import { formatCurrency, formatNumber } from '@/lib/utils';
import { Target as TargetIcon, Plus, Trophy, Calendar, CheckCircle2, User, Users } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { targetSchema, type TargetInput } from '@/schemas';

const defaultTargetValues: TargetInput = {
  type: 'REVENUE',
  scope: 'INDIVIDUAL',
  period: 'MONTHLY',
  target_value: 500000,
  period_start: '2026-09-01',
  period_end: '2026-09-30',
  product_id: undefined,
  user_id: undefined,
  team_id: undefined,
};

export function TargetListPage() {
  const { organization, isAdmin, profile } = useAuth();
  const orgId = organization?.id || '11111111-1111-1111-1111-111111111111';
  const { success, error: toastError } = useToast();

  const [loading, setLoading] = useState(true);
  const [targets, setTargets] = useState<Target[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const form = useForm<TargetInput>({
    resolver: zodResolver(targetSchema),
    defaultValues: defaultTargetValues,
  });

  const loadTargets = async () => {
    try {
      setLoading(true);
      const res = await targetsService.list(orgId);
      if (res && res.data.length > 0) {
        setTargets(res.data);
      } else {
        setTargets([]);
      }
    } catch (err) {
      console.error('Error fetching targets:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTargets();
  }, [orgId]);

  const onCreateTarget = async (values: TargetInput) => {
    try {
      await targetsService.create(orgId, values);
      success('Target Established', 'Target assigned with automated milestone tracking');
      setIsDialogOpen(false);
      form.reset();
      loadTargets();
    } catch (err: unknown) {
      toastError('Failed to establish target', err instanceof Error ? err.message : 'Please check parameters');
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Targets &amp; Quotas"
        subtitle="Configure revenue goals, milestones, and attainment accelerators for reps, squads, and the enterprise."
      >
        {isAdmin && (
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-2">
                <Plus className="w-4 h-4" /> Create Target
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Set Sales Target</DialogTitle>
                <DialogDescription>Define goal value and milestone triggers</DialogDescription>
              </DialogHeader>
              <form onSubmit={form.handleSubmit(onCreateTarget)} className="space-y-4 py-2">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Scope</Label>
                    <Select
                      defaultValue="INDIVIDUAL"
                      onValueChange={(val) => form.setValue('scope', val as any)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Scope" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="INDIVIDUAL">Individual Rep</SelectItem>
                        <SelectItem value="TEAM">Team / Squad</SelectItem>
                        <SelectItem value="ORGANIZATION">Entire Organization</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Metric Type</Label>
                    <Select
                      defaultValue="REVENUE"
                      onValueChange={(val) => form.setValue('type', val as any)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Metric" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="REVENUE">Revenue (₹)</SelectItem>
                        <SelectItem value="SALES_COUNT">Deals Count</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="target_value">Goal Target (₹ or Count)</Label>
                  <Input id="target_value" type="number" {...form.register('target_value')} />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="period_start">Start Date</Label>
                    <Input id="period_start" type="date" {...form.register('period_start')} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="period_end">End Date</Label>
                    <Input id="period_end" type="date" {...form.register('period_end')} />
                  </div>
                </div>

                <DialogFooter className="pt-3">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit">Deploy Target</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </PageHeader>

      {/* Target Cards */}
      {loading ? (
        <LoadingSpinner text="Evaluating goal progress..." />
      ) : targets.length === 0 ? (
        <EmptyState
          title="No targets established"
          description="Set monthly or quarterly sales goals to track performance and reward bonuses."
          actionLabel="Set Target"
          onAction={() => setIsDialogOpen(true)}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {targets.map((tgt) => {
            const pct = Math.round((tgt.current_value / tgt.target_value) * 100);
            const isRevenue = tgt.type === 'REVENUE';
            const isExceeded = pct >= 100;

            return (
              <Card key={tgt.id} className="border-border/60 hover:shadow-md transition-all">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <Badge variant="outline" className="text-[10px] font-semibold">
                      {tgt.scope} • {tgt.period}
                    </Badge>
                    <Badge variant={isExceeded ? 'success' : 'default'} className="text-[10px]">
                      {pct}% Achieved
                    </Badge>
                  </div>
                  <CardTitle className="text-base font-bold mt-2 flex items-center gap-2">
                    <TargetIcon className="w-4 h-4 text-primary" />
                    {tgt.scope === 'ORGANIZATION'
                      ? 'Enterprise Target'
                      : tgt.team
                      ? tgt.team.name
                      : tgt.user
                      ? `${tgt.user.first_name} ${tgt.user.last_name}`
                      : 'Personal Goal'}
                  </CardTitle>
                  <CardDescription className="text-xs">
                    {new Date(tgt.period_start).toLocaleDateString()} — {new Date(tgt.period_end).toLocaleDateString()}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <div className="flex justify-between text-xs mb-1.5">
                      <span className="text-muted-foreground">Current Progress</span>
                      <span className="font-bold text-foreground">
                        {isRevenue ? formatCurrency(tgt.current_value) : formatNumber(tgt.current_value)} / {isRevenue ? formatCurrency(tgt.target_value) : formatNumber(tgt.target_value)}
                      </span>
                    </div>
                    <Progress value={Math.min(pct, 100)} className="h-2.5" />
                  </div>

                  {/* Milestones markers */}
                  <div className="grid grid-cols-4 gap-1 text-center text-[10px] pt-2 border-t border-border/40">
                    <div className={pct >= 25 ? 'text-primary font-semibold' : 'text-muted-foreground'}>25%</div>
                    <div className={pct >= 50 ? 'text-primary font-semibold' : 'text-muted-foreground'}>50%</div>
                    <div className={pct >= 75 ? 'text-primary font-semibold' : 'text-muted-foreground'}>75%</div>
                    <div className={pct >= 100 ? 'text-emerald-500 font-bold' : 'text-muted-foreground'}>100% 🎯</div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
