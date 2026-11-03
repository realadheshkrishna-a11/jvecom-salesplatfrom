import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { employeesService } from '@/services/employees.service';
import { teamsService } from '@/services/teams.service';
import type { Profile, Team } from '@/types';
import { UserRole, EmployeeStatus } from '@/types';
import { PageHeader } from '@/components/common/PageHeader';
import { LoadingSpinner, EmptyState } from '@/components/common/EmptyState';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/toast';
import { Link } from 'react-router-dom';
import { Plus, Search, Mail, UserPlus, Filter, MoreHorizontal, ShieldCheck } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { employeeSchema, type EmployeeInput } from '@/schemas';

export function EmployeeListPage() {
  const { organization, isAdmin } = useAuth();
  const orgId = organization?.id || '11111111-1111-1111-1111-111111111111';
  const { success, error: toastError } = useToast();

  const [loading, setLoading] = useState(true);
  const [employees, setEmployees] = useState<Profile[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const form = useForm<EmployeeInput>({
    resolver: zodResolver(employeeSchema),
    defaultValues: {
      first_name: '',
      last_name: '',
      email: '',
      role: UserRole.SALES_REP,
    },
  });

  const loadData = async () => {
    try {
      setLoading(true);
      const [empRes, teamRes] = await Promise.allSettled([
        employeesService.list(orgId, { search: search || undefined }),
        teamsService.list(orgId),
      ]);

      if (empRes.status === 'fulfilled' && empRes.value.data.length > 0) {
        setEmployees(empRes.value.data);
      } else {
        setEmployees([]);
      }

      if (teamRes.status === 'fulfilled') {
        setTeams(teamRes.value);
      }
    } catch (err) {
      console.error('Error fetching employees:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [orgId]);

  const onInviteSubmit = async (values: EmployeeInput) => {
    try {
      await employeesService.create(orgId, values);
      success('Invitation Sent', `Invitation email dispatched to ${values.email}`);
      setIsDialogOpen(false);
      form.reset();
      loadData();
    } catch (err: unknown) {
      toastError('Failed to invite employee', err instanceof Error ? err.message : 'Please check details');
    }
  };

  const filteredEmployees = employees.filter((emp) => {
    const matchesSearch =
      `${emp.first_name} ${emp.last_name} ${emp.email}`
        .toLowerCase()
        .includes(search.toLowerCase());
    const matchesRole = roleFilter === 'ALL' || emp.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Employee Directory"
        subtitle="Manage sales representatives, team leads, access roles, and onboarding invitations."
      >
        {isAdmin && (
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-2">
                <UserPlus className="w-4 h-4" />
                Invite Employee
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Invite New Team Member</DialogTitle>
                <DialogDescription>
                  Send an activation link with role and team assignments
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={form.handleSubmit(onInviteSubmit)} className="space-y-4 py-2">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="first_name">First Name</Label>
                    <Input id="first_name" placeholder="John" {...form.register('first_name')} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="last_name">Last Name</Label>
                    <Input id="last_name" placeholder="Doe" {...form.register('last_name')} />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="email">Work Email</Label>
                  <Input id="email" type="email" placeholder="john.doe@company.com" {...form.register('email')} />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Role</Label>
                    <Select
                      defaultValue={UserRole.SALES_REP}
                      onValueChange={(val) => form.setValue('role', val as any)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select role" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={UserRole.SALES_REP}>Sales Representative</SelectItem>
                        <SelectItem value={UserRole.MANAGER}>Sales Manager</SelectItem>
                        <SelectItem value={UserRole.ORG_ADMIN}>Organization Admin</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label>Assign Team</Label>
                    <Select
                      onValueChange={(val) => form.setValue('team_id', val)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select team" />
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
                </div>

                <DialogFooter className="pt-4">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit">Send Invite</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </PageHeader>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-3" />
          <Input
            placeholder="Search by name, email or employee ID..."
            className="pl-9 bg-card"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="w-full sm:w-44 bg-card">
              <SelectValue placeholder="Filter Role" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Roles</SelectItem>
              <SelectItem value={UserRole.ORG_ADMIN}>Org Admins</SelectItem>
              <SelectItem value={UserRole.MANAGER}>Managers</SelectItem>
              <SelectItem value={UserRole.SALES_REP}>Sales Reps</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Employee Table */}
      {loading ? (
        <LoadingSpinner text="Fetching employee roster..." />
      ) : filteredEmployees.length === 0 ? (
        <EmptyState
          title="No employees found"
          description="Try adjusting your search criteria or invite your first sales representative."
          actionLabel="Invite Employee"
          onAction={() => setIsDialogOpen(true)}
        />
      ) : (
        <Card className="border-border/60">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Team</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEmployees.map((emp) => (
                  <TableRow key={emp.id}>
                    <TableCell>
                      <div>
                        <div className="font-semibold text-sm text-foreground">
                          {emp.first_name} {emp.last_name}
                        </div>
                        <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                          <Mail className="w-3 h-3" />
                          {emp.email}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          emp.role === UserRole.ORG_ADMIN ? 'default' :
                          emp.role === UserRole.MANAGER ? 'secondary' : 'outline'
                        }
                        className="text-[11px]"
                      >
                        {(emp.role ? String(emp.role).replace(/_/g, ' ') : 'Sales Rep')}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm font-medium">
                      {(emp.team as any)?.name || 'Unassigned'}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={emp.status === EmployeeStatus.ACTIVE ? 'success' : 'warning'}
                        className="text-[10px]"
                      >
                        {emp.status || 'ACTIVE'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {emp.created_at ? new Date(emp.created_at).toLocaleDateString() : 'N/A'}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" asChild>
                        <Link to={`/employees/${emp.id}`} className="text-xs text-primary">
                          Profile
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
