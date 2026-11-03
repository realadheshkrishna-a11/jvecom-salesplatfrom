// =============================================================================
// JVecom B2B Orders API Client & Synchronization Service
// Specification: v1.0 REST Read-Only Orders Gateway
// Carriers: Delhivery Live Tracking & RTO Events
// Real-Time HTTP GET implementation (Exhaustive Address Normalization)
// =============================================================================

import type {
  JVecomOrder,
  JVecomOrderItem,
  JVecomTrackingDetails,
  JVecomApiConfig,
  JVecomRateLimitState,
  JVecomListQueryParams,
  JVecomShippingAddress,
} from '@/types/jvecomOrders';
import { localDb, isLocalStorageMode, generateUUID } from '@/lib/localDb';
import { supabase } from '@/lib/supabase';
import type { Sale, Customer, SaleItem } from '@/types';
import { PaymentStatus, PaymentMethod, CustomerStatus } from '@/types';

export const DIRECT_EDGE_GATEWAY_URL = 'https://wokqhsfrncvswtnukdou.supabase.co/functions/v1/orders-api/v1';
export const PRODUCTION_PUBLIC_GATEWAY_URL = 'https://www.jvecomb2b.com/api/v1';
export const PROXY_GATEWAY_URL = '/api/jvecom';

const STORAGE_KEYS = {
  API_KEY: 'salesos_jvecom_api_key',
  GATEWAY_URL: 'salesos_jvecom_gateway_url',
  USE_LIVE: 'salesos_jvecom_use_live',
  AUTO_SYNC: 'salesos_jvecom_auto_sync',
  AUTO_SYNC_INTERVAL: 'salesos_jvecom_sync_interval',
  LAST_SYNCED_AT: 'salesos_jvecom_last_synced_at',
  ORDERS_CACHE: 'salesos_jvecom_orders_cache',
  RATE_LIMIT: 'salesos_jvecom_rate_limit',
};

// Purely real-time: Empty array export preserved for type compatibility.

// =============================================================================
// Exhaustive Address Extractor
// Checks nested objects, flat table columns, stringified JSON, and plain text
// =============================================================================
export function extractAddress(input: any): JVecomShippingAddress {
  const raw = Array.isArray(input) ? (input.length > 0 ? input[0] : {}) : (input || {});
  if (!raw || typeof raw !== 'object') {
    return {
      address_line1: 'Address on file',
      address_line2: '',
      city: 'India',
      state: '',
      postal_code: '',
      country: 'India',
      redacted: false,
    };
  }

  // 1. Look for candidate address containers in all known ecommerce/logistics structures
  const rawCandidates: any[] = [
    raw.shipping?.address,
    raw.shipping_address,
    raw.delivery_address,
    raw.destination_address,
    raw.recipient?.address,
    raw.recipient_address,
    raw.customer?.address,
    raw.customer_address,
    raw.buyer_address,
    raw.billing_address,
    raw.address,
    raw.shipping,
    raw.recipient,
    raw.customer,
    raw.delivery_details,
    raw.delivery,
    raw.destination,
  ];

  let foundObj: Record<string, any> = {};
  let foundString = '';

  // Merge found object candidates in reverse priority so earlier candidates overwrite later candidates
  for (let i = rawCandidates.length - 1; i >= 0; i--) {
    const item = rawCandidates[i];
    if (!item) continue;
    if (typeof item === 'string') {
      const trimmed = item.trim();
      if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
        try {
          const parsed = JSON.parse(trimmed);
          if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
            foundObj = { ...foundObj, ...parsed };
            continue;
          }
        } catch {
          // not JSON
        }
      }
      if (!foundString && trimmed.length > 2 && trimmed !== 'undefined' && trimmed !== 'null') {
        foundString = trimmed;
      }
    } else if (typeof item === 'object' && !Array.isArray(item)) {
      foundObj = { ...foundObj, ...item };
    }
  }

  // Extract postal code (PIN code)
  let postal_code = String(
    foundObj.postal_code ||
      foundObj.pincode ||
      foundObj.pin_code ||
      foundObj.pin ||
      foundObj.zip ||
      foundObj.zipcode ||
      foundObj.zip_code ||
      raw.shipping_postal_code ||
      raw.shipping_pincode ||
      raw.postal_code ||
      raw.pincode ||
      raw.pin_code ||
      raw.zip ||
      raw.zipcode ||
      ''
  ).trim();

  if (!postal_code && foundString) {
    const pinMatch = foundString.match(/\b([1-9][0-9]{5})\b/);
    if (pinMatch) postal_code = pinMatch[1];
  }

  // Extract city
  let city = String(
    foundObj.city ||
      foundObj.shipping_city ||
      foundObj.destination_city ||
      foundObj.delivery_city ||
      foundObj.district ||
      foundObj.city_name ||
      raw.shipping_city ||
      raw.destination_city ||
      raw.delivery_city ||
      raw.city ||
      ''
  ).trim();

  // Extract state
  let state = String(
    foundObj.state ||
      foundObj.shipping_state ||
      foundObj.destination_state ||
      foundObj.delivery_state ||
      foundObj.province ||
      foundObj.region ||
      foundObj.state_name ||
      raw.shipping_state ||
      raw.destination_state ||
      raw.delivery_state ||
      raw.state ||
      raw.province ||
      ''
  ).trim();

  // Extract address lines
  let address_line1 = String(
    foundObj.address_line1 ||
      foundObj.line1 ||
      foundObj.address_1 ||
      foundObj.address1 ||
      foundObj.street ||
      foundObj.street_address ||
      raw.shipping_address_line1 ||
      raw.shipping_address1 ||
      raw.address_line1 ||
      raw.address1 ||
      raw.street ||
      raw.street_address ||
      (typeof raw.address === 'string' ? raw.address : '') ||
      (typeof raw.shipping_address === 'string' ? raw.shipping_address : '') ||
      ''
  ).trim();

  let address_line2 = String(
    foundObj.address_line2 ||
      foundObj.line2 ||
      foundObj.address_2 ||
      foundObj.address2 ||
      foundObj.landmark ||
      foundObj.area ||
      raw.shipping_address_line2 ||
      raw.shipping_address2 ||
      raw.address_line2 ||
      raw.address2 ||
      raw.landmark ||
      raw.area ||
      ''
  ).trim();

  // If city/state/line1 are still empty but we have a text string:
  if ((!city || !address_line1) && foundString) {
    address_line1 = address_line1 || foundString;
    const parts = foundString.split(',').map((p) => p.trim()).filter(Boolean);
    if (parts.length >= 2) {
      if (!state) {
        state = parts[parts.length - 1].replace(postal_code, '').replace(/[-–]/g, '').trim();
      }
      if (!city && parts.length >= 3) {
        city = parts[parts.length - 2].trim();
      } else if (!city) {
        city = parts[0].trim();
      }
    }
  }

  const country = String(foundObj.country || raw.shipping_country || raw.country || 'India').trim();
  const redacted = Boolean(foundObj.redacted || raw.redacted);

  return {
    address_line1: address_line1 || 'Address on file',
    address_line2,
    city: city || (state ? state : 'India'),
    state,
    postal_code,
    country,
    redacted,
  };
}

// =============================================================================
// Defensive Normalizer: Guarantees safe property access on live API payloads
// =============================================================================
export function normalizeOrder(raw: any): JVecomOrder {
  if (!raw || typeof raw !== 'object') {
    return {
      id: 'UNKNOWN',
      uuid: '',
      order_number: 'UNKNOWN',
      source_type: 'b2b_portal',
      source_order_id: '',
      source_reference: null,
      status: 'pending',
      fulfillment_status: 'pending',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      synced_at: new Date().toISOString(),
      customer: { name: 'B2B Customer', phone: '', email: '' },
      recipient: { name: 'B2B Customer', phone: '', email: '' },
      shipping: {
        courier: 'Delhivery',
        courier_provider: 'delhivery',
        awb: 'PENDING',
        tracking_number: 'PENDING',
        tracking_url: null,
        tracking_status: 'pending',
        pickup: { scheduled: false, date: null },
        estimated_delivery: null,
        delivered_at: null,
        rto: { status: null, initiated_at: null, delivered_at: null, expected_return_date: null },
        address: { address_line1: '', address_line2: '', city: 'India', state: '', postal_code: '', country: 'India', redacted: false },
      },
      amount: {
        currency: 'INR',
        total: 0,
        wholesale_amount: 0,
        shipping_charge: 0,
        discount: 0,
        payment_method: 'cod',
        payment_status: 'pending',
      },
      items: [],
      tracking: {
        order_id: 'UNKNOWN',
        courier: 'Delhivery',
        courier_provider: 'delhivery',
        awb: 'PENDING',
        tracking_status: 'pending',
        estimated_delivery: null,
        delivered_at: null,
        rto: { status: null, initiated_at: null, delivered_at: null, expected_return_date: null },
        last_event: null,
        tracking_history: [],
        tracking_history_source: 'delhivery_api',
        synced_at: new Date().toISOString(),
      },
      internal_notes: null,
    };
  }

  const id = String(raw.id || raw.uuid || raw.order_number || raw._id || 'ORD-' + Math.random().toString(36).substring(7));
  const orderNumber = String(raw.order_number || raw.id || id);

  // Safe Customer & Recipient
  const custSource = raw.customer || raw.recipient || {};
  const customerName = custSource.name || raw.customer_name || raw.recipient_name || raw.buyer_name || 'B2B Customer';
  const customerPhone = custSource.phone || raw.customer_phone || raw.phone || '';
  const customerEmail = custSource.email || raw.customer_email || raw.email || '';

  const customer = {
    name: customerName,
    phone: customerPhone,
    email: customerEmail,
  };

  const recipient = raw.recipient
    ? {
        name: raw.recipient.name || customerName,
        phone: raw.recipient.phone || customerPhone,
        email: raw.recipient.email || customerEmail,
      }
    : customer;

  // Safe Address extraction
  const address = extractAddress(raw);

  // Safe Shipping & Courier
  const rawShip = raw.shipping || {};
  const awb = String(rawShip.awb || raw.awb || rawShip.tracking_number || raw.tracking_number || 'PENDING');
  const courier = rawShip.courier || raw.courier || 'Delhivery';
  const trackingStatus = rawShip.tracking_status || raw.tracking_status || raw.status || 'in_transit';

  const shipping = {
    courier,
    courier_provider: rawShip.courier_provider || raw.courier_provider || 'delhivery',
    awb,
    tracking_number: awb,
    tracking_url: rawShip.tracking_url || raw.tracking_url || (awb !== 'PENDING' ? `https://www.delhivery.com/track/package/${awb}` : null),
    tracking_status: trackingStatus,
    pickup: rawShip.pickup || { scheduled: Boolean(raw.pickup_date), date: raw.pickup_date || null },
    estimated_delivery: rawShip.estimated_delivery || raw.estimated_delivery || null,
    delivered_at: rawShip.delivered_at || raw.delivered_at || null,
    rto: rawShip.rto || { status: null, initiated_at: null, delivered_at: null, expected_return_date: null },
    address,
  };

  // Safe Amount
  const rawAmt = raw.amount || {};
  const total = Number(rawAmt.total ?? raw.total ?? raw.total_amount ?? 0);
  const wholesale = Number(rawAmt.wholesale_amount ?? raw.wholesale_amount ?? total);
  const shippingCharge = Number(rawAmt.shipping_charge ?? raw.shipping_charge ?? 0);
  const discount = Number(rawAmt.discount ?? raw.discount ?? 0);
  const paymentMethod = String(rawAmt.payment_method || raw.payment_method || 'cod');
  const paymentStatus = String(rawAmt.payment_status || raw.payment_status || (raw.status === 'delivered' ? 'paid' : 'pending'));

  const amount = {
    currency: rawAmt.currency || raw.currency || 'INR',
    total,
    wholesale_amount: wholesale,
    shipping_charge: shippingCharge,
    discount,
    payment_method: paymentMethod,
    payment_status: paymentStatus,
  };

  // Safe Line Items
  const rawItems = Array.isArray(raw.items) ? raw.items : Array.isArray(raw.order_items) ? raw.order_items : [];
  const items = rawItems.map((item: any, idx: number) => ({
    id: String(item.id || item.item_id || `item_${idx + 1}`),
    product_id: String(item.product_id || item.prod_id || `prod_${idx + 1}`),
    name: item.name || item.product_name || item.title || 'Product Item',
    product_name: item.product_name || item.name || item.title || 'Product Item',
    sku: item.sku || `SKU-${idx + 1}`,
    quantity: Number(item.quantity || item.qty || 1),
    unit_price: Number(item.unit_price || item.price || 0),
    line_total: Number(item.line_total || (Number(item.quantity || 1) * Number(item.unit_price || 0))),
  }));

  // Safe Tracking
  const rawTrack = raw.tracking || {};
  const tracking = {
    order_id: id,
    courier,
    courier_provider: rawShip.courier_provider || 'delhivery',
    awb,
    tracking_status: trackingStatus,
    estimated_delivery: rawTrack.estimated_delivery || shipping.estimated_delivery,
    delivered_at: rawTrack.delivered_at || shipping.delivered_at,
    rto: rawTrack.rto || shipping.rto,
    last_event: rawTrack.last_event || null,
    tracking_history: Array.isArray(rawTrack.tracking_history) ? rawTrack.tracking_history : [],
    tracking_history_source: rawTrack.tracking_history_source || 'delhivery_api',
    synced_at: rawTrack.synced_at || new Date().toISOString(),
  };

  return {
    id,
    uuid: raw.uuid || id,
    order_number: orderNumber,
    source_type: raw.source_type || 'b2b_portal',
    source_order_id: raw.source_order_id || raw.id || '',
    source_reference: raw.source_reference || null,
    status: raw.status || 'confirmed',
    fulfillment_status: raw.fulfillment_status || raw.status || 'pending',
    created_at: raw.created_at || new Date().toISOString(),
    updated_at: raw.updated_at || raw.created_at || new Date().toISOString(),
    synced_at: raw.synced_at || new Date().toISOString(),
    customer,
    recipient,
    shipping,
    amount,
    items,
    tracking,
    internal_notes: raw.internal_notes || null,
  };
}

class JVecomOrdersService {
  private rateLimit: JVecomRateLimitState = {
    limit: 60,
    remaining: 60,
    reset: Math.floor(Date.now() / 1000) + 60,
    requestId: null,
    lastChecked: null,
  };

  constructor() {
    this.loadRateLimitState();
  }

  // ---------------------------------------------------------------------------
  // Configuration Management
  // ---------------------------------------------------------------------------
  public getConfig(): JVecomApiConfig {
    const envApiKey = (import.meta.env.VITE_JVECOM_API_KEY as string) || '';
    const envGatewayUrl = (import.meta.env.VITE_JVECOM_API_URL as string) || PROXY_GATEWAY_URL;

    const savedApiKey = localStorage.getItem(STORAGE_KEYS.API_KEY) || envApiKey;
    let savedGateway = localStorage.getItem(STORAGE_KEYS.GATEWAY_URL) || envGatewayUrl;

    if (typeof window !== 'undefined' && (savedGateway === DIRECT_EDGE_GATEWAY_URL || savedGateway.includes('wokqhsfrncvswtnukdou.supabase.co'))) {
      savedGateway = PROXY_GATEWAY_URL;
    }

    const savedUseLive = localStorage.getItem(STORAGE_KEYS.USE_LIVE);
    const savedAutoSync = localStorage.getItem(STORAGE_KEYS.AUTO_SYNC);
    const savedInterval = localStorage.getItem(STORAGE_KEYS.AUTO_SYNC_INTERVAL);
    const lastSyncedAt = localStorage.getItem(STORAGE_KEYS.LAST_SYNCED_AT);

    return {
      apiKey: savedApiKey,
      gatewayUrl: savedGateway || PROXY_GATEWAY_URL,
      useLiveApi: savedUseLive !== null ? savedUseLive === 'true' : true,
      autoSync: savedAutoSync === 'true',
      autoSyncIntervalMinutes: savedInterval ? parseInt(savedInterval, 10) : 10,
      lastSyncedAt,
    };
  }

  public saveConfig(config: Partial<JVecomApiConfig>): void {
    if (config.apiKey !== undefined) {
      localStorage.setItem(STORAGE_KEYS.API_KEY, config.apiKey.trim());
    }
    if (config.gatewayUrl !== undefined) {
      localStorage.setItem(STORAGE_KEYS.GATEWAY_URL, config.gatewayUrl.trim());
    }
    if (config.useLiveApi !== undefined) {
      localStorage.setItem(STORAGE_KEYS.USE_LIVE, String(config.useLiveApi));
    }
    if (config.autoSync !== undefined) {
      localStorage.setItem(STORAGE_KEYS.AUTO_SYNC, String(config.autoSync));
    }
    if (config.autoSyncIntervalMinutes !== undefined) {
      localStorage.setItem(STORAGE_KEYS.AUTO_SYNC_INTERVAL, String(config.autoSyncIntervalMinutes));
    }
    if (config.lastSyncedAt !== undefined) {
      if (config.lastSyncedAt) {
        localStorage.setItem(STORAGE_KEYS.LAST_SYNCED_AT, config.lastSyncedAt);
      } else {
        localStorage.removeItem(STORAGE_KEYS.LAST_SYNCED_AT);
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Rate Limit Handling
  // ---------------------------------------------------------------------------
  private loadRateLimitState(): void {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.RATE_LIMIT);
      if (saved) {
        this.rateLimit = JSON.parse(saved);
      }
    } catch {
      // Ignore
    }
  }

  private updateRateLimitFromHeaders(headers: Headers): void {
    const limitHeader = headers.get('x-ratelimit-limit');
    const remainingHeader = headers.get('x-ratelimit-remaining');
    const resetHeader = headers.get('x-ratelimit-reset');
    const requestIdHeader = headers.get('x-request-id');

    if (limitHeader || remainingHeader || requestIdHeader) {
      this.rateLimit = {
        limit: limitHeader ? parseInt(limitHeader, 10) : this.rateLimit.limit,
        remaining: remainingHeader ? parseInt(remainingHeader, 10) : Math.max(0, this.rateLimit.remaining - 1),
        reset: resetHeader ? parseInt(resetHeader, 10) : this.rateLimit.reset,
        requestId: requestIdHeader || this.rateLimit.requestId,
        lastChecked: new Date().toISOString(),
      };
      localStorage.setItem(STORAGE_KEYS.RATE_LIMIT, JSON.stringify(this.rateLimit));
    }
  }

  public getRateLimitState(): JVecomRateLimitState {
    return { ...this.rateLimit };
  }

  // ---------------------------------------------------------------------------
  // URL Construction & CORS Gateway Resolver
  // ---------------------------------------------------------------------------
  public resolveGatewayUrl(url?: string): string {
    const raw = (url || this.getConfig().gatewayUrl || PROXY_GATEWAY_URL).trim().replace(/\/+$/, '');
    if (typeof window !== 'undefined') {
      if (raw === DIRECT_EDGE_GATEWAY_URL || raw.includes('wokqhsfrncvswtnukdou.supabase.co')) {
        return PROXY_GATEWAY_URL;
      }
    }
    return raw;
  }

  public buildUrl(path: string, gatewayOverride?: string): URL {
    const baseGateway = (gatewayOverride ? this.resolveGatewayUrl(gatewayOverride) : this.resolveGatewayUrl()).replace(/\/+$/, '');
    const cleanPath = path.startsWith('/') ? path : `/${path}`;

    if (baseGateway.startsWith('http://') || baseGateway.startsWith('https://')) {
      return new URL(`${baseGateway}${cleanPath}`);
    }

    const origin = typeof window !== 'undefined' && window.location.origin ? window.location.origin : 'http://localhost:5173';
    return new URL(`${baseGateway}${cleanPath}`, origin);
  }

  // ---------------------------------------------------------------------------
  // Live Orders Cache Storage
  // ---------------------------------------------------------------------------
  public getCachedOrders(): JVecomOrder[] {
    try {
      const cached = localStorage.getItem(STORAGE_KEYS.ORDERS_CACHE);
      if (!cached) return [];
      const parsed = JSON.parse(cached);
      return Array.isArray(parsed) ? parsed.map(normalizeOrder) : [];
    } catch {
      return [];
    }
  }

  public setCachedOrders(orders: JVecomOrder[]): void {
    try {
      localStorage.setItem(STORAGE_KEYS.ORDERS_CACHE, JSON.stringify(orders));
    } catch (err) {
      console.error('Failed to save orders cache to localStorage:', err);
    }
  }

  public resetCache(): void {
    localStorage.removeItem(STORAGE_KEYS.ORDERS_CACHE);
    localStorage.removeItem(STORAGE_KEYS.LAST_SYNCED_AT);
  }

  // ---------------------------------------------------------------------------
  // Live API Connection Test (GET /orders?limit=1)
  // ---------------------------------------------------------------------------
  public async testConnection(apiKeyOverride?: string, gatewayUrlOverride?: string): Promise<{
    success: boolean;
    message: string;
    statusCode: number;
    latencyMs: number;
    rateLimit?: JVecomRateLimitState;
    sampleOrder?: JVecomOrder;
    requestId?: string;
    usedUrl?: string;
  }> {
    const config = this.getConfig();
    const apiKey = (apiKeyOverride ?? config.apiKey).trim();
    const targetGateway = (gatewayUrlOverride ?? config.gatewayUrl).trim().replace(/\/+$/, '');

    if (!apiKey) {
      return {
        success: false,
        message: "API key is required. Enter your secret key starting with 'jvec_live_...' from your JVecom B2B Admin under Developer API.",
        statusCode: 401,
        latencyMs: 0,
      };
    }

    const candidates: string[] = [];
    if (typeof window !== 'undefined') {
      if (targetGateway === PROXY_GATEWAY_URL) {
        candidates.push(PROXY_GATEWAY_URL);
      } else {
        candidates.push(PROXY_GATEWAY_URL);
        candidates.push(targetGateway);
      }
    } else {
      candidates.push(targetGateway);
    }

    let lastError: Error | null = null;
    let lastLatency = 0;

    for (const currentTarget of candidates) {
      const start = performance.now();
      try {
        const testUrl = this.buildUrl('/orders?limit=1', currentTarget);
        const response = await fetch(testUrl.toString(), {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            Accept: 'application/json',
          },
        });

        const latencyMs = Math.round(performance.now() - start);
        this.updateRateLimitFromHeaders(response.headers);
        const requestId = response.headers.get('x-request-id') || undefined;

        if (!response.ok) {
          let errMessage = `HTTP ${response.status} ${response.statusText}`;
          try {
            const errBody = await response.json();
            if (errBody?.error?.message) {
              errMessage = errBody.error.message;
            } else if (errBody?.message) {
              errMessage = errBody.message;
            }
          } catch {
            // ignore
          }
          return {
            success: false,
            message: errMessage,
            statusCode: response.status,
            latencyMs,
            rateLimit: this.getRateLimitState(),
            requestId,
            usedUrl: currentTarget,
          };
        }

        const body = await response.json();
        const orders = Array.isArray(body?.data) ? body.data : Array.isArray(body?.orders) ? body.orders : Array.isArray(body) ? body : [];
        const sample = orders[0] ? normalizeOrder(orders[0]) : undefined;

        this.saveConfig({ gatewayUrl: currentTarget });

        return {
          success: true,
          message: currentTarget === PROXY_GATEWAY_URL
            ? 'Successfully connected to JVecom B2B Orders API via internal proxy (CORS bypassed)!'
            : 'Successfully connected to JVecom B2B Orders API! Gateway verified.',
          statusCode: response.status,
          latencyMs,
          rateLimit: this.getRateLimitState(),
          sampleOrder: sample,
          requestId,
          usedUrl: currentTarget,
        };
      } catch (err) {
        lastLatency = Math.round(performance.now() - start);
        lastError = err instanceof Error ? err : new Error(String(err));
      }
    }

    const isCorsFailure = lastError?.message?.includes('Failed to fetch') || lastError?.name === 'TypeError';
    const friendlyMessage = isCorsFailure
      ? 'Connection Error: Browser blocked direct fetch due to CORS policy. Ensure your Vite dev server proxy (/api/jvecom) is active.'
      : (lastError?.message || 'Network error communicating with Gateway');

    return {
      success: false,
      message: friendlyMessage,
      statusCode: 0,
      latencyMs: lastLatency,
    };
  }

  // ---------------------------------------------------------------------------
  // GET /orders — Real-Time List & Filter Orders
  // ---------------------------------------------------------------------------
  public async listOrders(params: JVecomListQueryParams = {}): Promise<{
    orders: JVecomOrder[];
    total: number;
    page: number;
    limit: number;
    fromLiveGateway: boolean;
    rateLimit: JVecomRateLimitState;
    error?: string;
  }> {
    const config = this.getConfig();
    const apiKey = config.apiKey.trim();

    if (!apiKey) {
      return {
        orders: [],
        total: 0,
        page: params.page || 1,
        limit: params.limit || 25,
        fromLiveGateway: false,
        rateLimit: this.getRateLimitState(),
        error: 'API key is required. Go to Settings → JVecom B2B API to enter your secret key (jvec_live_...).',
      };
    }

    const url = this.buildUrl('/orders');
    if (params.limit) url.searchParams.set('limit', String(params.limit));
    if (params.page) url.searchParams.set('page', String(params.page));
    if (params.updated_since) url.searchParams.set('updated_since', params.updated_since);
    if (params.status && params.status !== 'all') url.searchParams.set('status', params.status);
    if (params.search) url.searchParams.set('search', params.search);
    if (params.courier) url.searchParams.set('courier', params.courier);
    if (params.sort_by) url.searchParams.set('sort_by', params.sort_by);
    if (params.sort_order) url.searchParams.set('sort_order', params.sort_order);

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: 'application/json',
      },
    });

    this.updateRateLimitFromHeaders(response.headers);

    if (!response.ok) {
      let errDetail = `HTTP ${response.status} ${response.statusText}`;
      try {
        const errBody = await response.json();
        if (errBody?.error?.message) {
          errDetail = errBody.error.message;
        } else if (errBody?.message) {
          errDetail = errBody.message;
        }
      } catch {
        // ignore
      }
      throw new Error(`Orders API Error (${response.status}): ${errDetail}`);
    }

    const payload = await response.json();
    const rawItems: any[] = Array.isArray(payload.data)
      ? payload.data
      : Array.isArray(payload.orders)
      ? payload.orders
      : Array.isArray(payload)
      ? payload
      : [];

    const items: JVecomOrder[] = rawItems.map(normalizeOrder);
    const total = payload.pagination?.total ?? (payload.total ?? items.length);
    const page = payload.pagination?.page ?? (params.page || 1);
    const limit = payload.pagination?.limit ?? (params.limit || 25);

    if (items.length > 0) {
      this.mergeOrdersIntoCache(items);
    }

    return {
      orders: items,
      total,
      page,
      limit,
      fromLiveGateway: true,
      rateLimit: this.getRateLimitState(),
    };
  }

  // ---------------------------------------------------------------------------
  // GET /orders/{order_id} — Real-Time Order Details
  // ---------------------------------------------------------------------------
  public async getOrder(orderId: string): Promise<JVecomOrder | null> {
    const config = this.getConfig();
    const apiKey = config.apiKey.trim();
    if (!apiKey) throw new Error('API key is required to query live order details.');

    const url = this.buildUrl(`/orders/${encodeURIComponent(orderId)}`);
    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: 'application/json',
      },
    });

    this.updateRateLimitFromHeaders(response.headers);

    if (!response.ok) {
      if (response.status === 404) return null;
      let errMsg = `HTTP ${response.status} ${response.statusText}`;
      try {
        const errBody = await response.json();
        errMsg = errBody?.error?.message || errBody?.message || errMsg;
      } catch {
        // ignore
      }
      throw new Error(`Failed to get order ${orderId}: ${errMsg}`);
    }

    const payload = await response.json();
    const rawOrder = payload.data || payload.order || payload;
    const order = normalizeOrder(rawOrder);
    if (order && order.id) {
      this.mergeOrdersIntoCache([order]);
    }
    return order;
  }

  // ---------------------------------------------------------------------------
  // GET /orders/{order_id}/items — Real-Time Line Items
  // ---------------------------------------------------------------------------
  public async getOrderItems(orderId: string): Promise<JVecomOrderItem[]> {
    const config = this.getConfig();
    const apiKey = config.apiKey.trim();
    if (!apiKey) throw new Error('API key is required to query line items.');

    const url = this.buildUrl(`/orders/${encodeURIComponent(orderId)}/items`);
    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: 'application/json',
      },
    });

    this.updateRateLimitFromHeaders(response.headers);

    if (!response.ok) {
      let errMsg = `HTTP ${response.status} ${response.statusText}`;
      try {
        const errBody = await response.json();
        errMsg = errBody?.error?.message || errBody?.message || errMsg;
      } catch {
        // ignore
      }
      throw new Error(`Failed to fetch line items for order ${orderId}: ${errMsg}`);
    }

    const payload = await response.json();
    const rawItems: any[] = Array.isArray(payload.data)
      ? payload.data
      : Array.isArray(payload.items)
      ? payload.items
      : Array.isArray(payload)
      ? payload
      : [];

    return rawItems.map((item, idx) => ({
      id: String(item.id || item.item_id || `item_${idx + 1}`),
      product_id: String(item.product_id || item.prod_id || `prod_${idx + 1}`),
      name: item.name || item.product_name || item.title || 'Product Item',
      product_name: item.product_name || item.name || item.title || 'Product Item',
      sku: item.sku || `SKU-${idx + 1}`,
      quantity: Number(item.quantity || item.qty || 1),
      unit_price: Number(item.unit_price || item.price || 0),
      line_total: Number(item.line_total || (Number(item.quantity || 1) * Number(item.unit_price || 0))),
    }));
  }

  // ---------------------------------------------------------------------------
  // GET /orders/{order_id}/tracking — Real-Time Delhivery Courier Tracking
  // ---------------------------------------------------------------------------
  public async getOrderTracking(orderId: string): Promise<JVecomTrackingDetails | null> {
    const config = this.getConfig();
    const apiKey = config.apiKey.trim();
    if (!apiKey) throw new Error('API key is required to query real-time tracking.');

    const url = this.buildUrl(`/orders/${encodeURIComponent(orderId)}/tracking`);
    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: 'application/json',
      },
    });

    this.updateRateLimitFromHeaders(response.headers);

    if (!response.ok) {
      let errMsg = `HTTP ${response.status} ${response.statusText}`;
      try {
        const errBody = await response.json();
        errMsg = errBody?.error?.message || errBody?.message || errMsg;
      } catch {
        // ignore
      }
      throw new Error(`Failed to fetch Delhivery tracking for order ${orderId}: ${errMsg}`);
    }

    const payload = await response.json();
    const rawTrack = payload.data || payload.tracking || payload || {};
    return {
      order_id: String(rawTrack.order_id || orderId),
      courier: rawTrack.courier || 'Delhivery',
      courier_provider: rawTrack.courier_provider || 'delhivery',
      awb: String(rawTrack.awb || 'PENDING'),
      tracking_status: rawTrack.tracking_status || 'in_transit',
      estimated_delivery: rawTrack.estimated_delivery || null,
      delivered_at: rawTrack.delivered_at || null,
      rto: rawTrack.rto || { status: null, initiated_at: null, delivered_at: null, expected_return_date: null },
      last_event: rawTrack.last_event || null,
      tracking_history: Array.isArray(rawTrack.tracking_history) ? rawTrack.tracking_history : [],
      tracking_history_source: rawTrack.tracking_history_source || 'delhivery_api',
      synced_at: rawTrack.synced_at || new Date().toISOString(),
    };
  }

  // ---------------------------------------------------------------------------
  // Real-Time Incremental Sync (using GET /orders?updated_since=...)
  // ---------------------------------------------------------------------------
  public async syncOrdersIncrementally(): Promise<{
    syncedCount: number;
    newOrders: JVecomOrder[];
    lastSyncedAt: string;
    fromLiveGateway: boolean;
  }> {
    const config = this.getConfig();
    const apiKey = config.apiKey.trim();
    if (!apiKey) {
      throw new Error('API key is required for real-time order sync. Please configure your key in Settings.');
    }

    const lastSyncedAt = config.lastSyncedAt;
    const nowIso = new Date().toISOString();

    const url = this.buildUrl('/orders');
    url.searchParams.set('limit', '100');
    if (lastSyncedAt) {
      url.searchParams.set('updated_since', lastSyncedAt);
    }

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: 'application/json',
      },
    });

    this.updateRateLimitFromHeaders(response.headers);

    if (!response.ok) {
      let errMsg = `HTTP ${response.status} ${response.statusText}`;
      try {
        const errBody = await response.json();
        errMsg = errBody?.error?.message || errBody?.message || errMsg;
      } catch {
        // ignore
      }
      throw new Error(`Real-time sync failed (${response.status}): ${errMsg}`);
    }

    const payload = await response.json();
    const rawIncoming: any[] = Array.isArray(payload.data)
      ? payload.data
      : Array.isArray(payload.orders)
      ? payload.orders
      : Array.isArray(payload)
      ? payload
      : [];

    const incoming: JVecomOrder[] = rawIncoming.map(normalizeOrder);

    if (incoming.length > 0) {
      this.mergeOrdersIntoCache(incoming);
    }
    this.saveConfig({ lastSyncedAt: nowIso });

    return {
      syncedCount: incoming.length,
      newOrders: incoming,
      lastSyncedAt: nowIso,
      fromLiveGateway: true,
    };
  }

  // ---------------------------------------------------------------------------
  // Cache helper: merges real incoming orders into local storage
  // ---------------------------------------------------------------------------
  private mergeOrdersIntoCache(incoming: JVecomOrder[]): void {
    const current = this.getCachedOrders();
    const map = new Map<string, JVecomOrder>();

    current.forEach((item) => map.set(item.id, item));
    incoming.forEach((item) => {
      map.set(item.id, {
        ...map.get(item.id),
        ...item,
        synced_at: new Date().toISOString(),
      });
    });

    const merged = Array.from(map.values()).sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    this.setCachedOrders(merged);
  }

  // ---------------------------------------------------------------------------
  // Bridge to SalesOS CRM: Convert B2B Order into a CRM Sale & Customer
  // ---------------------------------------------------------------------------
  public async importOrderToCrmSale(
    order: JVecomOrder,
    orgId: string,
    userId: string
  ): Promise<Sale> {
    let o = normalizeOrder(order);

    // If order was passed from a summary list without full address lines, attempt to fetch the full canonical order object
    if (
      !o.shipping?.address?.address_line1 ||
      o.shipping.address.address_line1 === 'Address on file' ||
      !o.shipping?.address?.city ||
      o.shipping.address.city === 'India'
    ) {
      try {
        const full = await this.getOrder(o.order_number || o.id);
        if (full) {
          o = normalizeOrder(full);
        }
      } catch {
        // use existing o
      }
    }

    const customerEmail = (o.customer?.email || o.recipient?.email || 'customer@jvecomb2b.com').toLowerCase().trim();
    const customerPhone = o.customer?.phone || o.recipient?.phone || '';
    const customers = localDb.getAll<any>('customer');
    let matchedCustomer = customers.find(
      (c) => c.organization_id === orgId && c.email.toLowerCase() === customerEmail
    );

    const city = o.shipping?.address?.city && o.shipping.address.city !== 'India' ? o.shipping.address.city : '';
    const state = o.shipping?.address?.state || '';
    const postalCode = o.shipping?.address?.postal_code || '';
    const line1 = o.shipping?.address?.address_line1 && o.shipping.address.address_line1 !== 'Address on file' ? o.shipping.address.address_line1 : '';
    const line2 = o.shipping?.address?.address_line2 || '';

    const addressParts = [
      line1,
      line2,
      city,
      state,
      postalCode ? `PIN: ${postalCode}` : '',
      o.shipping?.address?.country || 'India',
    ].filter(Boolean);
    const fullAddressString = addressParts.length > 0 ? addressParts.join(', ') : 'B2B Client Address';

    if (!matchedCustomer) {
      const nameParts = (o.customer?.name || o.recipient?.name || 'B2B Customer').trim().split(' ');
      const firstName = nameParts[0] || 'B2B';
      const lastName = nameParts.slice(1).join(' ') || 'Customer';

      matchedCustomer = localDb.insert('customer', {
        organization_id: orgId,
        first_name: firstName,
        last_name: lastName,
        email: customerEmail,
        phone: customerPhone,
        company: city ? `B2B Client (${city})` : 'B2B Wholesale',
        status: 'ACTIVE' as any,
        total_spend: o.amount?.total || 0,
        total_deals: 1,
        address: fullAddressString,
      } as any);
    } else {
      localDb.update('customer', matchedCustomer.id, {
        total_spend: (matchedCustomer.total_spend || 0) + (o.amount?.total || 0),
        total_deals: (matchedCustomer.total_deals || 0) + 1,
        address: fullAddressString,
        phone: matchedCustomer.phone || customerPhone,
        company: matchedCustomer.company || (city ? `B2B Client (${city})` : 'B2B Wholesale'),
      } as any);
    }

    let mappedPaymentStatus = PaymentStatus.PENDING;
    if (o.amount?.payment_status === 'paid' || o.status === 'delivered') {
      mappedPaymentStatus = PaymentStatus.PAID;
    } else if (o.amount?.payment_status === 'failed' || o.status === 'cancelled') {
      mappedPaymentStatus = PaymentStatus.REFUNDED;
    }

    let mappedPaymentMethod = PaymentMethod.BANK_TRANSFER;
    const pm = (o.amount?.payment_method || '').toLowerCase();
    if (pm.includes('card')) mappedPaymentMethod = PaymentMethod.CARD;
    else if (pm.includes('upi')) mappedPaymentMethod = PaymentMethod.UPI;
    else if (pm.includes('cod')) mappedPaymentMethod = PaymentMethod.CASH;

    const itemsSummary = (o.items || []).map((i) => `${i.quantity}x ${i.name || i.product_name || 'Item'}`).join(', ');

    const newSale = localDb.insert<Sale>('sale', {
      organization_id: orgId,
      user_id: userId,
      customer_id: matchedCustomer.id,
      invoice_number: `INV-${o.order_number}`,
      subtotal: o.amount?.wholesale_amount || o.amount?.total || 0,
      discount: o.amount?.discount || 0,
      tax: 0,
      total: o.amount?.total || 0,
      payment_method: mappedPaymentMethod,
      payment_status: mappedPaymentStatus,
      sale_date: o.created_at || new Date().toISOString(),
      notes: `[JVecom B2B Order: ${o.order_number}] Destination: ${fullAddressString}. Carrier: ${o.shipping?.courier || 'Delhivery'} (AWB: ${o.shipping?.awb || 'N/A'}). Items: ${itemsSummary || 'Standard Line Items'}`,
    } as any);

    return newSale;
  }
}

export const jvecomOrdersService = new JVecomOrdersService();
