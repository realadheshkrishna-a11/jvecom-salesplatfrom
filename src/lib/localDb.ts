// ============================================================================
// SalesOS — LocalStorage Database Engine (localDb)
// Production-grade client-side database provider for offline testing & data persistence.
// Allows all CRUD operations to work instantly and persist across page reloads.
// ============================================================================

import type {
  Organization, Profile, Team, Product, Customer, Lead, LeadActivity,
  FollowUp, Sale, SaleItem, Target, TargetMilestone, XPRule, XPTransaction,
  Level, Achievement, UserAchievement, CommissionRule, CommissionRecord,
  BonusRule, BonusRecord, Notification, AuditLog, LeaderboardEntry
} from '@/types';
import {
  UserRole, OrgStatus, EmployeeStatus, TeamStatus, ProductStatus, CustomerStatus, LeadStage,
  LeadActivityType, FollowUpStatus,
  PaymentStatus, PaymentMethod, TargetType, TargetScope, TargetPeriod, XPSourceType,
  CompensationStatus, BonusConditionType, CommissionRuleType, NotificationType, AuditAction, EntityType
} from '@/types';

export function isLocalStorageMode(): boolean {
  try {
    const forced = typeof localStorage !== 'undefined' ? localStorage.getItem('salesos_db_mode') : null;
    if (forced === 'local') return true;
    if (forced === 'supabase') return false;
  } catch {}

  const url = import.meta.env.VITE_SUPABASE_URL;
  // If no Supabase URL is set or it's a placeholder, use localDb automatically
  if (!url || url.includes('placeholder') || url.includes('your-project-id')) {
    return true;
  }
  return false;
}

export function setStorageMode(mode: 'local' | 'supabase') {
  localStorage.setItem('salesos_db_mode', mode);
}

// Generate simple browser UUID
export function generateUUID(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// Low-level collection helpers
export function getCollection<T>(key: string, defaultData: T[] = []): T[] {
  try {
    const raw = localStorage.getItem(`salesos_${key}`);
    if (!raw) {
      localStorage.setItem(`salesos_${key}`, JSON.stringify(defaultData));
      return defaultData;
    }
    return JSON.parse(raw) as T[];
  } catch (err) {
    console.error(`Error reading collection ${key}:`, err);
    return defaultData;
  }
}

export function setCollection<T>(key: string, items: T[]): void {
  try {
    localStorage.setItem(`salesos_${key}`, JSON.stringify(items));
  } catch (err) {
    console.error(`Error writing collection ${key}:`, err);
  }
}

class LocalDatabase {
  private initialized = false;

  constructor() {
    this.init();
  }

  public init() {
    if (typeof window !== 'undefined') {
      this.initialized = true;
    }
  }

  // Generic Operations
  public getAll<T>(collectionKey: string): T[] {
    const list = getCollection<T>(collectionKey);
    if (collectionKey === 'profiles') {
      return (list as any[]).map(p => ({
        ...p,
        role: p.role || UserRole.SALES_REP,
        status: p.status || EmployeeStatus.ACTIVE,
      })) as T[];
    }
    return list;
  }

  public getById<T extends { id: string }>(collectionKey: string, id: string): T | undefined {
    const list = getCollection<T>(collectionKey);
    return list.find(item => item.id === id);
  }

  public insert<T extends { id?: string; created_at?: string; updated_at?: string }>(
    collectionKey: string,
    record: T
  ): T {
    const list = getCollection<T>(collectionKey);
    const now = new Date().toISOString();
    const itemWithDefaults: T = {
      ...record,
      id: record.id || generateUUID(),
      created_at: record.created_at || now,
      updated_at: record.updated_at || now,
    };
    list.unshift(itemWithDefaults);
    setCollection(collectionKey, list);
    return itemWithDefaults;
  }

  public update<T extends { id: string; updated_at?: string }>(
    collectionKey: string,
    id: string,
    updates: Partial<T>
  ): T {
    const list = getCollection<T>(collectionKey);
    const idx = list.findIndex(i => i.id === id);
    if (idx === -1) {
      throw new Error(`Record with id ${id} not found in ${collectionKey}`);
    }
    const updated = {
      ...list[idx],
      ...updates,
      updated_at: new Date().toISOString(),
    };
    list[idx] = updated;
    setCollection(collectionKey, list);
    return updated;
  }

  public delete<T extends { id: string }>(collectionKey: string, id: string): boolean {
    const list = getCollection<T>(collectionKey);
    const filtered = list.filter(i => i.id !== id);
    if (filtered.length === list.length) return false;
    setCollection(collectionKey, filtered);
    return true;
  }

  // Teams Specialized
  public getTeams(orgId: string): Team[] {
    const teams = getCollection<Team>('teams').filter(t => t.organization_id === orgId);
    const profiles = getCollection<Profile>('profiles');

    return teams.map(t => {
      const manager = profiles.find(p => p.id === t.manager_id);
      const memberCount = profiles.filter(p => p.team_id === t.id).length;
      return {
        ...t,
        manager: manager ? {
          id: manager.id,
          first_name: manager.first_name,
          last_name: manager.last_name,
          avatar_url: manager.avatar_url,
          email: manager.email,
        } as any : undefined,
        member_count: memberCount,
      };
    });
  }

  public createTeam(orgId: string, input: { name: string; description?: string | null; manager_id?: string | null }): Team {
    const profiles = getCollection<Profile>('profiles');
    const manager = input.manager_id ? profiles.find(p => p.id === input.manager_id) : undefined;
    const newTeam: Team = {
      id: generateUUID(),
      organization_id: orgId,
      name: input.name,
      description: input.description || null,
      manager_id: input.manager_id || null,
      status: TeamStatus.ACTIVE,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      manager: manager as any,
      member_count: 0,
    };
    return this.insert<Team>('teams', newTeam);
  }

  // Products Specialized
  public getProducts(orgId: string, filters: { search?: string; status?: string } = {}): Product[] {
    let list = getCollection<Product>('products').filter(p => p.organization_id === orgId);
    if (filters.status && filters.status !== 'ALL') {
      list = list.filter(p => p.status === filters.status);
    }
    if (filters.search) {
      const s = filters.search.toLowerCase();
      list = list.filter(p =>
        p.name.toLowerCase().includes(s) ||
        (p.sku && p.sku.toLowerCase().includes(s)) ||
        (p.category && p.category.toLowerCase().includes(s))
      );
    }
    return list;
  }

  public createProduct(orgId: string, input: Partial<Product>): Product {
    const newProduct: Product = {
      id: generateUUID(),
      organization_id: orgId,
      name: input.name || 'Untitled Product',
      sku: input.sku || `SKU-${Date.now().toString().slice(-4)}`,
      category: input.category || 'Software Development',
      description: input.description || null,
      cost: input.cost || 0,
      selling_price: input.selling_price || 0,
      status: (input.status as ProductStatus) || ProductStatus.ACTIVE,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      image_url: null,
    };
    return this.insert<Product>('products', newProduct);
  }

  // Customers Specialized
  public getCustomers(orgId: string, filters: { search?: string; status?: string } = {}): Customer[] {
    let list = getCollection<Customer>('customers').filter(c => c.organization_id === orgId);
    if (filters.status && filters.status !== 'ALL') {
      list = list.filter(c => c.status === filters.status);
    }
    if (filters.search) {
      const s = filters.search.toLowerCase();
      list = list.filter(c =>
        c.first_name.toLowerCase().includes(s) ||
        c.last_name.toLowerCase().includes(s) ||
        (c.email && c.email.toLowerCase().includes(s)) ||
        (c.company && c.company.toLowerCase().includes(s))
      );
    }
    return list;
  }

  public createCustomer(orgId: string, input: Partial<Customer>): Customer {
    const newCust: Customer = {
      id: generateUUID(),
      organization_id: orgId,
      first_name: input.first_name || '',
      last_name: input.last_name || '',
      email: input.email || null,
      phone: input.phone || null,
      company: input.company || null,
      city: input.city || null,
      state: input.state || null,
      country: input.country || 'India',
      address: input.address || null,
      status: (input.status as CustomerStatus) || CustomerStatus.LEAD,
      lead_source: input.lead_source || 'Direct',
      assigned_to: input.assigned_to || null,
      notes: input.notes || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    return this.insert<Customer>('customers', newCust);
  }

  // Leads Specialized
  public getLeads(orgId: string, filters: { stage?: string; assigned_to?: string; search?: string } = {}): Lead[] {
    let list = getCollection<Lead>('leads').filter(l => l.organization_id === orgId);
    const customers = getCollection<Customer>('customers');
    const profiles = getCollection<Profile>('profiles');
    const products = getCollection<Product>('products');

    if (filters.stage) {
      list = list.filter(l => l.stage === filters.stage);
    }
    if (filters.assigned_to) {
      list = list.filter(l => l.assigned_to === filters.assigned_to);
    }
    if (filters.search) {
      const s = filters.search.toLowerCase();
      list = list.filter(l =>
        (l.title ? l.title.toLowerCase().includes(s) : false) ||
        (l.notes ? l.notes.toLowerCase().includes(s) : false)
      );
    }

    return list.map(lead => ({
      ...lead,
      customer: customers.find(c => c.id === lead.customer_id),
      assigned_salesperson: profiles.find(p => p.id === lead.assigned_to),
      product: products.find(p => p.id === lead.product_id),
    }));
  }

  public createLead(orgId: string, input: Partial<Lead>): Lead {
    const newLead: Lead = {
      id: generateUUID(),
      organization_id: orgId,
      customer_id: input.customer_id || '',
      product_id: input.product_id || null,
      assigned_to: input.assigned_to || null,
      team_id: input.team_id || null,
      lead_source_id: input.lead_source_id || null,
      lead_source: input.lead_source || input.source || 'Website',
      source: input.source || input.lead_source || 'Website',
      title: input.title || 'New Opportunity',
      stage: (input.stage as LeadStage) || LeadStage.NEW,
      expected_value: Number(input.expected_value) || 0,
      probability: Number(input.probability) || 20,
      expected_close_date: input.expected_close_date || null,
      next_follow_up_date: input.next_follow_up_date || null,
      notes: input.notes || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    const saved = this.insert<Lead>('leads', newLead);
    const customers = getCollection<Customer>('customers');
    const products = getCollection<Product>('products');
    const profiles = getCollection<Profile>('profiles');
    return {
      ...saved,
      customer: customers.find(c => c.id === saved.customer_id),
      product: products.find(p => p.id === saved.product_id),
      assigned_salesperson: profiles.find(p => p.id === saved.assigned_to),
    };
  }

  public updateLeadStage(leadId: string, stage: LeadStage): Lead {
    const updated = this.update<Lead>('leads', leadId, { stage });
    const customers = getCollection<Customer>('customers');
    const products = getCollection<Product>('products');
    const profiles = getCollection<Profile>('profiles');
    return {
      ...updated,
      customer: customers.find(c => c.id === updated.customer_id),
      product: products.find(p => p.id === updated.product_id),
      assigned_salesperson: profiles.find(p => p.id === updated.assigned_to),
    };
  }

  public deleteLead(leadId: string): boolean {
    return this.delete<Lead>('leads', leadId);
  }

  public getLeadActivities(leadId: string): LeadActivity[] {
    const activities = getCollection<LeadActivity>('lead_activities').filter(a => a.lead_id === leadId);
    const profiles = getCollection<Profile>('profiles');
    return activities
      .sort((a, b) => new Date(b.activity_date || b.created_at || '').getTime() - new Date(a.activity_date || a.created_at || '').getTime())
      .map(act => ({
        ...act,
        user: profiles.find(p => p.id === act.user_id) ? {
          id: act.user_id,
          first_name: profiles.find(p => p.id === act.user_id)!.first_name,
          last_name: profiles.find(p => p.id === act.user_id)!.last_name,
          avatar_url: profiles.find(p => p.id === act.user_id)!.avatar_url,
        } as any : undefined,
      }));
  }

  public addLeadActivity(orgId: string, leadId: string, userId: string, input: any): LeadActivity {
    const newAct: LeadActivity = {
      id: generateUUID(),
      organization_id: orgId,
      lead_id: leadId,
      user_id: userId,
      type: input.type,
      description: input.description || null,
      outcome: input.outcome || null,
      activity_date: input.activity_date || new Date().toISOString(),
      created_at: new Date().toISOString(),
    };
    const saved = this.insert<LeadActivity>('lead_activities', newAct);
    const profiles = getCollection<Profile>('profiles');
    const u = profiles.find(p => p.id === userId);
    return {
      ...saved,
      user: u ? { id: u.id, first_name: u.first_name, last_name: u.last_name, avatar_url: u.avatar_url } as any : undefined,
    };
  }

  public getFollowUps(orgId: string, filters: { leadId?: string; userId?: string; status?: FollowUpStatus; filter?: 'today' | 'overdue' | 'upcoming' } = {}): FollowUp[] {
    let list = getCollection<FollowUp>('follow_ups').filter(f => f.organization_id === orgId);
    if (filters.leadId) list = list.filter(f => f.lead_id === filters.leadId);
    if (filters.userId) list = list.filter(f => f.user_id === filters.userId);
    if (filters.status) list = list.filter(f => f.status === filters.status);

    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);
    if (filters.filter === 'today') {
      list = list.filter(f => f.due_date?.startsWith(todayStr) && f.status === FollowUpStatus.PENDING);
    } else if (filters.filter === 'overdue') {
      list = list.filter(f => f.due_date && f.due_date < todayStr && f.status === FollowUpStatus.PENDING);
    } else if (filters.filter === 'upcoming') {
      list = list.filter(f => f.due_date && f.due_date > todayStr && f.status === FollowUpStatus.PENDING);
    }

    const leads = getCollection<Lead>('leads');
    const customers = getCollection<Customer>('customers');
    const profiles = getCollection<Profile>('profiles');

    return list.map(f => {
      const l = leads.find(ld => ld.id === f.lead_id);
      const cust = l ? customers.find(c => c.id === l.customer_id) : undefined;
      const u = profiles.find(p => p.id === f.user_id);
      return {
        ...f,
        lead: l ? {
          id: l.id,
          title: l.title,
          customer: cust ? { first_name: cust.first_name, last_name: cust.last_name, phone: cust.phone } : undefined,
        } as any : undefined,
        user: u ? { id: u.id, first_name: u.first_name, last_name: u.last_name } as any : undefined,
      };
    });
  }

  public createFollowUp(orgId: string, userId: string, input: any): FollowUp {
    const newFu: FollowUp = {
      id: generateUUID(),
      organization_id: orgId,
      lead_id: input.lead_id,
      user_id: userId,
      due_date: input.due_date,
      due_time: input.due_time || null,
      reminder: input.reminder || false,
      notes: input.notes || null,
      status: FollowUpStatus.PENDING,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    return this.insert<FollowUp>('follow_ups', newFu);
  }

  public updateFollowUpStatus(id: string, status: FollowUpStatus, completionNotes?: string): FollowUp {
    const existing = this.getById<FollowUp>('follow_ups', id);
    return this.update<FollowUp>('follow_ups', id, {
      status,
      notes: completionNotes ? `${existing?.notes ? existing.notes + ' | ' : ''}Note: ${completionNotes}` : existing?.notes,
    });
  }

  // Sales & Order Qualification Engine
  public getSales(orgId: string, filters: { payment_status?: string; user_id?: string } = {}): Sale[] {
    let list = getCollection<Sale>('sales').filter(s => s.organization_id === orgId);
    const customers = getCollection<Customer>('customers');
    const profiles = getCollection<Profile>('profiles');
    const saleItems = getCollection<SaleItem>('sale_items');

    if (filters.payment_status) {
      list = list.filter(s => s.payment_status === filters.payment_status);
    }
    if (filters.user_id) {
      list = list.filter(s => s.user_id === filters.user_id);
    }

    return list.map(sale => ({
      ...sale,
      customer: customers.find(c => c.id === sale.customer_id),
      user: profiles.find(p => p.id === sale.user_id),
      items: saleItems.filter(i => i.sale_id === sale.id),
    }));
  }

  public createSale(
    orgId: string,
    input: {
      user_id: string;
      customer_id: string;
      items: Array<{ product_id: string; quantity: number; unit_price: number; discount?: number }>;
      payment_method?: string;
      notes?: string;
      lead_id?: string;
    }
  ): Sale {
    const profiles = getCollection<Profile>('profiles');
    const products = getCollection<Product>('products');
    const customers = getCollection<Customer>('customers');

    const seller = profiles.find(p => p.id === input.user_id);
    const saleId = generateUUID();
    const invoiceNumber = `INV-${new Date().getFullYear()}-${String(getCollection<Sale>('sales').length + 42).padStart(4, '0')}`;

    let subtotal = 0;
    let totalDiscount = 0;
    const createdItems: SaleItem[] = [];

    input.items.forEach(it => {
      const lineDisc = it.discount || 0;
      const lineTotal = (it.quantity * it.unit_price) - lineDisc;
      subtotal += lineTotal;
      totalDiscount += lineDisc;

      const prod = products.find(p => p.id === it.product_id);
      const itemRecord: SaleItem = {
        id: generateUUID(),
        organization_id: orgId,
        sale_id: saleId,
        product_id: it.product_id,
        quantity: it.quantity,
        unit_price: it.unit_price,
        discount: lineDisc,
        total: lineTotal,
        created_at: new Date().toISOString(),
        product: prod,
      };
      this.insert<SaleItem>('sale_items', itemRecord);
      createdItems.push(itemRecord);
    });

    const taxAmount = Math.round(subtotal * 0.18 * 100) / 100;
    const grandTotal = Math.round((subtotal + taxAmount) * 100) / 100;

    const newSale: Sale = {
      id: saleId,
      organization_id: orgId,
      user_id: input.user_id,
      customer_id: input.customer_id,
      team_id: seller?.team_id || null,
      lead_id: input.lead_id || null,
      invoice_number: invoiceNumber,
      subtotal,
      discount: totalDiscount,
      tax: taxAmount,
      total: grandTotal,
      payment_status: PaymentStatus.PAID,
      payment_method: (input.payment_method as PaymentMethod) || PaymentMethod.UPI,
      sale_date: new Date().toISOString(),
      notes: input.notes || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const savedSale = this.insert<Sale>('sales', newSale);

    // Auto-calculate Commission Record (Default 5% or product-specific)
    const commRate = 5.0;
    const commAmount = Math.round((subtotal * (commRate / 100)) * 100) / 100;
    const commRecord: CommissionRecord = {
      id: generateUUID(),
      organization_id: orgId,
      user_id: input.user_id,
      sale_id: saleId,
      rule_id: '2',
      product_id: input.items[0]?.product_id || null,
      base_amount: subtotal,
      commission_rate: commRate,
      commission_amount: commAmount,
      amount: commAmount,
      status: CompensationStatus.APPROVED,
      approved_at: new Date().toISOString(),
      paid_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    this.insert<CommissionRecord>('commission_records', commRecord);

    // Award XP to closer (100 base + 25 per 10k)
    const xpBonus = 100 + Math.floor(grandTotal / 10000) * 25;
    this.insert<XPTransaction>('xp_transactions', {
      id: generateUUID(),
      organization_id: orgId,
      user_id: input.user_id,
      points: xpBonus,
      description: `Sale Qualified: ${invoiceNumber}`,
      source_type: XPSourceType.SALE,
      source_id: saleId,
      rule_id: null,
      reversed_at: null,
      created_at: new Date().toISOString(),
    });

    // Log compliance audit
    this.insert<AuditLog>('audit_logs', {
      id: generateUUID(),
      organization_id: orgId,
      actor_id: input.user_id,
      user_id: input.user_id,
      action: AuditAction.SALE_CREATED,
      entity_type: EntityType.SALE,
      entity_id: saleId,
      details: { invoice: invoiceNumber, amount: grandTotal },
      ip_address: '127.0.0.1',
      created_at: new Date().toISOString(),
    });

    // Create Notification
    this.insert<Notification>('notifications', {
      id: generateUUID(),
      organization_id: orgId,
      user_id: input.user_id,
      type: NotificationType.SALE_CREATED,
      title: `Sale Qualified: ₹${grandTotal.toLocaleString()}`,
      message: `${invoiceNumber} closed! Earned ₹${commAmount.toLocaleString()} commission & +${xpBonus} XP.`,
      link_url: '/sales',
      is_read: false,
      read: false,
      read_at: null,
      entity_type: EntityType.SALE,
      entity_id: saleId,
      created_at: new Date().toISOString(),
    });

    return {
      ...savedSale,
      customer: customers.find(c => c.id === savedSale.customer_id),
      user: seller,
      items: createdItems,
    };
  }

  public refundSale(saleId: string, reason: string): Sale {
    const sale = this.getById<Sale>('sales', saleId);
    if (!sale) throw new Error('Sale not found');

    const updatedSale = this.update<Sale>('sales', saleId, {
      payment_status: PaymentStatus.REFUNDED,
      notes: reason ? `${sale.notes ? sale.notes + ' | ' : ''}Refund Reason: ${reason}` : sale.notes,
    });

    // Reverse associated commissions
    const comms = getCollection<CommissionRecord>('commission_records').filter(c => c.sale_id === saleId);
    comms.forEach(c => {
      this.update<CommissionRecord>('commission_records', c.id, {
        status: CompensationStatus.REVERSED,
      });
    });

    // Log audit
    this.insert<AuditLog>('audit_logs', {
      id: generateUUID(),
      organization_id: sale.organization_id,
      actor_id: sale.user_id,
      action: AuditAction.SALE_REFUNDED,
      entity_type: EntityType.SALE,
      entity_id: saleId,
      details: { invoice: sale.invoice_number, reason },
      ip_address: '127.0.0.1',
      created_at: new Date().toISOString(),
    });

    return updatedSale;
  }

  // Leaderboard Aggregation
  public getLeaderboard(orgId: string, metric: 'REVENUE' | 'SALES_COUNT' | 'XP', limit = 10): LeaderboardEntry[] {
    const profiles = getCollection<Profile>('profiles').filter(p => p.organization_id === orgId && p.role === UserRole.SALES_REP);
    const sales = getCollection<Sale>('sales').filter(s => s.organization_id === orgId && s.payment_status === PaymentStatus.PAID);
    const xpTx = getCollection<XPTransaction>('xp_transactions').filter(x => x.organization_id === orgId);
    const teams = getCollection<Team>('teams');

    const entries: LeaderboardEntry[] = profiles.map(rep => {
      const repSales = sales.filter(s => s.user_id === rep.id);
      const repRevenue = repSales.reduce((sum, s) => sum + (Number(s.total) || 0), 0);
      const repXP = xpTx.filter(x => x.user_id === rep.id).reduce((sum, x) => sum + (Number(x.points) || 0), 0);
      const repTeam = teams.find(t => t.id === rep.team_id);
      const targetQuota = 500000;
      const targetAttainment = Math.round((repRevenue / targetQuota) * 100);

      return {
        rank: 0,
        user_id: rep.id,
        first_name: rep.first_name,
        last_name: rep.last_name,
        avatar_url: rep.avatar_url,
        team_name: repTeam?.name || 'Individual Closer',
        sales_count: repSales.length,
        revenue: repRevenue,
        target_achievement: targetAttainment,
        xp: repXP,
      };
    });

    // Sort by chosen metric
    entries.sort((a, b) => {
      if (metric === 'REVENUE') return b.revenue - a.revenue;
      if (metric === 'SALES_COUNT') return b.sales_count - a.sales_count;
      return b.xp - a.xp;
    });

    return entries.slice(0, limit).map((entry, index) => ({
      ...entry,
      rank: index + 1,
    }));
  }
}

export const localDb = new LocalDatabase();
