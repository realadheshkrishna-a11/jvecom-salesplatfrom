// =============================================================================
// JVecom B2B Orders API Types & Models
// Version: v1.0 (REST, Read-Only)
// =============================================================================

export type JVecomOrderStatus = 
  | 'all'
  | 'confirmed'
  | 'in_transit'
  | 'delivered'
  | 'cancelled'
  | 'rto';

export type JVecomFulfillmentStatus = 
  | 'pending'
  | 'confirmed'
  | 'in_transit'
  | 'out_for_delivery'
  | 'delivered'
  | 'cancelled'
  | 'rto';

export type JVecomTrackingStatus = 
  | 'pending'
  | 'in_transit'
  | 'out_for_delivery'
  | 'delivered'
  | 'rto';

export interface JVecomCustomer {
  name: string;
  phone: string;
  email: string;
}

export interface JVecomRecipient {
  name: string;
  phone: string;
  email: string;
}

export interface JVecomShippingAddress {
  address_line1: string;
  address_line2?: string | null;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  redacted?: boolean;
}

export interface JVecomPickupInfo {
  scheduled: boolean;
  date?: string | null;
}

export interface JVecomRTOInfo {
  status: string | null;
  initiated_at: string | null;
  delivered_at: string | null;
  expected_return_date: string | null;
}

export interface JVecomShippingInfo {
  courier: string;
  courier_provider: string;
  awb: string;
  tracking_number: string;
  tracking_url?: string | null;
  tracking_status: JVecomTrackingStatus | string;
  pickup?: JVecomPickupInfo;
  estimated_delivery?: string | null;
  delivered_at?: string | null;
  rto?: JVecomRTOInfo;
  address: JVecomShippingAddress;
}

export interface JVecomAmountInfo {
  currency: string;
  total: number;
  wholesale_amount: number;
  shipping_charge: number;
  discount: number;
  payment_method: 'cod' | 'prepaid' | 'card' | 'upi' | 'net_banking' | string;
  payment_status: 'pending' | 'paid' | 'failed' | 'refunded' | string;
}

export interface JVecomOrderItem {
  id: string;
  product_id: string;
  name: string;
  product_name: string;
  sku: string;
  quantity: number;
  unit_price: number;
  line_total: number;
}

export interface JVecomTrackingEvent {
  status: string;
  carrier_status: string;
  remark?: string;
  location: string;
  timestamp: string;
}

export interface JVecomTrackingDetails {
  order_id: string;
  courier: string;
  courier_provider: string;
  awb: string;
  tracking_status: string;
  estimated_delivery?: string | null;
  delivered_at?: string | null;
  rto?: JVecomRTOInfo;
  last_event?: JVecomTrackingEvent | null;
  tracking_history: JVecomTrackingEvent[];
  tracking_history_source?: string;
  synced_at?: string;
}

export interface JVecomOrder {
  id: string;
  uuid: string;
  order_number: string;
  source_type: string;
  source_order_id: string;
  source_reference?: string | null;
  status: JVecomOrderStatus | string;
  fulfillment_status: JVecomFulfillmentStatus | string;
  created_at: string;
  updated_at: string;
  synced_at: string;
  customer: JVecomCustomer;
  recipient: JVecomRecipient;
  shipping: JVecomShippingInfo;
  amount: JVecomAmountInfo;
  items: JVecomOrderItem[];
  tracking: JVecomTrackingDetails;
  internal_notes?: string | null;
}

export interface JVecomPagination {
  page: number;
  limit: number;
  total: number;
  total_pages?: number;
}

export interface JVecomOrdersApiResponse {
  success?: boolean;
  data?: JVecomOrder[];
  orders?: JVecomOrder[];
  pagination?: JVecomPagination;
  error?: {
    code: string;
    message: string;
    request_id?: string;
  };
}

export interface JVecomSingleOrderApiResponse {
  success?: boolean;
  data?: JVecomOrder;
  order?: JVecomOrder;
  error?: {
    code: string;
    message: string;
    request_id?: string;
  };
}

export interface JVecomRateLimitState {
  limit: number;
  remaining: number;
  reset: number;
  requestId: string | null;
  lastChecked: string | null;
}

export interface JVecomApiConfig {
  apiKey: string;
  gatewayUrl: string;
  useLiveApi: boolean;
  autoSync: boolean;
  autoSyncIntervalMinutes: number;
  lastSyncedAt: string | null;
}

export interface JVecomListQueryParams {
  limit?: number;
  page?: number;
  updated_since?: string | null;
  status?: string;
  search?: string;
  courier?: string;
  sort_by?: 'created_at' | 'updated_at' | 'total';
  sort_order?: 'asc' | 'desc';
}

