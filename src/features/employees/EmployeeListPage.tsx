import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { employeesService } from '@/services/employees.service';
import { emailService } from '@/services/email.service';
import { teamsService } from '@/services/teams.service';
import type { Profile, Team } from '@/types';
import { UserRole, EmployeeStatus } from '@/types';
import { MODULES, ROLE_DEFAULT_MODULES, serializeAccess, type ModuleId } from '@/lib/permissions';

export const SIDE_PANEL_FUNCTIONS = MODULES;
import { PageHeader } from '@/components/common/PageHeader';
import { LoadingSpinner, EmptyState } from '@/components/common/EmptyState';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/toast';
import { cn } from '@/lib/utils';
import { Link } from 'react-router-dom';
import { Search, Mail, UserPlus, RefreshCw, Copy, Eye, EyeOff, Check, Trash2, ShieldCheck, Lock } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { employeeSchema, type EmployeeInput } from '@/schemas';

function buildInvitationEmail({
  firstName,
  lastName,
  email,
  username,
  employeeId,
  password,
  role,
  accessOnly,
  orgName,
}: {
  firstName: string;
  lastName: string;
  email: string;
  username: string;
  employeeId: string;
  password: string;
  role: string;
  accessOnly?: string;
  orgName: string;
}) {
  const roleName = String(role).replace(/_/g, ' ');
  const loginUrl = `${window.location.origin}/login?email=${encodeURIComponent(email)}`;

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to ${orgName}</title>
</head>
<body style="margin:0;padding:24px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;background-color:#f1f5f9;color:#1e293b;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width:580px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e2e8f0;box-shadow:0 4px 6px -1px rgba(0,0,0,0.06);">
    <!-- Header -->
    <tr>
      <td style="background:linear-gradient(135deg,#1d4ed8,#3b82f6);padding:32px 28px;text-align:center;color:#ffffff;">
        <h1 style="margin:0;font-size:22px;font-weight:700;letter-spacing:-0.02em;color:#ffffff;">Welcome to ${orgName}</h1>
        <p style="margin:8px 0 0 0;font-size:14px;color:#dbeafe;">Your employee account has been created & activated</p>
      </td>
    </tr>
    <!-- Content -->
    <tr>
      <td style="padding:32px 28px;">
        <div style="font-size:16px;font-weight:600;color:#0f172a;margin-bottom:12px;">Hello ${firstName} ${lastName},</div>
        <p style="font-size:14px;line-height:1.6;color:#475569;margin-bottom:24px;">
          You have been invited to join <strong>${orgName}</strong> on the SalesOS CRM platform. Your employee account is active and ready. Click the button below to sign in:
        </p>

        <!-- Credentials Card -->
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background:#f8fafc;border:1px solid #cbd5e1;border-radius:8px;padding:16px;margin:20px 0;">
          <tr>
            <td colspan="2" style="padding-bottom:12px;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;color:#64748b;border-bottom:1px solid #e2e8f0;">
              Account Login Details
            </td>
          </tr>
          <tr>
            <td style="padding:10px 0;font-size:13px;font-weight:600;color:#334155;border-bottom:1px solid #e2e8f0;">Work Email</td>
            <td style="padding:10px 0;font-size:14px;font-family:monospace;font-weight:700;color:#0f172a;text-align:right;border-bottom:1px solid #e2e8f0;">${email}</td>
          </tr>
          <tr>
            <td style="padding:10px 0;font-size:13px;font-weight:600;color:#334155;border-bottom:1px solid #e2e8f0;">Temporary Password</td>
            <td style="padding:10px 0;font-size:14px;font-family:monospace;font-weight:700;color:#2563eb;text-align:right;border-bottom:1px solid #e2e8f0;">${password}</td>
          </tr>
          <tr>
            <td style="padding:10px 0;font-size:13px;font-weight:600;color:#334155;border-bottom:1px solid #e2e8f0;">Username</td>
            <td style="padding:10px 0;font-size:14px;font-family:monospace;font-weight:700;color:#0f172a;text-align:right;border-bottom:1px solid #e2e8f0;">${username}</td>
          </tr>
          <tr>
            <td style="padding:10px 0;font-size:13px;font-weight:600;color:#334155;border-bottom:1px solid #e2e8f0;">User ID</td>
            <td style="padding:10px 0;font-size:14px;font-family:monospace;font-weight:700;color:#0f172a;text-align:right;border-bottom:1px solid #e2e8f0;">${employeeId}</td>
          </tr>
          <tr>
            <td style="padding:10px 0;font-size:13px;font-weight:600;color:#334155;border-bottom:1px solid #e2e8f0;">Assigned Role</td>
            <td style="padding:10px 0;font-size:13px;font-weight:700;color:#1e40af;text-align:right;border-bottom:1px solid #e2e8f0;">${roleName}</td>
          </tr>
          <tr>
            <td style="padding:10px 0;font-size:13px;font-weight:600;color:#334155;">Allowed Modules</td>
            <td style="padding:10px 0;font-size:13px;font-weight:700;color:#0f172a;text-align:right;">${accessOnly || 'All Functions (Full Access)'}</td>
          </tr>
        </table>

        <!-- CTA Button -->
        <div style="text-align:center;margin:32px 0 20px;">
          <a href="${loginUrl}" style="background-color:#2563eb;color:#ffffff;display:inline-block;padding:14px 36px;font-size:15px;font-weight:700;border-radius:8px;text-decoration:none;box-shadow:0 4px 6px -1px rgba(37,99,235,0.3);">
            Access Your Account
          </a>
        </div>

        <p style="font-size:13px;line-height:1.5;color:#64748b;margin:20px 0 10px;text-align:center;">
          Button not clickable? Copy and paste this link in your browser:<br/>
          <a href="${loginUrl}" style="color:#2563eb;word-break:break-all;font-size:12px;">${loginUrl}</a>
        </p>

        <p style="font-size:13px;line-height:1.5;color:#64748b;margin:20px 0 10px;">
          <strong>Security Notice:</strong> Please keep these credentials confidential. You will be redirected to the CRM login page and can change your password anytime in Settings.
        </p>
      </td>
    </tr>
    <!-- Footer -->
    <tr>
      <td style="padding:20px 28px;background:#f8fafc;border-top:1px solid #e2e8f0;font-size:12px;color:#94a3b8;text-align:center;line-height:1.5;">
        This automated invitation was sent by ${orgName} via SalesOS.<br />
        If you have any questions, reach out to your team administrator.
      </td>
    </tr>
  </table>
</body>
</html>`;

  const text = `Welcome to ${orgName}!

Hello ${firstName} ${lastName},

You have been invited to join ${orgName} on the SalesOS CRM platform. Your employee account is active and ready.

Your login credentials:
- Work Email: ${email}
- Temporary Password: ${password}
- Username: ${username}
- User ID: ${employeeId}
- Assigned Role: ${roleName}
- Allowed Modules: ${accessOnly || 'All Functions (Full Access)'}

Access Your Account:
${loginUrl}

Security Notice: Please keep these credentials confidential and update your password after your initial sign-in.

---
This automated invitation was sent by ${orgName} via SalesOS.`;

  return { html, text };
}

function generateEmployeeId(): string {
  const prefix = 'EMP';
  const num = Math.floor(100000 + Math.random() * 900000);
  return `${prefix}-${num}`;
}

function generatePassword(): string {
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lower = 'abcdefghjkmnpqrstuvwxyz';
  const digits = '23456789';
  const special = '!@#$%&*';
  const all = upper + lower + digits + special;
  let pwd = '';
  pwd += upper[Math.floor(Math.random() * upper.length)];
  pwd += lower[Math.floor(Math.random() * lower.length)];
  pwd += digits[Math.floor(Math.random() * digits.length)];
  pwd += special[Math.floor(Math.random() * special.length)];
  for (let i = 4; i < 12; i++) {
    pwd += all[Math.floor(Math.random() * all.length)];
  }
  return pwd.split('').sort(() => Math.random() - 0.5).join('');
}

export function EmployeeListPage() {
  const { organization } = useAuth();
  const orgId = organization?.id || '11111111-1111-1111-1111-111111111111';
  const { success, error: toastError } = useToast();

  const [loading, setLoading] = useState(true);
  const [employees, setEmployees] = useState<Profile[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [selectedAccess, setSelectedAccess] = useState<string[]>(
    ROLE_DEFAULT_MODULES[UserRole.SALES_REP]
  );

  const toggleAccess = (id: string) => {
    if (id === 'dashboard') return; // Dashboard is always mandatory for landing
    const next = selectedAccess.includes(id)
      ? selectedAccess.filter((m) => m !== id)
      : [...selectedAccess, id];
    setSelectedAccess(next);
    form.setValue('access_only', serializeAccess(next));
  };

  const handleSelectAllAccess = () => {
    if (selectedAccess.length === MODULES.length) {
      setSelectedAccess(['dashboard']);
      form.setValue('access_only', serializeAccess(['dashboard']));
    } else {
      const allIds = MODULES.map((f) => f.id);
      setSelectedAccess(allIds);
      form.setValue('access_only', serializeAccess(allIds));
    }
  };

  const form = useForm<EmployeeInput>({
    resolver: zodResolver(employeeSchema),
    defaultValues: {
      first_name: '',
      last_name: '',
      email: '',
      username: '',
      employee_id: generateEmployeeId(),
      password: generatePassword(),
      role: UserRole.SALES_REP,
      team_id: '',
      access_only: serializeAccess(ROLE_DEFAULT_MODULES[UserRole.SALES_REP]),
    },
  });

  const handleRoleChange = (role: UserRole.ORG_ADMIN | UserRole.MANAGER | UserRole.SALES_REP) => {
    form.setValue('role', role);
    const defaults = ROLE_DEFAULT_MODULES[role] || MODULES.map(m => m.id);
    setSelectedAccess(defaults);
    form.setValue('access_only', serializeAccess(defaults));
  };

  const watchedEmployeeId = form.watch('employee_id');
  const watchedPassword = form.watch('password');
  const watchedAccessOnly = form.watch('access_only') || 'ALL';

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
        setTeams(teamRes.value || []);
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
    if (selectedAccess.length === 0) {
      toastError('Access Required', 'Please tick at least one module to grant access.');
      return;
    }

    try {
      const accessOnly = serializeAccess(selectedAccess);

      // 1. Create the employee profile record with permissions
      await employeesService.create(orgId, {
        ...values,
        access_only: accessOnly,
      });

      // 2. Prepare the invitation email containing username, userid, password, and Access Your Account button
      const orgName = organization?.name || 'SalesOS';
      const accessLabel = selectedAccess.length === MODULES.length
        ? 'All Modules (Full Workspace Access)'
        : selectedAccess.map(m => {
            const found = MODULES.find(f => f.id === m);
            return found ? found.label : m;
          }).join(', ');

      const { html, text } = buildInvitationEmail({
        firstName: values.first_name,
        lastName: values.last_name,
        email: values.email,
        username: values.username || values.email.split('@')[0],
        employeeId: values.employee_id || '',
        password: values.password || '',
        role: values.role,
        accessOnly: accessLabel,
        orgName,
      });

      const emailSubject = `Welcome to ${orgName} — Your Account Credentials`;

      // 3. Send email to the employee (dispatches via Live Gateway / Resend & records in Sent folder)
      try {
        await emailService.send({
          to: [values.email],
          subject: emailSubject,
          body_html: html,
          body_text: text,
          from_name: `${orgName} Team`,
          from_address: 'noreply@crm.jvecomb2b.com',
        }, orgId);
      } catch (mailErr) {
        console.warn('[EmployeeListPage] Live email dispatch notice:', mailErr);
      }

      // 4. Also deliver a copy to the in-app Mail Inbox for this user
      try {
        emailService.deliverToInbox({
          to: values.email,
          fromName: `${orgName} Team`,
          fromAddress: 'noreply@crm.jvecomb2b.com',
          subject: emailSubject,
          html,
          text,
          orgId,
        });
      } catch (inboxErr) {
        console.warn('[EmployeeListPage] In-app inbox delivery notice:', inboxErr);
      }

      success(
        'Invitation & Credentials Sent',
        `Account created with RBAC permissions and email dispatched to ${values.email}`
      );
      setIsDialogOpen(false);
      form.reset({
        first_name: '',
        last_name: '',
        email: '',
        username: '',
        employee_id: generateEmployeeId(),
        password: generatePassword(),
        role: UserRole.SALES_REP,
        team_id: '',
        access_only: serializeAccess(ROLE_DEFAULT_MODULES[UserRole.SALES_REP]),
      });
      setShowPassword(false);
      loadData();
    } catch (err: unknown) {
      toastError('Failed to invite employee', err instanceof Error ? err.message : 'Please check details');
    }
  };

  const handleDeleteEmployee = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete ${name}? This action cannot be undone.`)) {
      return;
    }
    try {
      await employeesService.delete(id);
      success('Employee Deleted', `${name} has been removed from the directory.`);
      loadData();
    } catch (err: unknown) {
      toastError('Failed to delete employee', err instanceof Error ? err.message : 'Please try again');
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleDialogOpen = (open: boolean) => {
    setIsDialogOpen(open);
    if (open) {
      const newEmpId = generateEmployeeId();
      const newPassword = generatePassword();
      const defaultRole = UserRole.SALES_REP;
      const defaults = ROLE_DEFAULT_MODULES[defaultRole] || MODULES.map(m => m.id);
      setSelectedAccess(defaults);
      form.reset({
        first_name: '',
        last_name: '',
        email: '',
        username: '',
        employee_id: newEmpId,
        password: newPassword,
        role: defaultRole,
        team_id: '',
        access_only: serializeAccess(defaults),
      });
      setShowPassword(false);
      setCopied(null);
    }
  };

  const filteredEmployees = employees.filter((emp) => {
    const matchesSearch =
      `${emp.first_name || ''} ${emp.last_name || ''} ${emp.email || ''} ${emp.username || ''} ${emp.employee_id || ''}`
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
        <Button size="sm" className="gap-2 shadow-sm" onClick={() => handleDialogOpen(true)}>
          <UserPlus className="w-4 h-4" />
          Invite Employee
        </Button>
      </PageHeader>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-3" />
          <Input
            placeholder="Search by name, email, username or employee ID..."
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
          onAction={() => handleDialogOpen(true)}
        />
      ) : (
        <Card className="border-border/60">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>User ID / Username</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Team</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Allowed Access</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEmployees.map((emp) => {
                  const accessTokens = (emp.access_only || 'ALL').split(',').map(s => s.trim().toLowerCase());
                  const isFull = !emp.access_only || emp.access_only === 'ALL' || accessTokens.length >= MODULES.length;
                  return (
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
                        <div className="text-xs font-mono text-foreground font-medium">
                          {emp.employee_id || '—'}
                        </div>
                        {emp.username && (
                          <div className="text-[11px] text-muted-foreground">
                            @{emp.username}
                          </div>
                        )}
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
                      <TableCell>
                        {isFull ? (
                          <Badge variant="outline" className="text-[10px] text-primary border-primary/30">
                            Full Access
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground font-mono">
                            {accessTokens.length} modules
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {emp.created_at ? new Date(emp.created_at).toLocaleDateString() : 'N/A'}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button variant="ghost" size="sm" asChild>
                            <Link to={`/employees/${emp.id}`} className="text-xs text-primary font-medium">
                              Profile
                            </Link>
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                            title="Delete Employee"
                            onClick={() => handleDeleteEmployee(emp.id, `${emp.first_name} ${emp.last_name}`)}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Invite Employee Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={handleDialogOpen}>
        <DialogContent className="sm:max-w-xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Invite New Team Member</DialogTitle>
            <DialogDescription>
              Create credentials and assign dynamic module permissions for the new employee.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={form.handleSubmit(onInviteSubmit)} className="space-y-4 py-2 overflow-y-auto pr-1">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="first_name">First Name *</Label>
                <Input id="first_name" placeholder="John" {...form.register('first_name')} />
                {form.formState.errors.first_name && (
                  <p className="text-xs text-destructive">{form.formState.errors.first_name.message}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="last_name">Last Name *</Label>
                <Input id="last_name" placeholder="Doe" {...form.register('last_name')} />
                {form.formState.errors.last_name && (
                  <p className="text-xs text-destructive">{form.formState.errors.last_name.message}</p>
                )}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="email">Work Email *</Label>
              <Input id="email" type="email" placeholder="john.doe@company.com" {...form.register('email')} />
              {form.formState.errors.email && (
                <p className="text-xs text-destructive">{form.formState.errors.email.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="username">Username *</Label>
              <Input id="username" placeholder="john.doe" {...form.register('username')} />
              {form.formState.errors.username && (
                <p className="text-xs text-destructive">{form.formState.errors.username.message}</p>
              )}
            </div>

            {/* Auto-generated User ID */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="employee_id">User ID <span className="text-xs text-muted-foreground font-normal">(Auto-generated)</span></Label>
                {copied === 'userId' && (
                  <span className="text-xs text-green-600 flex items-center gap-1 font-medium">
                    <Check className="w-3 h-3" /> Copied!
                  </span>
                )}
              </div>
              <div className="flex gap-2">
                <Input
                  id="employee_id"
                  readOnly
                  value={watchedEmployeeId || ''}
                  className="bg-muted/70 font-mono text-sm tracking-wide"
                  {...form.register('employee_id')}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="shrink-0"
                  title="Regenerate User ID"
                  onClick={() => form.setValue('employee_id', generateEmployeeId(), { shouldValidate: true })}
                >
                  <RefreshCw className="w-4 h-4" />
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="shrink-0"
                  title="Copy User ID"
                  onClick={() => copyToClipboard(watchedEmployeeId || '', 'userId')}
                >
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
              {form.formState.errors.employee_id && (
                <p className="text-xs text-destructive">{form.formState.errors.employee_id.message}</p>
              )}
            </div>

            {/* Auto-generated Password */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Temporary Password <span className="text-xs text-muted-foreground font-normal">(Auto-generated)</span></Label>
                {copied === 'password' && (
                  <span className="text-xs text-green-600 flex items-center gap-1 font-medium">
                    <Check className="w-3 h-3" /> Copied!
                  </span>
                )}
              </div>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    readOnly
                    value={watchedPassword || ''}
                    className="bg-muted/70 font-mono text-sm tracking-wider pr-10"
                    {...form.register('password')}
                  />
                  <button
                    type="button"
                    tabIndex={-1}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1 transition-colors"
                    onClick={() => setShowPassword(!showPassword)}
                    title={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="shrink-0"
                  title="Regenerate Password"
                  onClick={() => form.setValue('password', generatePassword(), { shouldValidate: true })}
                >
                  <RefreshCw className="w-4 h-4" />
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="shrink-0"
                  title="Copy Password"
                  onClick={() => copyToClipboard(watchedPassword || '', 'password')}
                >
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
              {form.formState.errors.password && (
                <p className="text-xs text-destructive">{form.formState.errors.password.message}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Role</Label>
                <Select
                  defaultValue={UserRole.SALES_REP}
                  onValueChange={(val) => handleRoleChange(val as UserRole.ORG_ADMIN | UserRole.MANAGER | UserRole.SALES_REP)}
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
                  onValueChange={(val) => form.setValue('team_id', val === 'none' ? undefined : val)}
                >
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
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Access Only - RBAC Module Permissions */}
            <div className="space-y-2 pt-2 border-t border-border/70">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div>
                  <Label className="text-sm font-semibold flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-primary" />
                    Role-Based Access Control (RBAC)
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Assign which CRM modules, features and pages this employee is allowed to view.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge
                    variant={selectedAccess.length === MODULES.length ? 'default' : selectedAccess.length > 0 ? 'secondary' : 'outline'}
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
                    className="h-7 text-xs px-2.5"
                    onClick={handleSelectAllAccess}
                  >
                    {selectedAccess.length === MODULES.length ? 'Deselect All' : 'Select All'}
                  </Button>
                </div>
              </div>

              {/* Module selection checkboxes */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 p-3 bg-muted/20 border border-border/70 rounded-lg max-h-56 overflow-y-auto">
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
                      className={cn(
                        "flex items-center gap-2.5 p-2 rounded-md border text-xs font-medium cursor-pointer transition-all select-none",
                        isChecked
                          ? "bg-primary/10 border-primary text-primary font-semibold shadow-xs"
                          : "bg-background border-border/60 hover:bg-muted text-foreground/80 hover:text-foreground",
                        isMandatory && "opacity-80 cursor-default"
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        disabled={isMandatory}
                        onChange={() => {}}
                        className="w-4 h-4 rounded border-border text-primary focus:ring-primary accent-primary cursor-pointer shrink-0"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="truncate flex items-center gap-1">
                          {mod.label}
                          {isMandatory && (
                            <span className="text-[9px] text-muted-foreground font-normal">(Home)</span>
                          )}
                        </div>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>

            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">Send Invite & Create Credentials</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default EmployeeListPage;
