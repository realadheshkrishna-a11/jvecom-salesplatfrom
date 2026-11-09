import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { employeesService } from '@/services/employees.service';
import { teamsService } from '@/services/teams.service';
import { localDb } from '@/lib/localDb';
import type { Profile, Team } from '@/types';
import { UserRole, EmployeeStatus } from '@/types';
import {
  MODULES,
  ROLE_DEFAULT_MODULES,
  getAllowedModules,
  serializeAccess,
  type ModuleId,
} from '@/lib/permissions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/components/ui/toast';
import { cn } from '@/lib/utils';
import { User, Users, ShieldCheck, Power, AlertTriangle, RotateCcw } from 'lucide-react';

export type EditSection = 'details' | 'team' | 'access' | 'status';

interface EditEmployeeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employee: Profile;
  initialSection?: EditSection;
  onSaved: (updated: Profile) => void;
}

type EditableRole = UserRole.ORG_ADMIN | UserRole.MANAGER | UserRole.SALES_REP;

const ROLE_OPTIONS: { value: EditableRole; label: string }[] = [
  { value: UserRole.SALES_REP, label: 'Sales Representative' },
  { value: UserRole.MANAGER, label: 'Sales Manager' },
  { value: UserRole.ORG_ADMIN, label: 'Organization Admin' },
];

const STATUS_OPTIONS: { value: EmployeeStatus; label: string; description: string; tone: string }[] = [
  {
    value: EmployeeStatus.ACTIVE,
    label: 'Active',
    description: 'Can sign in and use all granted modules.',
    tone: 'border-emerald-500 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
  },
  {
    value: EmployeeStatus.INACTIVE,
    label: 'Inactive',
    description: 'Account is paused. Records are kept but the employee is hidden from active rosters.',
    tone: 'border-amber-500 bg-amber-500/10 text-amber-700 dark:text-amber-300',
  },
  {
    value: EmployeeStatus.SUSPENDED,
    label: 'Suspended',
    description: 'Access is blocked pending review (e.g. policy or security issue).',
    tone: 'border-destructive bg-destructive/10 text-destructive',
  },
];

function initialAccessFor(employee: Profile): ModuleId[] {
  return [...getAllowedModules(employee)];
}

export function EditEmployeeDialog({
  open,
  onOpenChange,
  employee,
  initialSection = 'details',
  onSaved,
}: EditEmployeeDialogProps) {
  const { organization, profile: currentUser, refreshProfile } = useAuth();
  const orgId = organization?.id || employee.organization_id;
  const { success, error: toastError } = useToast();

  const [section, setSection] = useState<EditSection>(initialSection);
  const [saving, setSaving] = useState(false);
  const [teams, setTeams] = useState<Team[]>([]);
  const [managers, setManagers] = useState<Profile[]>([]);

  // Details
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [username, setUsername] = useState('');
  const [employeeCode, setEmployeeCode] = useState('');
  const [joiningDate, setJoiningDate] = useState('');
  // Role & Team
  const [role, setRole] = useState<UserRole>(UserRole.SALES_REP);
  const [teamId, setTeamId] = useState<string>('none');
  const [managerId, setManagerId] = useState<string>('none');
  // Access
  const [selectedAccess, setSelectedAccess] = useState<ModuleId[]>([]);
  // Status
  const [status, setStatus] = useState<EmployeeStatus>(EmployeeStatus.ACTIVE);

  const isSelf = currentUser?.id === employee.id;
  const isSuperAdmin = employee.role === UserRole.SUPER_ADMIN;
  const originalAccess = useMemo(() => serializeAccess(initialAccessFor(employee)), [employee]);

  // Reset form whenever the dialog opens
  useEffect(() => {
    if (!open) return;
    setSection(initialSection);
    setFirstName(employee.first_name || '');
    setLastName(employee.last_name || '');
    setPhone(employee.phone || '');
    setUsername(employee.username || '');
    setEmployeeCode(employee.employee_id || '');
    setJoiningDate(employee.joining_date ? String(employee.joining_date).slice(0, 10) : '');
    setRole(employee.role || UserRole.SALES_REP);
    setTeamId(employee.team_id || 'none');
    setManagerId(employee.manager_id || 'none');
    setSelectedAccess(initialAccessFor(employee));
    setStatus(employee.status || EmployeeStatus.ACTIVE);
  }, [open, employee, initialSection]);

  // Load teams + possible managers
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      const [teamRes, empRes] = await Promise.allSettled([
        teamsService.list(orgId),
        employeesService.list(orgId, { pageSize: 1000 }),
      ]);
      if (cancelled) return;

      if (teamRes.status === 'fulfilled') {
        setTeams((teamRes.value as Team[]) || []);
      } else {
        try {
          setTeams(localDb.getAll<Team>('teams'));
        } catch {
          setTeams([]);
        }
      }

      if (empRes.status === 'fulfilled') {
        setManagers(
          (empRes.value.data || []).filter(
            (p) =>
              p.id !== employee.id &&
              (p.role === UserRole.MANAGER || p.role === UserRole.ORG_ADMIN)
          )
        );
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, orgId, employee.id]);

  // ---------------------------------------------------------------------------
  // Access helpers
  // ---------------------------------------------------------------------------
  const toggleAccess = (id: ModuleId) => {
    if (id === 'dashboard') return; // always granted
    setSelectedAccess((prev) => (prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]));
  };

  const handleSelectAllAccess = () => {
    setSelectedAccess((prev) =>
      prev.length === MODULES.length ? ['dashboard'] : MODULES.map((m) => m.id)
    );
  };

  const applyRoleDefaults = () => {
    setSelectedAccess([...(ROLE_DEFAULT_MODULES[role] || ['dashboard'])]);
  };

  // ---------------------------------------------------------------------------
  // Diff + save
  // ---------------------------------------------------------------------------
  const changes = useMemo(() => {
    const diff: Partial<Profile> = {};
    const norm = (v: string) => v.trim();
    if (norm(firstName) !== (employee.first_name || '')) diff.first_name = norm(firstName);
    if (norm(lastName) !== (employee.last_name || '')) diff.last_name = norm(lastName);
    if (norm(phone) !== (employee.phone || '')) diff.phone = norm(phone) || null;
    if (norm(username) !== (employee.username || '')) diff.username = norm(username) || null;
    if (norm(employeeCode) !== (employee.employee_id || '')) diff.employee_id = norm(employeeCode) || null;
    const origJoin = employee.joining_date ? String(employee.joining_date).slice(0, 10) : '';
    if (joiningDate !== origJoin) diff.joining_date = joiningDate || null;

    if (role !== (employee.role || UserRole.SALES_REP)) diff.role = role;
    const nextTeam = teamId === 'none' ? null : teamId;
    if (nextTeam !== (employee.team_id || null)) diff.team_id = nextTeam;
    const nextManager = managerId === 'none' ? null : managerId;
    if (nextManager !== (employee.manager_id || null)) diff.manager_id = nextManager;

    const nextAccess = serializeAccess(selectedAccess);
    if (nextAccess !== originalAccess) diff.access_only = nextAccess;

    if (status !== (employee.status || EmployeeStatus.ACTIVE)) diff.status = status;
    return diff;
  }, [
    firstName, lastName, phone, username, employeeCode, joiningDate,
    role, teamId, managerId, selectedAccess, status, employee, originalAccess,
  ]);

  const changeCount = Object.keys(changes).length;

  const validationError = (() => {
    if (!firstName.trim()) return 'First name is required.';
    if (!lastName.trim()) return 'Last name is required.';
    if (username.trim() && username.trim().length < 3) return 'Username must be at least 3 characters.';
    return null;
  })();

  const handleSave = async () => {
    if (validationError) {
      toastError('Check details', validationError);
      setSection('details');
      return;
    }
    if (changeCount === 0) {
      onOpenChange(false);
      return;
    }
    try {
      setSaving(true);
      const updated = await employeesService.update(employee.id, changes);
      const selectedTeam = teams.find((t) => t.id === (updated.team_id ?? changes.team_id));
      const merged: Profile = {
        ...employee,
        ...updated,
        ...changes,
        team: changes.team_id !== undefined ? selectedTeam : employee.team,
        manager:
          changes.manager_id !== undefined
            ? managers.find((m) => m.id === changes.manager_id)
            : employee.manager,
      };
      if (isSelf) {
        try {
          await refreshProfile();
        } catch {
          /* non-blocking */
        }
      }
      success(
        'Employee Updated',
        `${merged.first_name} ${merged.last_name}'s profile has been saved (${changeCount} change${changeCount === 1 ? '' : 's'}).`
      );
      onSaved(merged);
      onOpenChange(false);
    } catch (err) {
      toastError('Update Failed', err instanceof Error ? err.message : 'Could not save changes');
    } finally {
      setSaving(false);
    }
  };

  const sectionHasChanges = (s: EditSection) => {
    const keys: Record<EditSection, (keyof Profile)[]> = {
      details: ['first_name', 'last_name', 'phone', 'username', 'employee_id', 'joining_date'],
      team: ['role', 'team_id', 'manager_id'],
      access: ['access_only'],
      status: ['status'],
    };
    return keys[s].some((k) => k in changes);
  };

  const TabDot = ({ s }: { s: EditSection }) =>
    sectionHasChanges(s) ? <span className="ml-1.5 w-1.5 h-1.5 rounded-full bg-primary inline-block" /> : null;

  return (
    <Dialog open={open} onOpenChange={(o) => !saving && onOpenChange(o)}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Edit Employee</DialogTitle>
          <DialogDescription>
            Update {employee.first_name} {employee.last_name}'s profile details, role &amp; team, module access and account status.
          </DialogDescription>
        </DialogHeader>

        <Tabs
          value={section}
          onValueChange={(v) => setSection(v as EditSection)}
          className="flex-1 min-h-0 flex flex-col"
        >
          <TabsList className="grid grid-cols-4 w-full h-9">
            <TabsTrigger value="details" className="gap-1 text-[11px] sm:text-xs px-1 sm:px-2.5 truncate">
              <User className="w-3.5 h-3.5 shrink-0" /> Details <TabDot s="details" />
            </TabsTrigger>
            <TabsTrigger value="team" className="gap-1 text-[11px] sm:text-xs px-1 sm:px-2.5 truncate">
              <Users className="w-3.5 h-3.5 shrink-0" /> Team <TabDot s="team" />
            </TabsTrigger>
            <TabsTrigger value="access" className="gap-1 text-[11px] sm:text-xs px-1 sm:px-2.5 truncate">
              <ShieldCheck className="w-3.5 h-3.5 shrink-0" /> Access <TabDot s="access" />
            </TabsTrigger>
            <TabsTrigger value="status" className="gap-1 text-[11px] sm:text-xs px-1 sm:px-2.5 truncate">
              <Power className="w-3.5 h-3.5 shrink-0" /> Status <TabDot s="status" />
            </TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-y-auto pr-1 py-3">
            {/* ---------------- Details ---------------- */}
            <TabsContent value="details" className="space-y-4 mt-0">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="edit_first_name">First Name *</Label>
                  <Input id="edit_first_name" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="edit_last_name">Last Name *</Label>
                  <Input id="edit_last_name" value={lastName} onChange={(e) => setLastName(e.target.value)} />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="edit_email">
                  Work Email <span className="text-xs text-muted-foreground font-normal">(login ID — cannot be changed)</span>
                </Label>
                <Input id="edit_email" value={employee.email} readOnly disabled className="bg-muted/60" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="edit_username">Username</Label>
                  <Input id="edit_username" value={username} onChange={(e) => setUsername(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="edit_employee_id">User ID</Label>
                  <Input
                    id="edit_employee_id"
                    value={employeeCode}
                    onChange={(e) => setEmployeeCode(e.target.value)}
                    className="font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="edit_phone">Phone</Label>
                  <Input
                    id="edit_phone"
                    type="tel"
                    placeholder="+91 98765 43210"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="edit_joining_date">Joining Date</Label>
                  <Input
                    id="edit_joining_date"
                    type="date"
                    value={joiningDate}
                    onChange={(e) => setJoiningDate(e.target.value)}
                  />
                </div>
              </div>
              {validationError && <p className="text-xs text-destructive">{validationError}</p>}
            </TabsContent>

            {/* ---------------- Role & Team ---------------- */}
            <TabsContent value="team" className="space-y-4 mt-0">
              <div className="space-y-1.5">
                <Label>Role</Label>
                <Select value={role} onValueChange={(v) => setRole(v as UserRole)} disabled={isSuperAdmin}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    {isSuperAdmin && <SelectItem value={UserRole.SUPER_ADMIN}>Super Admin</SelectItem>}
                    {ROLE_OPTIONS.map((r) => (
                      <SelectItem key={r.value} value={r.value}>
                        {r.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {role !== employee.role && (
                  <div className="flex items-center justify-between gap-2 p-2.5 rounded-md border border-primary/30 bg-primary/5 text-xs">
                    <span className="text-foreground">
                      Role changed. Do you also want to reset module access to the{' '}
                      <strong>{String(role).replace(/_/g, ' ')}</strong> defaults?
                    </span>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs shrink-0"
                      onClick={() => {
                        applyRoleDefaults();
                        setSection('access');
                      }}
                    >
                      Apply defaults
                    </Button>
                  </div>
                )}
                {isSelf && role !== employee.role && (
                  <p className="text-xs text-amber-600 flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5" /> You are changing your own role.
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label>Team</Label>
                <Select value={teamId} onValueChange={setTeamId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select team" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No Team (Unassigned)</SelectItem>
                    {teams.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.name}
                      </SelectItem>
                    ))}
                    {employee.team_id && !teams.some((t) => t.id === employee.team_id) && (
                      <SelectItem value={employee.team_id}>
                        {(employee.team as Team | undefined)?.name || 'Current team'}
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
                {teams.length === 0 && (
                  <p className="text-xs text-muted-foreground">No teams yet — create one from the Teams page.</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label>Reporting Manager</Label>
                <Select value={managerId} onValueChange={setManagerId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select manager" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No Manager</SelectItem>
                    {managers.map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        {`${m.first_name || ''} ${m.last_name || ''}`.trim() || m.email} ·{' '}
                        {String(m.role).replace(/_/g, ' ')}
                      </SelectItem>
                    ))}
                    {employee.manager_id && !managers.some((m) => m.id === employee.manager_id) && (
                      <SelectItem value={employee.manager_id}>
                        {employee.manager
                          ? `${employee.manager.first_name} ${employee.manager.last_name}`
                          : 'Current manager'}
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
            </TabsContent>

            {/* ---------------- Access ---------------- */}
            <TabsContent value="access" className="space-y-3 mt-0">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div>
                  <Label className="text-sm font-semibold flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-primary" />
                    Module Access (RBAC)
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Choose which CRM modules and pages this employee can open.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge
                    variant={selectedAccess.length === MODULES.length ? 'default' : 'secondary'}
                    className="text-[11px]"
                  >
                    {selectedAccess.length === MODULES.length
                      ? `All Modules (${MODULES.length})`
                      : `${selectedAccess.length} / ${MODULES.length} Granted`}
                  </Badge>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs px-2.5 gap-1"
                    onClick={applyRoleDefaults}
                    title="Reset to role defaults"
                  >
                    <RotateCcw className="w-3 h-3" /> Role defaults
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs px-2.5"
                    onClick={handleSelectAllAccess}
                  >
                    {selectedAccess.length === MODULES.length ? 'Deselect All' : 'Select All'}
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 p-3 bg-muted/20 border border-border/70 rounded-lg">
                {MODULES.map((mod) => {
                  const isChecked = selectedAccess.includes(mod.id);
                  const isMandatory = mod.id === 'dashboard';
                  return (
                    <label
                      key={mod.id}
                      onClick={(e) => {
                        e.preventDefault();
                        if (!isMandatory) toggleAccess(mod.id);
                      }}
                      title={mod.description}
                      className={cn(
                        'flex items-center gap-2.5 p-2 rounded-md border text-xs font-medium cursor-pointer transition-all select-none',
                        isChecked
                          ? 'bg-primary/10 border-primary text-primary font-semibold'
                          : 'bg-background border-border/60 hover:bg-muted text-foreground/80 hover:text-foreground',
                        isMandatory && 'opacity-80 cursor-default'
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        disabled={isMandatory}
                        onChange={() => {}}
                        className="w-4 h-4 rounded border-border accent-primary cursor-pointer shrink-0"
                      />
                      <div className="min-w-0 flex-1 truncate flex items-center gap-1">
                        {mod.label}
                        {isMandatory && (
                          <span className="text-[9px] text-muted-foreground font-normal">(Home)</span>
                        )}
                        {mod.sensitive && (
                          <AlertTriangle className="w-3 h-3 text-amber-500 shrink-0" aria-label="Admin-level module" />
                        )}
                      </div>
                    </label>
                  );
                })}
              </div>
              <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                <AlertTriangle className="w-3 h-3 text-amber-500" /> Marked modules grant admin-level powers.
              </p>
              {isSelf && !selectedAccess.includes('employees') && (
                <p className="text-xs text-amber-600 flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5" /> Removing your own Employees access will lock you out of this page.
                </p>
              )}
            </TabsContent>

            {/* ---------------- Status ---------------- */}
            <TabsContent value="status" className="space-y-2.5 mt-0">
              {STATUS_OPTIONS.map((opt) => {
                const active = status === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setStatus(opt.value)}
                    className={cn(
                      'w-full text-left p-3 rounded-lg border transition-all flex items-start gap-3',
                      active ? opt.tone : 'border-border/60 hover:bg-muted/60'
                    )}
                  >
                    <span
                      className={cn(
                        'mt-0.5 w-4 h-4 rounded-full border-2 shrink-0 flex items-center justify-center',
                        active ? 'border-current' : 'border-muted-foreground/40'
                      )}
                    >
                      {active && <span className="w-2 h-2 rounded-full bg-current" />}
                    </span>
                    <span>
                      <span className="block text-sm font-semibold">{opt.label}</span>
                      <span className="block text-xs text-muted-foreground">{opt.description}</span>
                    </span>
                  </button>
                );
              })}
              {isSelf && status !== EmployeeStatus.ACTIVE && (
                <p className="text-xs text-amber-600 flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5" /> You are deactivating your own account.
                </p>
              )}
            </TabsContent>
          </div>
        </Tabs>

        <DialogFooter className="pt-3 border-t border-border/60 shrink-0 flex-col-reverse sm:flex-row sm:justify-between items-center gap-2">
          <span className="text-xs text-muted-foreground text-center sm:text-left w-full sm:w-auto">
            {changeCount === 0 ? 'No unsaved changes' : `${changeCount} unsaved change${changeCount === 1 ? '' : 's'}`}
          </span>
          <div className="flex gap-2 w-full sm:w-auto">
            <Button type="button" variant="outline" className="flex-1 sm:flex-initial text-xs" disabled={saving} onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="button" className="flex-1 sm:flex-initial text-xs font-semibold" disabled={saving || changeCount === 0} onClick={handleSave}>
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default EditEmployeeDialog;

