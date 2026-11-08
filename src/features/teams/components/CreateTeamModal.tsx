import { useState, useMemo } from 'react';
import type { Profile } from '@/types';
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
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Users, Shield, Target, Check, Search } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CreateTeamModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  managers: Profile[];
  availableEmployees: Profile[];
  onSubmit: (values: TeamInput) => Promise<void>;
}

const TEAM_TYPE_PRESETS = [
  {
    id: 'Telecalling / Lead Qualification',
    label: 'Telecalling & Lead Qualification',
    desc: 'Outbound calls, lead qualification, follow-ups, appointment setting',
    defaultTargetType: 'QUALIFIED_LEADS',
    defaultTargetValue: 150,
  },
  {
    id: 'Sales Closing / Deal Execution',
    label: 'Sales Closing & Deal Execution',
    desc: 'Consultations, product demos, objection handling, closing revenue deals',
    defaultTargetType: 'REVENUE',
    defaultTargetValue: 500000,
  },
  {
    id: 'Enterprise & Key Accounts',
    label: 'Enterprise & Key Accounts',
    desc: 'High ticket B2B clients, customized agreements, bulk orders',
    defaultTargetType: 'REVENUE',
    defaultTargetValue: 1000000,
  },
  {
    id: 'General Sales',
    label: 'General Regional Sales',
    desc: 'General territory-based sales and field acquisition',
    defaultTargetType: 'CLOSURES',
    defaultTargetValue: 50,
  },
];

export function CreateTeamModal({
  open,
  onOpenChange,
  managers,
  availableEmployees,
  onSubmit,
}: CreateTeamModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [teamType, setTeamType] = useState('Telecalling / Lead Qualification');
  const [managerId, setManagerId] = useState('none');
  const [status, setStatus] = useState<'ACTIVE' | 'INACTIVE'>('ACTIVE');
  const [targetType, setTargetType] = useState('REVENUE');
  const [targetValue, setTargetValue] = useState<number>(500000);
  const [targetPeriod, setTargetPeriod] = useState('MONTHLY');
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [memberSearch, setMemberSearch] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handlePresetSelect = (presetId: string) => {
    setTeamType(presetId);
    const preset = TEAM_TYPE_PRESETS.find(p => p.id === presetId);
    if (preset) {
      if (!name) setName(preset.id.split('/')[0].trim() + ' Squad');
      if (!description) setDescription(preset.desc);
      setTargetType(preset.defaultTargetType);
      setTargetValue(preset.defaultTargetValue);
    }
  };

  const toggleMember = (id: string) => {
    setSelectedMemberIds(prev =>
      prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id]
    );
  };

  const filteredEmployees = useMemo(() => {
    if (!memberSearch.trim()) return availableEmployees;
    const q = memberSearch.toLowerCase();
    return availableEmployees.filter(e =>
      `${e.first_name || ''} ${e.last_name || ''} ${e.employee_id || ''} ${e.email || ''}`
        .toLowerCase()
        .includes(q)
    );
  }, [availableEmployees, memberSearch]);

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMsg('Team name is required.');
      return;
    }
    setErrorMsg(null);
    try {
      setIsSubmitting(true);
      await onSubmit({
        name: name.trim(),
        description: description.trim() || undefined,
        team_type: teamType,
        manager_id: managerId === 'none' ? undefined : managerId,
        status,
        target_value: targetValue ? Number(targetValue) : undefined,
        target_type: targetType,
        target_period: targetPeriod,
        member_ids: selectedMemberIds,
      });
      // reset
      setName('');
      setDescription('');
      setSelectedMemberIds([]);
      setManagerId('none');
      onOpenChange(false);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to create team');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[92vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            Create Sales Team / Squad
          </DialogTitle>
          <DialogDescription>
            Configure squad name, type, dedicated manager, member roster, and performance targets.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleFormSubmit} className="space-y-4 py-2 overflow-y-auto pr-1 flex-1">
          {errorMsg && (
            <div className="p-3 text-xs rounded-lg bg-destructive/10 text-destructive border border-destructive/20">
              {errorMsg}
            </div>
          )}

          {/* Quick Type Presets */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              1. Select Squad Type
            </Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {TEAM_TYPE_PRESETS.map((p) => {
                const isSelected = teamType === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => handlePresetSelect(p.id)}
                    className={cn(
                      "p-3 rounded-xl border text-left transition-all relative flex flex-col justify-between",
                      isSelected
                        ? "bg-primary/10 border-primary text-primary shadow-xs ring-1 ring-primary"
                        : "bg-card border-border/70 hover:bg-muted/50 text-foreground"
                    )}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="text-xs font-bold">{p.label}</span>
                      {isSelected && <Check className="w-3.5 h-3.5 text-primary" />}
                    </div>
                    <span className="text-[11px] text-muted-foreground mt-1 line-clamp-2">
                      {p.desc}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Team Basic Info */}
          <div className="space-y-3 pt-2 border-t border-border/60">
            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              2. Squad Identity
            </Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="team_name">Team Name *</Label>
                <Input
                  id="team_name"
                  placeholder="e.g. Telecalling Team, Sales Closing Team"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="team_status">Initial Status</Label>
                <Select value={status} onValueChange={(v) => setStatus(v as 'ACTIVE' | 'INACTIVE')}>
                  <SelectTrigger id="team_status">
                    <SelectValue placeholder="Select Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ACTIVE">Active Squad</SelectItem>
                    <SelectItem value="INACTIVE">Inactive / Paused</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="team_desc">Mission / Scope</Label>
              <Textarea
                id="team_desc"
                placeholder="Key responsibilities, qualification standards, deal size scope..."
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
          </div>

          {/* Squad Lead / Manager */}
          <div className="space-y-2 pt-2 border-t border-border/60">
            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              3. Squad Leadership
            </Label>
            <div className="space-y-1.5">
              <Label>Squad Lead / Manager</Label>
              <Select value={managerId} onValueChange={setManagerId}>
                <SelectTrigger>
                  <SelectValue placeholder="Assign Squad Leader" />
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
              <p className="text-[11px] text-muted-foreground">
                Responsible for squad target monitoring, coaching, target achievement, and reviews.
              </p>
            </div>
          </div>

          {/* Target Configuration */}
          <div className="space-y-3 pt-2 border-t border-border/60">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <Target className="w-3.5 h-3.5 text-primary" />
                4. Squad Target Benchmark
              </Label>
              <Badge variant="outline" className="text-[10px]">
                {targetPeriod} Target
              </Badge>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <div className="space-y-1.5">
                <Label className="text-xs">Target Metric</Label>
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
                <Label className="text-xs">Quota / Target Value</Label>
                <Input
                  type="number"
                  className="h-9 text-xs font-mono"
                  value={targetValue || ''}
                  onChange={(e) => setTargetValue(Number(e.target.value))}
                  placeholder="500000"
                />
              </div>
            </div>
          </div>

          {/* Assign Team Members */}
          <div className="space-y-2 pt-2 border-t border-border/60">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  5. Assign Team Members
                </Label>
                <p className="text-[11px] text-muted-foreground">
                  Select available sales reps or executives to assign to this squad.
                </p>
              </div>
              <Badge variant="secondary" className="text-[11px]">
                {selectedMemberIds.length} Selected
              </Badge>
            </div>

            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-muted-foreground" />
              <Input
                placeholder="Filter reps by name or employee ID..."
                className="pl-8 text-xs h-8 bg-muted/30"
                value={memberSearch}
                onChange={(e) => setMemberSearch(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto p-2 rounded-lg border border-border/60 bg-muted/10">
              {filteredEmployees.length === 0 ? (
                <div className="col-span-2 text-center text-xs py-4 text-muted-foreground">
                  No matching employees available.
                </div>
              ) : (
                filteredEmployees.map((emp) => {
                  const isChecked = selectedMemberIds.includes(emp.id);
                  return (
                    <label
                      key={emp.id}
                      onClick={() => toggleMember(emp.id)}
                      className={cn(
                        "flex items-center gap-2.5 p-2 rounded-lg border text-xs cursor-pointer select-none transition-all",
                        isChecked
                          ? "bg-primary/10 border-primary text-primary font-medium"
                          : "bg-card border-border/60 hover:bg-muted text-foreground"
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {}}
                        className="rounded border-border accent-primary shrink-0"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-semibold flex items-center gap-1.5">
                          {emp.first_name} {emp.last_name}
                          {emp.employee_id && (
                            <span className="text-[10px] font-mono text-muted-foreground font-normal">
                              ({emp.employee_id})
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-muted-foreground truncate">
                          {emp.email}
                        </div>
                      </div>
                    </label>
                  );
                })
              )}
            </div>
          </div>

          <DialogFooter className="pt-3 border-t border-border/60">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || !name.trim()}>
              {isSubmitting ? 'Creating Squad...' : 'Create Sales Team'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

