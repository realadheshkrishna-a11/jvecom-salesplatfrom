import { useState, useEffect } from 'react';
import type { Team, Profile } from '@/types';
import type { TeamInput } from '@/schemas';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Users, Target, Shield, AlertTriangle } from 'lucide-react';

interface EditTeamModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  team: Team | null;
  managers: Profile[];
  onSubmit: (id: string, updates: Partial<TeamInput>) => Promise<void>;
}

export function EditTeamModal({
  open,
  onOpenChange,
  team,
  managers,
  onSubmit,
}: EditTeamModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [teamType, setTeamType] = useState('General Sales');
  const [managerId, setManagerId] = useState('none');
  const [status, setStatus] = useState<'ACTIVE' | 'INACTIVE'>('ACTIVE');
  const [targetType, setTargetType] = useState('REVENUE');
  const [targetValue, setTargetValue] = useState<number>(500000);
  const [targetPeriod, setTargetPeriod] = useState('MONTHLY');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !team) return;
    setName(team.name || '');
    setDescription(team.description || '');
    setTeamType(team.team_type || 'General Sales');
    setManagerId(team.manager_id || 'none');
    setStatus(team.status === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE');
    setTargetType(team.target_type || 'REVENUE');
    setTargetValue(team.target_value ? Number(team.target_value) : 500000);
    setTargetPeriod(team.target_period || 'MONTHLY');
    setErrorMsg(null);
  }, [open, team]);

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!team) return;
    if (!name.trim()) {
      setErrorMsg('Team name is required.');
      return;
    }
    setErrorMsg(null);
    try {
      setIsSubmitting(true);
      await onSubmit(team.id, {
        name: name.trim(),
        description: description.trim() || undefined,
        team_type: teamType,
        manager_id: managerId === 'none' ? undefined : managerId,
        status,
        target_value: targetValue ? Number(targetValue) : undefined,
        target_type: targetType,
        target_period: targetPeriod,
      });
      onOpenChange(false);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to update squad');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!team) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            Edit Squad &mdash; {team.name}
          </DialogTitle>
          <DialogDescription>
            Update squad details, assigned leadership, target benchmarks, and operational status.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleFormSubmit} className="space-y-4 py-2 overflow-y-auto pr-1 flex-1">
          {errorMsg && (
            <div className="p-3 text-xs rounded-lg bg-destructive/10 text-destructive border border-destructive/20">
              {errorMsg}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="edit_name">Squad Name *</Label>
              <Input
                id="edit_name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="edit_type">Squad Specialization</Label>
              <Select value={teamType} onValueChange={setTeamType}>
                <SelectTrigger id="edit_type">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Telecalling / Lead Qualification">Telecalling & Lead Qualification</SelectItem>
                  <SelectItem value="Sales Closing / Deal Execution">Sales Closing & Deal Execution</SelectItem>
                  <SelectItem value="Enterprise & Key Accounts">Enterprise & Key Accounts</SelectItem>
                  <SelectItem value="General Sales">General Regional Sales</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="edit_desc">Mission / Scope</Label>
            <Textarea
              id="edit_desc"
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Squad Lead / Manager</Label>
              <Select value={managerId} onValueChange={setManagerId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select squad lead" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No Squad Leader (Unassigned)</SelectItem>
                  {managers.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {`${m.first_name || ''} ${m.last_name || ''}`.trim() || m.email} ({m.role.replace(/_/g, ' ')})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Operational Status</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as 'ACTIVE' | 'INACTIVE')}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ACTIVE">Active Squad</SelectItem>
                  <SelectItem value="INACTIVE">Inactive / Paused</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Targets */}
          <div className="space-y-3 pt-3 border-t border-border/60">
            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Target className="w-3.5 h-3.5 text-primary" />
              Target Benchmark
            </Label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <div className="space-y-1.5">
                <Label className="text-xs">Metric</Label>
                <Select value={targetType} onValueChange={setTargetType}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="REVENUE">Revenue (₹)</SelectItem>
                    <SelectItem value="QUALIFIED_LEADS">Qualified Leads</SelectItem>
                    <SelectItem value="CLOSURES">Closed Deals</SelectItem>
                    <SelectItem value="CALLS">Calls Connected</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Period</Label>
                <Select value={targetPeriod} onValueChange={setTargetPeriod}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DAILY">Daily</SelectItem>
                    <SelectItem value="WEEKLY">Weekly</SelectItem>
                    <SelectItem value="MONTHLY">Monthly</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Quota / Target</Label>
                <Input
                  type="number"
                  className="h-9 text-xs font-mono"
                  value={targetValue || ''}
                  onChange={(e) => setTargetValue(Number(e.target.value))}
                />
              </div>
            </div>
          </div>

          <DialogFooter className="pt-3 border-t border-border/60">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || !name.trim()}>
              {isSubmitting ? 'Saving Changes...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

