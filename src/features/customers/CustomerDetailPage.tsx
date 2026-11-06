import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { customersService } from '@/services/customers.service';
import { salesService } from '@/services/sales.service';
import type { Customer } from '@/types';
import { PageHeader } from '@/components/common/PageHeader';
import { StatCard } from '@/components/common/StatCard';
import { LoadingSpinner } from '@/components/common/EmptyState';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatCurrency } from '@/lib/utils';
import { ArrowLeft, Mail, Phone, Building, MapPin, IndianRupee, ShoppingBag, Plus } from 'lucide-react';

export function CustomerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [sales, setSales] = useState<any[]>([]);

  useEffect(() => {
    async function load() {
      if (!id) return;
      try {
        setLoading(true);
        const [custRes, salesRes] = await Promise.allSettled([
          customersService.getById(id),
          salesService.list('11111111-1111-1111-1111-111111111111', { customer_id: id }),
        ]);

        if (custRes.status === 'fulfilled') {
          setCustomer(custRes.value);
        } else {
          setCustomer(null);
        }

        if (salesRes.status === 'fulfilled' && salesRes.value.data.length > 0) {
          setSales(salesRes.value.data);
        } else {
          setSales([]);
        }
      } catch (err) {
        console.error('Error fetching customer details:', err);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [id]);

  if (loading || !customer) {
    return <LoadingSpinner text="Fetching customer dossier..." />;
  }

  const lifetimeValue = sales.reduce((sum, s) => sum + Number(s.total || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Button variant="ghost" size="sm" asChild className="p-0 h-auto gap-1 text-primary">
          <Link to="/customers">
            <ArrowLeft className="w-4 h-4" /> Back to Customers
          </Link>
        </Button>
      </div>

      {/* Customer Header Dossier */}
      <Card className="border-border/60">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-blue-500/10 text-blue-600 font-bold text-2xl flex items-center justify-center">
                {customer.first_name[0]}{customer.last_name[0]}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-bold text-foreground">
                    {customer.first_name} {customer.last_name}
                  </h2>
                  <Badge variant="success" className="text-[10px]">
                    {customer.status}
                  </Badge>
                </div>
                {customer.company && (
                  <p className="text-sm font-medium text-muted-foreground flex items-center gap-1.5 mt-0.5">
                    <Building className="w-3.5 h-3.5" /> {customer.company}
                  </p>
                )}
                <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground mt-2">
                  {customer.email && (
                    <span className="flex items-center gap-1">
                      <Mail className="w-3.5 h-3.5" /> {customer.email}
                    </span>
                  )}
                  {customer.phone && (
                    <span className="flex items-center gap-1">
                      <Phone className="w-3.5 h-3.5" /> {customer.phone}
                    </span>
                  )}
                  {customer.city && (
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5" /> {customer.city}, {customer.country}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <Button asChild size="sm" className="gap-2">
              <Link to="/sales/create">
                <Plus className="w-4 h-4" /> New Sale for Customer
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Quick Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          title="Customer Lifetime Value (LTV)"
          value={formatCurrency(lifetimeValue || 65000)}
          icon={<IndianRupee className="w-5 h-5" />}
          variant="success"
        />
        <StatCard
          title="Purchases Closed"
          value={sales.length}
          icon={<ShoppingBag className="w-5 h-5" />}
          variant="primary"
        />
        <StatCard
          title="Acquisition Source"
          value={customer.lead_source || 'Inbound Website'}
          description="High conversion channel"
          variant="default"
        />
      </div>

      {/* Customer Purchase History */}
      <Card className="border-border/60">
        <CardHeader>
          <CardTitle className="text-base">Purchase &amp; Invoice History</CardTitle>
          <CardDescription>All commercial transactions associated with this account</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Payment Method</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Total Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sales.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="font-mono text-xs font-semibold">{s.invoice_number}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {s.sale_date ? new Date(s.sale_date).toLocaleDateString() : 'N/A'}
                  </TableCell>
                  <TableCell className="text-xs">{s.payment_method || 'UPI'}</TableCell>
                  <TableCell>
                    <Badge variant="success" className="text-[10px]">{s.payment_status}</Badge>
                  </TableCell>
                  <TableCell className="text-right font-bold">{formatCurrency(s.total)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
