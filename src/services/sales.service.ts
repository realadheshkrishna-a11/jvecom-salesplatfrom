// ============================================================================
// SalesOS — Sales Service
// Sales records, multi-product line items, qualification, and refund processing
// ============================================================================

import { supabase } from '@/lib/supabase';
import { localDb, isLocalStorageMode } from '@/lib/localDb';
import type { Sale, PaginatedResponse } from '@/types';
import { PaymentStatus } from '@/types';
import type { SaleInput } from '@/schemas';

interface SaleFilters {
  search?: string;
  payment_status?: PaymentStatus | string;
  user_id?: string;
  customer_id?: string;
  team_id?: string;
  date_from?: string;
  date_to?: string;
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortDir?: 'asc' | 'desc';
}

export const salesService = {
  async list(orgId: string, filters: SaleFilters = {}): Promise<PaginatedResponse<Sale>> {
    if (isLocalStorageMode()) {
      const items = localDb.getSales(orgId, {
        payment_status: filters.payment_status as any,
        user_id: filters.user_id,
      });
      return {
        data: items,
        total: items.length,
        page: filters.page || 1,
        pageSize: filters.pageSize || 25,
        totalPages: 1,
      };
    }

    const {
      search, payment_status, user_id, customer_id, team_id,
      date_from, date_to,
      page = 1, pageSize = 25,
      sortBy = 'sale_date', sortDir = 'desc'
    } = filters;

    let query = supabase
      .from('sales')
      .select(`
        *,
        customer:customers(id, first_name, last_name, email, phone, company),
        user:profiles(id, first_name, last_name, email, avatar_url),
        items:sale_items(
          *,
          product:products(id, name, sku, category)
        )
      `, { count: 'exact' })
      .eq('organization_id', orgId);

    if (payment_status) query = query.eq('payment_status', payment_status);
    if (user_id) query = query.eq('user_id', user_id);
    if (customer_id) query = query.eq('customer_id', customer_id);
    if (team_id) query = query.eq('team_id', team_id);
    if (date_from) query = query.gte('sale_date', date_from);
    if (date_to) query = query.lte('sale_date', date_to);

    if (search) {
      query = query.or(`invoice_number.ilike.%${search}%,notes.ilike.%${search}%`);
    }

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    query = query.order(sortBy, { ascending: sortDir === 'asc' }).range(from, to);

    const { data, count, error } = await query;
    if (error) throw error;

    return {
      data: (data || []) as unknown as Sale[],
      total: count || 0,
      page,
      pageSize,
      totalPages: Math.ceil((count || 0) / pageSize),
    };
  },

  async getById(id: string): Promise<Sale> {
    if (isLocalStorageMode()) {
      const sale = localDb.getSales('').find(s => s.id === id);
      if (!sale) throw new Error('Sale not found');
      return sale;
    }

    const { data, error } = await supabase
      .from('sales')
      .select(`
        *,
        customer:customers(*),
        user:profiles(id, first_name, last_name, email, avatar_url, team_id),
        lead:leads(*),
        items:sale_items(
          *,
          product:products(*)
        )
      `)
      .eq('id', id)
      .single();

    if (error) throw error;
    return data as unknown as Sale;
  },

  async create(orgId: string, userId: string, teamId: string | null, input: SaleInput): Promise<Sale> {
    if (isLocalStorageMode()) {
      return localDb.createSale(orgId, {
        user_id: userId,
        customer_id: input.customer_id,
        items: input.items,
        payment_method: input.payment_method,
        notes: input.notes,
        lead_id: input.lead_id,
      });
    }
    // 1. Calculate items subtotal and total
    let subtotal = 0;
    const itemsData = input.items.map(item => {
      const lineTotal = (item.quantity * item.unit_price) - (item.discount || 0);
      subtotal += lineTotal;
      return {
        product_id: item.product_id,
        quantity: item.quantity,
        unit_price: item.unit_price,
        discount: item.discount || 0,
        total: Math.max(0, lineTotal),
      };
    });

    const discount = input.discount || 0;
    const tax = input.tax || 0;
    const total = Math.max(0, subtotal - discount + tax);

    // 2. Generate invoice number
    const timestamp = Date.now().toString().slice(-6);
    const invoiceNumber = `INV-${new Date().getFullYear()}-${timestamp}`;

    // 3. Insert sale header
    const { data: saleData, error: saleError } = await supabase
      .from('sales')
      .insert({
        organization_id: orgId,
        user_id: userId,
        team_id: teamId || null,
        customer_id: input.customer_id,
        lead_id: input.lead_id || null,
        invoice_number: invoiceNumber,
        subtotal,
        discount,
        tax,
        total,
        payment_method: input.payment_method || 'UPI',
        payment_status: input.payment_status || 'PAID',
        sale_date: input.sale_date || new Date().toISOString(),
        notes: input.notes || null,
      })
      .select()
      .single();

    if (saleError) throw saleError;

    // 4. Insert line items
    const saleItems = itemsData.map(item => ({
      ...item,
      organization_id: orgId,
      sale_id: saleData.id,
    }));

    const { error: itemsError } = await supabase
      .from('sale_items')
      .insert(saleItems);

    if (itemsError) throw itemsError;

    // 5. If marked as PAID, invoke qualification logic (or SQL function)
    if (input.payment_status === 'PAID') {
      try {
        await supabase.rpc('process_sale_qualification', { p_sale_id: saleData.id });
      } catch (rpcErr) {
        console.warn('RPC process_sale_qualification executed or trigger handled:', rpcErr);
      }
    }

    // 6. If linked to lead, transition lead to WON
    if (input.lead_id) {
      await supabase
        .from('leads')
        .update({ stage: 'WON', updated_at: new Date().toISOString() })
        .eq('id', input.lead_id);
    }

    // 7. Transition customer to CUSTOMER if not already
    await supabase
      .from('customers')
      .update({ status: 'CUSTOMER', updated_at: new Date().toISOString() })
      .eq('id', input.customer_id);

    return this.getById(saleData.id);
  },

  async refund(saleId: string, reason?: string): Promise<Sale> {
    if (isLocalStorageMode()) {
      return localDb.refundSale(saleId, reason || 'Customer requested refund');
    }

    try {
      await supabase.rpc('process_sale_refund', { p_sale_id: saleId });
    } catch (rpcErr) {
      console.warn('RPC process_sale_refund fallback to direct update:', rpcErr);
      await supabase
        .from('sales')
        .update({
          payment_status: PaymentStatus.REFUNDED,
          notes: reason ? `Refunded: ${reason}` : 'Refunded',
          updated_at: new Date().toISOString(),
        })
        .eq('id', saleId);
    }

    return this.getById(saleId);
  },

  async cancel(saleId: string, reason?: string): Promise<Sale> {
    const { error } = await supabase
      .from('sales')
      .update({
        payment_status: PaymentStatus.CANCELLED,
        notes: reason ? `Cancelled: ${reason}` : 'Cancelled',
        updated_at: new Date().toISOString(),
      })
      .eq('id', saleId);

    if (error) throw error;
    return this.getById(saleId);
  },

  async getStats(orgId: string, userId?: string, dateFrom?: string, dateTo?: string) {
    if (isLocalStorageMode()) {
      const sales = localDb.getSales(orgId, { user_id: userId });
      const paidSales = sales.filter(s => s.payment_status === 'PAID');
      const totalRevenue = paidSales.reduce((acc, s) => acc + Number(s.total || 0), 0);
      const count = paidSales.length;
      return {
        totalRevenue,
        paidSalesCount: count,
        avgDealSize: count > 0 ? Math.round(totalRevenue / count) : 0,
        totalSalesCount: sales.length,
      };
    }

    try {
      let query = supabase
        .from('sales')
        .select('total, payment_status, sale_date')
        .eq('organization_id', orgId);

      if (userId) query = query.eq('user_id', userId);
      if (dateFrom) query = query.gte('sale_date', dateFrom);
      if (dateTo) query = query.lte('sale_date', dateTo);

      const { data, error } = await query;
      if (error) throw error;

      const paidSales = (data || []).filter(s => s.payment_status === 'PAID');
      const totalRevenue = paidSales.reduce((acc, s) => acc + Number(s.total || 0), 0);
      const count = paidSales.length;
      const avgDealSize = count > 0 ? Math.round(totalRevenue / count) : 0;

      return {
        totalRevenue,
        paidSalesCount: count,
        avgDealSize,
        totalSalesCount: (data || []).length,
      };
    } catch (err) {
      console.warn('[salesService.getStats] Remote query error, using local fallback:', err);
      const sales = localDb.getSales(orgId, { user_id: userId });
      const paidSales = sales.filter(s => s.payment_status === 'PAID');
      const totalRevenue = paidSales.reduce((acc, s) => acc + Number(s.total || 0), 0);
      const count = paidSales.length;
      return {
        totalRevenue,
        paidSalesCount: count,
        avgDealSize: count > 0 ? Math.round(totalRevenue / count) : 0,
        totalSalesCount: sales.length,
      };
    }
  }
};
