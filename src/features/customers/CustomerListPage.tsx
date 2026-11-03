import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { customersService } from '@/services/customers.service';
import type { Customer } from '@/types';
import { CustomerStatus } from '@/types';
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
import { User, Plus, Search, Mail, Phone, Building, ArrowUpRight } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { customerSchema, type CustomerInput } from '@/schemas';

export function CustomerListPage() {
  const { organization } = useAuth();
  const orgId = organization?.id || '11111111-1111-1111-1111-111111111111';
  const { success, error: toastError } = useToast();

  const [loading, setLoading] = useState(true);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const form = useForm<any>({
    resolver: zodResolver(customerSchema),
    defaultValues: {
      first_name: '',
      last_name: '',
      email: '',
      phone: '',
      company: '',
      status: 'PROSPECT',
    },
  });

  const loadCustomers = async () => {
    try {
      setLoading(true);
      const res = await customersService.list(orgId, {
        search: search || undefined,
        status: statusFilter === 'ALL' ? undefined : statusFilter,
      });

      if (res && res.data.length > 0) {
        setCustomers(res.data);
      } else {
        setCustomers([]);
      }
    } catch (err) {
      console.error('Error loading customers:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCustomers();
  }, [orgId, statusFilter]);

  const onCreateCustomer = async (values: any) => {
    try {
      await customersService.create(orgId, values);
      success('Customer Added', `Registered ${values.first_name} ${values.last_name}`);
      setIsDialogOpen(false);
      form.reset();
      loadCustomers();
    } catch (err: unknown) {
      toastError('Failed to add customer', err instanceof Error ? err.message : 'Please check details');
    }
  };

  const filtered = customers.filter(c =>
    `${c.first_name} ${c.last_name} ${c.email || ''} ${c.company || ''}`
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Customer Directory"
        subtitle="Maintain comprehensive contact, account, lifecycle status, and relationship history."
      >
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-2">
              <Plus className="w-4 h-4" /> Add Customer
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Add New Customer</DialogTitle>
              <DialogDescription>Create a client or prospect record</DialogDescription>
            </DialogHeader>
            <form onSubmit={form.handleSubmit(onCreateCustomer)} className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="first_name">First Name</Label>
                  <Input id="first_name" placeholder="Rohan" {...form.register('first_name')} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="last_name">Last Name</Label>
                  <Input id="last_name" placeholder="Sharma" {...form.register('last_name')} />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" placeholder="rohan@example.com" {...form.register('email')} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="phone">Phone</Label>
                  <Input id="phone" placeholder="+91 98765 43210" {...form.register('phone')} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="company">Company</Label>
                  <Input id="company" placeholder="Acme Inc." {...form.register('company')} />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Lifecycle Stage</Label>
                <Select
                  defaultValue="PROSPECT"
                  onValueChange={(val) => form.setValue('status', val as any)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={CustomerStatus.LEAD}>Lead</SelectItem>
                    <SelectItem value={CustomerStatus.PROSPECT}>Prospect</SelectItem>
                    <SelectItem value={CustomerStatus.CUSTOMER}>Paying Customer</SelectItem>
                    <SelectItem value={CustomerStatus.LOST}>Lost</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <DialogFooter className="pt-3">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">Save Customer</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </PageHeader>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-3" />
          <Input
            placeholder="Search by customer name, email, or company..."
            className="pl-9 bg-card"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-44 bg-card">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Stages</SelectItem>
            <SelectItem value={CustomerStatus.CUSTOMER}>Customer</SelectItem>
            <SelectItem value={CustomerStatus.PROSPECT}>Prospect</SelectItem>
            <SelectItem value={CustomerStatus.LEAD}>Lead</SelectItem>
            <SelectItem value={CustomerStatus.LOST}>Lost</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <LoadingSpinner text="Fetching customer records..." />
      ) : filtered.length === 0 ? (
        <EmptyState
          title="No customers found"
          description="Build your client database by capturing inbound inquiries and corporate accounts."
          actionLabel="Add Customer"
          onAction={() => setIsDialogOpen(true)}
        />
      ) : (
        <Card className="border-border/60">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Lifecycle Stage</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((cust) => (
                  <TableRow key={cust.id}>
                    <TableCell>
                      <div className="font-semibold text-sm text-foreground">
                        {cust.first_name} {cust.last_name}
                      </div>
                      {cust.notes && (
                        <div className="text-xs text-muted-foreground line-clamp-1">{cust.notes}</div>
                      )}
                    </TableCell>
                    <TableCell className="text-xs font-medium text-muted-foreground">
                      {cust.company ? (
                        <span className="flex items-center gap-1.5 text-foreground font-medium">
                          <Building className="w-3.5 h-3.5 text-muted-foreground" />
                          {cust.company}
                        </span>
                      ) : '—'}
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1 text-xs text-muted-foreground">
                        {cust.email && <div className="flex items-center gap-1"><Mail className="w-3 h-3" /> {cust.email}</div>}
                        {cust.phone && <div className="flex items-center gap-1"><Phone className="w-3 h-3" /> {cust.phone}</div>}
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {cust.city ? `${cust.city}, ${cust.state || ''}` : 'India'}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          cust.status === CustomerStatus.CUSTOMER ? 'success' :
                          cust.status === CustomerStatus.PROSPECT ? 'default' :
                          cust.status === CustomerStatus.LEAD ? 'outline' : 'destructive'
                        }
                        className="text-[10px]"
                      >
                        {cust.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" asChild>
                        <Link to={`/customers/${cust.id}`} className="text-xs text-primary flex items-center gap-1">
                          View <ArrowUpRight className="w-3 h-3" />
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
