import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { employeesService } from '@/services/employees.service';
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
import { useToast } from '@/components/ui/toast';
import { ArrowLeft, Mail, Phone, Calendar, Trash2, User, ShieldCheck } from 'lucide-react';
import { SIDE_PANEL_FUNCTIONS } from '@/features/employees/EmployeeListPage';

export function EmployeeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { success, error: toastError } = useToast();

  const [loading, setLoading] = useState(true);
  const [employee, setEmployee] = useState<Profile | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

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
      success('Employee Deleted', `${employee.first_name} ${employee.last_name} has been removed.`);
      setDeleteDialogOpen(false);
      navigate('/employees');
    } catch (err: unknown) {
      toastError('Failed to delete employee', err instanceof Error ? err.message : 'Please try again');
    } finally {
      setIsDeleting(false);
    }
  };

  if (loading) {
    return <LoadingSpinner text="Loading employee profile..." />;
  }

  if (!employee) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" asChild className="p-0 h-auto gap-1 text-primary">
          <Link to="/employees">
            <ArrowLeft className="w-4 h-4" /> Back to Directory
          </Link>
        </Button>
        <Card className="p-8 text-center">
          <p className="text-muted-foreground">Employee profile not found.</p>
        </Card>
      </div>
    );
  }

  // Format joined date as YYYY-MM-DD
  const joinedDate = employee.joining_date
    ? employee.joining_date
    : employee.created_at
      ? employee.created_at.split('T')[0]
      : '2026-11-04';

  const roleFormatted = employee.role ? String(employee.role).replace(/_/g, ' ') : 'Sales Rep';
  const teamFormatted = (employee.team as any)?.name || 'General Sales';

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Navigation Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Button variant="ghost" size="sm" asChild className="p-0 h-auto gap-1.5 text-primary hover:text-primary/80">
          <Link to="/employees">
            <ArrowLeft className="w-4 h-4" /> Back to Directory
          </Link>
        </Button>
      </div>

      {/* Employee Profile Card */}
      <Card className="border-border/60 shadow-sm">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
            <div className="flex items-start gap-4">
              {/* Initials Avatar */}
              <div className="w-16 h-16 shrink-0 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-bold text-2xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
                {(employee.first_name?.[0] || 'E').toUpperCase()}
                {(employee.last_name?.[0] || '').toUpperCase()}
              </div>

              {/* Info Details */}
              <div className="space-y-1">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h2 className="text-xl font-bold text-foreground">
                    {employee.first_name} {employee.last_name}
                  </h2>
                  <Badge variant="success" className="text-[10px] font-semibold tracking-wide">
                    {employee.status || 'ACTIVE'}
                  </Badge>
                </div>

                {/* Role and Team: MANAGER • General Sales */}
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                    {roleFormatted} • {teamFormatted}
                  </p>
                  {employee.access_only && employee.access_only !== 'ALL' && (
                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                      <span className="text-xs font-semibold text-muted-foreground">Allowed Access:</span>
                      {employee.access_only.split(',').map((mod) => {
                        const trimmed = mod.trim().toLowerCase();
                        const found = SIDE_PANEL_FUNCTIONS.find(f => f.id === trimmed);
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
                      })}
                    </div>
                  )}
                </div>

                {/* User ID and Username */}
                {(employee.employee_id || employee.username) && (
                  <div className="flex items-center gap-3 text-xs text-muted-foreground pt-0.5">
                    {employee.employee_id && (
                      <span className="font-mono bg-muted/60 px-2 py-0.5 rounded border border-border/40">
                        ID: {employee.employee_id}
                      </span>
                    )}
                    {employee.username && (
                      <span className="text-muted-foreground">
                        @{employee.username}
                      </span>
                    )}
                  </div>
                )}

                {/* Email, Phone & Joined Date */}
                <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground pt-2">
                  <span className="flex items-center gap-1.5 text-foreground/80 font-medium">
                    <Mail className="w-3.5 h-3.5 text-muted-foreground" /> {employee.email}
                  </span>
                  {employee.phone && (
                    <span className="flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5" /> {employee.phone}
                    </span>
                  )}
                  <span className="flex items-center gap-1.5 text-muted-foreground">
                    <Calendar className="w-3.5 h-3.5" /> Joined {joinedDate}
                  </span>
                </div>
              </div>
            </div>

            {/* Actions: Delete Employee */}
            <div className="flex items-center gap-2 self-start md:self-auto shrink-0">
              <Button
                variant="outline"
                size="sm"
                className="text-destructive border-destructive/30 hover:bg-destructive/10 hover:text-destructive gap-1.5 shadow-sm"
                onClick={() => setDeleteDialogOpen(true)}
              >
                <Trash2 className="w-4 h-4" />
                Delete Employee
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Delete Confirmation Modal */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-destructive flex items-center gap-2">
              <Trash2 className="w-5 h-5" />
              Delete Employee Profile
            </DialogTitle>
            <DialogDescription className="pt-2">
              Are you sure you want to delete <strong>{employee.first_name} {employee.last_name}</strong>?
              This will permanently remove their profile and credentials from the platform.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="pt-4 gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleDelete}
              disabled={isDeleting}
              className="gap-1.5"
            >
              <Trash2 className="w-4 h-4" />
              {isDeleting ? 'Deleting...' : 'Delete Employee'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
