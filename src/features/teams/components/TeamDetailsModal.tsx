import { Link } from 'react-router-dom';
import type { Team, Profile } from '@/types';
import { isFakeProfile } from '@/lib/localDb';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Users,
  UserCheck,
  Target,
  Pencil,
  Trash2,
  Calendar,
  Shield,
  Activity,
  ExternalLink,
  Power,
} from 'lucide-react';

interface TeamDetailsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  team: Team | null;
  members: Profile[];
  allEmployees?: Profile[];
  currentValue?: number;
  isAdmin: boolean;
  onEdit: (team: Team) => void;
  onManageRoster: (team: Team) => void;
  onDelete: (team: Team) => void;
  onToggleStatus: (team: Team) => void;
}

export function TeamDetailsModal({
  open,
  onOpenChange,
  team,
  members,
  allEmployees,
  currentValue,
  isAdmin,
  onEdit,
  onManageRoster,
  onDelete,
  onToggleStatus,
}: TeamDetailsModalProps) {
  if (!team) return null;

  const cleanMembers = (members || []).filter(m => !isFakeProfile(m));
  const isTelecalling = team.team_type?.toLowerCase().includes('telecall') || team.name.toLowerCase().includes('telecall');
  const targetVal = team.target_value ? Number(team.target_value) : 0;
  const currentVal = currentValue ?? 0;
  const progressPct = targetVal > 0 ? Math.min(100, Math.round((currentVal / targetVal) * 100)) : 0;
  const leader = team.manager || (allEmployees || members).find((e) => e.id === team.manager_id);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[92vh] flex flex-col">
        <DialogHeader>
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <DialogTitle className="text-xl font-bold text-foreground">
                  {team.name}
                </DialogTitle>
                <Badge
                  variant={team.status === 'ACTIVE' ? 'success' : 'warning'}
                  className="text-[10px]"
                >
                  {team.status || 'ACTIVE'}
                </Badge>
                {team.team_type && (
                  <Badge variant="outline" className="text-[10px] text-primary border-primary/30">
                    {team.team_type}
                  </Badge>
                )}
              </div>
              <DialogDescription className="mt-1 text-xs">
                {team.description || 'Dedicated sales unit driving revenue targets.'}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-2 overflow-y-auto pr-1 flex-1">
          {/* Leadership & Quick Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3 rounded-xl border border-border/70 bg-card">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
                Squad Leader
              </span>
              <div className="mt-1 flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-blue-500/10 text-blue-600 font-bold text-xs flex items-center justify-center">
                  <UserCheck className="w-3.5 h-3.5" />
                </div>
                <div className="min-w-0">
                  <div className="font-semibold text-xs text-foreground truncate">
                    {leader ? `${leader.first_name || ''} ${leader.last_name || ''}`.trim() || leader.email : 'Unassigned'}
                  </div>
                  <div className="text-[10px] text-muted-foreground truncate">
                    {leader?.email || 'No email'}
                  </div>
                </div>
              </div>
            </div>

            <div className="p-3 rounded-xl border border-border/70 bg-card">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
                Team Size
              </span>
              <div className="mt-1 flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-indigo-500/10 text-indigo-600 font-bold text-xs flex items-center justify-center">
                  <Users className="w-3.5 h-3.5" />
                </div>
                <div>
                  <div className="font-bold text-base text-foreground">
                    {members.length} Reps
                  </div>
                  <div className="text-[10px] text-muted-foreground">
                    Active in squad
                  </div>
                </div>
              </div>
            </div>

            <div className="p-3 rounded-xl border border-border/70 bg-card">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
                Quota Period
              </span>
              <div className="mt-1 flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-emerald-500/10 text-emerald-600 font-bold text-xs flex items-center justify-center">
                  <Target className="w-3.5 h-3.5" />
                </div>
                <div>
                  <div className="font-bold text-xs text-foreground">
                    {team.target_period || 'MONTHLY'}
                  </div>
                  <div className="text-[10px] text-muted-foreground">
                    {team.target_type || 'REVENUE'}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Target Progress Card */}
          <div className="p-4 rounded-xl border border-border/70 bg-muted/20 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-foreground flex items-center gap-1.5">
                <Target className="w-3.5 h-3.5 text-primary" />
                Squad Target Progress ({team.target_period || 'Monthly'})
              </span>
              <Badge variant="outline" className="font-mono text-primary font-bold">
                {progressPct}% Achieved
              </Badge>
            </div>
            <Progress value={progressPct} className="h-2" />
            <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1">
              <span>
                Current:{' '}
                <strong className="text-foreground">
                  {isTelecalling ? `${currentVal} Qualified Leads` : `₹${currentVal.toLocaleString('en-IN')}`}
                </strong>
              </span>
              <span>
                Target:{' '}
                <strong className="text-foreground">
                  {targetVal > 0
                    ? isTelecalling
                      ? `${targetVal} Qualified Leads`
                      : `₹${targetVal.toLocaleString('en-IN')}`
                    : 'None set'}
                </strong>
              </span>
            </div>
          </div>

          {/* Member Roster Preview */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Assigned Reps ({cleanMembers.length})
              </span>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs text-primary gap-1"
                onClick={() => {
                  onOpenChange(false);
                  onManageRoster(team);
                }}
              >
                <Pencil className="w-3 h-3" /> Manage Roster
              </Button>
            </div>

            <div className="divide-y divide-border/60 rounded-xl border border-border/70 bg-card overflow-hidden">
              {cleanMembers.length === 0 ? (
                <div className="p-4 text-center text-xs text-muted-foreground">
                  No reps assigned to this squad yet.
                </div>
              ) : (
                cleanMembers.map((emp) => (
                  <div key={emp.id} className="p-2.5 flex items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-7 h-7 rounded-full bg-muted font-bold text-[11px] flex items-center justify-center text-foreground">
                        {emp.first_name?.[0]}{emp.last_name?.[0]}
                      </div>
                      <div className="min-w-0">
                        <div className="font-semibold text-foreground truncate">
                          {emp.first_name} {emp.last_name}
                        </div>
                        <div className="text-[10px] text-muted-foreground font-mono truncate">
                          {emp.employee_id || emp.email}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant="outline" className="text-[9px]">
                        {emp.role.replace(/_/g, ' ')}
                      </Badge>
                      <Button variant="ghost" size="icon" className="h-6 w-6" asChild>
                        <Link to={`/employees/${emp.id}`}>
                          <ExternalLink className="w-3 h-3 text-muted-foreground hover:text-foreground" />
                        </Link>
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Action Footer */}
        <DialogFooter className="pt-3 border-t border-border/60 shrink-0 flex-col sm:flex-row gap-2 justify-between">
          <div className="grid grid-cols-2 sm:flex sm:items-center gap-1.5 w-full sm:w-auto">
            {isAdmin && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs gap-1.5 justify-center"
                  onClick={() => {
                    onOpenChange(false);
                    onToggleStatus(team);
                  }}
                >
                  <Power className="w-3.5 h-3.5" />
                  {team.status === 'ACTIVE' ? 'Pause' : 'Activate'}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs text-destructive hover:bg-destructive/10 hover:border-destructive/40 gap-1.5 justify-center"
                  onClick={() => {
                    onOpenChange(false);
                    onDelete(team);
                  }}
                >
                  <Trash2 className="w-3.5 h-3.5" /> Delete
                </Button>
              </>
            )}
          </div>

          <div className="grid grid-cols-2 sm:flex sm:items-center gap-2 w-full sm:w-auto">
            <Button
              variant="outline"
              size="sm"
              className="text-xs justify-center"
              onClick={() => {
                onOpenChange(false);
                onEdit(team);
              }}
            >
              <Pencil className="w-3.5 h-3.5 mr-1" /> Edit Squad
            </Button>
            <Button
              size="sm"
              className="text-xs justify-center"
              onClick={() => {
                onOpenChange(false);
                onManageRoster(team);
              }}
            >
              <Users className="w-3.5 h-3.5 mr-1" /> Manage Roster
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

