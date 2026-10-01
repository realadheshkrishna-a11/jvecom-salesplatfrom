// ============================================================================
// SalesOS — Database & Domain Types
// ============================================================================

import {
  UserRole, OrgStatus, EmployeeStatus, TeamStatus, ProductStatus,
  CustomerStatus, LeadStage, LeadActivityType, FollowUpStatus,
  PaymentStatus, PaymentMethod, TargetType, TargetScope, TargetPeriod,
  XPSourceType, CommissionRuleType, CompensationStatus, BonusConditionType,
  NotificationType, AuditAction, EntityType, InvitationStatus,
} from './enums';

// ============================================================================
// Core
// ============================================================================

export interface Organization {
  id: string;
  name: string;
  logo_url: string | null;
  email: string;
  phone: string | null;
  industry: string | null;
  country: string;
  currency: string;
  timezone: string;
  address: string | null;
  website: string | null;
  status: OrgStatus;
  created_at: string;
  updated_at: string;
}

export interface OrganizationSettings {
  id: string;
  organization_id: string;
  setting_key: string;
  setting_value: string;
  created_at: string;
  updated_at: string;
}

export interface Profile {
  id: string; // same as auth.uid()
  organization_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  username: string | null;
  employee_id: string | null;
  role: UserRole;
  team_id: string | null;
  manager_id: string | null;
  avatar_url: string | null;
  joining_date: string | null;
  status: EmployeeStatus;
  created_at: string;
  updated_at: string;
  // Joined
  team?: Team;
  manager?: Profile;
  organization?: Organization;
}

// ============================================================================
// Teams
// ============================================================================

export interface Team {
  id: string;
  organization_id: string;
  name: string;
  description: string | null;
  manager_id: string | null;
  status: TeamStatus;
  created_at: string;
  updated_at: string;
  // Joined
  manager?: Profile;
  member_count?: number;
}

export interface TeamMember {
  id: string;
  organization_id: string;
  team_id: string;
  user_id: string;
  joined_at: string;
  left_at: string | null;
  // Joined
  profile?: Profile;
  team?: Team;
}

// ============================================================================
// Products
// ============================================================================

export interface Product {
  id: string;
  organization_id: string;
  name: string;
  sku: string | null;
  category: string | null;
  description: string | null;
  image_url: string | null;
  cost: number;
  selling_price: number;
  status: ProductStatus;
  created_at: string;
  updated_at: string;
  // Analytics
  total_sold?: number;
  total_revenue?: number;
}

// ============================================================================
// Customers
// ============================================================================

export interface Customer {
  id: string;
  organization_id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  lead_source: string | null;
  assigned_to: string | null;
  status: CustomerStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
  // Joined
  assigned_salesperson?: Profile;
}

// ============================================================================
// Leads / CRM
// ============================================================================

export interface Lead {
  id: string;
  organization_id: string;
  customer_id: string;
  assigned_to: string | null;
  team_id: string | null;
  product_id: string | null;
  lead_source_id: string | null;
  lead_source: string | null;
  source?: string | null;
  title?: string | null;
  expected_value: number;
  probability: number;
  expected_close_date: string | null;
  stage: LeadStage;
  next_follow_up_date: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  // Calculated
  expected_revenue?: number; // expected_value * probability
  // Joined
  customer?: Customer;
  assigned_salesperson?: Profile;
  product?: Product;
  team?: Team;
}

export interface LeadActivity {
  id: string;
  organization_id: string;
  lead_id: string;
  user_id: string;
  type: LeadActivityType;
  description: string | null;
  outcome: string | null;
  activity_date: string;
  created_at: string;
  // Joined
  user?: Profile;
}

export interface FollowUp {
  id: string;
  organization_id: string;
  lead_id: string;
  user_id: string;
  due_date: string;
  due_time: string | null;
  reminder: boolean;
  status: FollowUpStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
  // Joined
  lead?: Lead;
  user?: Profile;
}

export interface LeadSource {
  id: string;
  organization_id: string;
  name: string;
  is_active: boolean;
  created_at: string;
}

// ============================================================================
// Sales
// ============================================================================

export interface Sale {
  id: string;
  organization_id: string;
  user_id: string;
  team_id: string | null;
  customer_id: string;
  lead_id: string | null;
  invoice_number: string;
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  payment_status: PaymentStatus;
  payment_method: PaymentMethod | null;
  sale_date: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
  // Joined
  salesperson?: Profile;
  user?: Profile;
  customer?: Customer;
  lead?: Lead;
  team?: Team;
  items?: SaleItem[];
}

export interface SaleItem {
  id: string;
  organization_id: string;
  sale_id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  discount: number;
  total: number;
  created_at: string;
  // Joined
  product?: Product;
}

// ============================================================================
// Targets
// ============================================================================

export interface Target {
  id: string;
  organization_id: string;
  user_id: string | null;
  team_id: string | null;
  type: TargetType;
  scope: TargetScope;
  period: TargetPeriod;
  target_value: number;
  current_value: number;
  period_start: string;
  period_end: string;
  product_id: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // Calculated
  achievement_percentage?: number;
  remaining?: number;
  // Joined
  user?: Profile;
  team?: Team;
  product?: Product;
  milestones?: TargetMilestone[];
}

export interface TargetMilestone {
  id: string;
  organization_id: string;
  target_id: string;
  percentage: number;
  reached_at: string | null;
  notified: boolean;
  created_at: string;
}

// ============================================================================
// Gamification
// ============================================================================

export interface XPRule {
  id: string;
  organization_id: string;
  name: string;
  description: string | null;
  action: string;
  condition_type: string | null;
  condition_value: string | null;
  reward_points: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface XPTransaction {
  id: string;
  organization_id: string;
  user_id: string;
  points: number;
  source_type: XPSourceType;
  source_id: string | null;
  rule_id: string | null;
  description: string;
  reversed_at: string | null;
  created_at: string;
}

export interface Level {
  id: string;
  organization_id: string;
  name: string;
  level_order: number;
  min_xp: number;
  icon: string | null;
  created_at: string;
  updated_at: string;
}

export interface Achievement {
  id: string;
  organization_id: string;
  name: string;
  description: string | null;
  icon: string | null;
  xp_reward: number;
  condition_type: string;
  condition_value: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserAchievement {
  id: string;
  organization_id: string;
  user_id: string;
  achievement_id: string;
  unlocked_at: string;
  // Joined
  achievement?: Achievement;
}

// ============================================================================
// Commissions
// ============================================================================

export interface CommissionRule {
  id: string;
  organization_id: string;
  name: string;
  rule_name?: string;
  description?: string | null;
  type: CommissionRuleType;
  rate: number; // percentage or fixed amount
  product_id: string | null;
  user_id: string | null;
  team_id: string | null;
  tier_min: number | null;
  tier_max: number | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // Joined
  product?: Product;
}

export interface CommissionRecord {
  id: string;
  organization_id: string;
  user_id: string;
  sale_id: string;
  rule_id: string | null;
  product_id: string | null;
  base_amount?: number;
  commission_rate?: number;
  commission_amount?: number;
  amount: number;
  approved_at?: string | null;
  paid_at?: string | null;
  status: CompensationStatus;
  created_at: string;
  updated_at: string;
  // Joined
  user?: Profile;
  sale?: Sale;
  rule?: CommissionRule;
}

// ============================================================================
// Bonuses
// ============================================================================

export interface BonusRule {
  id: string;
  organization_id: string;
  name: string;
  condition_type: BonusConditionType;
  condition_value: number;
  bonus_amount: number;
  period: TargetPeriod;
  product_id: string | null;
  team_id: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface BonusRecord {
  id: string;
  organization_id: string;
  user_id: string;
  rule_id: string;
  amount: number;
  period_start: string;
  period_end: string;
  status: CompensationStatus;
  approved_at?: string | null;
  paid_at?: string | null;
  created_at: string;
  updated_at: string;
  // Joined
  user?: Profile;
  rule?: BonusRule;
}

// ============================================================================
// Notifications
// ============================================================================

export interface Notification {
  id: string;
  organization_id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  message: string;
  read?: boolean;
  is_read?: boolean;
  read_at?: string | null;
  link_url?: string | null;
  entity_type: EntityType | null;
  entity_id: string | null;
  created_at: string;
}

// ============================================================================
// Audit
// ============================================================================

export interface AuditLog {
  id: string;
  organization_id: string;
  actor_id?: string;
  user_id?: string;
  action: AuditAction;
  entity_type: EntityType;
  entity_id: string;
  metadata?: Record<string, unknown> | null;
  details?: Record<string, unknown> | null;
  ip_address?: string | null;
  created_at: string;
  // Joined
  actor?: Profile;
}

// ============================================================================
// Email
// ============================================================================

export interface EmailLog {
  id: string;
  organization_id: string;
  recipient: string;
  template: string;
  subject: string;
  status: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

// ============================================================================
// Invitations
// ============================================================================

export interface EmployeeInvitation {
  id: string;
  organization_id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: UserRole;
  team_id: string | null;
  manager_id: string | null;
  phone: string | null;
  employee_id_str: string | null;
  token: string;
  status: InvitationStatus;
  expires_at: string;
  created_at: string;
}

// ============================================================================
// Dashboard & Analytics Types
// ============================================================================

export interface DashboardKPIs {
  total_revenue: number;
  total_sales: number;
  active_employees: number;
  active_leads: number;
  conversion_rate: number;
  target_achievement: number;
  commission_payable: number;
  bonus_payable: number;
}

export interface LeaderboardEntry {
  rank: number;
  user_id: string;
  first_name: string;
  last_name: string;
  avatar_url: string | null;
  team_name: string | null;
  sales_count: number;
  revenue: number;
  target_achievement: number;
  xp: number;
  total_sales?: number;
  total_revenue?: number;
  total_xp?: number;
}

export interface SalesChartData {
  date: string;
  revenue: number;
  sales_count: number;
}

export interface ProductPerformance {
  product_id: string;
  product_name: string;
  units_sold: number;
  revenue: number;
}

export interface EmployeePerformance {
  user_id: string;
  first_name: string;
  last_name: string;
  team_name: string | null;
  sales_count: number;
  revenue: number;
  target_achievement: number;
  xp: number;
  commission: number;
  bonus: number;
}

// ============================================================================
// Pagination & Filtering
// ============================================================================

export interface PaginationParams {
  page: number;
  pageSize: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface SortParams {
  column: string;
  direction: 'asc' | 'desc';
}

export interface DateRange {
  from: string;
  to: string;
}

// ============================================================================
// Form Types (for create/edit operations)
// ============================================================================

export interface CreateEmployeeInput {
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  username?: string;
  employee_id?: string;
  role: UserRole;
  team_id?: string;
  manager_id?: string;
  joining_date?: string;
}

export interface CreateSaleInput {
  customer_id: string;
  lead_id?: string;
  items: CreateSaleItemInput[];
  discount: number;
  tax: number;
  payment_method: PaymentMethod;
  payment_status: PaymentStatus;
  sale_date: string;
  notes?: string;
}

export interface CreateSaleItemInput {
  product_id: string;
  quantity: number;
  unit_price: number;
  discount: number;
}

export interface CreateLeadInput {
  customer_id: string;
  assigned_to?: string;
  product_id?: string;
  lead_source?: string;
  expected_value: number;
  probability: number;
  expected_close_date?: string;
  notes?: string;
}

export interface CreateTargetInput {
  user_id?: string;
  team_id?: string;
  type: TargetType;
  scope: TargetScope;
  period: TargetPeriod;
  target_value: number;
  period_start: string;
  period_end: string;
  product_id?: string;
}
