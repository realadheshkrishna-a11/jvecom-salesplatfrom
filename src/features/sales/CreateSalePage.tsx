import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { salesService } from '@/services/sales.service';
import { customersService } from '@/services/customers.service';
import { productsService } from '@/services/products.service';
import type { Customer, Product } from '@/types';
import { PageHeader } from '@/components/common/PageHeader';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/components/ui/toast';
import { formatCurrency } from '@/lib/utils';
import { Plus, Trash2, ArrowLeft, CheckCircle2, IndianRupee, Sparkles } from 'lucide-react';

interface LineItem {
  id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  discount: number;
}

export function CreateSalePage() {
  const { organization, profile } = useAuth();
  const orgId = organization?.id || '11111111-1111-1111-1111-111111111111';
  const navigate = useNavigate();
  const { success, error: toastError } = useToast();

  const [loading, setLoading] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  const [customerId, setCustomerId] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('UPI');
  const [paymentStatus, setPaymentStatus] = useState<'PAID' | 'PENDING'>('PAID');
  const [orderDiscount, setOrderDiscount] = useState(0);
  const [orderTax, setOrderTax] = useState(0);
  const [notes, setNotes] = useState('');

  const [items, setItems] = useState<LineItem[]>([
    { id: '1', product_id: '', quantity: 1, unit_price: 0, discount: 0 }
  ]);

  useEffect(() => {
    async function load() {
      try {
        const [cRes, pRes] = await Promise.allSettled([
          customersService.list(orgId, { pageSize: 50 }),
          productsService.list(orgId, { pageSize: 50 }),
        ]);

        if (cRes.status === 'fulfilled' && cRes.value.data.length > 0) {
          setCustomers(cRes.value.data);
          setCustomerId(cRes.value.data[0].id);
        } else {
          setCustomers([]);
          setCustomerId('');
        }

        if (pRes.status === 'fulfilled' && pRes.value.data.length > 0) {
          setProducts(pRes.value.data);
          const firstProd = pRes.value.data[0];
          setItems([{ id: '1', product_id: firstProd.id, quantity: 1, unit_price: firstProd.selling_price, discount: 0 }]);
        } else {
          setProducts([]);
          setItems([]);
        }
      } catch (err) {
        console.error('Error in CreateSale load:', err);
      }
    }
    load();
  }, [orgId]);

  const addLineItem = () => {
    const nextProd = products[0];
    setItems(prev => [
      ...prev,
      {
        id: Math.random().toString(36).substring(2, 9),
        product_id: nextProd ? nextProd.id : '',
        quantity: 1,
        unit_price: nextProd ? nextProd.selling_price : 0,
        discount: 0,
      }
    ]);
  };

  const removeLineItem = (id: string) => {
    if (items.length <= 1) return;
    setItems(prev => prev.filter(i => i.id !== id));
  };

  const updateLineItem = (id: string, updates: Partial<LineItem>) => {
    setItems(prev => prev.map(item => {
      if (item.id !== id) return item;
      const updated = { ...item, ...updates };

      if (updates.product_id) {
        const p = products.find(prod => prod.id === updates.product_id);
        if (p) updated.unit_price = p.selling_price;
      }
      return updated;
    }));
  };

  // Calculations
  const subtotal = items.reduce((sum, item) => {
    return sum + (item.quantity * item.unit_price) - item.discount;
  }, 0);

  const total = Math.max(0, subtotal - orderDiscount + orderTax);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerId) {
      toastError('Customer Required', 'Please choose a customer');
      return;
    }
    if (items.length === 0 || !items[0].product_id) {
      toastError('Items Required', 'Please add at least one product');
      return;
    }

    setLoading(true);
    try {
      await salesService.create(
        orgId,
        profile?.id || '44444444-4444-4444-4444-444444444441',
        profile?.team_id || null,
        {
          customer_id: customerId,
          items: items.map(i => ({
            product_id: i.product_id,
            quantity: i.quantity,
            unit_price: i.unit_price,
            discount: i.discount,
          })),
          discount: orderDiscount,
          tax: orderTax,
          payment_method: paymentMethod as any,
          payment_status: paymentStatus as any,
          sale_date: new Date().toISOString(),
          notes,
        }
      );

      success('Sale Recorded Successfully!', `Qualified deal total: ${formatCurrency(total)}`);
      navigate('/sales');
    } catch (err: unknown) {
      toastError('Failed to record sale', err instanceof Error ? err.message : 'Please check sale details');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Button variant="ghost" size="sm" asChild className="p-0 h-auto gap-1 text-primary">
          <Link to="/sales">
            <ArrowLeft className="w-4 h-4" /> Back to Sales
          </Link>
        </Button>
      </div>

      <PageHeader
        title="Record New Sale"
        subtitle="Create an audited invoice with line items, instant qualification, and automated compensation triggers."
      />

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Customer Selection */}
          <Card className="border-border/60 md:col-span-2">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Customer Information</CardTitle>
              <CardDescription>Select the account paying for this program</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label>Select Existing Customer</Label>
                <Select value={customerId} onValueChange={setCustomerId}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Choose customer" />
                  </SelectTrigger>
                  <SelectContent>
                    {customers.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.first_name} {c.last_name} {c.company ? `(${c.company})` : ''} — {c.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="notes">Order Notes / Invoice Reference</Label>
                <Textarea
                  id="notes"
                  placeholder="e.g. Approved by Regional VP with corporate discount"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Payment Terms */}
          <Card className="border-border/60">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Commercial Terms</CardTitle>
              <CardDescription>Method &amp; collection status</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label>Payment Method</Label>
                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                  <SelectTrigger>
                    <SelectValue placeholder="Method" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="UPI">UPI (Google Pay / PhonePe)</SelectItem>
                    <SelectItem value="CARD">Credit / Debit Card</SelectItem>
                    <SelectItem value="BANK_TRANSFER">NEFT / RTGS Bank Wire</SelectItem>
                    <SelectItem value="ONLINE_PAYMENT">Razorpay / Stripe Gateway</SelectItem>
                    <SelectItem value="CASH">Cash Deposit</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>Collection Status</Label>
                <Select value={paymentStatus} onValueChange={(val: any) => setPaymentStatus(val)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PAID">Paid (Triggers Commission &amp; XP)</SelectItem>
                    <SelectItem value="PENDING">Pending (Payment Awaited)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {paymentStatus === 'PAID' && (
                <div className="p-3 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 rounded-xl text-xs flex items-start gap-2">
                  <Sparkles className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>Marking as PAID qualifies the sale immediately for quota attainment, XP gain, and commission generation.</span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Line Items Table */}
        <Card className="border-border/60">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="text-base">Purchased Items &amp; Programs</CardTitle>
              <CardDescription>Add one or multiple course enrollments or corporate seats</CardDescription>
            </div>
            <Button type="button" variant="outline" size="sm" onClick={addLineItem} className="gap-1.5">
              <Plus className="w-4 h-4" /> Add Line Item
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[40%]">Product</TableHead>
                  <TableHead className="w-[15%]">Qty</TableHead>
                  <TableHead className="w-[20%]">Unit Price (₹)</TableHead>
                  <TableHead className="w-[15%]">Discount (₹)</TableHead>
                  <TableHead className="text-right w-[10%]">Line Total</TableHead>
                  <TableHead className="w-[5%]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item, idx) => {
                  const lineTotal = (item.quantity * item.unit_price) - item.discount;
                  return (
                    <TableRow key={item.id}>
                      <TableCell>
                        <Select
                          value={item.product_id}
                          onValueChange={(val) => updateLineItem(item.id, { product_id: val })}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Choose program" />
                          </SelectTrigger>
                          <SelectContent>
                            {products.map((p) => (
                              <SelectItem key={p.id} value={p.id}>
                                {p.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min={1}
                          value={item.quantity}
                          onChange={(e) => updateLineItem(item.id, { quantity: Number(e.target.value) || 1 })}
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          value={item.unit_price}
                          onChange={(e) => updateLineItem(item.id, { unit_price: Number(e.target.value) || 0 })}
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          value={item.discount}
                          onChange={(e) => updateLineItem(item.id, { discount: Number(e.target.value) || 0 })}
                        />
                      </TableCell>
                      <TableCell className="text-right font-bold text-sm">
                        {formatCurrency(Math.max(0, lineTotal))}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                          onClick={() => removeLineItem(item.id)}
                          disabled={items.length <= 1}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>

          {/* Totals Section */}
          <CardFooter className="flex flex-col items-end border-t border-border/50 py-4 px-6 gap-2 bg-muted/20">
            <div className="w-full sm:w-72 space-y-2 text-sm">
              <div className="flex justify-between text-muted-foreground">
                <span>Items Subtotal:</span>
                <span className="font-semibold text-foreground">{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex items-center justify-between text-muted-foreground gap-3">
                <span>Order Discount (₹):</span>
                <Input
                  type="number"
                  className="w-24 h-7 text-right"
                  value={orderDiscount}
                  onChange={(e) => setOrderDiscount(Number(e.target.value) || 0)}
                />
              </div>
              <div className="flex items-center justify-between text-muted-foreground gap-3">
                <span>GST Tax (₹):</span>
                <Input
                  type="number"
                  className="w-24 h-7 text-right"
                  value={orderTax}
                  onChange={(e) => setOrderTax(Number(e.target.value) || 0)}
                />
              </div>
              <div className="flex justify-between text-base font-bold text-foreground pt-2 border-t border-border/80">
                <span>Total Amount:</span>
                <span className="text-primary text-lg">{formatCurrency(total)}</span>
              </div>
            </div>
          </CardFooter>
        </Card>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3">
          <Button type="button" variant="outline" asChild>
            <Link to="/sales">Cancel</Link>
          </Button>
          <Button type="submit" size="lg" disabled={loading} className="gap-2">
            {loading ? 'Processing Sale...' : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                Generate Invoice &amp; Record Sale
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
