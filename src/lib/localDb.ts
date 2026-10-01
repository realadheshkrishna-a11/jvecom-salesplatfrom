// ============================================================================
// SalesOS — LocalStorage Database Engine (localDb)
// Production-grade client-side database provider for offline testing & demo persistence.
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
  const url = import.meta.env.VITE_SUPABASE_URL;
  if (!url || url.includes('placeholder')) return true;
  const forced = localStorage.getItem('salesos_db_mode');
  if (forced === 'local') return true;
  if (forced === 'supabase') return false;
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

// ============================================================================
// Initial Seed Data (Matching 005_seed.sql)
// ============================================================================

const DEFAULT_ORG_ID = '11111111-1111-1111-1111-111111111111';

export const INITIAL_ORGANIZATION: Organization = {
  id: DEFAULT_ORG_ID,
  name: 'Acme Learning Technologies',
  logo_url: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=128&auto=format&fit=crop',
  email: 'contact@acmelearning.io',
  phone: '+91 80 1234 5678',
  industry: 'EdTech & Corporate Training',
  country: 'India',
  currency: 'INR',
  timezone: 'Asia/Kolkata',
  address: 'Indiranagar 100ft Rd, Bangalore',
  website: 'https://acmelearning.io',
  status: OrgStatus.ACTIVE,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};

export const INITIAL_PROFILES: Profile[] = [
  {
    id: '22222222-2222-2222-2222-222222222222',
    organization_id: DEFAULT_ORG_ID,
    email: 'rajesh.admin@acmelearning.io',
    first_name: 'Abhijith',
    last_name: 'Up',
    avatar_url: null,
    phone: '+91 98111 00001',
    username: 'rajesh_admin',
    employee_id: 'EMP-001',
    joining_date: '2026-01-01',
    role: UserRole.ORG_ADMIN,
    team_id: null,
    manager_id: null,
    status: EmployeeStatus.ACTIVE,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  },
  {
    id: '33333333-3333-3333-3333-333333333331',
    organization_id: DEFAULT_ORG_ID,
    email: 'priya.manager@acmelearning.io',
    first_name: 'Priya',
    last_name: 'Sharma',
    avatar_url: null,
    phone: '+91 98111 00002',
    username: 'priya_sharma',
    employee_id: 'EMP-002',
    joining_date: '2026-01-01',
    role: UserRole.MANAGER,
    team_id: '55555555-5555-5555-5555-555555555551',
    manager_id: '22222222-2222-2222-2222-222222222222',
    status: EmployeeStatus.ACTIVE,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  },
  {
    id: '33333333-3333-3333-3333-333333333332',
    organization_id: DEFAULT_ORG_ID,
    email: 'vikram.manager@acmelearning.io',
    first_name: 'Vikram',
    last_name: 'Seth',
    avatar_url: null,
    phone: '+91 98111 00003',
    username: 'vikram_seth',
    employee_id: 'EMP-003',
    joining_date: '2026-01-01',
    role: UserRole.MANAGER,
    team_id: '55555555-5555-5555-5555-555555555552',
    manager_id: '22222222-2222-2222-2222-222222222222',
    status: EmployeeStatus.ACTIVE,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  },
  {
    id: '44444444-4444-4444-4444-444444444441',
    organization_id: DEFAULT_ORG_ID,
    email: 'arjun.nair@acmelearning.io',
    first_name: 'Arjun',
    last_name: 'Nair',
    avatar_url: null,
    phone: '+91 98111 00004',
    username: 'arjun_nair',
    employee_id: 'EMP-004',
    joining_date: '2026-01-01',
    role: UserRole.SALES_REP,
    team_id: '55555555-5555-5555-5555-555555555551',
    manager_id: '33333333-3333-3333-3333-333333333331',
    status: EmployeeStatus.ACTIVE,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  },
  {
    id: '44444444-4444-4444-4444-444444444442',
    organization_id: DEFAULT_ORG_ID,
    email: 'kavita.menon@acmelearning.io',
    first_name: 'Kavita',
    last_name: 'Menon',
    avatar_url: null,
    phone: '+91 98111 00005',
    username: 'kavita_menon',
    employee_id: 'EMP-005',
    joining_date: '2026-01-01',
    role: UserRole.SALES_REP,
    team_id: '55555555-5555-5555-5555-555555555552',
    manager_id: '33333333-3333-3333-3333-333333333332',
    status: EmployeeStatus.ACTIVE,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  },
  {
    id: '44444444-4444-4444-4444-444444444443',
    organization_id: DEFAULT_ORG_ID,
    email: 'suresh.iyer@acmelearning.io',
    first_name: 'Suresh',
    last_name: 'Iyer',
    avatar_url: null,
    phone: '+91 98111 00006',
    username: 'suresh_iyer',
    employee_id: 'EMP-006',
    joining_date: '2026-01-01',
    role: UserRole.SALES_REP,
    team_id: '55555555-5555-5555-5555-555555555551',
    manager_id: '33333333-3333-3333-3333-333333333331',
    status: EmployeeStatus.ACTIVE,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  },
];

export const INITIAL_TEAMS: Team[] = [
  {
    id: '55555555-5555-5555-5555-555555555551',
    organization_id: DEFAULT_ORG_ID,
    name: 'Alpha Squad (North)',
    description: 'North Region Enterprise & High-Ticket Retail Closers',
    manager_id: '33333333-3333-3333-3333-333333333331',
    status: TeamStatus.ACTIVE,
    created_at: '2026-01-05T00:00:00Z',
    updated_at: '2026-01-05T00:00:00Z',
    manager: {
      id: '33333333-3333-3333-3333-333333333331',
      first_name: 'Priya',
      last_name: 'Sharma',
      avatar_url: null,
      email: 'priya.manager@acmelearning.io',
    } as any,
    member_count: 2,
  },
  {
    id: '55555555-5555-5555-5555-555555555552',
    organization_id: DEFAULT_ORG_ID,
    name: 'Beta Sharks (West)',
    description: 'West Region Growth Acceleration & Digital Upgrades',
    manager_id: '33333333-3333-3333-3333-333333333332',
    status: TeamStatus.ACTIVE,
    created_at: '2026-01-05T00:00:00Z',
    updated_at: '2026-01-05T00:00:00Z',
    manager: {
      id: '33333333-3333-3333-3333-333333333332',
      first_name: 'Vikram',
      last_name: 'Seth',
      avatar_url: null,
      email: 'vikram.manager@acmelearning.io',
    } as any,
    member_count: 1,
  },
];

export const INITIAL_PRODUCTS: Product[] = [
  {
    id: '66666666-6666-6666-6666-666666666661',
    organization_id: DEFAULT_ORG_ID,
    name: 'Full-Stack Python Bootcamp',
    sku: 'SKU-PY-01',
    category: 'Software Development',
    description: 'Comprehensive 6-month Python, Django, React live training program',
    cost: 15000,
    selling_price: 35000,
    status: ProductStatus.ACTIVE,
    created_at: '2026-01-10T00:00:00Z',
    updated_at: '2026-01-10T00:00:00Z',
    image_url: null,
  },
  {
    id: '66666666-6666-6666-6666-666666666662',
    organization_id: DEFAULT_ORG_ID,
    name: 'AI & GenAI Masterclass',
    sku: 'SKU-AI-02',
    category: 'Data & AI',
    description: 'Cutting-edge LLM engineering, LangChain, RAG architecture masterclass',
    cost: 22000,
    selling_price: 65000,
    status: ProductStatus.ACTIVE,
    created_at: '2026-01-15T00:00:00Z',
    updated_at: '2026-01-15T00:00:00Z',
    image_url: null,
  },
  {
    id: '66666666-6666-6666-6666-666666666663',
    organization_id: DEFAULT_ORG_ID,
    name: 'Executive Web Development',
    sku: 'SKU-WEB-03',
    category: 'Software Development',
    description: 'TypeScript, Next.js, Cloud Architectures for tech leads',
    cost: 18000,
    selling_price: 45000,
    status: ProductStatus.ACTIVE,
    created_at: '2026-01-20T00:00:00Z',
    updated_at: '2026-01-20T00:00:00Z',
    image_url: null,
  },
  {
    id: '66666666-6666-6666-6666-666666666664',
    organization_id: DEFAULT_ORG_ID,
    name: 'Cloud & DevOps Engineering',
    sku: 'SKU-DO-04',
    category: 'Cloud & Infra',
    description: 'AWS, Kubernetes, CI/CD, Terraform and Docker architecture',
    cost: 20000,
    selling_price: 55000,
    status: ProductStatus.ACTIVE,
    created_at: '2026-01-25T00:00:00Z',
    updated_at: '2026-01-25T00:00:00Z',
    image_url: null,
  },
];

export const INITIAL_CUSTOMERS: Customer[] = [
  {
    id: '77777777-7777-7777-7777-777777777771',
    organization_id: DEFAULT_ORG_ID,
    first_name: 'Rohan',
    last_name: 'Sharma',
    email: 'rohan.sharma@example.com',
    phone: '+91 98111 22233',
    company: 'Infosys Ltd',
    city: 'Bangalore',
    state: 'Karnataka',
    country: 'India',
    address: 'Indiranagar 100ft Rd',
    status: CustomerStatus.CUSTOMER,
    lead_source: 'Website',
    assigned_to: '44444444-4444-4444-4444-444444444441',
    notes: 'Enrolled in AI & GenAI Masterclass',
    created_at: '2026-02-01T00:00:00Z',
    updated_at: '2026-02-01T00:00:00Z',
  },
  {
    id: '77777777-7777-7777-7777-777777777772',
    organization_id: DEFAULT_ORG_ID,
    first_name: 'Priya',
    last_name: 'Verma',
    email: 'priya.verma@example.com',
    phone: '+91 98222 33344',
    company: 'TCS',
    city: 'Mumbai',
    state: 'Maharashtra',
    country: 'India',
    address: 'Bandra Kurla Complex',
    status: CustomerStatus.CUSTOMER,
    lead_source: 'Referral',
    assigned_to: '44444444-4444-4444-4444-444444444442',
    notes: 'Enrolled in Full-Stack Python',
    created_at: '2026-02-10T00:00:00Z',
    updated_at: '2026-02-10T00:00:00Z',
  },
  {
    id: '77777777-7777-7777-7777-777777777773',
    organization_id: DEFAULT_ORG_ID,
    first_name: 'Amit',
    last_name: 'Patel',
    email: 'amit.patel@example.com',
    phone: '+91 98333 44455',
    company: 'Wipro',
    city: 'Ahmedabad',
    state: 'Gujarat',
    country: 'India',
    address: 'SG Highway',
    status: CustomerStatus.PROSPECT,
    lead_source: 'Direct Call',
    assigned_to: '44444444-4444-4444-4444-444444444441',
    notes: 'Scheduled live demo for Web Dev',
    created_at: '2026-02-15T00:00:00Z',
    updated_at: '2026-02-15T00:00:00Z',
  },
  {
    id: '77777777-7777-7777-7777-777777777774',
    organization_id: DEFAULT_ORG_ID,
    first_name: 'Sneha',
    last_name: 'Reddy',
    email: 'sneha.reddy@example.com',
    phone: '+91 98444 55566',
    company: 'Cognizant',
    city: 'Hyderabad',
    state: 'Telangana',
    country: 'India',
    address: 'Hitec City',
    status: CustomerStatus.LEAD,
    lead_source: 'Meta Ads',
    assigned_to: '44444444-4444-4444-4444-444444444443',
    notes: 'Inquired about DevOps certification',
    created_at: '2026-03-01T00:00:00Z',
    updated_at: '2026-03-01T00:00:00Z',
  },
];

export const INITIAL_LEADS: Lead[] = [
  {
    id: '88888888-8888-8888-8888-888888888881',
    organization_id: DEFAULT_ORG_ID,
    customer_id: '77777777-7777-7777-7777-777777777771',
    product_id: '66666666-6666-6666-6666-666666666662',
    assigned_to: '44444444-4444-4444-4444-444444444441',
    team_id: null,
    lead_source_id: null,
    lead_source: 'Website',
    source: 'Website',
    title: 'Enterprise GenAI Upskilling for Tech Team',
    stage: LeadStage.WON,
    expected_value: 65000,
    probability: 100,
    expected_close_date: null,
    next_follow_up_date: null,
    notes: 'Successfully closed and paid via UPI',
    created_at: '2026-03-01T10:00:00Z',
    updated_at: '2026-03-04T15:00:00Z',
    customer: INITIAL_CUSTOMERS[0],
    product: INITIAL_PRODUCTS[1],
    assigned_salesperson: INITIAL_PROFILES[3],
  },
  {
    id: '88888888-8888-8888-8888-888888888882',
    organization_id: DEFAULT_ORG_ID,
    customer_id: '77777777-7777-7777-7777-777777777772',
    product_id: '66666666-6666-6666-6666-666666666661',
    assigned_to: '44444444-4444-4444-4444-444444444442',
    team_id: null,
    lead_source_id: null,
    lead_source: 'Referral',
    source: 'Referral',
    title: 'Python Career Transition Bootcamp',
    stage: LeadStage.WON,
    expected_value: 35000,
    probability: 100,
    expected_close_date: null,
    next_follow_up_date: null,
    notes: 'Transferred full fee',
    created_at: '2026-03-02T11:00:00Z',
    updated_at: '2026-03-05T12:00:00Z',
    customer: INITIAL_CUSTOMERS[1],
    product: INITIAL_PRODUCTS[0],
    assigned_salesperson: INITIAL_PROFILES[4],
  },
  {
    id: '88888888-8888-8888-8888-888888888883',
    organization_id: DEFAULT_ORG_ID,
    customer_id: '77777777-7777-7777-7777-777777777773',
    product_id: '66666666-6666-6666-6666-666666666663',
    assigned_to: '44444444-4444-4444-4444-444444444441',
    team_id: null,
    lead_source_id: null,
    lead_source: 'Direct Call',
    source: 'Direct Call',
    title: 'Executive Web Dev Program',
    stage: LeadStage.NEGOTIATION,
    expected_value: 45000,
    probability: 75,
    expected_close_date: null,
    next_follow_up_date: null,
    notes: 'Requested flexible EMI schedule',
    created_at: '2026-03-05T09:00:00Z',
    updated_at: '2026-03-06T14:00:00Z',
    customer: INITIAL_CUSTOMERS[2],
    product: INITIAL_PRODUCTS[2],
    assigned_salesperson: INITIAL_PROFILES[3],
  },
  {
    id: '88888888-8888-8888-8888-888888888884',
    organization_id: DEFAULT_ORG_ID,
    customer_id: '77777777-7777-7777-7777-777777777774',
    product_id: '66666666-6666-6666-6666-666666666664',
    assigned_to: '44444444-4444-4444-4444-444444444443',
    team_id: null,
    lead_source_id: null,
    lead_source: 'Meta Ads',
    source: 'Meta Ads',
    title: 'Corporate DevOps Accelerator',
    stage: LeadStage.DEMO,
    expected_value: 55000,
    probability: 50,
    expected_close_date: null,
    next_follow_up_date: null,
    notes: 'Demo scheduled for Friday 4 PM',
    created_at: '2026-03-07T14:00:00Z',
    updated_at: '2026-03-07T14:00:00Z',
    customer: INITIAL_CUSTOMERS[3],
    product: INITIAL_PRODUCTS[3],
    assigned_salesperson: INITIAL_PROFILES[5],
  },
  {
    id: '88888888-8888-8888-8888-888888888885',
    organization_id: DEFAULT_ORG_ID,
    customer_id: '77777777-7777-7777-7777-777777777774',
    product_id: '66666666-6666-6666-6666-666666666662',
    assigned_to: '44444444-4444-4444-4444-444444444441',
    team_id: null,
    lead_source_id: null,
    lead_source: 'Google Search',
    source: 'Google Search',
    title: 'Inquiry - GenAI for Management',
    stage: LeadStage.NEW,
    expected_value: 65000,
    probability: 20,
    expected_close_date: null,
    next_follow_up_date: null,
    notes: 'Downloaded syllabus from website',
    created_at: '2026-03-08T10:00:00Z',
    updated_at: '2026-03-08T10:00:00Z',
    customer: INITIAL_CUSTOMERS[3],
    product: INITIAL_PRODUCTS[1],
    assigned_salesperson: INITIAL_PROFILES[3],
  },
];

export const INITIAL_LEAD_ACTIVITIES: LeadActivity[] = [
  {
    id: 'act-1',
    organization_id: DEFAULT_ORG_ID,
    lead_id: '88888888-8888-8888-8888-888888888881',
    user_id: '44444444-4444-4444-4444-444444444441',
    type: LeadActivityType.DEMO,
    description: 'Delivered custom GenAI architecture demo for Tech team',
    outcome: 'EXCELLENT',
    activity_date: '2026-03-03T14:30:00Z',
    created_at: '2026-03-03T14:30:00Z',
  },
  {
    id: 'act-2',
    organization_id: DEFAULT_ORG_ID,
    lead_id: '88888888-8888-8888-8888-888888888883',
    user_id: '44444444-4444-4444-4444-444444444441',
    type: LeadActivityType.CALL,
    description: 'Discussed 3-part installment plan via phone',
    outcome: 'POSITIVE',
    activity_date: '2026-03-05T11:00:00Z',
    created_at: '2026-03-05T11:00:00Z',
  },
  {
    id: 'act-3',
    organization_id: DEFAULT_ORG_ID,
    lead_id: '88888888-8888-8888-8888-888888888884',
    user_id: '44444444-4444-4444-4444-444444444443',
    type: LeadActivityType.WHATSAPP,
    description: 'Shared syllabus PDF and lab schedule on WhatsApp',
    outcome: 'DELIVERED',
    activity_date: '2026-03-07T10:15:00Z',
    created_at: '2026-03-07T10:15:00Z',
  },
];

export const INITIAL_FOLLOW_UPS: FollowUp[] = [
  {
    id: 'fu-1',
    organization_id: DEFAULT_ORG_ID,
    lead_id: '88888888-8888-8888-8888-888888888883',
    user_id: '44444444-4444-4444-4444-444444444441',
    due_date: '2026-10-05',
    due_time: '15:00',
    reminder: true,
    status: FollowUpStatus.PENDING,
    notes: 'Follow up on EMI payment link and invoice',
    created_at: '2026-03-05T11:05:00Z',
    updated_at: '2026-03-05T11:05:00Z',
  },
  {
    id: 'fu-2',
    organization_id: DEFAULT_ORG_ID,
    lead_id: '88888888-8888-8888-8888-888888888884',
    user_id: '44444444-4444-4444-4444-444444444443',
    due_date: '2026-10-08',
    due_time: '16:00',
    reminder: true,
    status: FollowUpStatus.PENDING,
    notes: 'Schedule product walkthrough demo with team lead',
    created_at: '2026-03-07T10:20:00Z',
    updated_at: '2026-03-07T10:20:00Z',
  },
];

export const INITIAL_SALES: Sale[] = [
  {
    id: '99999999-9999-9999-9999-999999999991',
    organization_id: DEFAULT_ORG_ID,
    user_id: '44444444-4444-4444-4444-444444444441',
    customer_id: '77777777-7777-7777-7777-777777777771',
    team_id: '55555555-5555-5555-5555-555555555551',
    lead_id: '88888888-8888-8888-8888-888888888881',
    invoice_number: 'INV-2026-0041',
    subtotal: 55084.75,
    discount: 0,
    tax: 9915.25,
    total: 65000,
    payment_status: PaymentStatus.PAID,
    payment_method: PaymentMethod.UPI,
    sale_date: '2026-03-04T15:00:00Z',
    notes: 'Paid in full',
    created_at: '2026-03-04T15:00:00Z',
    updated_at: '2026-03-04T15:00:00Z',
    customer: INITIAL_CUSTOMERS[0],
    user: INITIAL_PROFILES[3],
  },
  {
    id: '99999999-9999-9999-9999-999999999992',
    organization_id: DEFAULT_ORG_ID,
    user_id: '44444444-4444-4444-4444-444444444442',
    customer_id: '77777777-7777-7777-7777-777777777772',
    team_id: '55555555-5555-5555-5555-555555555552',
    lead_id: '88888888-8888-8888-8888-888888888882',
    invoice_number: 'INV-2026-0040',
    subtotal: 29661.02,
    discount: 0,
    tax: 5338.98,
    total: 35000,
    payment_status: PaymentStatus.PAID,
    payment_method: PaymentMethod.BANK_TRANSFER,
    sale_date: '2026-03-05T12:00:00Z',
    notes: 'Direct bank transfer',
    created_at: '2026-03-05T12:00:00Z',
    updated_at: '2026-03-05T12:00:00Z',
    customer: INITIAL_CUSTOMERS[1],
    user: INITIAL_PROFILES[4],
  },
];

export const INITIAL_SALE_ITEMS: SaleItem[] = [
  {
    id: 'item-1',
    organization_id: DEFAULT_ORG_ID,
    sale_id: '99999999-9999-9999-9999-999999999991',
    product_id: '66666666-6666-6666-6666-666666666662',
    quantity: 1,
    unit_price: 65000,
    discount: 0,
    total: 65000,
    created_at: '2026-03-04T15:00:00Z',
    product: INITIAL_PRODUCTS[1],
  },
  {
    id: 'item-2',
    organization_id: DEFAULT_ORG_ID,
    sale_id: '99999999-9999-9999-9999-999999999992',
    product_id: '66666666-6666-6666-6666-666666666661',
    quantity: 1,
    unit_price: 35000,
    discount: 0,
    total: 35000,
    created_at: '2026-03-05T12:00:00Z',
    product: INITIAL_PRODUCTS[0],
  },
];

export const INITIAL_COMMISSION_RULES: CommissionRule[] = [
  {
    id: '1',
    organization_id: DEFAULT_ORG_ID,
    name: 'AI Accelerator Incentive',
    rule_name: 'AI Accelerator Incentive',
    type: CommissionRuleType.PERCENTAGE,
    rate: 8.0,
    description: 'Special 8% commission on GenAI Masterclass enrollments',
    is_active: true,
    product_id: '66666666-6666-6666-6666-666666666662',
    user_id: null,
    team_id: null,
    tier_min: null,
    tier_max: null,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  },
  {
    id: '2',
    organization_id: DEFAULT_ORG_ID,
    name: 'Standard Base Commission',
    rule_name: 'Standard Base Commission',
    type: CommissionRuleType.PERCENTAGE,
    rate: 5.0,
    description: 'Standard 5% commission on all completed courses',
    is_active: true,
    product_id: null,
    user_id: null,
    team_id: null,
    tier_min: null,
    tier_max: null,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  },
];

export const INITIAL_COMMISSION_RECORDS: CommissionRecord[] = [
  {
    id: 'comm-1',
    organization_id: DEFAULT_ORG_ID,
    user_id: '44444444-4444-4444-4444-444444444441',
    sale_id: '99999999-9999-9999-9999-999999999991',
    rule_id: '1',
    product_id: '66666666-6666-6666-6666-666666666662',
    base_amount: 65000,
    commission_rate: 8.0,
    commission_amount: 5200,
    amount: 5200,
    status: CompensationStatus.APPROVED,
    approved_at: '2026-03-04T16:00:00Z',
    paid_at: null,
    created_at: '2026-03-04T15:00:00Z',
    updated_at: '2026-03-04T16:00:00Z',
    user: INITIAL_PROFILES[3],
    sale: INITIAL_SALES[0],
    rule: INITIAL_COMMISSION_RULES[0],
  },
  {
    id: 'comm-2',
    organization_id: DEFAULT_ORG_ID,
    user_id: '44444444-4444-4444-4444-444444444442',
    sale_id: '99999999-9999-9999-9999-999999999992',
    rule_id: '2',
    product_id: '66666666-6666-6666-6666-666666666661',
    base_amount: 35000,
    commission_rate: 5.0,
    commission_amount: 1750,
    amount: 1750,
    status: CompensationStatus.APPROVED,
    approved_at: '2026-03-05T13:00:00Z',
    paid_at: null,
    created_at: '2026-03-05T12:00:00Z',
    updated_at: '2026-03-05T13:00:00Z',
    user: INITIAL_PROFILES[4],
    sale: INITIAL_SALES[1],
    rule: INITIAL_COMMISSION_RULES[1],
  },
];

export const INITIAL_BONUS_RULES: BonusRule[] = [
  {
    id: '1',
    organization_id: DEFAULT_ORG_ID,
    name: 'Monthly Revenue Champion',
    condition_type: BonusConditionType.REVENUE,
    condition_value: 300000,
    bonus_amount: 20000,
    period: TargetPeriod.MONTHLY,
    is_active: true,
    product_id: null,
    team_id: null,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  },
  {
    id: '2',
    organization_id: DEFAULT_ORG_ID,
    name: 'Top Deal Closer',
    condition_type: BonusConditionType.SALES_COUNT,
    condition_value: 8,
    bonus_amount: 15000,
    period: TargetPeriod.MONTHLY,
    is_active: true,
    product_id: null,
    team_id: null,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  },
];

export const INITIAL_BONUS_RECORDS: BonusRecord[] = [
  {
    id: 'bonus-1',
    organization_id: DEFAULT_ORG_ID,
    user_id: '44444444-4444-4444-4444-444444444441',
    rule_id: '1',
    amount: 20000,
    status: CompensationStatus.APPROVED,
    approved_at: '2026-03-01T10:00:00Z',
    paid_at: null,
    period_start: '2026-02-01',
    period_end: '2026-02-28',
    created_at: '2026-03-01T10:00:00Z',
    updated_at: '2026-03-01T10:00:00Z',
    user: INITIAL_PROFILES[3],
    rule: INITIAL_BONUS_RULES[0],
  },
];

export const INITIAL_LEVELS: Level[] = [
  { id: '1', organization_id: DEFAULT_ORG_ID, name: 'Rookie Closer', min_xp: 0, level_order: 1, icon: 'Zap', created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z' },
  { id: '2', organization_id: DEFAULT_ORG_ID, name: 'Rising Star', min_xp: 1000, level_order: 2, icon: 'Star', created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z' },
  { id: '3', organization_id: DEFAULT_ORG_ID, name: 'Deal Hunter', min_xp: 2500, level_order: 3, icon: 'Shield', created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z' },
  { id: '4', organization_id: DEFAULT_ORG_ID, name: 'Top Gun Closer', min_xp: 5000, level_order: 4, icon: 'Award', created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z' },
  { id: '5', organization_id: DEFAULT_ORG_ID, name: 'Sales Legend', min_xp: 10000, level_order: 5, icon: 'Crown', created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z' },
];

export const INITIAL_ACHIEVEMENTS: Achievement[] = [
  { id: '1', organization_id: DEFAULT_ORG_ID, name: 'First Blood', description: 'Closed your first sale on SalesOS', icon: 'Zap', xp_reward: 150, condition_type: 'SALES_COUNT' as any, condition_value: 1, is_active: true, created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z' },
  { id: '2', organization_id: DEFAULT_ORG_ID, name: 'Centurion', description: 'Generated ₹1,00,000+ in revenue in a single month', icon: 'Award', xp_reward: 500, condition_type: 'REVENUE' as any, condition_value: 100000, is_active: true, created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z' },
  { id: '3', organization_id: DEFAULT_ORG_ID, name: 'Hat-Trick Hero', description: 'Closed 3 deals in a single day', icon: 'Flame', xp_reward: 300, condition_type: 'SALES_COUNT' as any, condition_value: 3, is_active: true, created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z' },
  { id: '4', organization_id: DEFAULT_ORG_ID, name: 'Target Destroyer', description: 'Achieved 100% of your monthly sales target', icon: 'Target', xp_reward: 400, condition_type: 'TARGET_ACHIEVEMENT' as any, condition_value: 100, is_active: true, created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z' },
];

export const INITIAL_XP_RULES: XPRule[] = [
  { id: '1', organization_id: DEFAULT_ORG_ID, name: 'Sale Qualified Points', action: 'SALE_QUALIFIED', description: 'Points awarded for every qualified sale', condition_type: null, condition_value: null, reward_points: 100, is_active: true, created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z' },
  { id: '2', organization_id: DEFAULT_ORG_ID, name: 'Revenue Multiplier Points', action: 'REVENUE_PER_10K', description: 'Points per ₹10,000 in generated revenue', condition_type: null, condition_value: null, reward_points: 25, is_active: true, created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z' },
  { id: '3', organization_id: DEFAULT_ORG_ID, name: 'Lead Won Bonus', action: 'LEAD_WON', description: 'Bonus points for transitioning lead to Won', condition_type: null, condition_value: null, reward_points: 50, is_active: true, created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z' },
];

export const INITIAL_XP_TRANSACTIONS: XPTransaction[] = [
  { id: 'xp-1', organization_id: DEFAULT_ORG_ID, user_id: '44444444-4444-4444-4444-444444444441', points: 100, description: 'Sale Qualified: INV-2026-0041', source_type: XPSourceType.SALE, source_id: '99999999-9999-9999-9999-999999999991', rule_id: null, reversed_at: null, created_at: '2026-03-04T15:00:00Z' },
  { id: 'xp-2', organization_id: DEFAULT_ORG_ID, user_id: '44444444-4444-4444-4444-444444444441', points: 150, description: 'Revenue bonus on ₹65,000 sale', source_type: XPSourceType.REVENUE, source_id: '99999999-9999-9999-9999-999999999991', rule_id: null, reversed_at: null, created_at: '2026-03-04T15:00:00Z' },
  { id: 'xp-3', organization_id: DEFAULT_ORG_ID, user_id: '44444444-4444-4444-4444-444444444442', points: 100, description: 'Sale Qualified: INV-2026-0040', source_type: XPSourceType.SALE, source_id: '99999999-9999-9999-9999-999999999992', rule_id: null, reversed_at: null, created_at: '2026-03-05T12:00:00Z' },
];

export const INITIAL_TARGETS: Target[] = [
  {
    id: 'target-1',
    organization_id: DEFAULT_ORG_ID,
    user_id: '44444444-4444-4444-4444-444444444441',
    team_id: '55555555-5555-5555-5555-555555555551',
    type: TargetType.REVENUE,
    scope: TargetScope.INDIVIDUAL,
    period: TargetPeriod.MONTHLY,
    period_start: '2026-03-01',
    period_end: '2026-03-31',
    product_id: null,
    is_active: true,
    target_value: 500000,
    current_value: 650000,
    created_at: '2026-03-01T00:00:00Z',
    updated_at: '2026-03-05T00:00:00Z',
    user: INITIAL_PROFILES[3],
    team: INITIAL_TEAMS[0],
    achievement_percentage: 130,
  },
  {
    id: 'target-2',
    organization_id: DEFAULT_ORG_ID,
    user_id: '44444444-4444-4444-4444-444444444442',
    team_id: '55555555-5555-5555-5555-555555555552',
    type: TargetType.REVENUE,
    scope: TargetScope.INDIVIDUAL,
    period: TargetPeriod.MONTHLY,
    period_start: '2026-03-01',
    period_end: '2026-03-31',
    product_id: null,
    is_active: true,
    target_value: 500000,
    current_value: 520000,
    created_at: '2026-03-01T00:00:00Z',
    updated_at: '2026-03-05T00:00:00Z',
    user: INITIAL_PROFILES[4],
    team: INITIAL_TEAMS[1],
    achievement_percentage: 104,
  },
];

export const INITIAL_NOTIFICATIONS: Notification[] = [
  {
    id: 'notif-1',
    organization_id: DEFAULT_ORG_ID,
    user_id: '44444444-4444-4444-4444-444444444441',
    type: NotificationType.SALE_CREATED,
    title: 'Sale Qualified: ₹65,000',
    message: 'Invoice INV-2026-0041 was paid and qualified. ₹5,200 commission registered.',
    link_url: '/sales',
    is_read: false,
    read: false,
    read_at: null,
    entity_type: EntityType.SALE,
    entity_id: '99999999-9999-9999-9999-999999999991',
    created_at: '2026-03-04T15:05:00Z',
  },
  {
    id: 'notif-2',
    organization_id: DEFAULT_ORG_ID,
    user_id: '44444444-4444-4444-4444-444444444441',
    type: NotificationType.COMMISSION_APPROVED,
    title: 'Commission Approved',
    message: 'Abhijith Up approved your commission for INV-2026-0041.',
    link_url: '/commissions',
    is_read: false,
    read: false,
    read_at: null,
    entity_type: EntityType.COMMISSION,
    entity_id: 'comm-1',
    created_at: '2026-03-04T16:05:00Z',
  },
];

export const INITIAL_AUDIT_LOGS: AuditLog[] = [
  {
    id: 'audit-1',
    organization_id: DEFAULT_ORG_ID,
    actor_id: '22222222-2222-2222-2222-222222222222',
    user_id: '22222222-2222-2222-2222-222222222222',
    action: AuditAction.SALE_CREATED,
    entity_type: EntityType.SALE,
    entity_id: '99999999-9999-9999-9999-999999999991',
    details: { invoice: 'INV-2026-0041', amount: 65000, customer: 'Rohan Sharma' },
    ip_address: '127.0.0.1',
    metadata: { invoice: 'INV-2026-0041', amount: 65000 },
    created_at: '2026-03-04T15:00:00Z',
    actor: INITIAL_PROFILES[0],
  },
  {
    id: 'audit-2',
    organization_id: DEFAULT_ORG_ID,
    actor_id: '22222222-2222-2222-2222-222222222222',
    user_id: '22222222-2222-2222-2222-222222222222',
    action: AuditAction.COMMISSION_APPROVED,
    entity_type: EntityType.COMMISSION,
    entity_id: 'comm-1',
    details: { commission_id: 'comm-1', amount: 5200, recipient: 'Arjun Nair' },
    ip_address: '127.0.0.1',
    metadata: { commission_id: 'comm-1', amount: 5200 },
    created_at: '2026-03-04T16:00:00Z',
    actor: INITIAL_PROFILES[0],
  },
];

// ============================================================================
// High-level Domain Engine
// ============================================================================

class LocalDatabase {
  private initialized = false;

  constructor() {
    this.init();
  }

  public init(forceReset = false) {
    if (typeof window === 'undefined') return;

    const DB_VERSION = 'v2.5';
    const currentVersion = localStorage.getItem('salesos_db_version');

    if (!currentVersion || currentVersion !== DB_VERSION || forceReset) {
      // Version changed or first time: ensure profiles and other collections are fresh or sanitized
      const existingProfiles = getCollection<Profile>('profiles');
      if (existingProfiles.length === 0 || forceReset) {
        setCollection('profiles', INITIAL_PROFILES);
      } else {
        const sanitized = existingProfiles.map(p => ({
          ...p,
          ...(p.id === INITIAL_PROFILES[0].id
            ? { first_name: 'Abhijith', last_name: 'Up' }
            : {}),
          role: p.role || UserRole.SALES_REP,
          status: p.status || EmployeeStatus.ACTIVE,
        }));
        setCollection('profiles', sanitized);
      }
      // Ensure activities & follow-ups collections exist
      if (forceReset || !localStorage.getItem('salesos_lead_activities')) {
        setCollection('lead_activities', INITIAL_LEAD_ACTIVITIES);
      }
      if (forceReset || !localStorage.getItem('salesos_follow_ups')) {
        setCollection('follow_ups', INITIAL_FOLLOW_UPS);
      }
      localStorage.setItem('salesos_db_version', DB_VERSION);
    }

    const hasInit = localStorage.getItem('salesos_db_initialized');
    if (hasInit && !forceReset) {
      this.initialized = true;
      return;
    }

    // Populate all collections
    setCollection('organization', [INITIAL_ORGANIZATION]);
    setCollection('profiles', INITIAL_PROFILES);
    setCollection('teams', INITIAL_TEAMS);
    setCollection('products', INITIAL_PRODUCTS);
    setCollection('customers', INITIAL_CUSTOMERS);
    setCollection('leads', INITIAL_LEADS);
    setCollection('lead_activities', INITIAL_LEAD_ACTIVITIES);
    setCollection('follow_ups', INITIAL_FOLLOW_UPS);
    setCollection('sales', INITIAL_SALES);
    setCollection('sale_items', INITIAL_SALE_ITEMS);
    setCollection('commission_rules', INITIAL_COMMISSION_RULES);
    setCollection('commission_records', INITIAL_COMMISSION_RECORDS);
    setCollection('bonus_rules', INITIAL_BONUS_RULES);
    setCollection('bonus_records', INITIAL_BONUS_RECORDS);
    setCollection('levels', INITIAL_LEVELS);
    setCollection('achievements', INITIAL_ACHIEVEMENTS);
    setCollection('xp_rules', INITIAL_XP_RULES);
    setCollection('xp_transactions', INITIAL_XP_TRANSACTIONS);
    setCollection('targets', INITIAL_TARGETS);
    setCollection('notifications', INITIAL_NOTIFICATIONS);
    setCollection('audit_logs', INITIAL_AUDIT_LOGS);

    localStorage.setItem('salesos_db_initialized', 'true');
    localStorage.setItem('salesos_db_version', DB_VERSION);
    this.initialized = true;
  }

  public resetToSeed() {
    this.init(true);
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
