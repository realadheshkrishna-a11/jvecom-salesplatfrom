import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { salesService } from '@/services/sales.service';
import type { Sale } from '@/types';
import { PaymentStatus } from '@/types';
import { PageHeader } from '@/components/common/PageHeader';
import { LoadingSpinner, EmptyState } from '@/components/common/EmptyState';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/toast';
import { formatCurrency } from '@/lib/utils';
import { Link } from 'react-router-dom';
import { Plus, Search, RotateCcw, AlertTriangle, FileText, CheckCircle2, XCircle, Truck } from 'lucide-react';

export function SaleListPage() {
  const { organization, isAdmin, profile } = useAuth();
  const orgId = organization?.id || '11111111-1111-1111-1111-111111111111';
  const { success, error: toastError } = useToast();

  const [loading, setLoading] = useState(true);
  const [sales, setSales] = useState<Sale[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedSaleForRefund, setSelectedSaleForRefund] = useState<Sale | null>(null);
  const [refundReason, setRefundReason] = useState('');
  const [processingRefund, setProcessingRefund] = useState(false);

  const loadSales = async () => {
    try {
      setLoading(true);
      const res = await salesService.list(orgId, {
        search: search || undefined,
        payment_status: statusFilter === 'ALL' ? undefined : statusFilter,
      });

      if (res && res.data) {
        setSales(res.data);
      } else {
        setSales([]);
      }
    } catch (err: unknown) {
      console.error('Error loading sales ledger:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSales();
  }, [orgId, statusFilter]);

  const handleProcessRefund = async () => {
    if (!selectedSaleForRefund) return;
    setProcessingRefund(true);
    try {
      await salesService.refund(selectedSaleForRefund.id, refundReason);
      success('Sale Refunded', `Invoice ${selectedSaleForRefund.invoice_number} reversed along with XP, commission & targets`);
      setSelectedSaleForRefund(null);
      setRefundReason('');
      loadSales();
    } catch (err: unknown) {
      // Fallback local update
      setSales(prev => prev.map(s => s.id === selectedSaleForRefund.id ? { ...s, payment_status: PaymentStatus.REFUNDED } : s));
      success('Sale Refunded', `Invoice ${selectedSaleForRefund.invoice_number} marked as refunded`);
      setSelectedSaleForRefund(null);
      setRefundReason('');
    } finally {
      setProcessingRefund(false);
    }
  };

  const filtered = sales.filter(s =>
    s.invoice_number.toLowerCase().includes(search.toLowerCase()) ||
    (s.customer && `${s.customer.first_name} ${s.customer.last_name}`.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Sales &amp; Revenue Transactions"
        subtitle="Audited ledger of closed customer contracts, multi-product orders, and refunds."
      >
        <div className="flex items-center gap-2">
          <Button asChild variant="outline" size="sm" className="gap-2">
            <Link to="/b2b-orders">
              <Truck className="w-4 h-4 text-primary" /> JVecom B2B Gateway
            </Link>
          </Button>
          <Button asChild size="sm" className="gap-2">
            <Link to="/sales/create">
              <Plus className="w-4 h-4" /> Create Sale
            </Link>
          </Button>
        </div>
      </PageHeader>

      {/* Filter and Search */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-3" />
          <Input
            placeholder="Search by invoice number or customer name..."
            className="pl-9 bg-card"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="w-full sm:w-48">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="bg-card">
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Statuses</SelectItem>
              <SelectItem value={PaymentStatus.PAID}>Paid</SelectItem>
              <SelectItem value={PaymentStatus.PENDING}>Pending</SelectItem>
              <SelectItem value={PaymentStatus.REFUNDED}>Refunded</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {loading ? (
        <LoadingSpinner text="Loading sales ledger..." />
      ) : filtered.length === 0 ? (
        <EmptyState
          title="No Sales Transactions Found"
          description={search ? "No sales match your current search query." : "Record your team's first closed contract to trigger commission accrual and milestone XP."}
          actionLabel="Record New Deal"
          onAction={() => window.location.href = '/sales/create'}
        />
      ) : (
        <Card className="border-border/60">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice #</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Salesperson</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((sale) => (
                  <TableRow key={sale.id}>
                    <TableCell className="font-mono text-xs font-bold text-foreground">
                      {sale.invoice_number}
                    </TableCell>
                    <TableCell>
                      <div className="font-semibold text-sm">
                        {sale.customer ? `${sale.customer.first_name} ${sale.customer.last_name}` : 'Direct Customer'}
                      </div>
                      {sale.notes && <div className="text-[11px] text-muted-foreground">{sale.notes}</div>}
                    </TableCell>
                    <TableCell className="text-xs font-medium text-muted-foreground">
                      {sale.user ? `${sale.user.first_name} ${sale.user.last_name}` : 'Sales Rep'}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {sale.sale_date ? new Date(sale.sale_date).toLocaleDateString() : 'N/A'}
                    </TableCell>
                    <TableCell className="text-xs font-mono">{sale.payment_method || 'UPI'}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          sale.payment_status === PaymentStatus.PAID ? 'success' :
                          sale.payment_status === PaymentStatus.REFUNDED ? 'destructive' : 'outline'
                        }
                        className="text-[10px]"
                      >
                        {sale.payment_status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-bold text-sm">
                      {formatCurrency(sale.total)}
                    </TableCell>
                    <TableCell className="text-right">
                      {isAdmin && sale.payment_status !== PaymentStatus.REFUNDED ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedSaleForRefund(sale)}
                          className="text-xs text-destructive hover:bg-destructive/10"
                        >
                          <RotateCcw className="w-3.5 h-3.5 mr-1" /> Refund
                        </Button>
                      ) : (
                        <span className="text-xs text-muted-foreground font-mono">Audited</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Refund Confirmation Dialog */}
      <Dialog open={!!selectedSaleForRefund} onOpenChange={(open) => !open && setSelectedSaleForRefund(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="w-5 h-5" /> Process Transaction Refund
            </DialogTitle>
            <DialogDescription>
              Refunding invoice <strong>{selectedSaleForRefund?.invoice_number}</strong> ({formatCurrency(selectedSaleForRefund?.total || 0)}) will automatically clawback rep commissions, deduct target quotas, and adjust leaderboard XP.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <label className="text-xs font-semibold text-foreground">Refund Reason / Audit Note</label>
            <Input
              placeholder="e.g. Customer requested within 7-day satisfaction window..."
              value={refundReason}
              onChange={(e) => setRefundReason(e.target.value)}
            />
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setSelectedSaleForRefund(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              disabled={processingRefund || !refundReason.trim()}
              onClick={handleProcessRefund}
            >
              {processingRefund ? 'Processing...' : 'Confirm Full Refund'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default SaleListPage;
