import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import type { Team, Profile } from '@/types';
import { UserRole } from '@/types';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Users,
  UserPlus,
  Search,
  MoreVertical,
  ExternalLink,
  Crown,
  UserMinus,
  ArrowRightLeft,
  Shield,
  Mail,
  Phone,
  Check,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { isFakeProfile } from '@/lib/localDb';

interface ManageRosterModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  team: Team | null;
  allTeams: Team[];
  allEmployees: Profile[];
  onAddMember: (teamId: string, userId: string) => Promise<void>;
  onRemoveMember: (teamId: string, userId: string) => Promise<void>;
  onTransferMember: (toTeamId: string, userId: string) => Promise<void>;
  onAssignLeader: (teamId: string, userId: string) => Promise<void>;
}

export function ManageRosterModal({
  open,
  onOpenChange,
  team,
  allTeams,
  allEmployees,
  onAddMember,
  onRemoveMember,
  onTransferMember,
  onAssignLeader,
}: ManageRosterModalProps) {
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [selectedAddUserId, setSelectedAddUserId] = useState<string>('none');
  const [transferUserId, setTransferUserId] = useState<string | null>(null);
  const [targetTeamId, setTargetTeamId] = useState<string>('none');
  const [actionLoading, setActionLoading] = useState(false);

  // Active members of this team
  const members = useMemo(() => {
    if (!team) return [];
    return allEmployees
      .filter(emp => !isFakeProfile(emp))
      .filter(emp => emp.team_id === team.id || (team.manager_id === emp.id && !emp.team_id));
  }, [team, allEmployees]);

  // Available employees who can be added to this team (unassigned or from other teams)
  const availableToAdd = useMemo(() => {
    if (!team) return [];
    return allEmployees
      .filter(emp => !isFakeProfile(emp))
      .filter(emp => emp.team_id !== team.id && team.manager_id !== emp.id);
  }, [team, allEmployees]);

  const filteredMembers = useMemo(() => {
    return members.filter(emp => {
      const q = search.toLowerCase();
      const matchSearch =
        `${emp.first_name || ''} ${emp.last_name || ''} ${emp.employee_id || ''} ${emp.email || ''}`
          .toLowerCase()
          .includes(q);
      const matchRole = roleFilter === 'ALL' || emp.role === roleFilter;
      return matchSearch && matchRole;
    });
  }, [members, search, roleFilter]);

  if (!team) return null;

  const handleAddSubmit = async () => {
    if (selectedAddUserId === 'none') return;
    try {
      setActionLoading(true);
      await onAddMember(team.id, selectedAddUserId);
      setSelectedAddUserId('none');
      setIsAddOpen(false);
    } finally {
      setActionLoading(false);
    }
  };

  const handleTransferSubmit = async () => {
    if (!transferUserId || targetTeamId === 'none') return;
    try {
      setActionLoading(true);
      await onTransferMember(targetTeamId, transferUserId);
      setTransferUserId(null);
      setTargetTeamId('none');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRemove = async (empId: string) => {
    try {
      setActionLoading(true);
      await onRemoveMember(team.id, empId);
    } finally {
      setActionLoading(false);
    }
  };

  const handleSetLeader = async (empId: string) => {
    try {
      setActionLoading(true);
      await onAssignLeader(team.id, empId);
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl max-h-[92vh] flex flex-col">
        <DialogHeader>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <DialogTitle className="flex items-center gap-2">
                <Users className="w-5 h-5 text-primary" />
                Manage Squad Roster &mdash; {team.name}
              </DialogTitle>
              <DialogDescription>
                Assign, transfer, or remove sales reps. Designate squad leaders and manage team roles.
              </DialogDescription>
            </div>
            <Button
              size="sm"
              className="gap-1.5"
              onClick={() => setIsAddOpen(true)}
            >
              <UserPlus className="w-4 h-4" /> Add Team Member
            </Button>
          </div>
        </DialogHeader>

        {/* Search & Filter Bar */}
        <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
          <div className="relative flex-1 w-full">
            <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-muted-foreground" />
            <Input
              placeholder="Search member by name, user ID, or email..."
              className="pl-9 h-9 text-xs"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="w-full sm:w-44 h-9 text-xs">
              <SelectValue placeholder="All Roles" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Roles</SelectItem>
              <SelectItem value={UserRole.SALES_REP}>Sales Reps</SelectItem>
              <SelectItem value={UserRole.MANAGER}>Managers</SelectItem>
              <SelectItem value={UserRole.ORG_ADMIN}>Admins</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Member Table */}
        <div className="flex-1 overflow-y-auto border border-border/70 rounded-lg mt-2 min-h-[280px]">
          {filteredMembers.length === 0 ? (
            <div className="p-8 text-center space-y-2">
              <Users className="w-8 h-8 text-muted-foreground mx-auto opacity-50" />
              <p className="text-sm font-semibold text-foreground">No members found</p>
              <p className="text-xs text-muted-foreground">
                {members.length === 0
                  ? 'This squad has no assigned members yet. Click "Add Team Member" above.'
                  : 'No team members match your filter criteria.'}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40">
                  <TableHead className="w-[280px]">Employee</TableHead>
                  <TableHead>User ID</TableHead>
                  <TableHead>Role & Specialization</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredMembers.map((emp) => {
                  const isSquadLead = team.manager_id === emp.id;
                  const isTelecalling = team.team_type?.toLowerCase().includes('telecall') || team.name.toLowerCase().includes('telecall');
                  const specialization = isSquadLead
                    ? 'Squad Leader / Manager'
                    : isTelecalling
                      ? 'Lead Qualification Executive'
                      : 'Closing Specialist';

                  return (
                    <TableRow key={emp.id} className="hover:bg-muted/30">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/20 text-primary font-bold text-xs flex items-center justify-center shrink-0">
                            {emp.first_name?.[0] || 'E'}{emp.last_name?.[0] || ''}
                          </div>
                          <div className="min-w-0">
                            <div className="font-semibold text-sm text-foreground flex items-center gap-1.5 truncate">
                              {emp.first_name} {emp.last_name}
                              {isSquadLead && (
                                <Badge variant="default" className="text-[9px] py-0 px-1 gap-1 h-4">
                                  <Crown className="w-2.5 h-2.5 text-amber-300" /> Leader
                                </Badge>
                              )}
                            </div>
                            <div className="text-xs text-muted-foreground flex items-center gap-2 truncate">
                              <span>{emp.email}</span>
                            </div>
                          </div>
                        </div>
                      </TableCell>

                      <TableCell>
                        <span className="font-mono text-xs font-semibold text-foreground">
                          {emp.employee_id || '—'}
                        </span>
                      </TableCell>

                      <TableCell>
                        <div className="space-y-0.5">
                          <div className="text-xs font-medium text-foreground">
                            {specialization}
                          </div>
                          <Badge
                            variant={
                              emp.role === UserRole.ORG_ADMIN ? 'default' :
                              emp.role === UserRole.MANAGER ? 'secondary' : 'outline'
                            }
                            className="text-[10px]"
                          >
                            {emp.role.replace(/_/g, ' ')}
                          </Badge>
                        </div>
                      </TableCell>

                      <TableCell>
                        <Badge
                          variant={emp.status === 'ACTIVE' ? 'success' : 'warning'}
                          className="text-[10px]"
                        >
                          {emp.status || 'ACTIVE'}
                        </Badge>
                      </TableCell>

                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreVertical className="w-3.5 h-3.5" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-52">
                            <DropdownMenuLabel className="text-xs">Member Actions</DropdownMenuLabel>
                            
                            <DropdownMenuItem asChild>
                              <Link to={`/employees/${emp.id}`} className="cursor-pointer">
                                <ExternalLink className="w-3.5 h-3.5" /> View Full Profile
                              </Link>
                            </DropdownMenuItem>

                            {!isSquadLead && (
                              <DropdownMenuItem onClick={() => handleSetLeader(emp.id)}>
                                <Crown className="w-3.5 h-3.5 text-amber-500" /> Make Squad Leader
                              </DropdownMenuItem>
                            )}

                            <DropdownMenuItem onClick={() => setTransferUserId(emp.id)}>
                              <ArrowRightLeft className="w-3.5 h-3.5" /> Transfer to Another Squad
                            </DropdownMenuItem>

                            <DropdownMenuSeparator />

                            <DropdownMenuItem
                              onClick={() => handleRemove(emp.id)}
                              className="text-destructive focus:text-destructive focus:bg-destructive/10 cursor-pointer"
                            >
                              <UserMinus className="w-3.5 h-3.5" /> Remove from Squad
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </div>

        <DialogFooter className="pt-3 border-t border-border/60 sm:justify-between items-center">
          <span className="text-xs text-muted-foreground">
            Total Squad Members: <strong>{members.length}</strong>
          </span>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close Roster
          </Button>
        </DialogFooter>

        {/* Add Member Sub-Dialog */}
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-primary" />
                Add Member to {team.name}
              </DialogTitle>
              <DialogDescription>
                Select an available employee to assign to this squad.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-2">
              <div className="space-y-1.5">
                <Label>Select Employee</Label>
                <Select value={selectedAddUserId} onValueChange={setSelectedAddUserId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose employee..." />
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    <SelectItem value="none">Select an employee</SelectItem>
                    {availableToAdd.map((emp) => {
                      const currentTeam = allTeams.find(t => t.id === emp.team_id);
                      return (
                        <SelectItem key={emp.id} value={emp.id}>
                          {emp.first_name} {emp.last_name} ({emp.employee_id || 'ID'}) {currentTeam ? `· [${currentTeam.name}]` : '· (Unassigned)'}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddOpen(false)}>
                Cancel
              </Button>
              <Button
                disabled={selectedAddUserId === 'none' || actionLoading}
                onClick={handleAddSubmit}
              >
                {actionLoading ? 'Adding...' : 'Add to Squad'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Transfer Member Sub-Dialog */}
        <Dialog open={!!transferUserId} onOpenChange={(open) => !open && setTransferUserId(null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <ArrowRightLeft className="w-4 h-4 text-primary" />
                Transfer Employee
              </DialogTitle>
              <DialogDescription>
                Move this employee to a different sales squad or make unassigned.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-2">
              <div className="space-y-1.5">
                <Label>Target Squad</Label>
                <Select value={targetTeamId} onValueChange={setTargetTeamId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select target team" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No Team (Make Unassigned)</SelectItem>
                    {allTeams
                      .filter(t => t.id !== team.id)
                      .map((t) => (
                        <SelectItem key={t.id} value={t.id}>
                          {t.name} ({t.team_type || 'Sales Squad'})
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setTransferUserId(null)}>
                Cancel
              </Button>
              <Button disabled={actionLoading} onClick={handleTransferSubmit}>
                {actionLoading ? 'Transferring...' : 'Confirm Transfer'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </DialogContent>
    </Dialog>
  );
}

