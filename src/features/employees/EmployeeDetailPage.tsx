import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { employeesService } from '@/services/employees.service';
import { teamsService } from '@/services/teams.service';
import type { Profile } from '@/types';
import { LoadingSpinner } from '@/components/common/EmptyState';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/components/ui/toast';
import {
  ArrowLeft, Mail, Phone, Calendar, Trash2, User, Users, ShieldCheck, Pencil, ChevronDown, Power, UserCog,
} from 'lucide-react';
import { MODULES } from '@/lib/permissions';
import { EditEmployeeDialog, type EditSection } from './EditEmployeeDialog';

export function EmployeeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { success, error: toastError } = useToast();

  const [loading, setLoading] = useState(true);
  const [employee, setEmployee] = useState<Profile | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editSection, setEditSection] = useState<EditSection>('details');
  const [managerName, setManagerName] = useState<string | null>(null);
  const [teamName, setTeamName] = useState<string | null>(null);

  const openEdit = (section: EditSection) => {
    setEditSection(section);
    setEditOpen(true);
  };

  // Resolve team name
  useEffect(() => {
    let cancelled = false;
    if (!employee?.team_id) {
      setTeamName(null);
      return;
    }
    if ((employee.team as any)?.name) {
      setTeamName((employee.team as any).name);
      return;
    }
    teamsService
      .getById(employee.team_id)
      .then((t) => !cancelled && setTeamName(t?.name || null))
      .catch(() => !cancelled && setTeamName(null));
    return () => {
      cancelled = true;
    };
  }, [employee?.team_id, employee?.team]);

  // Resolve reporting manager's name (not always joined by the profile query)
  useEffect(() => {
    let cancelled = false;
    if (!employee?.manager_id) {
      setManagerName(null);
      return;
    }
    if (employee.manager) {
      setManagerName(`${employee.manager.first_name} ${employee.manager.last_name}`.trim());
      return;
    }
    employeesService
      .getById(employee.manager_id)
      .then((m) => !cancelled && setManagerName(`${m.first_name || ''} ${m.last_name || ''}`.trim() || m.email))
      .catch(() => !cancelled && setManagerName(null));
    return () => {
      cancelled = true;
    };
  }, [employee?.manager_id, employee?.manager]);

  useEffect(() => {
    async function load() {
      if (!id) return;
      try {
        setLoading(true);
        const emp = await employeesService.getById(id);
        setEmployee(emp);
      } catch (err) {
        console.error('Error fetching employee detail:', err);
        setEmployee(null);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [id]);

  const handleDelete = async () => {
    if (!employee) return;
    try {
      setIsDeleting(true);
      await employeesService.delete(employee.id);
      success('Employee Removed', `${employee.first_name} ${employee.last_name} has been deleted.`);
      navigate('/employees');
    } catch (err) {
      toastError('Delete Failed', err instanceof Error ? err.message : 'Could not remove employee');
    } finally {
      setIsDeleting(false);
      setDeleteDialogOpen(false);
    }
  };

  if (loading) {
    return <LoadingSpinner text="Loading employee profile..." />;
  }

  if (!employee) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" asChild>
          <Link to="/employees" className="gap-2">
            <ArrowLeft className="w-4 h-4" /> Back to Directory
          </Link>
        </Button>
        <Card className="p-8 text-center text-muted-foreground">
          Employee profile not found or has been removed.
        </Card>
      </div>
    );
  }

  const roleFormatted = (employee.role || 'Sales Rep').replace(/_/g, ' ');
  const teamFormatted = teamName || (employee.team as any)?.name || 'Unassigned Team';

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Top back bar & Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <Button variant="ghost" size="sm" asChild className="w-fit -ml-2 text-muted-foreground hover:text-foreground">
          <Link to="/employees" className="gap-2 text-xs sm:text-sm">
            <ArrowLeft className="w-4 h-4" /> Back to Employee Directory
          </Link>
        </Button>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" className="gap-1.5">
                <Pencil className="w-3.5 h-3.5" /> Edit
                <ChevronDown className="w-3.5 h-3.5 opacity-80" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel className="text-xs text-muted-foreground">Edit employee</DropdownMenuLabel>
              <DropdownMenuItem onSelect={() => openEdit('details')}>
                <User /> Profile Details
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => openEdit('team')}>
                <Users /> Role &amp; Team
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => openEdit('access')}>
                <ShieldCheck /> Access &amp; Permissions
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => openEdit('status')}>
                <Power /> Account Status
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button
            variant="outline"
            size="sm"
            className="text-destructive hover:bg-destructive/10 hover:border-destructive/40 gap-1.5"
            onClick={() => setDeleteDialogOpen(true)}
          >
            <Trash2 className="w-3.5 h-3.5" /> Delete Employee
          </Button>
        </div>
      </div>

      {/* Main Profile Header Card */}
      <Card className="border-border/60 overflow-hidden">
        <div className="h-28 bg-gradient-to-r from-blue-600 via-indigo-600 to-primary/80" />
        <CardContent className="p-6 relative pt-0">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 -mt-12 mb-6">
            <div className="flex items-end gap-4">
              <div className="w-24 h-24 rounded-2xl bg-card border-4 border-card shadow-lg flex items-center justify-center text-primary font-bold text-3xl">
                {employee.first_name[0]}{employee.last_name[0]}
              </div>
              <div className="space-y-1 mb-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-2xl font-bold text-foreground">
                    {employee.first_name} {employee.last_name}
                  </h1>
                  <Badge
                    variant={
                      !employee.status || employee.status === 'ACTIVE'
                        ? 'success'
                        : employee.status === 'SUSPENDED'
                          ? 'destructive'
                          : 'warning'
                    }
                    className="text-[10px]"
                  >
                    {employee.status || 'ACTIVE'}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground font-mono">
                  User ID: {employee.employee_id || 'N/A'} {employee.username && `• @${employee.username}`}
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-border/60">
            {/* Left: Role, Access & Team */}
            <div className="space-y-3">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Role &amp; Organization
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-[11px] gap-1 text-primary"
                    onClick={() => openEdit('team')}
                  >
                    <UserCog className="w-3 h-3" /> Edit
                  </Button>
                </div>
                <p className="text-sm font-semibold text-foreground mt-0.5">
                  {roleFormatted}
                </p>
                <p className="text-xs text-muted-foreground">
                  Team: <span className="font-medium text-foreground">{teamFormatted}</span>
                </p>
                <p className="text-xs text-muted-foreground">
                  Reports to: <span className="font-medium text-foreground">{managerName || 'No manager assigned'}</span>
                </p>
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Assigned Workspace Access
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-[11px] gap-1 text-primary"
                    onClick={() => openEdit('access')}
                  >
                    <ShieldCheck className="w-3 h-3" /> Edit
                  </Button>
                </div>
                <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                  {!employee.access_only || employee.access_only === 'ALL' ? (
                    <Badge variant="outline" className="text-xs text-primary border-primary/30">
                      Full Workspace Access (All Modules)
                    </Badge>
                  ) : (
                    employee.access_only.split(',').map((mod) => {
                      const trimmed = mod.trim().toLowerCase();
                      const found = MODULES.find(f => f.id === trimmed);
                      const label = found ? found.label : trimmed;
                      return (
                        <Badge
                          key={trimmed}
                          variant="secondary"
                          className="text-[10px] font-medium bg-primary/10 text-primary border border-primary/20"
                        >
                          {label}
                        </Badge>
                      );
                    })
                  )}
                </div>
              </div>
            </div>

            {/* Right: Contact & System Metadata */}
            <div className="space-y-2.5 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Contact &amp; Details
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-[11px] gap-1 text-primary"
                  onClick={() => openEdit('details')}
                >
                  <Pencil className="w-3 h-3" /> Edit
                </Button>
              </div>

              <div className="flex items-center gap-2 text-foreground text-xs">
                <Mail className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                <span className="truncate">{employee.email}</span>
              </div>

              {employee.phone && (
                <div className="flex items-center gap-2 text-foreground text-xs">
                  <Phone className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                  <span>{employee.phone}</span>
                </div>
              )}

              <div className="flex items-center gap-2 text-foreground text-xs">
                <Calendar className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                <span>Joined on {employee.joining_date ? new Date(employee.joining_date).toLocaleDateString() : 'N/A'}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Edit Employee Modal (Details / Role & Team / Access / Status) */}
      <EditEmployeeDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        employee={employee}
        initialSection={editSection}
        onSaved={(updated) => setEmployee(updated)}
      />

      {/* Delete Confirmation Modal */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Confirm Employee Deletion</DialogTitle>
            <DialogDescription>
              Are you sure you want to permanently remove {employee.first_name} {employee.last_name} from the directory?
              This will revoke their CRM access immediately.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" disabled={isDeleting} onClick={handleDelete}>
              {isDeleting ? 'Deleting...' : 'Delete Employee'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default EmployeeDetailPage;
