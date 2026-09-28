// ============================================================================
// SalesOS — Products Service
// ============================================================================

import { supabase } from '@/lib/supabase';
import { localDb, isLocalStorageMode } from '@/lib/localDb';
import type { Product, PaginatedResponse } from '@/types';
import type { ProductInput } from '@/schemas';

interface ProductFilters {
  search?: string;
  status?: string;
  category?: string;
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortDir?: 'asc' | 'desc';
}

export const productsService = {
  async list(orgId: string, filters: ProductFilters = {}): Promise<PaginatedResponse<Product>> {
    if (isLocalStorageMode()) {
      const items = localDb.getProducts(orgId, { search: filters.search, status: filters.status });
      return {
        data: items,
        total: items.length,
        page: filters.page || 1,
        pageSize: filters.pageSize || 25,
        totalPages: 1,
      };
    }

    const {
      search, status, category,
      page = 1, pageSize = 25,
      sortBy = 'created_at', sortDir = 'desc'
    } = filters;

    let query = supabase
      .from('products')
      .select('*', { count: 'exact' })
      .eq('organization_id', orgId);

    if (search) {
      query = query.or(`name.ilike.%${search}%,sku.ilike.%${search}%,category.ilike.%${search}%`);
    }
    if (status) query = query.eq('status', status);
    if (category) query = query.eq('category', category);

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    query = query.order(sortBy, { ascending: sortDir === 'asc' }).range(from, to);

    const { data, count, error } = await query;
    if (error) throw error;

    return {
      data: (data || []) as unknown as Product[],
      total: count || 0,
      page,
      pageSize,
      totalPages: Math.ceil((count || 0) / pageSize),
    };
  },

  async getById(id: string): Promise<Product> {
    if (isLocalStorageMode()) {
      const item = localDb.getById<Product>('products', id);
      if (!item) throw new Error('Product not found');
      return item;
    }

    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data as unknown as Product;
  },

  async create(orgId: string, input: ProductInput): Promise<Product> {
    if (isLocalStorageMode()) {
      return localDb.createProduct(orgId, input as any);
    }

    const { data, error } = await supabase
      .from('products')
      .insert({
        organization_id: orgId,
        ...input,
      })
      .select()
      .single();

    if (error) throw error;
    return data as unknown as Product;
  },

  async bulkCreate(orgId: string, items: ProductInput[]): Promise<Product[]> {
    if (items.length === 0) return [];

    if (isLocalStorageMode()) {
      return items.map(item => localDb.createProduct(orgId, item as any));
    }

    const records = items.map(item => ({
      organization_id: orgId,
      name: item.name,
      sku: item.sku || null,
      category: item.category || 'General',
      description: item.description || null,
      cost: Number(item.cost) || 0,
      selling_price: Number(item.selling_price) || 0,
      status: item.status || 'ACTIVE',
    }));

    const { data, error } = await supabase
      .from('products')
      .insert(records)
      .select();

    if (error) throw error;
    return (data || []) as unknown as Product[];
  },

  async update(id: string, input: Partial<ProductInput>): Promise<Product> {
    if (isLocalStorageMode()) {
      return localDb.update<Product>('products', id, input as any);
    }

    const { data, error } = await supabase
      .from('products')
      .update(input)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as unknown as Product;
  },

  async archive(id: string): Promise<void> {
    if (isLocalStorageMode()) {
      localDb.update<Product>('products', id, { status: 'ARCHIVED' as any });
      return;
    }

    const { error } = await supabase
      .from('products')
      .update({ status: 'ARCHIVED' })
      .eq('id', id);

    if (error) throw error;
  },

  async activate(id: string): Promise<void> {
    if (isLocalStorageMode()) {
      localDb.update<Product>('products', id, { status: 'ACTIVE' as any });
      return;
    }

    const { error } = await supabase
      .from('products')
      .update({ status: 'ACTIVE' })
      .eq('id', id);

    if (error) throw error;
  },

  async getCategories(orgId: string): Promise<string[]> {
    if (isLocalStorageMode()) {
      const products = localDb.getProducts(orgId);
      const categories = new Set(products.map(p => p.category).filter(Boolean));
      return Array.from(categories) as string[];
    }
    const { data, error } = await supabase
      .from('products')
      .select('category')
      .eq('organization_id', orgId)
      .not('category', 'is', null);

    if (error) throw error;
    const categories = [...new Set(data?.map(p => p.category).filter(Boolean))] as string[];
    return categories;
  },

  async getPerformance(orgId: string, dateFrom?: string, dateTo?: string) {
    const { data, error } = await supabase.rpc('get_product_performance', {
      p_org_id: orgId,
      p_date_from: dateFrom || null,
      p_date_to: dateTo || null,
    });

    if (error) throw error;
    return data;
  },
};
