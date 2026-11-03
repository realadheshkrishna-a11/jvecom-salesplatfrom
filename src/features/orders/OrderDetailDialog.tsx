import { useState, useEffect, useCallback } from 'react';
import type { JVecomOrder, JVecomOrderItem, JVecomTrackingDetails } from '@/types/jvecomOrders';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { formatCurrency } from '@/lib/utils';
import {
  Truck,
  Package,
  Calendar,
  MapPin,
  User,
  Phone,
  Mail,
  ExternalLink,
  Copy,
  Check,
  AlertTriangle,
  RotateCcw,
  CheckCircle2,
  Clock,
  ArrowRight,
  Code2,
  Receipt,
  Download,
  RotateCw,
} from 'lucide-react';
import { useToast } from '@/components/ui/toast';
import { jvecomOrdersService, normalizeOrder } from '@/services/jvecomOrders.service';
import { useAuth } from '@/lib/auth';

interface OrderDetailDialogProps {
  order: JVecomOrder | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImportSuccess?: () => void;
  onOrderUpdated?: (order: JVecomOrder) => void;
}

export function OrderDetailDialog({
  order: rawOrder,
  open,
  onOpenChange,
  onImportSuccess,
  onOrderUpdated,
}: OrderDetailDialogProps) {
  const { organization, profile } = useAuth();
  const { success, error: toastError } = useToast();
  const [copiedAwb, setCopiedAwb] = useState(false);
  const [copiedJson, setCopiedJson] = useState(false);
  const [importing, setImporting] = useState(false);
  const [refreshingLive, setRefreshingLive] = useState(false);
  const [liveOrder, setLiveOrder] = useState<JVecomOrder | null>(null);
  const [liveTracking, setLiveTracking] = useState<JVecomTrackingDetails | null>(null);
  const [liveItems, setLiveItems] = useState<JVecomOrderItem[]>([]);

  // Fetch real-time canonical order (GET /orders/{id}), tracking (GET /orders/{id}/tracking), and items (GET /orders/{id}/items)
  const fetchRealtimeDetails = useCallback(async () => {
    if (!rawOrder) return;
    const orderKey = rawOrder.order_number || rawOrder.id;
    try {
      setRefreshingLive(true);
      const [orderRes, trackingRes, itemsRes] = await Promise.allSettled([
        jvecomOrdersService.getOrder(orderKey),
        jvecomOrdersService.getOrderTracking(orderKey),
        jvecomOrdersService.getOrderItems(orderKey),
      ]);

      let loadedItems: JVecomOrderItem[] = [];
      let updatedOrder: JVecomOrder | null = null;

      if (orderRes.status === 'fulfilled' && orderRes.value) {
        updatedOrder = orderRes.value;
        setLiveOrder(orderRes.value);
        if (orderRes.value.items && orderRes.value.items.length > 0) {
          loadedItems = orderRes.value.items;
          setLiveItems(orderRes.value.items);
        }
      }
      if (trackingRes.status === 'fulfilled' && trackingRes.value) {
        setLiveTracking(trackingRes.value);
      }
      if (itemsRes.status === 'fulfilled' && itemsRes.value && itemsRes.value.length > 0) {
        loadedItems = itemsRes.value;
        setLiveItems(itemsRes.value);
      }

      if (updatedOrder && onOrderUpdated) {
        if (loadedItems.length > 0) {
          updatedOrder = { ...updatedOrder, items: loadedItems };
        }
        onOrderUpdated(updatedOrder);
      }
    } catch (e) {
      console.warn('Real-time order query note:', e);
    } finally {
      setRefreshingLive(false);
    }
  }, [rawOrder, onOrderUpdated]);

  useEffect(() => {
    if (open && rawOrder) {
      setLiveOrder(null);
      setLiveTracking(rawOrder.tracking || null);
      setLiveItems(rawOrder.items && rawOrder.items.length > 0 ? rawOrder.items : []);
      fetchRealtimeDetails();
    }
  }, [open, rawOrder?.id, fetchRealtimeDetails]);

  const order = liveOrder ? normalizeOrder(liveOrder) : (rawOrder ? normalizeOrder(rawOrder) : null);

  if (!order) return null;

  const currentTracking = liveTracking || order.tracking;
  const currentItems = liveItems.length > 0
    ? liveItems
    : (order.items && order.items.length > 0 ? order.items : (rawOrder?.items || []));

  const copyToClipboard = (text: string, type: 'awb' | 'json') => {
    navigator.clipboard.writeText(text);
    if (type === 'awb') {
      setCopiedAwb(true);
      setTimeout(() => setCopiedAwb(false), 2000);
      success('Copied', 'AWB copied to clipboard');
    } else {
      setCopiedJson(true);
      setTimeout(() => setCopiedJson(false), 2000);
      success('Copied', 'Canonical Order JSON copied');
    }
  };

  const handleImportToCrm = async () => {
    if (!organization?.id || !profile?.id) {
      toastError('Auth Error', 'Organization and user profile required.');
      return;
    }

    try {
      setImporting(true);
      await jvecomOrdersService.importOrderToCrmSale(order, organization.id, profile.id);
      const addressDisplay = order.shipping?.address?.city || 'CRM';
      success('Order Imported', `B2B Order ${order.order_number} successfully converted to CRM Sale & Customer address synced (${addressDisplay})!`);
      if (onImportSuccess) onImportSuccess();
    } catch (err) {
      toastError('Import Failed', err instanceof Error ? err.message : 'Could not import order');
    } finally {
      setImporting(false);
    }
  };

  const getStatusBadge = (status?: string) => {
    switch ((status || '').toLowerCase()) {
      case 'delivered':
        return <Badge className="bg-emerald-500/15 text-emerald-500 border-emerald-500/30">Delivered</Badge>;
      case 'in_transit':
        return <Badge className="bg-blue-500/15 text-blue-500 border-blue-500/30">In Transit</Badge>;
      case 'out_for_delivery':
        return <Badge className="bg-amber-500/15 text-amber-500 border-amber-500/30">Out for Delivery</Badge>;
      case 'rto':
      case 'rto_in_transit':
        return <Badge className="bg-rose-500/15 text-rose-500 border-rose-500/30">RTO / Returned</Badge>;
      case 'confirmed':
        return <Badge className="bg-purple-500/15 text-purple-500 border-purple-500/30">Confirmed</Badge>;
      case 'cancelled':
        return <Badge className="bg-zinc-500/15 text-zinc-400 border-zinc-500/30">Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status || 'Pending'}</Badge>;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <DialogTitle className="text-xl font-bold font-mono tracking-tight text-foreground">
                  {order.order_number || order.id}
                </DialogTitle>
                {getStatusBadge(order.status)}
                <Badge variant="outline" className="text-[11px] font-normal uppercase">
                  {order.source_type || 'B2B'}
                </Badge>
                <Badge className="bg-emerald-500/15 text-emerald-500 border-emerald-500/30 text-[10px]">
                  Real-Time GET
                </Badge>
              </div>
              <DialogDescription className="text-xs text-muted-foreground mt-1">
                Ref: {order.source_reference || order.source_order_id || 'N/A'} • Created{' '}
                {order.created_at ? new Date(order.created_at).toLocaleString() : 'Recent'} • Synced{' '}
                {order.synced_at ? new Date(order.synced_at).toLocaleTimeString() : 'Just now'}
              </DialogDescription>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={fetchRealtimeDetails}
                disabled={refreshingLive}
                className="text-xs gap-1.5 h-8"
                title="Fetch live address, tracking and line items using GET"
              >
                <RotateCw className={`h-3.5 w-3.5 ${refreshingLive ? 'animate-spin text-primary' : ''}`} />
                {refreshingLive ? 'Fetching...' : 'Refresh Live'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => copyToClipboard(JSON.stringify(rawOrder || order, null, 2), 'json')}
                className="text-xs gap-1.5 h-8"
              >
                {copiedJson ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                Copy JSON
              </Button>
              <Button
                size="sm"
                onClick={handleImportToCrm}
                disabled={importing}
                className="text-xs gap-1.5 h-8 bg-primary hover:bg-primary/90 text-primary-foreground"
              >
                <Receipt className="h-3.5 w-3.5" />
                {importing ? 'Importing...' : 'Sync to CRM Sales'}
              </Button>
            </div>
          </div>
        </DialogHeader>

        <Tabs defaultValue="overview" className="mt-2 space-y-4">
          <TabsList className="grid grid-cols-4 w-full sm:w-auto">
            <TabsTrigger value="overview" className="text-xs">Overview</TabsTrigger>
            <TabsTrigger value="tracking" className="text-xs">Delhivery Tracking</TabsTrigger>
            <TabsTrigger value="items" className="text-xs">Line Items ({currentItems.length})</TabsTrigger>
            <TabsTrigger value="raw" className="text-xs">Raw JSON Spec</TabsTrigger>
          </TabsList>

          {/* TAB 1: OVERVIEW */}
          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Customer & Recipient */}
              <Card className="border-border">
                <CardContent className="pt-4 space-y-3 text-xs">
                  <div className="flex items-center gap-2 font-semibold text-foreground text-sm border-b border-border pb-2">
                    <User className="h-4 w-4 text-primary" /> Recipient &amp; Customer
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[11px]">Consignee Name</span>
                    <span className="font-medium text-foreground text-sm">
                      {order.recipient?.name || order.customer?.name || 'B2B Customer'}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-muted-foreground block text-[11px]">Phone</span>
                      <span className="font-mono text-foreground">
                        {order.recipient?.phone || order.customer?.phone || 'N/A'}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-[11px]">Email</span>
                      <span className="font-medium text-foreground truncate block">
                        {order.recipient?.email || order.customer?.email || 'N/A'}
                      </span>
                    </div>
                  </div>

                  {/* Shipping Address Container with Full Real-Time Syncing */}
                  <div className="pt-2 border-t border-border">
                    <div className="flex items-start gap-2">
                      <MapPin className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-0.5">
                          <span className="text-muted-foreground block text-[11px] font-semibold">
                            Shipping Destination Address
                          </span>
                          {refreshingLive && (
                            <span className="text-[10px] text-primary flex items-center gap-1 font-mono">
                              <RotateCw className="h-3 w-3 animate-spin" /> Live Syncing...
                            </span>
                          )}
                        </div>
                        <p className="font-medium text-foreground leading-relaxed">
                          {order.shipping?.address?.address_line1 && order.shipping.address.address_line1 !== 'Address on file'
                            ? order.shipping.address.address_line1
                            : 'Address details on file'}
                          {order.shipping?.address?.address_line2 && (
                            <>
                              <br />
                              {order.shipping.address.address_line2}
                            </>
                          )}
                          <br />
                          {[
                            order.shipping?.address?.city && order.shipping.address.city !== 'India' ? order.shipping.address.city : null,
                            order.shipping?.address?.state,
                            order.shipping?.address?.postal_code ? `PIN: ${order.shipping.address.postal_code}` : null,
                          ]
                            .filter(Boolean)
                            .join(', ') || 'India'}
                          <br />
                          {order.shipping?.address?.country || 'India'}
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Courier & Delhivery Quick Card */}
              <Card className="border-border">
                <CardContent className="pt-4 space-y-3 text-xs">
                  <div className="flex items-center justify-between border-b border-border pb-2">
                    <div className="flex items-center gap-2 font-semibold text-foreground text-sm">
                      <Truck className="h-4 w-4 text-primary" /> {order.shipping?.courier || 'Delhivery'} Live Sync
                    </div>
                    {getStatusBadge(order.shipping?.tracking_status || order.status)}
                  </div>

                  <div className="space-y-1">
                    <span className="text-muted-foreground text-[11px] block">AWB Air Waybill</span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-foreground bg-muted px-2 py-1 rounded text-xs select-all">
                        {order.shipping?.awb || 'Pending'}
                      </span>
                      {order.shipping?.awb && order.shipping.awb !== 'PENDING' && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => copyToClipboard(order.shipping.awb, 'awb')}
                        >
                          {copiedAwb ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
                        </Button>
                      )}
                      {order.shipping?.tracking_url && (
                        <a
                          href={order.shipping.tracking_url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-[11px] text-primary hover:underline ml-auto"
                        >
                          Public Delhivery Portal <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <div>
                      <span className="text-muted-foreground text-[11px] block">Pickup Schedule</span>
                      <span className="font-medium text-foreground">
                        {order.shipping?.pickup?.scheduled ? 'Scheduled' : 'Pending'}
                        {order.shipping?.pickup?.date && ` (${new Date(order.shipping.pickup.date).toLocaleDateString()})`}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground text-[11px] block">
                        {order.shipping?.delivered_at ? 'Delivered At' : 'Estimated Delivery'}
                      </span>
                      <span className="font-medium text-foreground">
                        {order.shipping?.delivered_at
                          ? new Date(order.shipping.delivered_at).toLocaleDateString()
                          : order.shipping?.estimated_delivery
                          ? new Date(order.shipping.estimated_delivery).toLocaleDateString()
                          : 'In Transit'}
                      </span>
                    </div>
                  </div>

                  {order.shipping?.rto?.status && (
                    <div className="p-2.5 rounded-lg border border-rose-500/30 bg-rose-500/5 text-rose-600 dark:text-rose-400">
                      <div className="flex items-center gap-1.5 font-semibold text-xs">
                        <AlertTriangle className="h-3.5 w-3.5" /> RTO Lifecycle Event Active
                      </div>
                      <p className="text-[11px] mt-0.5">
                        Initiated:{' '}
                        {order.shipping.rto.initiated_at
                          ? new Date(order.shipping.rto.initiated_at).toLocaleDateString()
                          : 'N/A'}{' '}
                        • Return expected:{' '}
                        {order.shipping.rto.expected_return_date
                          ? new Date(order.shipping.rto.expected_return_date).toLocaleDateString()
                          : 'In Transit'}
                      </p>
                    </div>
                  )}

                  {currentTracking?.last_event && (
                    <div className="p-2.5 rounded-lg border border-primary/20 bg-primary/5">
                      <span className="text-[10px] text-muted-foreground block uppercase font-bold tracking-wider">
                        Latest Checkpoint Event
                      </span>
                      <p className="font-semibold text-foreground text-xs mt-0.5">
                        {currentTracking.last_event.carrier_status || currentTracking.last_event.status} • {currentTracking.last_event.location}
                      </p>
                      {currentTracking.last_event.remark && (
                        <p className="text-muted-foreground text-[11px] mt-0.5 leading-tight">
                          {currentTracking.last_event.remark}
                        </p>
                      )}
                      <span className="text-[10px] text-muted-foreground block mt-1">
                        {currentTracking.last_event.timestamp ? new Date(currentTracking.last_event.timestamp).toLocaleString() : ''}
                      </span>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* ORDERED PRODUCTS CARD - DISPLAYED DIRECTLY ON VIEW */}
            <Card className="border-border shadow-sm">
              <CardContent className="pt-4 space-y-3 text-xs">
                <div className="flex items-center justify-between border-b border-border pb-2.5">
                  <div className="flex items-center gap-2 font-semibold text-foreground text-sm">
                    <Package className="h-4 w-4 text-primary" /> Ordered Products
                    {currentItems.length > 0 && (
                      <Badge variant="secondary" className="text-[11px] font-normal">
                        {currentItems.reduce((acc, i) => acc + (i.quantity || 1), 0)}{' '}
                        {currentItems.reduce((acc, i) => acc + (i.quantity || 1), 0) === 1 ? 'unit' : 'units'} (
                        {currentItems.length} {currentItems.length === 1 ? 'product' : 'products'})
                      </Badge>
                    )}
                  </div>
                  {refreshingLive && (
                    <span className="text-[10px] text-primary flex items-center gap-1 font-mono">
                      <RotateCw className="h-3 w-3 animate-spin" /> Fetching live product data...
                    </span>
                  )}
                </div>

                {refreshingLive && currentItems.length === 0 ? (
                  <div className="py-6 text-center text-muted-foreground flex flex-col items-center justify-center gap-2">
                    <RotateCw className="h-5 w-5 animate-spin text-primary" />
                    <span>Loading ordered products...</span>
                  </div>
                ) : currentItems.length === 0 ? (
                  <div className="py-6 text-center text-muted-foreground flex flex-col items-center justify-center gap-1">
                    <Package className="h-6 w-6 text-muted-foreground/40" />
                    <span>No specific product items returned in order payload</span>
                  </div>
                ) : (
                  <div className="divide-y divide-border">
                    {currentItems.map((item, idx) => (
                      <div
                        key={item.id || idx}
                        className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-muted/10 px-1 rounded-md transition-colors"
                      >
                        <div className="flex items-start gap-3">
                          <div className="h-10 w-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0 mt-0.5">
                            <Package className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <span className="font-semibold text-foreground text-sm block leading-snug">
                              {item.product_name || item.name || 'Product Item'}
                            </span>
                            <div className="flex flex-wrap items-center gap-2 mt-1">
                              {item.sku && (
                                <Badge variant="outline" className="font-mono text-[10px] px-1.5 py-0 bg-muted/50">
                                  SKU: {item.sku}
                                </Badge>
                              )}
                              {item.product_id && (
                                <span className="font-mono text-[10px] text-muted-foreground">
                                  ID: {item.product_id}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center justify-between sm:justify-end gap-4 text-right pl-13 sm:pl-0">
                          <div>
                            <span className="text-muted-foreground text-[10px] block">Unit Price</span>
                            <span className="font-medium text-foreground text-xs">
                              {formatCurrency(item.unit_price || 0)}
                            </span>
                          </div>
                          <div className="bg-muted px-2.5 py-1 rounded text-center min-w-[50px]">
                            <span className="text-muted-foreground text-[10px] block">Qty</span>
                            <span className="font-bold text-foreground text-xs">
                              × {item.quantity || 1}
                            </span>
                          </div>
                          <div className="min-w-[80px]">
                            <span className="text-muted-foreground text-[10px] block">Line Total</span>
                            <span className="font-bold text-sm text-primary">
                              {formatCurrency(item.line_total || ((item.quantity || 1) * (item.unit_price || 0)))}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Financial Totals & Payment */}
            <Card className="border-border">
              <CardContent className="pt-4 text-xs">
                <div className="flex items-center justify-between border-b border-border pb-2 mb-3">
                  <span className="font-semibold text-foreground text-sm">Financials &amp; Settlements</span>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="uppercase font-mono text-[10px]">
                      {order.amount?.payment_method || 'cod'}
                    </Badge>
                    <Badge
                      className={
                        order.amount?.payment_status === 'paid'
                          ? 'bg-emerald-500/15 text-emerald-500'
                          : 'bg-amber-500/15 text-amber-500'
                      }
                    >
                      {(order.amount?.payment_status || 'pending').toUpperCase()}
                    </Badge>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div>
                    <span className="text-muted-foreground text-[11px] block">Wholesale Amount</span>
                    <span className="font-semibold text-sm text-foreground">
                      {formatCurrency(order.amount?.wholesale_amount || 0)}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground text-[11px] block">Shipping Charge</span>
                    <span className="font-semibold text-sm text-foreground">
                      {formatCurrency(order.amount?.shipping_charge || 0)}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground text-[11px] block">Discount</span>
                    <span className="font-semibold text-sm text-foreground">
                      {formatCurrency(order.amount?.discount || 0)}
                    </span>
                  </div>
                  <div className="bg-primary/5 p-2 rounded-lg border border-primary/20">
                    <span className="text-primary text-[11px] block font-semibold">Total Order Value</span>
                    <span className="font-bold text-base text-primary">
                      {formatCurrency(order.amount?.total || 0)}
                    </span>
                  </div>
                </div>

                {order.internal_notes && (
                  <div className="mt-3 pt-3 border-t border-border">
                    <span className="text-muted-foreground text-[11px] block font-semibold mb-1">Internal Notes</span>
                    <p className="bg-muted p-2 rounded text-xs font-mono whitespace-pre-line text-foreground/80">
                      {order.internal_notes}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB 2: DELHIVERY TRACKING */}
          <TabsContent value="tracking" className="space-y-4">
            <Card className="border-border">
              <CardContent className="pt-4 space-y-4 text-xs">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <Truck className="h-4 w-4 text-primary" />
                      <span className="font-bold text-sm text-foreground">Delhivery Express Carrier Pipeline</span>
                      {refreshingLive && (
                        <span className="text-[10px] text-primary flex items-center gap-1 font-mono">
                          <RotateCw className="h-3 w-3 animate-spin" /> Querying GET /orders/{order.order_number}/tracking...
                        </span>
                      )}
                    </div>
                    <p className="text-muted-foreground text-xs mt-0.5">
                      Carrier Provider: <span className="font-mono text-foreground">{order.shipping?.courier_provider || 'delhivery'}</span> •
                      AWB: <span className="font-mono text-foreground font-bold">{order.shipping?.awb || 'Pending'}</span>
                    </p>
                  </div>

                  {order.shipping?.tracking_url && (
                    <Button variant="outline" size="sm" asChild className="text-xs gap-1.5 h-8">
                      <a href={order.shipping.tracking_url} target="_blank" rel="noreferrer">
                        Delhivery Tracker <ExternalLink className="h-3 w-3" />
                      </a>
                    </Button>
                  )}
                </div>

                {/* Tracking Milestones */}
                <div className="space-y-4 pt-2">
                  <span className="font-semibold text-foreground text-xs block">
                    Chronological Checkpoint Scan Events ({currentTracking?.tracking_history?.length || 0})
                  </span>

                  {(!currentTracking?.tracking_history || currentTracking.tracking_history.length === 0) ? (
                    <p className="text-muted-foreground italic text-xs py-4 text-center">
                      No tracking scan events recorded for this shipment yet.
                    </p>
                  ) : (
                    <div className="relative pl-6 space-y-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-border">
                      {currentTracking.tracking_history.map((event, idx) => {
                        const isLatest = idx === (currentTracking.tracking_history.length - 1);
                        return (
                          <div key={idx} className="relative group">
                            {/* Marker Dot */}
                            <div
                              className={`absolute -left-6 top-1 h-4 w-4 rounded-full border-2 flex items-center justify-center ${
                                isLatest
                                  ? 'bg-primary border-primary text-primary-foreground shadow-sm shadow-primary/50'
                                  : 'bg-background border-muted-foreground/40'
                              }`}
                            >
                              <div className={`h-1.5 w-1.5 rounded-full ${isLatest ? 'bg-white' : 'bg-muted-foreground/60'}`} />
                            </div>

                            {/* Event Content */}
                            <div
                              className={`rounded-lg border p-3 transition-colors ${
                                isLatest
                                  ? 'border-primary/40 bg-primary/5'
                                  : 'border-border bg-card hover:bg-muted/30'
                              }`}
                            >
                              <div className="flex flex-wrap items-center justify-between gap-1 mb-1">
                                <span className="font-bold text-foreground text-xs flex items-center gap-1.5">
                                  {event.carrier_status || event.status}
                                  {isLatest && <Badge className="text-[9px] py-0 px-1 bg-primary">Current</Badge>}
                                </span>
                                <span className="text-[11px] text-muted-foreground font-mono">
                                  {event.timestamp ? new Date(event.timestamp).toLocaleString() : ''}
                                </span>
                              </div>

                              <p className="text-xs text-foreground/80 font-medium flex items-center gap-1.5">
                                <MapPin className="h-3 w-3 text-muted-foreground" />
                                {event.location || 'In Transit'}
                              </p>

                              {event.remark && (
                                <p className="text-muted-foreground text-xs mt-1 leading-relaxed bg-muted/40 p-1.5 rounded">
                                  {event.remark}
                                </p>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB 3: LINE ITEMS */}
          <TabsContent value="items" className="space-y-4">
            <Card className="border-border">
              <CardContent className="pt-4 text-xs">
                <div className="flex items-center justify-between mb-3 pb-2 border-b border-border">
                  <span className="font-semibold text-foreground text-sm">Real-Time SKU Items</span>
                  {refreshingLive && (
                    <span className="text-[10px] text-primary flex items-center gap-1 font-mono">
                      <RotateCw className="h-3 w-3 animate-spin" /> Querying GET /orders/{order.order_number}/items...
                    </span>
                  )}
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-border text-muted-foreground text-[11px] uppercase tracking-wider">
                        <th className="pb-2">SKU &amp; Item Details</th>
                        <th className="pb-2">Product ID</th>
                        <th className="pb-2 text-right">Quantity</th>
                        <th className="pb-2 text-right">Unit Wholesale</th>
                        <th className="pb-2 text-right">Line Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {currentItems.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="py-8 text-center text-muted-foreground">
                            {refreshingLive ? (
                              <div className="flex items-center justify-center gap-2">
                                <RotateCw className="h-4 w-4 animate-spin text-primary" />
                                <span>Loading line items from API...</span>
                              </div>
                            ) : (
                              <span>No line items found for this order.</span>
                            )}
                          </td>
                        </tr>
                      ) : (
                        currentItems.map((item, idx) => (
                          <tr key={item.id || idx} className="hover:bg-muted/20">
                            <td className="py-3">
                              <span className="font-semibold text-foreground text-xs block">
                                {item.product_name || item.name || 'Product'}
                              </span>
                              <span className="font-mono text-[11px] text-muted-foreground">{item.sku || 'N/A'}</span>
                            </td>
                            <td className="py-3 font-mono text-[11px] text-muted-foreground">
                              {item.product_id || 'N/A'}
                            </td>
                            <td className="py-3 text-right font-medium text-foreground">{item.quantity || 1}</td>
                            <td className="py-3 text-right font-medium text-foreground">
                              {formatCurrency(item.unit_price || 0)}
                            </td>
                            <td className="py-3 text-right font-bold text-foreground">
                              {formatCurrency(item.line_total || 0)}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="mt-4 pt-4 border-t border-border flex justify-end">
                  <div className="w-64 space-y-1.5 text-xs">
                    <div className="flex justify-between text-muted-foreground">
                      <span>Subtotal Wholesale:</span>
                      <span className="font-medium text-foreground">{formatCurrency(order.amount?.wholesale_amount || 0)}</span>
                    </div>
                    <div className="flex justify-between text-muted-foreground">
                      <span>Shipping Charge:</span>
                      <span className="font-medium text-foreground">{formatCurrency(order.amount?.shipping_charge || 0)}</span>
                    </div>
                    {(order.amount?.discount || 0) > 0 && (
                      <div className="flex justify-between text-emerald-500">
                        <span>Discount:</span>
                        <span>-{formatCurrency(order.amount.discount)}</span>
                      </div>
                    )}
                    <div className="flex justify-between font-bold text-sm text-foreground pt-1 border-t border-border">
                      <span>Total:</span>
                      <span>{formatCurrency(order.amount?.total || 0)}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB 4: RAW CANONICAL JSON SPEC */}
          <TabsContent value="raw" className="space-y-4">
            <Card className="border-border">
              <CardContent className="pt-4 text-xs">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-muted-foreground font-mono text-xs">
                    Canonical API Payload Specification
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(JSON.stringify(rawOrder || order, null, 2), 'json')}
                    className="text-xs gap-1 h-7"
                  >
                    {copiedJson ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
                    Copy JSON
                  </Button>
                </div>
                <pre className="bg-muted p-3 rounded-lg overflow-x-auto text-[11px] font-mono leading-relaxed text-foreground max-h-96">
                  {JSON.stringify(rawOrder || order, null, 2)}
                </pre>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
