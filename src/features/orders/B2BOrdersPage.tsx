import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/auth';
import { jvecomOrdersService } from '@/services/jvecomOrders.service';
import type { JVecomOrder, JVecomRateLimitState } from '@/types/jvecomOrders';
import { PageHeader } from '@/components/common/PageHeader';
import { LoadingSpinner, EmptyState } from '@/components/common/EmptyState';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/components/ui/toast';
import { formatCurrency } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import {
  Truck,
  Package,
  Search,
  RotateCw,
  ExternalLink,
  Receipt,
  Settings,
  ShieldCheck,
  Zap,
  Filter,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ArrowUpDown,
  FileCode,
  Copy,
  Check,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  Key,
} from 'lucide-react';
import { OrderDetailDialog } from './OrderDetailDialog';

export function B2BOrdersPage() {
  const { organization, profile } = useAuth();
  const orgId = organization?.id || '11111111-1111-1111-1111-111111111111';
  const userId = profile?.id || '22222222-2222-2222-2222-222222222222';
  const { success, error: toastError } = useToast();
  const navigate = useNavigate();

  // State
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [orders, setOrders] = useState<JVecomOrder[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLiveGateway, setIsLiveGateway] = useState(false);
  const [rateLimit, setRateLimit] = useState<JVecomRateLimitState | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Filters & Pagination
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [courierFilter, setCourierFilter] = useState('all');
  const [sortBy, setSortBy] = useState<'created_at' | 'updated_at' | 'total'>('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);

  // Modals
  const [selectedOrder, setSelectedOrder] = useState<JVecomOrder | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [apiDocModalOpen, setApiDocModalOpen] = useState(false);
  const [copiedCurl, setCopiedCurl] = useState(false);

  // Configuration info
  const config = jvecomOrdersService.getConfig();

  // Load real-time orders using GET /orders
  const loadOrders = useCallback(async () => {
    try {
      setLoading(true);
      setFetchError(null);
      const res = await jvecomOrdersService.listOrders({
        page,
        limit,
        status: statusFilter === 'all' ? undefined : statusFilter,
        search: search || undefined,
        courier: courierFilter === 'all' ? undefined : courierFilter,
        sort_by: sortBy,
        sort_order: sortOrder,
      });

      if (res.error) {
        setFetchError(res.error);
      }
      setOrders(res.orders);
      setTotalCount(res.total);
      setIsLiveGateway(res.fromLiveGateway);
      setRateLimit(res.rateLimit);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to retrieve orders from JVecom gateway';
      setFetchError(msg);
      toastError('Fetch Error', msg);
    } finally {
      setLoading(false);
    }
  }, [page, limit, statusFilter, search, courierFilter, sortBy, sortOrder, toastError]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  // Auto-sync polling if enabled in settings
  useEffect(() => {
    if (!config.autoSync || !config.apiKey) return;
    const intervalMinutes = Math.max(1, config.autoSyncIntervalMinutes || 10);
    const intervalId = setInterval(() => {
      jvecomOrdersService
        .syncOrdersIncrementally()
        .then((res) => {
          if (res.syncedCount > 0) {
            loadOrders();
          }
        })
        .catch((err) => {
          console.warn('[JVecom Auto-Sync] Background polling note:', err);
        });
    }, intervalMinutes * 60 * 1000);

    return () => clearInterval(intervalId);
  }, [config.autoSync, config.apiKey, config.autoSyncIntervalMinutes, loadOrders]);

  // Handle manual incremental sync using GET /orders?updated_since=...
  const handleIncrementalSync = async () => {
    if (!config.apiKey) {
      toastError('API Key Required', 'Please configure your API key in Settings first.');
      navigate('/settings');
      return;
    }

    try {
      setSyncing(true);
      const result = await jvecomOrdersService.syncOrdersIncrementally();
      success(
        'Synchronization Complete',
        `Synced ${result.syncedCount} real-time orders using updated_since parameter from Live Edge Gateway.`
      );
      loadOrders();
    } catch (err) {
      toastError('Sync Failed', err instanceof Error ? err.message : 'Incremental sync failed');
    } finally {
      setSyncing(false);
    }
  };

  // Import single order to CRM Sale
  const handleImportToCrm = async (order: JVecomOrder) => {
    try {
      await jvecomOrdersService.importOrderToCrmSale(order, orgId, userId);
      success(
        'Imported to CRM',
        `B2B Order ${order.order_number} converted to CRM Sale with customer profile.`
      );
    } catch (err) {
      toastError('Import Error', 'Could not convert order to CRM sale.');
    }
  };

  // Quick Stats
  const inTransitCount = orders.filter((o) => o?.status === 'in_transit').length;
  const deliveredCount = orders.filter((o) => o?.status === 'delivered').length;
  const rtoCount = orders.filter((o) => o?.status === 'rto').length;
  const totalWholesaleValue = orders.reduce((sum, o) => sum + (o?.amount?.total || 0), 0);

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
        return <Badge className="bg-rose-500/15 text-rose-500 border-rose-500/30">RTO</Badge>;
      case 'confirmed':
        return <Badge className="bg-purple-500/15 text-purple-500 border-purple-500/30">Confirmed</Badge>;
      case 'cancelled':
        return <Badge className="bg-zinc-500/15 text-zinc-400 border-zinc-500/30">Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status || 'Pending'}</Badge>;
    }
  };

  const copySampleCurl = () => {
    const curlCmd = `curl -X GET "${config.gatewayUrl}/orders?limit=25" \\\n  -H "Authorization: Bearer ${
      config.apiKey || 'jvec_live_your_api_key_here'
    }" \\\n  -H "Accept: application/json"`;
    navigator.clipboard.writeText(curlCmd);
    setCopiedCurl(true);
    setTimeout(() => setCopiedCurl(false), 2000);
    success('Copied', 'cURL sample copied to clipboard');
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <Truck className="h-6 w-6 text-primary" /> JVecom B2B Orders
            </h1>
            {isLiveGateway ? (
              <Badge className="bg-emerald-500/15 text-emerald-500 border-emerald-500/30 text-[10px]">
                ● Live Edge Gateway (Real-Time)
              </Badge>
            ) : config.apiKey ? (
              <Badge className="bg-blue-500/15 text-blue-500 border-blue-500/30 text-[10px]">
                ● Live Gateway Ready
              </Badge>
            ) : (
              <Badge className="bg-amber-500/15 text-amber-500 border-amber-500/30 text-[10px]">
                API Key Required
              </Badge>
            )}
            {rateLimit && (
              <Badge variant="outline" className="text-[10px] font-mono text-muted-foreground">
                Rate Limit: {rateLimit.remaining}/{rateLimit.limit} req/min
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Real-time B2B orders sync, recipient addresses, line item SKUs, and Delhivery courier tracking checkpoints.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setApiDocModalOpen(true)}
            className="text-xs gap-1.5 h-8"
          >
            <FileCode className="h-3.5 w-3.5 text-primary" /> API Specification
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/settings')}
            className="text-xs gap-1.5 h-8"
          >
            <Settings className="h-3.5 w-3.5" /> API Settings
          </Button>

          <Button
            size="sm"
            onClick={handleIncrementalSync}
            disabled={syncing}
            className="text-xs gap-1.5 h-8 bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm"
          >
            <RotateCw className={`h-3.5 w-3.5 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? 'Querying Live Gateway...' : 'Sync Orders'}
          </Button>
        </div>
      </div>

      {/* Gateway Error Banner */}
      {fetchError && (
        <div className="p-4 rounded-xl border border-destructive/30 bg-destructive/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5 text-destructive">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <div>
              <span className="font-semibold block">Gateway Error</span>
              <span className="text-muted-foreground">{fetchError}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={loadOrders} className="h-7 text-xs gap-1">
              <RotateCw className="h-3 w-3" /> Retry GET
            </Button>
            <Button size="sm" onClick={() => navigate('/settings')} className="h-7 text-xs">
              Open Settings
            </Button>
          </div>
        </div>
      )}

      {/* API Key Missing Notice */}
      {!config.apiKey && !fetchError && (
        <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-500/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5 text-amber-600 dark:text-amber-400">
            <Key className="h-4 w-4 shrink-0" />
            <div>
              <span className="font-semibold block">API Key Not Configured</span>
              <span className="text-muted-foreground">
                To retrieve real-time B2B orders, configure your secret API key (starts with <code className="font-mono text-foreground font-semibold">jvec_live_...</code>) in Settings.
              </span>
            </div>
          </div>
          <Button
            size="sm"
            onClick={() => navigate('/settings')}
            className="h-7 text-xs bg-amber-600 hover:bg-amber-700 text-white shrink-0"
          >
            Configure API Key
          </Button>
        </div>
      )}

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card className="border-border">
          <CardContent className="p-3 text-xs">
            <span className="text-muted-foreground block text-[11px] font-medium">Total B2B Orders</span>
            <span className="text-xl font-bold text-foreground mt-0.5 block">{totalCount}</span>
            <span className="text-[10px] text-muted-foreground mt-0.5 block">Live queried orders</span>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardContent className="p-3 text-xs">
            <span className="text-muted-foreground block text-[11px] font-medium">In Transit (Delhivery)</span>
            <span className="text-xl font-bold text-blue-500 mt-0.5 block">{inTransitCount}</span>
            <span className="text-[10px] text-muted-foreground mt-0.5 block">Active linehaul scans</span>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardContent className="p-3 text-xs">
            <span className="text-muted-foreground block text-[11px] font-medium">Delivered</span>
            <span className="text-xl font-bold text-emerald-500 mt-0.5 block">{deliveredCount}</span>
            <span className="text-[10px] text-muted-foreground mt-0.5 block">Consignee fulfilled</span>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardContent className="p-3 text-xs">
            <span className="text-muted-foreground block text-[11px] font-medium">RTO Returns</span>
            <span className="text-xl font-bold text-rose-500 mt-0.5 block">{rtoCount}</span>
            <span className="text-[10px] text-muted-foreground mt-0.5 block">Return lifecycle events</span>
          </CardContent>
        </Card>

        <Card className="border-border col-span-2 md:col-span-1">
          <CardContent className="p-3 text-xs">
            <span className="text-muted-foreground block text-[11px] font-medium">Wholesale Gross Value</span>
            <span className="text-xl font-bold text-foreground mt-0.5 block">
              {formatCurrency(totalWholesaleValue)}
            </span>
            <span className="text-[10px] text-muted-foreground mt-0.5 block">Across current query</span>
          </CardContent>
        </Card>
      </div>

      {/* Filter and Search Controls */}
      <Card className="border-border">
        <CardContent className="p-3 space-y-3">
          <div className="flex flex-col md:flex-row gap-2.5 items-center justify-between">
            {/* Search Input */}
            <div className="relative w-full md:w-96">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search Order Number, AWB, Customer name, Phone..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="pl-8 text-xs h-9"
              />
            </div>

            {/* Filter Dropdowns */}
            <div className="flex items-center gap-2 w-full md:w-auto flex-wrap">
              <div className="w-36">
                <Select
                  value={statusFilter}
                  onValueChange={(val) => {
                    setStatusFilter(val);
                    setPage(1);
                  }}
                >
                  <SelectTrigger className="text-xs h-9">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="confirmed">Confirmed</SelectItem>
                    <SelectItem value="in_transit">In Transit</SelectItem>
                    <SelectItem value="delivered">Delivered</SelectItem>
                    <SelectItem value="rto">RTO</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="w-36">
                <Select
                  value={courierFilter}
                  onValueChange={(val) => {
                    setCourierFilter(val);
                    setPage(1);
                  }}
                >
                  <SelectTrigger className="text-xs h-9">
                    <SelectValue placeholder="Carrier" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Carriers</SelectItem>
                    <SelectItem value="Delhivery">Delhivery</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="w-40">
                <Select
                  value={sortBy}
                  onValueChange={(val: any) => {
                    setSortBy(val);
                    setPage(1);
                  }}
                >
                  <SelectTrigger className="text-xs h-9">
                    <SelectValue placeholder="Sort By" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="created_at">Sort: Created Date</SelectItem>
                    <SelectItem value="updated_at">Sort: Updated Date</SelectItem>
                    <SelectItem value="total">Sort: Total Amount</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button
                variant="outline"
                size="icon"
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                title={`Sort ${sortOrder === 'asc' ? 'Ascending' : 'Descending'}`}
                className="h-9 w-9 shrink-0"
              >
                <ArrowUpDown className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Orders Table */}
      <Card className="border-border">
        <CardContent className="p-0">
          {loading ? (
            <LoadingSpinner text="Executing GET /orders from JVecom Gateway..." />
          ) : orders.length === 0 ? (
            <div className="py-6">
              <EmptyState
                icon={<Package className="h-10 w-10 text-muted-foreground" />}
                title="No Real-Time Orders Found"
                description={
                  !config.apiKey
                    ? 'Enter your JVecom B2B API Key in Settings to query real-time orders.'
                    : search || statusFilter !== 'all'
                    ? 'No orders matched your active search and filter criteria. Try resetting filters.'
                    : 'No orders returned from the live gateway yet. Click Sync Orders to poll real-time orders using GET.'
                }
                actionLabel={
                  !config.apiKey
                    ? 'Go to Settings'
                    : search || statusFilter !== 'all'
                    ? 'Clear Filters'
                    : 'Sync Orders Now'
                }
                onAction={
                  !config.apiKey
                    ? () => navigate('/settings')
                    : search || statusFilter !== 'all'
                    ? () => {
                        setSearch('');
                        setStatusFilter('all');
                        setCourierFilter('all');
                      }
                    : handleIncrementalSync
                }
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-border bg-muted/40 text-muted-foreground uppercase text-[10px] tracking-wider font-semibold">
                    <th className="py-3 px-4">Order Details</th>
                    <th className="py-3 px-4">Customer &amp; Destination</th>
                    <th className="py-3 px-4">Delhivery Live Tracking</th>
                    <th className="py-3 px-4">Line Items</th>
                    <th className="py-3 px-4 text-right">Amount</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {orders.map((order) => (
                    <tr
                      key={order.id}
                      className="hover:bg-muted/30 transition-colors cursor-pointer group"
                      onClick={() => {
                        setSelectedOrder(order);
                        setDetailModalOpen(true);
                      }}
                    >
                      {/* Order Number & Timing */}
                      <td className="py-3.5 px-4">
                        <span className="font-mono font-bold text-foreground block text-xs group-hover:text-primary transition-colors">
                          {order.order_number}
                        </span>
                        <span className="text-[11px] text-muted-foreground block">
                          {new Date(order.created_at).toLocaleDateString()} •{' '}
                          {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        {order.source_reference && (
                          <span className="text-[10px] font-mono text-muted-foreground block">
                            Ref: {order.source_reference}
                          </span>
                        )}
                      </td>

                      {/* Customer & Destination */}
                      <td className="py-3.5 px-4">
                        <span className="font-semibold text-foreground block text-xs">
                          {order.customer?.name || order.recipient?.name || 'B2B Customer'}
                        </span>
                        <span className="text-[11px] text-muted-foreground block">
                          {order.shipping?.address?.city || 'India'}
                          {order.shipping?.address?.state ? `, ${order.shipping.address.state}` : ''}
                        </span>
                        <span className="text-[10px] text-muted-foreground font-mono block">
                          {order.customer?.phone || order.recipient?.phone || ''}
                        </span>
                      </td>

                      {/* Delhivery Carrier Tracking */}
                      <td className="py-3.5 px-4" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-xs font-semibold text-foreground">
                            {order.shipping?.awb || 'Pending'}
                          </span>
                          {order.shipping?.tracking_url && (
                            <a
                              href={order.shipping.tracking_url}
                              target="_blank"
                              rel="noreferrer"
                              title="Open Delhivery Public Tracking"
                              className="text-primary hover:text-primary/80"
                            >
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          )}
                        </div>
                        {order.tracking?.last_event && (
                          <span className="text-[11px] text-muted-foreground block truncate max-w-xs mt-0.5">
                            {order.tracking.last_event.carrier_status || order.tracking.last_event.status} • {order.tracking.last_event.location}
                          </span>
                        )}
                      </td>

                      {/* Line Items */}
                      <td className="py-3.5 px-4">
                        <span className="font-medium text-foreground block text-xs truncate max-w-[200px]">
                          {order.items?.[0]?.product_name || order.items?.[0]?.name || 'Products'}
                        </span>
                        <span className="text-[11px] text-muted-foreground block">
                          {order.items?.length || 0} {(order.items?.length || 0) === 1 ? 'item' : 'items'}
                          {order.items?.[0]?.sku ? ` • SKU: ${order.items[0].sku}` : ''}
                        </span>
                      </td>

                      {/* Amount & Payment */}
                      <td className="py-3.5 px-4 text-right">
                        <span className="font-bold text-foreground text-xs block">
                          {formatCurrency(order.amount?.total || 0)}
                        </span>
                        <div className="flex items-center justify-end gap-1 mt-0.5">
                          <span className="text-[10px] uppercase font-mono text-muted-foreground">
                            {order.amount?.payment_method || 'cod'}
                          </span>
                          <span
                            className={`text-[9px] px-1 py-0.2 rounded font-semibold uppercase ${
                              order.amount?.payment_status === 'paid'
                                ? 'bg-emerald-500/10 text-emerald-500'
                                : 'bg-amber-500/10 text-amber-500'
                            }`}
                          >
                            {order.amount?.payment_status || 'pending'}
                          </span>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 text-center">
                        {getStatusBadge(order.status)}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedOrder(order);
                              setDetailModalOpen(true);
                            }}
                            className="text-xs h-7 px-2"
                          >
                            View
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleImportToCrm(order)}
                            title="Convert into CRM Sale Record"
                            className="text-xs h-7 px-2 gap-1 text-primary hover:text-primary"
                          >
                            <Receipt className="h-3 w-3" />
                            Sync CRM
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination Footer */}
          {!loading && orders.length > 0 && (
            <div className="p-3 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
              <span className="text-muted-foreground">
                Showing {Math.min((page - 1) * limit + 1, totalCount)} to{' '}
                {Math.min(page * limit, totalCount)} of {totalCount} orders
              </span>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="h-7 text-xs gap-1"
                >
                  <ChevronLeft className="h-3.5 w-3.5" /> Prev
                </Button>
                <span className="font-medium text-foreground px-1">
                  Page {page} of {Math.max(1, Math.ceil(totalCount / limit))}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => p + 1)}
                  disabled={page * limit >= totalCount}
                  className="h-7 text-xs gap-1"
                >
                  Next <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Order Detail Dialog */}
      <OrderDetailDialog
        order={selectedOrder}
        open={detailModalOpen}
        onOpenChange={setDetailModalOpen}
        onImportSuccess={loadOrders}
      />

      {/* API Specification & Integration Quick Reference Dialog */}
      <Dialog open={apiDocModalOpen} onOpenChange={setApiDocModalOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <FileCode className="h-4 w-4 text-primary" /> JVecom B2B Orders API Specification &amp; Reference
            </DialogTitle>
            <DialogDescription className="text-xs">
              Official REST v1.0 specifications for querying live orders, line item SKUs, and Delhivery carrier checkpoints.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 text-xs mt-2">
            {/* Quick 3-step Connection summary */}
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 space-y-2">
              <span className="font-semibold text-foreground text-xs block">3 Steps to Connect</span>
              <ol className="list-decimal pl-4 space-y-1 text-muted-foreground">
                <li>
                  <strong className="text-foreground">Obtain API Key:</strong> Generate key starting with{' '}
                  <code className="bg-muted px-1 rounded text-foreground font-mono">jvec_live_...</code> from JVecom B2B Admin under Developer API.
                </li>
                <li>
                  <strong className="text-foreground">Authenticate:</strong> Include header{' '}
                  <code className="bg-muted px-1 rounded text-foreground font-mono">Authorization: Bearer jvec_live_...</code> on every request.
                </li>
                <li>
                  <strong className="text-foreground">Incremental Polling:</strong> Pass{' '}
                  <code className="bg-muted px-1 rounded text-foreground font-mono">?updated_since=...</code> to fetch only newly modified orders.
                </li>
              </ol>
            </div>

            {/* Endpoints Table */}
            <div className="rounded-lg border border-border overflow-hidden">
              <table className="w-full text-left">
                <thead className="bg-muted/50 border-b border-border text-[11px] uppercase text-muted-foreground font-semibold">
                  <tr>
                    <th className="p-2.5">Method &amp; Path</th>
                    <th className="p-2.5">Scope &amp; Description</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  <tr>
                    <td className="p-2.5 font-mono text-primary font-semibold">GET /orders</td>
                    <td className="p-2.5 text-muted-foreground">
                      List &amp; Filter orders with pagination, search, status, courier, and incremental{' '}
                      <code className="text-foreground">updated_since</code>.
                    </td>
                  </tr>
                  <tr>
                    <td className="p-2.5 font-mono text-primary font-semibold">GET /orders/:id</td>
                    <td className="p-2.5 text-muted-foreground">
                      Retrieves full canonical order details by JVE Order ID (e.g. JVE001780002) or UUID.
                    </td>
                  </tr>
                  <tr>
                    <td className="p-2.5 font-mono text-primary font-semibold">GET /orders/:id/items</td>
                    <td className="p-2.5 text-muted-foreground">
                      Retrieves line items array with SKU, title, variant, quantity, unit price, and line totals.
                    </td>
                  </tr>
                  <tr>
                    <td className="p-2.5 font-mono text-primary font-semibold">GET /orders/:id/tracking</td>
                    <td className="p-2.5 text-muted-foreground">
                      Live Delhivery tracking details, AWB, public tracking URL, and chronological scan checkpoints.
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* cURL Example */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-foreground text-xs">cURL Test Snippet</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={copySampleCurl}
                  className="h-6 text-[11px] gap-1 px-2"
                >
                  {copiedCurl ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
                  Copy cURL
                </Button>
              </div>
              <pre className="bg-muted p-2.5 rounded-lg text-[11px] font-mono overflow-x-auto text-foreground">
{`curl -X GET "${config.gatewayUrl}/orders?limit=25" \\
  -H "Authorization: Bearer ${config.apiKey || 'jvec_live_your_api_key_here'}" \\
  -H "Accept: application/json"`}
              </pre>
            </div>

            <div className="pt-2 border-t border-border flex justify-end">
              <Button
                size="sm"
                onClick={() => {
                  setApiDocModalOpen(false);
                  navigate('/settings');
                }}
                className="text-xs gap-1.5"
              >
                <Settings className="h-3.5 w-3.5" /> Configure API in Settings
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default B2BOrdersPage;
