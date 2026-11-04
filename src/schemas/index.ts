// ============================================================================
// SalesOS — Zod Validation Schemas
// ============================================================================

import { z } from 'zod';

// ============================================================================
// Auth
// ============================================================================
export const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const forgotPasswordSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
});
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z.object({
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string(),
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

// ============================================================================
// Organization
// ============================================================================
export const organizationSchema = z.object({
  name: z.string().min(2, 'Company name is required'),
  email: z.string().email('Please enter a valid email'),
  phone: z.string().optional(),
  industry: z.string().optional(),
  country: z.string().min(1, 'Country is required'),
  currency: z.string().min(1, 'Currency is required'),
  timezone: z.string().min(1, 'Timezone is required'),
  address: z.string().optional(),
  website: z.string().url('Please enter a valid URL').optional().or(z.literal('')),
});
export type OrganizationInput = z.infer<typeof organizationSchema>;

// ============================================================================
// Employee
// ============================================================================
export const employeeSchema = z.object({
  first_name: z.string().min(1, 'First name is required'),
  last_name: z.string().min(1, 'Last name is required'),
  email: z.string().email('Please enter a valid email'),
  phone: z.string().optional(),
  username: z.string().min(3, 'Username must be at least 3 characters'),
  employee_id: z.string().min(1, 'User ID is required'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  role: z.enum(['ORG_ADMIN', 'MANAGER', 'SALES_REP']),
  team_id: z.string().optional(),
  manager_id: z.string().optional(),
  joining_date: z.string().optional(),
  access_only: z.string().optional(),
});
export type EmployeeInput = z.infer<typeof employeeSchema>;

// ============================================================================
// Team
// ============================================================================
export const teamSchema = z.object({
  name: z.string().min(1, 'Team name is required'),
  description: z.string().optional(),
  manager_id: z.string().optional(),
});
export type TeamInput = z.infer<typeof teamSchema>;

// ============================================================================
// Product
// ============================================================================
export const productSchema = z.object({
  name: z.string().min(1, 'Product name is required'),
  sku: z.string().optional(),
  category: z.string().optional(),
  description: z.string().optional(),
  cost: z.coerce.number().min(0, 'Cost must be 0 or more'),
  selling_price: z.coerce.number().min(0, 'Price must be 0 or more'),
  status: z.enum(['ACTIVE', 'ARCHIVED', 'DRAFT']).default('ACTIVE'),
});
export type ProductInput = z.infer<typeof productSchema>;

// ============================================================================
// Customer
// ============================================================================
export const customerSchema = z.object({
  first_name: z.string().min(1, 'First name is required'),
  last_name: z.string().min(1, 'Last name is required'),
  email: z.string().email('Please enter a valid email').optional().or(z.literal('')),
  phone: z.string().optional(),
  company: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  country: z.string().optional(),
  lead_source: z.string().optional(),
  assigned_to: z.string().optional(),
  status: z.enum(['LEAD', 'PROSPECT', 'CUSTOMER', 'LOST']).default('LEAD'),
  notes: z.string().optional(),
});
export type CustomerInput = z.infer<typeof customerSchema>;

// ============================================================================
// Lead
// ============================================================================
export const leadSchema = z.object({
  customer_id: z.string().min(1, 'Customer is required'),
  assigned_to: z.string().optional(),
  product_id: z.string().optional(),
  lead_source: z.string().optional(),
  expected_value: z.coerce.number().min(0, 'Expected value must be 0 or more'),
  probability: z.coerce.number().min(0).max(100, 'Probability must be between 0 and 100'),
  expected_close_date: z.string().optional(),
  stage: z.enum(['NEW', 'CONTACTED', 'QUALIFIED', 'DEMO', 'NEGOTIATION', 'WON', 'LOST']).default('NEW'),
  notes: z.string().optional(),
});
export type LeadInput = z.infer<typeof leadSchema>;

// ============================================================================
// Lead Activity
// ============================================================================
export const leadActivitySchema = z.object({
  type: z.enum(['CALL', 'EMAIL', 'WHATSAPP', 'MEETING', 'DEMO', 'NOTE', 'FOLLOW_UP']),
  description: z.string().optional(),
  outcome: z.string().optional(),
  activity_date: z.string().optional(),
});
export type LeadActivityInput = z.infer<typeof leadActivitySchema>;

// ============================================================================
// Follow-up
// ============================================================================
export const followUpSchema = z.object({
  lead_id: z.string().min(1, 'Lead is required'),
  due_date: z.string().min(1, 'Due date is required'),
  due_time: z.string().optional(),
  reminder: z.boolean().default(false),
  notes: z.string().optional(),
});
export type FollowUpInput = z.infer<typeof followUpSchema>;

// ============================================================================
// Sale
// ============================================================================
export const saleItemSchema = z.object({
  product_id: z.string().min(1, 'Product is required'),
  quantity: z.coerce.number().min(1, 'Quantity must be at least 1'),
  unit_price: z.coerce.number().min(0, 'Unit price must be 0 or more'),
  discount: z.coerce.number().min(0, 'Discount must be 0 or more').default(0),
});

export const saleSchema = z.object({
  customer_id: z.string().min(1, 'Customer is required'),
  lead_id: z.string().optional(),
  items: z.array(saleItemSchema).min(1, 'At least one product is required'),
  discount: z.coerce.number().min(0).default(0),
  tax: z.coerce.number().min(0).default(0),
  payment_method: z.enum(['CASH', 'CARD', 'UPI', 'BANK_TRANSFER', 'ONLINE_PAYMENT', 'OTHER']).optional(),
  payment_status: z.enum(['PENDING', 'PAID', 'REFUNDED', 'CANCELLED']).default('PENDING'),
  sale_date: z.string().min(1, 'Sale date is required'),
  notes: z.string().optional(),
});
export type SaleInput = z.infer<typeof saleSchema>;
export type SaleItemInput = z.infer<typeof saleItemSchema>;

// ============================================================================
// Target
// ============================================================================
export const targetSchema = z.object({
  user_id: z.string().optional(),
  team_id: z.string().optional(),
  type: z.enum(['SALES_COUNT', 'REVENUE', 'PRODUCT_QUANTITY', 'PRODUCT_REVENUE']),
  scope: z.enum(['INDIVIDUAL', 'TEAM', 'ORGANIZATION']),
  period: z.enum(['DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY', 'CUSTOM']),
  target_value: z.coerce.number().min(1, 'Target value must be at least 1'),
  period_start: z.string().min(1, 'Period start is required'),
  period_end: z.string().min(1, 'Period end is required'),
  product_id: z.string().optional(),
});
export type TargetInput = z.infer<typeof targetSchema>;

// ============================================================================
// XP Rule
// ============================================================================
export const xpRuleSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  action: z.string().min(1, 'Action is required'),
  condition_type: z.string().optional(),
  condition_value: z.string().optional(),
  reward_points: z.coerce.number().min(1, 'XP points must be at least 1'),
});
export type XPRuleInput = z.infer<typeof xpRuleSchema>;

// ============================================================================
// Level
// ============================================================================
export const levelSchema = z.object({
  name: z.string().min(1, 'Level name is required'),
  level_order: z.coerce.number().min(1, 'Level order must be at least 1'),
  min_xp: z.coerce.number().min(0, 'Minimum XP must be 0 or more'),
  icon: z.string().optional(),
});
export type LevelInput = z.infer<typeof levelSchema>;

// ============================================================================
// Achievement
// ============================================================================
export const achievementSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  icon: z.string().optional(),
  xp_reward: z.coerce.number().min(0, 'XP reward must be 0 or more'),
  condition_type: z.string().min(1, 'Condition type is required'),
  condition_value: z.coerce.number().min(1, 'Condition value must be at least 1'),
});
export type AchievementInput = z.infer<typeof achievementSchema>;

// ============================================================================
// Commission Rule
// ============================================================================
export const commissionRuleSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  type: z.enum(['PERCENTAGE', 'FIXED', 'TIERED']),
  rate: z.coerce.number().min(0, 'Rate must be 0 or more'),
  product_id: z.string().optional(),
  user_id: z.string().optional(),
  team_id: z.string().optional(),
  tier_min: z.coerce.number().optional(),
  tier_max: z.coerce.number().optional(),
});
export type CommissionRuleInput = z.infer<typeof commissionRuleSchema>;

// ============================================================================
// Bonus Rule
// ============================================================================
export const bonusRuleSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  condition_type: z.enum(['SALES_COUNT', 'REVENUE', 'TARGET_ACHIEVEMENT', 'PRODUCT_SALES', 'TEAM_PERFORMANCE']),
  condition_value: z.coerce.number().min(1, 'Condition value must be at least 1'),
  bonus_amount: z.coerce.number().min(1, 'Bonus amount must be at least 1'),
  period: z.enum(['DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY', 'CUSTOM']).default('MONTHLY'),
  product_id: z.string().optional(),
  team_id: z.string().optional(),
});
export type BonusRuleInput = z.infer<typeof bonusRuleSchema>;
