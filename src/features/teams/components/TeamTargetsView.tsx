import { useState, useEffect, useMemo } from 'react';
import type { Team, Profile, Target } from '@/types';
import { useAuth } from '@/lib/auth';
import { targetsService } from '@/services/targets.service';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/components/ui/toast';
import { Target as TargetIcon, Plus, CheckCircle2, TrendingUp, Calendar, User, Users } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TeamTargetsViewProps {
  teams: Team[];
  allEmployees: Profile[];
}

export function TeamTargetsView({ teams, allEmployees }: TeamTargetsViewProps) {
  const { organization } = useAuth();
  const orgId = organization?.id || '';
  const { success, error: toastError } = useToast();

  const [periodFilter, setPeriodFilter] = useState<'ALL' | 'DAILY' | 'WEEKLY' | 'MONTHLY'>('ALL');
  const [scopeFilter, setScopeFilter] = useState<'ALL' | 'TEAM' | 'INDIVIDUAL'>('ALL');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [targets, setTargets] = useState<Target[]>([]);

  // New Target Form State
  const [newTeamId, setNewTeamId] = useState<string>(teams[0]?.id || 'none');
  const [newScope, setNewScope] = useState<'TEAM' | 'INDIVIDUAL'>('TEAM');
  const [newUserId, setNewUserId] = useState<string>('none');
  const [newPeriod, setNewPeriod] = useState<'DAILY' | 'WEEKLY' | 'MONTHLY'>('MONTHLY');
  const [newType, setNewType] = useState<'REVENUE' | 'SALES_COUNT'>('REVENUE');
  const [newTargetValue, setNewTargetValue] = useState<number>(500000);
  const [isSaving, setIsSaving] = useState(false);

  const loadTargets = async () => {
    try {
      setLoading(true);
      const res = await targetsService.list(orgId);
      setTargets(res.data || []);
    } catch (err) {
      console.warn('Loading targets notice:', err);
      setTargets([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTargets();
  }, [orgId]);

  const filteredTargets = useMemo(() => {
    return targets.filter(t => {
      const matchPeriod = periodFilter === 'ALL' || t.period === periodFilter;
      const matchScope = scopeFilter === 'ALL' || t.scope === scopeFilter;
      return matchPeriod && matchScope;
    });
  }, [targets, periodFilter, scopeFilter]);

  const handleAddTarget = async () => {
    if (!newTargetValue || newTargetValue <= 0) {
      toastError('Invalid Target', 'Please enter a target value greater than 0');
      return;
    }

    try {
      setIsSaving(true);
      const now = new Date();
      const periodStart = now.toISOString().split('T')[0];
      const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      const periodEnd = endDate.toISOString().split('T')[0];

      await targetsService.create(orgId, {
        team_id: newTeamId === 'none' ? undefined : newTeamId,
        user_id: newScope === 'INDIVIDUAL' && newUserId !== 'none' ? newUserId : undefined,
        scope: newScope,
        period: newPeriod,
        type: newType,
        target_value: Number(newTargetValue),
        period_start: periodStart,
        period_end: periodEnd,
      });

      success('Target Created', 'New performance benchmark has been set.');
      setIsModalOpen(false);
      loadTargets();
    } catch (err) {
      toastError('Failed to save target', err instanceof Error ? err.message : 'Please try again');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Target Dashboard Header & Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-bold text-foreground flex items-center gap-2">
            <TargetIcon className="w-4 h-4 text-primary" />
            Squad &amp; Individual Target Benchmarks
          </h3>
          <p className="text-xs text-muted-foreground">
            Track real daily, weekly and monthly quotas against live CRM sales output.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Select value={periodFilter} onValueChange={(v) => setPeriodFilter(v as any)}>
            <SelectTrigger className="w-32 h-8 text-xs">
              <SelectValue placeholder="Period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Periods</SelectItem>
              <SelectItem value="DAILY">Daily</SelectItem>
              <SelectItem value="WEEKLY">Weekly</SelectItem>
              <SelectItem value="MONTHLY">Monthly</SelectItem>
            </SelectContent>
          </Select>

          <Select value={scopeFilter} onValueChange={(v) => setScopeFilter(v as any)}>
            <SelectTrigger className="w-32 h-8 text-xs">
              <SelectValue placeholder="Scope" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Scopes</SelectItem>
              <SelectItem value="TEAM">Team Only</SelectItem>
              <SelectItem value="INDIVIDUAL">Individual Rep</SelectItem>
            </SelectContent>
          </Select>

          <Button size="sm" className="h-8 gap-1.5 text-xs shadow-xs" onClick={() => setIsModalOpen(true)}>
            <Plus className="w-3.5 h-3.5" /> Set Target
          </Button>
        </div>
      </div>

      {/* Target Cards Grid */}
      {filteredTargets.length === 0 ? (
        <Card className="p-8 text-center space-y-2 border-border/70">
          <TargetIcon className="w-8 h-8 text-muted-foreground mx-auto opacity-50" />
          <p className="text-sm font-semibold text-foreground">No targets configured yet</p>
          <p className="text-xs text-muted-foreground">
            Click &ldquo;Set Target&rdquo; above to assign daily, weekly, or monthly benchmarks to squads and reps.
          </p>
          <Button size="sm" variant="outline" className="mt-2 text-xs" onClick={() => setIsModalOpen(true)}>
            <Plus className="w-3.5 h-3.5 mr-1" /> Configure First Target
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTargets.map((tgt) => {
            const currentVal = Number(tgt.current_value) || 0;
            const targetVal = Number(tgt.target_value) || 1;
            const pct = Math.min(100, Math.round((currentVal / targetVal) * 100));
            const isFinished = pct >= 100;
            const isRevenue = tgt.type === 'REVENUE';
            const remaining = Math.max(0, targetVal - currentVal);
            const team = teams.find(t => t.id === tgt.team_id);
            const employee = allEmployees.find(e => e.id === tgt.user_id);

            return (
              <Card key={tgt.id} className="border-border/70 hover:shadow-md transition-all">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5">
                        <Badge variant={tgt.scope === 'TEAM' ? 'default' : 'secondary'} className="text-[9px] py-0 px-1.5">
                          {tgt.scope === 'TEAM' ? 'Team Target' : 'Individual'}
                        </Badge>
                        <Badge variant="outline" className="text-[9px] py-0 px-1.5 font-mono">
                          {tgt.period}
                        </Badge>
                      </div>
                      <CardTitle className="text-sm font-bold text-foreground">
                        {tgt.scope === 'TEAM'
                          ? (team?.name || 'Assigned Squad')
                          : (employee ? `${employee.first_name} ${employee.last_name}` : 'Assigned Rep')}
                      </CardTitle>
                      {tgt.scope === 'INDIVIDUAL' && team && (
                        <CardDescription className="text-[11px]">
                          Squad: {team.name}
                        </CardDescription>
                      )}
                    </div>

                    <Badge
                      variant={isFinished ? 'success' : pct > 60 ? 'default' : 'warning'}
                      className="font-mono text-[11px]"
                    >
                      {pct}%
                    </Badge>
                  </div>
                </CardHeader>

                <CardContent className="space-y-3 pt-0">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">{isRevenue ? '₹ Revenue' : 'Closed Sales'}</span>
                      <span className="font-semibold text-foreground font-mono">
                        {isRevenue ? `₹${currentVal.toLocaleString('en-IN')} / ₹${targetVal.toLocaleString('en-IN')}` : `${currentVal} / ${targetVal}`}
                      </span>
                    </div>
                    <Progress
                      value={pct}
                      className={cn(
                        "h-2",
                        isFinished && "[&>div]:bg-emerald-500",
                        pct < 50 && "[&>div]:bg-amber-500"
                      )}
                    />
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1 border-t border-border/50">
                    <span>
                      Remaining:{' '}
                      <strong className="text-foreground">
                        {isRevenue ? `₹${remaining.toLocaleString('en-IN')}` : remaining}
                      </strong>
                    </span>
                    <span className="font-mono text-[10px]">
                      Till {new Date(tgt.period_end).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Set Target Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <TargetIcon className="w-4 h-4 text-primary" />
              Set Performance Target
            </DialogTitle>
            <DialogDescription>
              Assign a daily, weekly, or monthly quota to a team or individual sales rep.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label>Target Scope</Label>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant={newScope === 'TEAM' ? 'default' : 'outline'}
                  size="sm"
                  className="text-xs"
                  onClick={() => setNewScope('TEAM')}
                >
                  <Users className="w-3.5 h-3.5 mr-1.5" /> Team Target
                </Button>
                <Button
                  type="button"
                  variant={newScope === 'INDIVIDUAL' ? 'default' : 'outline'}
                  size="sm"
                  className="text-xs"
                  onClick={() => setNewScope('INDIVIDUAL')}
                >
                  <User className="w-3.5 h-3.5 mr-1.5" /> Individual Rep
                </Button>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Select Squad</Label>
              <Select value={newTeamId} onValueChange={setNewTeamId}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {teams.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {newScope === 'INDIVIDUAL' && (
              <div className="space-y-1.5">
                <Label>Select Employee</Label>
                <Select value={newUserId} onValueChange={setNewUserId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose rep..." />
                  </SelectTrigger>
                  <SelectContent className="max-h-56">
                    <SelectItem value="none">Choose an employee</SelectItem>
                    {allEmployees.map((e) => (
                      <SelectItem key={e.id} value={e.id}>
                        {e.first_name} {e.last_name} ({e.employee_id || 'ID'})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="grid grid-cols-2 gap-2.5">
              <div className="space-y-1.5">
                <Label>Target Metric</Label>
                <Select value={newType} onValueChange={(v) => setNewType(v as any)}>
                  <SelectTrigger className="text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="REVENUE">Revenue (₹)</SelectItem>
                    <SelectItem value="SALES_COUNT">Closed Deals</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>Target Period</Label>
                <Select value={newPeriod} onValueChange={(v) => setNewPeriod(v as any)}>
                  <SelectTrigger className="text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DAILY">Daily</SelectItem>
                    <SelectItem value="WEEKLY">Weekly</SelectItem>
                    <SelectItem value="MONTHLY">Monthly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Target Amount / Quantity</Label>
              <Input
                type="number"
                value={newTargetValue || ''}
                onChange={(e) => setNewTargetValue(Number(e.target.value))}
                placeholder="e.g. 500000"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button disabled={isSaving} onClick={handleAddTarget}>
              {isSaving ? 'Saving...' : 'Save Target'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
