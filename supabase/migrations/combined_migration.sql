-- ===== 001_initial_schema.sql =====
-- ============================================================================
-- SalesOS Database Schema — Migration 001
-- Complete normalized PostgreSQL schema for multi-tenant SaaS
-- ============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- 1. Organizations
-- ============================================================================
CREATE TABLE organizations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  logo_url TEXT,
  email TEXT NOT NULL,
  phone TEXT,
  industry TEXT,
  country TEXT NOT NULL DEFAULT 'India',
  currency TEXT NOT NULL DEFAULT 'INR',
  timezone TEXT NOT NULL DEFAULT 'Asia/Kolkata',
  address TEXT,
  website TEXT,
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'SUSPENDED', 'TRIAL')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================================
-- 2. Organization Settings
-- ============================================================================
CREATE TABLE organization_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  setting_key TEXT NOT NULL,
  setting_value JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, setting_key)
);

-- ============================================================================
-- 3. Profiles (linked to auth.users)
-- ============================================================================
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  username TEXT,
  employee_id TEXT,
  role TEXT NOT NULL DEFAULT 'SALES_REP' CHECK (role IN ('SUPER_ADMIN', 'ORG_ADMIN', 'MANAGER', 'SALES_REP')),
  team_id UUID,
  manager_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  avatar_url TEXT,
  joining_date DATE,
  status TEXT NOT NULL DEFAULT 'INVITED' CHECK (status IN ('ACTIVE', 'INACTIVE', 'INVITED', 'SUSPENDED')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_profiles_org ON profiles(organization_id);
CREATE INDEX idx_profiles_team ON profiles(team_id);
CREATE INDEX idx_profiles_manager ON profiles(manager_id);
CREATE INDEX idx_profiles_role ON profiles(organization_id, role);
CREATE INDEX idx_profiles_status ON profiles(organization_id, status);
CREATE UNIQUE INDEX idx_profiles_email ON profiles(email);
CREATE UNIQUE INDEX idx_profiles_employee_id ON profiles(organization_id, employee_id) WHERE employee_id IS NOT NULL;

-- ============================================================================
-- 4. Teams
-- ============================================================================
CREATE TABLE teams (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  manager_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, name)
);

CREATE INDEX idx_teams_org ON teams(organization_id);
CREATE INDEX idx_teams_manager ON teams(manager_id);

-- Add FK from profiles to teams (deferred because of circular dep)
ALTER TABLE profiles ADD CONSTRAINT fk_profiles_team FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE SET NULL;

-- ============================================================================
-- 5. Team Members (history tracking)
-- ============================================================================
CREATE TABLE team_members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  left_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_team_members_org ON team_members(organization_id);
CREATE INDEX idx_team_members_team ON team_members(team_id);
CREATE INDEX idx_team_members_user ON team_members(user_id);
CREATE INDEX idx_team_members_active ON team_members(team_id, user_id) WHERE left_at IS NULL;

-- ============================================================================
-- 6. Products
-- ============================================================================
CREATE TABLE products (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sku TEXT,
  category TEXT,
  description TEXT,
  image_url TEXT,
  cost NUMERIC(12,2) NOT NULL DEFAULT 0,
  selling_price NUMERIC(12,2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'ARCHIVED', 'DRAFT')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_products_org ON products(organization_id);
CREATE INDEX idx_products_status ON products(organization_id, status);
CREATE UNIQUE INDEX idx_products_sku ON products(organization_id, sku) WHERE sku IS NOT NULL;

-- ============================================================================
-- 7. Customers
-- ============================================================================
CREATE TABLE customers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  company TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  country TEXT,
  lead_source TEXT,
  assigned_to UUID REFERENCES profiles(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'LEAD' CHECK (status IN ('LEAD', 'PROSPECT', 'CUSTOMER', 'LOST')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_customers_org ON customers(organization_id);
CREATE INDEX idx_customers_status ON customers(organization_id, status);
CREATE INDEX idx_customers_assigned ON customers(assigned_to);
CREATE INDEX idx_customers_email ON customers(organization_id, email) WHERE email IS NOT NULL;

-- ============================================================================
-- 8. Lead Sources (configurable per org)
-- ============================================================================
CREATE TABLE lead_sources (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, name)
);

CREATE INDEX idx_lead_sources_org ON lead_sources(organization_id);

-- ============================================================================
-- 9. Leads
-- ============================================================================
CREATE TABLE leads (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  assigned_to UUID REFERENCES profiles(id) ON DELETE SET NULL,
  team_id UUID REFERENCES teams(id) ON DELETE SET NULL,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  lead_source_id UUID REFERENCES lead_sources(id) ON DELETE SET NULL,
  lead_source TEXT,
  expected_value NUMERIC(12,2) NOT NULL DEFAULT 0,
  probability NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (probability >= 0 AND probability <= 100),
  expected_close_date DATE,
  stage TEXT NOT NULL DEFAULT 'NEW' CHECK (stage IN ('NEW', 'CONTACTED', 'QUALIFIED', 'DEMO', 'NEGOTIATION', 'WON', 'LOST')),
  next_follow_up_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_leads_org ON leads(organization_id);
CREATE INDEX idx_leads_stage ON leads(organization_id, stage);
CREATE INDEX idx_leads_assigned ON leads(assigned_to);
CREATE INDEX idx_leads_customer ON leads(customer_id);
CREATE INDEX idx_leads_product ON leads(product_id);
CREATE INDEX idx_leads_follow_up ON leads(next_follow_up_date) WHERE next_follow_up_date IS NOT NULL;

-- ============================================================================
-- 10. Lead Activities
-- ============================================================================
CREATE TABLE lead_activities (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('CALL', 'EMAIL', 'WHATSAPP', 'MEETING', 'DEMO', 'NOTE', 'FOLLOW_UP')),
  description TEXT,
  outcome TEXT,
  activity_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_lead_activities_org ON lead_activities(organization_id);
CREATE INDEX idx_lead_activities_lead ON lead_activities(lead_id);
CREATE INDEX idx_lead_activities_user ON lead_activities(user_id);

-- ============================================================================
-- 11. Follow-ups
-- ============================================================================
CREATE TABLE follow_ups (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  due_date DATE NOT NULL,
  due_time TIME,
  reminder BOOLEAN NOT NULL DEFAULT false,
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'COMPLETED', 'RESCHEDULED', 'CANCELLED')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_follow_ups_org ON follow_ups(organization_id);
CREATE INDEX idx_follow_ups_user ON follow_ups(user_id);
CREATE INDEX idx_follow_ups_due ON follow_ups(user_id, due_date) WHERE status = 'PENDING';
CREATE INDEX idx_follow_ups_lead ON follow_ups(lead_id);

-- ============================================================================
-- 12. Sales
-- ============================================================================
CREATE TABLE sales (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  team_id UUID REFERENCES teams(id) ON DELETE SET NULL,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  subtotal NUMERIC(14,2) NOT NULL DEFAULT 0,
  discount NUMERIC(14,2) NOT NULL DEFAULT 0,
  tax NUMERIC(14,2) NOT NULL DEFAULT 0,
  total NUMERIC(14,2) NOT NULL DEFAULT 0,
  payment_status TEXT NOT NULL DEFAULT 'PENDING' CHECK (payment_status IN ('PENDING', 'PAID', 'REFUNDED', 'CANCELLED')),
  payment_method TEXT CHECK (payment_method IN ('CASH', 'CARD', 'UPI', 'BANK_TRANSFER', 'ONLINE_PAYMENT', 'OTHER')),
  sale_date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_sales_org ON sales(organization_id);
CREATE INDEX idx_sales_user ON sales(user_id);
CREATE INDEX idx_sales_customer ON sales(customer_id);
CREATE INDEX idx_sales_team ON sales(team_id);
CREATE INDEX idx_sales_date ON sales(organization_id, sale_date);
CREATE INDEX idx_sales_payment ON sales(organization_id, payment_status);
CREATE INDEX idx_sales_qualifying ON sales(organization_id, payment_status, sale_date) WHERE payment_status = 'PAID';

-- ============================================================================
-- 13. Sale Items
-- ============================================================================
CREATE TABLE sale_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  sale_id UUID NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  unit_price NUMERIC(12,2) NOT NULL DEFAULT 0,
  discount NUMERIC(12,2) NOT NULL DEFAULT 0,
  total NUMERIC(14,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_sale_items_org ON sale_items(organization_id);
CREATE INDEX idx_sale_items_sale ON sale_items(sale_id);
CREATE INDEX idx_sale_items_product ON sale_items(product_id);

-- ============================================================================
-- 14. Targets
-- ============================================================================
CREATE TABLE targets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  team_id UUID REFERENCES teams(id) ON DELETE SET NULL,
  type TEXT NOT NULL CHECK (type IN ('SALES_COUNT', 'REVENUE', 'PRODUCT_QUANTITY', 'PRODUCT_REVENUE')),
  scope TEXT NOT NULL CHECK (scope IN ('INDIVIDUAL', 'TEAM', 'ORGANIZATION')),
  period TEXT NOT NULL CHECK (period IN ('DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY', 'CUSTOM')),
  target_value NUMERIC(14,2) NOT NULL CHECK (target_value > 0),
  current_value NUMERIC(14,2) NOT NULL DEFAULT 0,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (period_end >= period_start)
);

CREATE INDEX idx_targets_org ON targets(organization_id);
CREATE INDEX idx_targets_user ON targets(user_id);
CREATE INDEX idx_targets_team ON targets(team_id);
CREATE INDEX idx_targets_period ON targets(organization_id, period_start, period_end);
CREATE INDEX idx_targets_active ON targets(organization_id, is_active) WHERE is_active = true;

-- ============================================================================
-- 15. Target Milestones
-- ============================================================================
CREATE TABLE target_milestones (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  target_id UUID NOT NULL REFERENCES targets(id) ON DELETE CASCADE,
  percentage INTEGER NOT NULL CHECK (percentage > 0),
  reached_at TIMESTAMPTZ,
  notified BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (target_id, percentage)
);

CREATE INDEX idx_target_milestones_target ON target_milestones(target_id);

-- ============================================================================
-- 16. XP Rules
-- ============================================================================
CREATE TABLE xp_rules (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  action TEXT NOT NULL,
  condition_type TEXT,
  condition_value TEXT,
  reward_points INTEGER NOT NULL CHECK (reward_points > 0),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_xp_rules_org ON xp_rules(organization_id);
CREATE INDEX idx_xp_rules_action ON xp_rules(organization_id, action) WHERE is_active = true;

-- ============================================================================
-- 17. XP Transactions
-- ============================================================================
CREATE TABLE xp_transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  points INTEGER NOT NULL,
  source_type TEXT NOT NULL CHECK (source_type IN ('SALE', 'REVENUE', 'TARGET_ACHIEVEMENT', 'ACHIEVEMENT', 'MILESTONE', 'MANUAL')),
  source_id UUID,
  rule_id UUID REFERENCES xp_rules(id) ON DELETE SET NULL,
  description TEXT NOT NULL,
  reversed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_xp_transactions_org ON xp_transactions(organization_id);
CREATE INDEX idx_xp_transactions_user ON xp_transactions(user_id);
CREATE INDEX idx_xp_transactions_source ON xp_transactions(source_type, source_id);
CREATE INDEX idx_xp_transactions_active ON xp_transactions(user_id) WHERE reversed_at IS NULL;

-- Prevent duplicate XP for same source event
CREATE UNIQUE INDEX idx_xp_transactions_unique_source ON xp_transactions(user_id, source_type, source_id, rule_id) 
  WHERE source_id IS NOT NULL AND reversed_at IS NULL;

-- ============================================================================
-- 18. Levels
-- ============================================================================
CREATE TABLE levels (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  level_order INTEGER NOT NULL,
  min_xp INTEGER NOT NULL DEFAULT 0,
  icon TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, level_order)
);

CREATE INDEX idx_levels_org ON levels(organization_id);

-- ============================================================================
-- 19. Achievements
-- ============================================================================
CREATE TABLE achievements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  xp_reward INTEGER NOT NULL DEFAULT 0,
  condition_type TEXT NOT NULL,
  condition_value NUMERIC(14,2) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_achievements_org ON achievements(organization_id);

-- ============================================================================
-- 20. User Achievements
-- ============================================================================
CREATE TABLE user_achievements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  achievement_id UUID NOT NULL REFERENCES achievements(id) ON DELETE CASCADE,
  unlocked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, achievement_id)
);

CREATE INDEX idx_user_achievements_org ON user_achievements(organization_id);
CREATE INDEX idx_user_achievements_user ON user_achievements(user_id);

-- ============================================================================
-- 21. Commission Rules
-- ============================================================================
CREATE TABLE commission_rules (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('PERCENTAGE', 'FIXED', 'TIERED')),
  rate NUMERIC(10,4) NOT NULL DEFAULT 0,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  team_id UUID REFERENCES teams(id) ON DELETE SET NULL,
  tier_min NUMERIC(14,2),
  tier_max NUMERIC(14,2),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_commission_rules_org ON commission_rules(organization_id);
CREATE INDEX idx_commission_rules_product ON commission_rules(product_id);
CREATE INDEX idx_commission_rules_active ON commission_rules(organization_id) WHERE is_active = true;

-- ============================================================================
-- 22. Commission Records
-- ============================================================================
CREATE TABLE commission_records (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  sale_id UUID NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
  rule_id UUID REFERENCES commission_rules(id) ON DELETE SET NULL,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  base_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  commission_rate NUMERIC(10,4) NOT NULL DEFAULT 0,
  commission_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'PAID', 'REVERSED')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_commission_records_org ON commission_records(organization_id);
CREATE INDEX idx_commission_records_user ON commission_records(user_id);
CREATE INDEX idx_commission_records_sale ON commission_records(sale_id);
CREATE INDEX idx_commission_records_status ON commission_records(organization_id, status);

-- Prevent duplicate commission for same sale+rule
CREATE UNIQUE INDEX idx_commission_unique ON commission_records(sale_id, rule_id) WHERE status != 'REVERSED';

-- ============================================================================
-- 23. Bonus Rules
-- ============================================================================
CREATE TABLE bonus_rules (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  condition_type TEXT NOT NULL CHECK (condition_type IN ('SALES_COUNT', 'REVENUE', 'TARGET_ACHIEVEMENT', 'PRODUCT_SALES', 'TEAM_PERFORMANCE')),
  condition_value NUMERIC(14,2) NOT NULL,
  bonus_amount NUMERIC(14,2) NOT NULL CHECK (bonus_amount > 0),
  period TEXT NOT NULL DEFAULT 'MONTHLY' CHECK (period IN ('DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY', 'CUSTOM')),
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  team_id UUID REFERENCES teams(id) ON DELETE SET NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_bonus_rules_org ON bonus_rules(organization_id);
CREATE INDEX idx_bonus_rules_active ON bonus_rules(organization_id) WHERE is_active = true;

-- ============================================================================
-- 24. Bonus Records
-- ============================================================================
CREATE TABLE bonus_records (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  rule_id UUID NOT NULL REFERENCES bonus_rules(id) ON DELETE CASCADE,
  amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'PAID', 'REVERSED')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_bonus_records_org ON bonus_records(organization_id);
CREATE INDEX idx_bonus_records_user ON bonus_records(user_id);
CREATE INDEX idx_bonus_records_status ON bonus_records(organization_id, status);

-- Prevent duplicate bonus for same user+rule+period
CREATE UNIQUE INDEX idx_bonus_unique ON bonus_records(user_id, rule_id, period_start, period_end) WHERE status != 'REVERSED';

-- ============================================================================
-- 25. Notifications
-- ============================================================================
CREATE TABLE notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  read BOOLEAN NOT NULL DEFAULT false,
  entity_type TEXT,
  entity_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_unread ON notifications(user_id) WHERE read = false;
CREATE INDEX idx_notifications_org ON notifications(organization_id);

-- ============================================================================
-- 26. Audit Logs
-- ============================================================================
CREATE TABLE audit_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  actor_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_logs_org ON audit_logs(organization_id);
CREATE INDEX idx_audit_logs_actor ON audit_logs(actor_id);
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_logs_date ON audit_logs(organization_id, created_at DESC);
CREATE INDEX idx_audit_logs_action ON audit_logs(organization_id, action);

-- ============================================================================
-- 27. Email Logs
-- ============================================================================
CREATE TABLE email_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  recipient TEXT NOT NULL,
  template TEXT NOT NULL,
  subject TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING',
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_email_logs_org ON email_logs(organization_id);

-- ============================================================================
-- 28. Employee Invitations
-- ============================================================================
CREATE TABLE employee_invitations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'SALES_REP' CHECK (role IN ('ORG_ADMIN', 'MANAGER', 'SALES_REP')),
  team_id UUID REFERENCES teams(id) ON DELETE SET NULL,
  manager_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  phone TEXT,
  employee_id_str TEXT,
  token UUID NOT NULL DEFAULT gen_random_uuid(),
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'ACCEPTED', 'EXPIRED', 'CANCELLED')),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '7 days'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_invitations_org ON employee_invitations(organization_id);
CREATE INDEX idx_invitations_token ON employee_invitations(token) WHERE status = 'PENDING';
CREATE INDEX idx_invitations_email ON employee_invitations(email);

-- ============================================================================
-- Auto-update updated_at trigger function
-- ============================================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to all tables with updated_at
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN
    SELECT table_name FROM information_schema.columns
    WHERE column_name = 'updated_at' AND table_schema = 'public'
  LOOP
    EXECUTE format(
      'CREATE TRIGGER trigger_updated_at BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION update_updated_at()',
      tbl
    );
  END LOOP;
END;
$$;


-- ===== 002_rls_policies.sql =====
-- ============================================================================
-- SalesOS RLS Policies — Migration 002
-- Row Level Security for multi-tenant data isolation
-- ============================================================================
-- NOTE: Helper functions are created in the `public` schema because
-- Supabase hosted does NOT allow creating functions in the `auth` schema.
-- Only auth.uid() and auth.jwt() are available from Supabase's auth schema.
-- ============================================================================

-- ============================================================================
-- Helper function: Get current user's organization_id from their profile
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_user_org_id()
RETURNS UUID AS $$
  SELECT organization_id FROM public.profiles WHERE id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Helper: Get current user's role
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS TEXT AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Helper: Check if user is super admin
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS(SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'SUPER_ADMIN')
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Helper: Check if user is org admin
CREATE OR REPLACE FUNCTION public.is_org_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS(SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('SUPER_ADMIN', 'ORG_ADMIN'))
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Helper: Check if user is manager of a team
CREATE OR REPLACE FUNCTION public.manages_team(p_team_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS(
    SELECT 1 FROM public.teams 
    WHERE id = p_team_id AND manager_id = auth.uid() AND organization_id = public.get_user_org_id()
  )
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Helper: Check if user manages another user (directly or via team)
CREATE OR REPLACE FUNCTION public.manages_user(p_user_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS(
    SELECT 1 FROM public.profiles 
    WHERE id = p_user_id 
    AND organization_id = public.get_user_org_id()
    AND (manager_id = auth.uid() OR team_id IN (
      SELECT id FROM public.teams WHERE manager_id = auth.uid()
    ))
  )
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ============================================================================
-- Enable RLS on all tables
-- ============================================================================
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE follow_ups ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE targets ENABLE ROW LEVEL SECURITY;
ALTER TABLE target_milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE xp_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE xp_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE commission_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE commission_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE bonus_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE bonus_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_invitations ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Organizations
-- ============================================================================
CREATE POLICY "super_admin_all_orgs" ON organizations
  FOR ALL USING (public.is_super_admin());

CREATE POLICY "users_own_org" ON organizations
  FOR SELECT USING (id = public.get_user_org_id());

-- ============================================================================
-- Organization Settings
-- ============================================================================
CREATE POLICY "org_settings_read" ON organization_settings
  FOR SELECT USING (organization_id = public.get_user_org_id());

CREATE POLICY "org_settings_write" ON organization_settings
  FOR ALL USING (organization_id = public.get_user_org_id() AND public.is_org_admin());

-- ============================================================================
-- Profiles
-- ============================================================================
CREATE POLICY "profiles_read_own_org" ON profiles
  FOR SELECT USING (organization_id = public.get_user_org_id() OR public.is_super_admin());

CREATE POLICY "profiles_insert" ON profiles
  FOR INSERT WITH CHECK (organization_id = public.get_user_org_id() AND public.is_org_admin());

CREATE POLICY "profiles_update_admin" ON profiles
  FOR UPDATE USING (
    (organization_id = public.get_user_org_id() AND public.is_org_admin())
    OR id = auth.uid()
  );

-- ============================================================================
-- Teams
-- ============================================================================
CREATE POLICY "teams_read" ON teams
  FOR SELECT USING (organization_id = public.get_user_org_id());

CREATE POLICY "teams_write" ON teams
  FOR ALL USING (organization_id = public.get_user_org_id() AND public.is_org_admin());

-- ============================================================================
-- Team Members
-- ============================================================================
CREATE POLICY "team_members_read" ON team_members
  FOR SELECT USING (organization_id = public.get_user_org_id());

CREATE POLICY "team_members_write" ON team_members
  FOR ALL USING (organization_id = public.get_user_org_id() AND public.is_org_admin());

-- ============================================================================
-- Products
-- ============================================================================
CREATE POLICY "products_read" ON products
  FOR SELECT USING (organization_id = public.get_user_org_id());

CREATE POLICY "products_write" ON products
  FOR ALL USING (organization_id = public.get_user_org_id() AND public.is_org_admin());

-- ============================================================================
-- Customers
-- ============================================================================
CREATE POLICY "customers_read" ON customers
  FOR SELECT USING (organization_id = public.get_user_org_id());

CREATE POLICY "customers_write_admin" ON customers
  FOR ALL USING (organization_id = public.get_user_org_id() AND public.is_org_admin());

CREATE POLICY "customers_write_self" ON customers
  FOR INSERT WITH CHECK (organization_id = public.get_user_org_id());

CREATE POLICY "customers_update_self" ON customers
  FOR UPDATE USING (organization_id = public.get_user_org_id());

-- ============================================================================
-- Lead Sources
-- ============================================================================
CREATE POLICY "lead_sources_read" ON lead_sources
  FOR SELECT USING (organization_id = public.get_user_org_id());

CREATE POLICY "lead_sources_write" ON lead_sources
  FOR ALL USING (organization_id = public.get_user_org_id() AND public.is_org_admin());

-- ============================================================================
-- Leads
-- ============================================================================
CREATE POLICY "leads_read_admin" ON leads
  FOR SELECT USING (
    organization_id = public.get_user_org_id() 
    AND (
      public.get_user_role() IN ('SUPER_ADMIN', 'ORG_ADMIN')
      OR assigned_to = auth.uid()
      OR team_id IN (SELECT id FROM public.teams WHERE manager_id = auth.uid())
    )
  );

CREATE POLICY "leads_insert" ON leads
  FOR INSERT WITH CHECK (organization_id = public.get_user_org_id());

CREATE POLICY "leads_update" ON leads
  FOR UPDATE USING (
    organization_id = public.get_user_org_id()
    AND (
      public.get_user_role() IN ('SUPER_ADMIN', 'ORG_ADMIN')
      OR assigned_to = auth.uid()
      OR team_id IN (SELECT id FROM public.teams WHERE manager_id = auth.uid())
    )
  );

CREATE POLICY "leads_delete" ON leads
  FOR DELETE USING (organization_id = public.get_user_org_id() AND public.is_org_admin());

-- ============================================================================
-- Lead Activities
-- ============================================================================
CREATE POLICY "lead_activities_read" ON lead_activities
  FOR SELECT USING (organization_id = public.get_user_org_id());

CREATE POLICY "lead_activities_insert" ON lead_activities
  FOR INSERT WITH CHECK (organization_id = public.get_user_org_id());

-- ============================================================================
-- Follow-ups
-- ============================================================================
CREATE POLICY "follow_ups_read" ON follow_ups
  FOR SELECT USING (
    organization_id = public.get_user_org_id()
    AND (
      public.get_user_role() IN ('SUPER_ADMIN', 'ORG_ADMIN')
      OR user_id = auth.uid()
      OR EXISTS(SELECT 1 FROM public.leads l JOIN public.teams t ON l.team_id = t.id WHERE l.id = lead_id AND t.manager_id = auth.uid())
    )
  );

CREATE POLICY "follow_ups_write" ON follow_ups
  FOR ALL USING (organization_id = public.get_user_org_id() AND (user_id = auth.uid() OR public.is_org_admin()));

-- ============================================================================
-- Sales
-- ============================================================================
CREATE POLICY "sales_read" ON sales
  FOR SELECT USING (
    organization_id = public.get_user_org_id()
    AND (
      public.get_user_role() IN ('SUPER_ADMIN', 'ORG_ADMIN')
      OR user_id = auth.uid()
      OR team_id IN (SELECT id FROM public.teams WHERE manager_id = auth.uid())
    )
  );

CREATE POLICY "sales_insert" ON sales
  FOR INSERT WITH CHECK (organization_id = public.get_user_org_id());

CREATE POLICY "sales_update" ON sales
  FOR UPDATE USING (
    organization_id = public.get_user_org_id()
    AND (public.is_org_admin() OR user_id = auth.uid())
  );

-- ============================================================================
-- Sale Items
-- ============================================================================
CREATE POLICY "sale_items_read" ON sale_items
  FOR SELECT USING (organization_id = public.get_user_org_id());

CREATE POLICY "sale_items_insert" ON sale_items
  FOR INSERT WITH CHECK (organization_id = public.get_user_org_id());

-- ============================================================================
-- Targets
-- ============================================================================
CREATE POLICY "targets_read" ON targets
  FOR SELECT USING (
    organization_id = public.get_user_org_id()
    AND (
      public.get_user_role() IN ('SUPER_ADMIN', 'ORG_ADMIN')
      OR user_id = auth.uid()
      OR team_id IN (SELECT id FROM public.teams WHERE manager_id = auth.uid())
    )
  );

CREATE POLICY "targets_write" ON targets
  FOR ALL USING (organization_id = public.get_user_org_id() AND public.is_org_admin());

-- ============================================================================
-- Target Milestones
-- ============================================================================
CREATE POLICY "milestones_read" ON target_milestones
  FOR SELECT USING (organization_id = public.get_user_org_id());

CREATE POLICY "milestones_write" ON target_milestones
  FOR ALL USING (organization_id = public.get_user_org_id() AND public.is_org_admin());

-- ============================================================================
-- XP Rules
-- ============================================================================
CREATE POLICY "xp_rules_read" ON xp_rules
  FOR SELECT USING (organization_id = public.get_user_org_id());

CREATE POLICY "xp_rules_write" ON xp_rules
  FOR ALL USING (organization_id = public.get_user_org_id() AND public.is_org_admin());

-- ============================================================================
-- XP Transactions
-- ============================================================================
CREATE POLICY "xp_transactions_read" ON xp_transactions
  FOR SELECT USING (
    organization_id = public.get_user_org_id()
    AND (public.get_user_role() IN ('SUPER_ADMIN', 'ORG_ADMIN') OR user_id = auth.uid())
  );

CREATE POLICY "xp_transactions_insert" ON xp_transactions
  FOR INSERT WITH CHECK (organization_id = public.get_user_org_id());

-- ============================================================================
-- Levels
-- ============================================================================
CREATE POLICY "levels_read" ON levels
  FOR SELECT USING (organization_id = public.get_user_org_id());

CREATE POLICY "levels_write" ON levels
  FOR ALL USING (organization_id = public.get_user_org_id() AND public.is_org_admin());

-- ============================================================================
-- Achievements
-- ============================================================================
CREATE POLICY "achievements_read" ON achievements
  FOR SELECT USING (organization_id = public.get_user_org_id());

CREATE POLICY "achievements_write" ON achievements
  FOR ALL USING (organization_id = public.get_user_org_id() AND public.is_org_admin());

-- ============================================================================
-- User Achievements
-- ============================================================================
CREATE POLICY "user_achievements_read" ON user_achievements
  FOR SELECT USING (
    organization_id = public.get_user_org_id()
    AND (public.get_user_role() IN ('SUPER_ADMIN', 'ORG_ADMIN') OR user_id = auth.uid())
  );

CREATE POLICY "user_achievements_insert" ON user_achievements
  FOR INSERT WITH CHECK (organization_id = public.get_user_org_id());

-- ============================================================================
-- Commission Rules
-- ============================================================================
CREATE POLICY "commission_rules_read" ON commission_rules
  FOR SELECT USING (organization_id = public.get_user_org_id());

CREATE POLICY "commission_rules_write" ON commission_rules
  FOR ALL USING (organization_id = public.get_user_org_id() AND public.is_org_admin());

-- ============================================================================
-- Commission Records
-- ============================================================================
CREATE POLICY "commission_records_read" ON commission_records
  FOR SELECT USING (
    organization_id = public.get_user_org_id()
    AND (public.get_user_role() IN ('SUPER_ADMIN', 'ORG_ADMIN') OR user_id = auth.uid())
  );

CREATE POLICY "commission_records_write" ON commission_records
  FOR ALL USING (organization_id = public.get_user_org_id() AND public.is_org_admin());

-- ============================================================================
-- Bonus Rules
-- ============================================================================
CREATE POLICY "bonus_rules_read" ON bonus_rules
  FOR SELECT USING (organization_id = public.get_user_org_id());

CREATE POLICY "bonus_rules_write" ON bonus_rules
  FOR ALL USING (organization_id = public.get_user_org_id() AND public.is_org_admin());

-- ============================================================================
-- Bonus Records
-- ============================================================================
CREATE POLICY "bonus_records_read" ON bonus_records
  FOR SELECT USING (
    organization_id = public.get_user_org_id()
    AND (public.get_user_role() IN ('SUPER_ADMIN', 'ORG_ADMIN') OR user_id = auth.uid())
  );

CREATE POLICY "bonus_records_write" ON bonus_records
  FOR ALL USING (organization_id = public.get_user_org_id() AND public.is_org_admin());

-- ============================================================================
-- Notifications
-- ============================================================================
CREATE POLICY "notifications_read" ON notifications
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "notifications_update" ON notifications
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "notifications_insert" ON notifications
  FOR INSERT WITH CHECK (organization_id = public.get_user_org_id());

-- ============================================================================
-- Audit Logs (read only for admins)
-- ============================================================================
CREATE POLICY "audit_logs_read" ON audit_logs
  FOR SELECT USING (organization_id = public.get_user_org_id() AND public.is_org_admin());

CREATE POLICY "audit_logs_insert" ON audit_logs
  FOR INSERT WITH CHECK (organization_id = public.get_user_org_id());

-- ============================================================================
-- Email Logs
-- ============================================================================
CREATE POLICY "email_logs_read" ON email_logs
  FOR SELECT USING (organization_id = public.get_user_org_id() AND public.is_org_admin());

CREATE POLICY "email_logs_insert" ON email_logs
  FOR INSERT WITH CHECK (organization_id = public.get_user_org_id());

-- ============================================================================
-- Employee Invitations
-- ============================================================================
CREATE POLICY "invitations_read" ON employee_invitations
  FOR SELECT USING (organization_id = public.get_user_org_id() AND public.is_org_admin());

CREATE POLICY "invitations_write" ON employee_invitations
  FOR ALL USING (organization_id = public.get_user_org_id() AND public.is_org_admin());

-- Allow unauthenticated reads by token for accepting invitations
CREATE POLICY "invitations_accept" ON employee_invitations
  FOR SELECT USING (status = 'PENDING' AND expires_at > now());



-- ===== 003_functions.sql =====
-- ============================================================================
-- SalesOS PostgreSQL Functions — Migration 003
-- Server-side business logic functions (single source of truth)
-- ============================================================================

-- ============================================================================
-- Calculate total revenue for a user in a date range (qualifying sales only)
-- ============================================================================
CREATE OR REPLACE FUNCTION calculate_user_revenue(
  p_user_id UUID,
  p_org_id UUID,
  p_date_from DATE DEFAULT NULL,
  p_date_to DATE DEFAULT NULL
)
RETURNS NUMERIC AS $$
  SELECT COALESCE(SUM(total), 0)
  FROM sales
  WHERE organization_id = p_org_id
    AND user_id = p_user_id
    AND payment_status = 'PAID'
    AND (p_date_from IS NULL OR sale_date >= p_date_from)
    AND (p_date_to IS NULL OR sale_date <= p_date_to);
$$ LANGUAGE sql STABLE;

-- ============================================================================
-- Calculate total sales count for a user
-- ============================================================================
CREATE OR REPLACE FUNCTION calculate_user_sales_count(
  p_user_id UUID,
  p_org_id UUID,
  p_date_from DATE DEFAULT NULL,
  p_date_to DATE DEFAULT NULL
)
RETURNS INTEGER AS $$
  SELECT COUNT(*)::INTEGER
  FROM sales
  WHERE organization_id = p_org_id
    AND user_id = p_user_id
    AND payment_status = 'PAID'
    AND (p_date_from IS NULL OR sale_date >= p_date_from)
    AND (p_date_to IS NULL OR sale_date <= p_date_to);
$$ LANGUAGE sql STABLE;

-- ============================================================================
-- Calculate team revenue
-- ============================================================================
CREATE OR REPLACE FUNCTION calculate_team_revenue(
  p_team_id UUID,
  p_org_id UUID,
  p_date_from DATE DEFAULT NULL,
  p_date_to DATE DEFAULT NULL
)
RETURNS NUMERIC AS $$
  SELECT COALESCE(SUM(total), 0)
  FROM sales
  WHERE organization_id = p_org_id
    AND team_id = p_team_id
    AND payment_status = 'PAID'
    AND (p_date_from IS NULL OR sale_date >= p_date_from)
    AND (p_date_to IS NULL OR sale_date <= p_date_to);
$$ LANGUAGE sql STABLE;

-- ============================================================================
-- Calculate org-wide revenue
-- ============================================================================
CREATE OR REPLACE FUNCTION calculate_org_revenue(
  p_org_id UUID,
  p_date_from DATE DEFAULT NULL,
  p_date_to DATE DEFAULT NULL
)
RETURNS NUMERIC AS $$
  SELECT COALESCE(SUM(total), 0)
  FROM sales
  WHERE organization_id = p_org_id
    AND payment_status = 'PAID'
    AND (p_date_from IS NULL OR sale_date >= p_date_from)
    AND (p_date_to IS NULL OR sale_date <= p_date_to);
$$ LANGUAGE sql STABLE;

-- ============================================================================
-- Calculate org-wide sales count
-- ============================================================================
CREATE OR REPLACE FUNCTION calculate_org_sales_count(
  p_org_id UUID,
  p_date_from DATE DEFAULT NULL,
  p_date_to DATE DEFAULT NULL
)
RETURNS INTEGER AS $$
  SELECT COUNT(*)::INTEGER
  FROM sales
  WHERE organization_id = p_org_id
    AND payment_status = 'PAID'
    AND (p_date_from IS NULL OR sale_date >= p_date_from)
    AND (p_date_to IS NULL OR sale_date <= p_date_to);
$$ LANGUAGE sql STABLE;

-- ============================================================================
-- Calculate conversion rate (won leads / total leads excluding new)
-- ============================================================================
CREATE OR REPLACE FUNCTION calculate_conversion_rate(
  p_org_id UUID,
  p_date_from DATE DEFAULT NULL,
  p_date_to DATE DEFAULT NULL
)
RETURNS NUMERIC AS $$
DECLARE
  total_leads INTEGER;
  won_leads INTEGER;
BEGIN
  SELECT COUNT(*) INTO total_leads
  FROM leads
  WHERE organization_id = p_org_id
    AND stage != 'NEW'
    AND (p_date_from IS NULL OR created_at::date >= p_date_from)
    AND (p_date_to IS NULL OR created_at::date <= p_date_to);

  SELECT COUNT(*) INTO won_leads
  FROM leads
  WHERE organization_id = p_org_id
    AND stage = 'WON'
    AND (p_date_from IS NULL OR created_at::date >= p_date_from)
    AND (p_date_to IS NULL OR created_at::date <= p_date_to);

  IF total_leads = 0 THEN RETURN 0; END IF;
  RETURN ROUND((won_leads::NUMERIC / total_leads::NUMERIC) * 100, 2);
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================================
-- Calculate user XP (sum of non-reversed transactions)
-- ============================================================================
CREATE OR REPLACE FUNCTION calculate_user_xp(
  p_user_id UUID,
  p_org_id UUID
)
RETURNS INTEGER AS $$
  SELECT COALESCE(SUM(points), 0)::INTEGER
  FROM xp_transactions
  WHERE organization_id = p_org_id
    AND user_id = p_user_id
    AND reversed_at IS NULL;
$$ LANGUAGE sql STABLE;

-- ============================================================================
-- Get user level based on XP
-- ============================================================================
CREATE OR REPLACE FUNCTION get_user_level(
  p_user_id UUID,
  p_org_id UUID
)
RETURNS TABLE(level_id UUID, level_name TEXT, level_order INTEGER, min_xp INTEGER) AS $$
DECLARE
  user_xp INTEGER;
BEGIN
  user_xp := calculate_user_xp(p_user_id, p_org_id);
  RETURN QUERY
  SELECT l.id, l.name, l.level_order, l.min_xp
  FROM levels l
  WHERE l.organization_id = p_org_id AND l.min_xp <= user_xp
  ORDER BY l.min_xp DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================================
-- Get leaderboard
-- ============================================================================
CREATE OR REPLACE FUNCTION get_leaderboard(
  p_org_id UUID,
  p_metric TEXT DEFAULT 'revenue',
  p_date_from DATE DEFAULT NULL,
  p_date_to DATE DEFAULT NULL,
  p_limit INTEGER DEFAULT 25
)
RETURNS TABLE(
  rank BIGINT,
  user_id UUID,
  first_name TEXT,
  last_name TEXT,
  avatar_url TEXT,
  team_name TEXT,
  sales_count BIGINT,
  revenue NUMERIC,
  xp BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ROW_NUMBER() OVER (
      ORDER BY
        CASE WHEN p_metric = 'revenue' THEN COALESCE(SUM(s.total), 0) ELSE 0 END DESC,
        CASE WHEN p_metric = 'sales_count' THEN COUNT(s.id) ELSE 0 END DESC,
        CASE WHEN p_metric = 'xp' THEN COALESCE((
          SELECT SUM(xp.points) FROM xp_transactions xp
          WHERE xp.user_id = p.id AND xp.reversed_at IS NULL AND xp.organization_id = p_org_id
        ), 0) ELSE 0 END DESC
    ) AS rank,
    p.id AS user_id,
    p.first_name,
    p.last_name,
    p.avatar_url,
    t.name AS team_name,
    COUNT(s.id) AS sales_count,
    COALESCE(SUM(s.total), 0) AS revenue,
    COALESCE((
      SELECT SUM(xp.points) FROM xp_transactions xp
      WHERE xp.user_id = p.id AND xp.reversed_at IS NULL AND xp.organization_id = p_org_id
    ), 0) AS xp
  FROM profiles p
  LEFT JOIN sales s ON s.user_id = p.id
    AND s.organization_id = p_org_id
    AND s.payment_status = 'PAID'
    AND (p_date_from IS NULL OR s.sale_date >= p_date_from)
    AND (p_date_to IS NULL OR s.sale_date <= p_date_to)
  LEFT JOIN teams t ON p.team_id = t.id
  WHERE p.organization_id = p_org_id
    AND p.role IN ('SALES_REP', 'MANAGER')
    AND p.status = 'ACTIVE'
  GROUP BY p.id, p.first_name, p.last_name, p.avatar_url, t.name
  ORDER BY
    CASE WHEN p_metric = 'revenue' THEN COALESCE(SUM(s.total), 0) ELSE 0 END DESC,
    CASE WHEN p_metric = 'sales_count' THEN COUNT(s.id) ELSE 0 END DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================================
-- Get admin dashboard KPIs
-- ============================================================================
CREATE OR REPLACE FUNCTION get_admin_dashboard_kpis(
  p_org_id UUID,
  p_date_from DATE DEFAULT NULL,
  p_date_to DATE DEFAULT NULL
)
RETURNS TABLE(
  total_revenue NUMERIC,
  total_sales BIGINT,
  active_employees BIGINT,
  active_leads BIGINT,
  conversion_rate NUMERIC,
  commission_payable NUMERIC,
  bonus_payable NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    (SELECT COALESCE(SUM(s.total), 0) FROM sales s
     WHERE s.organization_id = p_org_id AND s.payment_status = 'PAID'
     AND (p_date_from IS NULL OR s.sale_date >= p_date_from)
     AND (p_date_to IS NULL OR s.sale_date <= p_date_to)) AS total_revenue,

    (SELECT COUNT(*) FROM sales s
     WHERE s.organization_id = p_org_id AND s.payment_status = 'PAID'
     AND (p_date_from IS NULL OR s.sale_date >= p_date_from)
     AND (p_date_to IS NULL OR s.sale_date <= p_date_to)) AS total_sales,

    (SELECT COUNT(*) FROM profiles pr
     WHERE pr.organization_id = p_org_id AND pr.status = 'ACTIVE'
     AND pr.role IN ('SALES_REP', 'MANAGER')) AS active_employees,

    (SELECT COUNT(*) FROM leads l
     WHERE l.organization_id = p_org_id
     AND l.stage NOT IN ('WON', 'LOST')) AS active_leads,

    calculate_conversion_rate(p_org_id, p_date_from, p_date_to) AS conversion_rate,

    (SELECT COALESCE(SUM(cr.commission_amount), 0) FROM commission_records cr
     WHERE cr.organization_id = p_org_id AND cr.status = 'PENDING') AS commission_payable,

    (SELECT COALESCE(SUM(br.amount), 0) FROM bonus_records br
     WHERE br.organization_id = p_org_id AND br.status = 'PENDING') AS bonus_payable;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================================
-- Get sales rep dashboard KPIs
-- ============================================================================
CREATE OR REPLACE FUNCTION get_rep_dashboard_kpis(
  p_user_id UUID,
  p_org_id UUID,
  p_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE(
  today_sales BIGINT,
  today_revenue NUMERIC,
  week_sales BIGINT,
  week_revenue NUMERIC,
  month_sales BIGINT,
  month_revenue NUMERIC,
  total_xp BIGINT,
  total_commission NUMERIC,
  total_bonus NUMERIC,
  pending_leads BIGINT,
  today_follow_ups BIGINT,
  overdue_follow_ups BIGINT
) AS $$
DECLARE
  week_start DATE;
  month_start DATE;
BEGIN
  week_start := date_trunc('week', p_date)::date;
  month_start := date_trunc('month', p_date)::date;

  RETURN QUERY
  SELECT
    (SELECT COUNT(*) FROM sales s WHERE s.user_id = p_user_id AND s.organization_id = p_org_id
     AND s.payment_status = 'PAID' AND s.sale_date = p_date) AS today_sales,

    (SELECT COALESCE(SUM(s.total), 0) FROM sales s WHERE s.user_id = p_user_id AND s.organization_id = p_org_id
     AND s.payment_status = 'PAID' AND s.sale_date = p_date) AS today_revenue,

    (SELECT COUNT(*) FROM sales s WHERE s.user_id = p_user_id AND s.organization_id = p_org_id
     AND s.payment_status = 'PAID' AND s.sale_date >= week_start AND s.sale_date <= p_date) AS week_sales,

    (SELECT COALESCE(SUM(s.total), 0) FROM sales s WHERE s.user_id = p_user_id AND s.organization_id = p_org_id
     AND s.payment_status = 'PAID' AND s.sale_date >= week_start AND s.sale_date <= p_date) AS week_revenue,

    (SELECT COUNT(*) FROM sales s WHERE s.user_id = p_user_id AND s.organization_id = p_org_id
     AND s.payment_status = 'PAID' AND s.sale_date >= month_start AND s.sale_date <= p_date) AS month_sales,

    (SELECT COALESCE(SUM(s.total), 0) FROM sales s WHERE s.user_id = p_user_id AND s.organization_id = p_org_id
     AND s.payment_status = 'PAID' AND s.sale_date >= month_start AND s.sale_date <= p_date) AS month_revenue,

    (SELECT COALESCE(SUM(xp.points), 0) FROM xp_transactions xp
     WHERE xp.user_id = p_user_id AND xp.organization_id = p_org_id AND xp.reversed_at IS NULL) AS total_xp,

    (SELECT COALESCE(SUM(cr.commission_amount), 0) FROM commission_records cr
     WHERE cr.user_id = p_user_id AND cr.organization_id = p_org_id
     AND cr.status IN ('PENDING', 'APPROVED')) AS total_commission,

    (SELECT COALESCE(SUM(br.amount), 0) FROM bonus_records br
     WHERE br.user_id = p_user_id AND br.organization_id = p_org_id
     AND br.status IN ('PENDING', 'APPROVED')) AS total_bonus,

    (SELECT COUNT(*) FROM leads l WHERE l.assigned_to = p_user_id AND l.organization_id = p_org_id
     AND l.stage NOT IN ('WON', 'LOST')) AS pending_leads,

    (SELECT COUNT(*) FROM follow_ups f WHERE f.user_id = p_user_id AND f.organization_id = p_org_id
     AND f.status = 'PENDING' AND f.due_date = p_date) AS today_follow_ups,

    (SELECT COUNT(*) FROM follow_ups f WHERE f.user_id = p_user_id AND f.organization_id = p_org_id
     AND f.status = 'PENDING' AND f.due_date < p_date) AS overdue_follow_ups;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================================
-- Revenue over time (for charts)
-- ============================================================================
CREATE OR REPLACE FUNCTION get_revenue_over_time(
  p_org_id UUID,
  p_date_from DATE,
  p_date_to DATE,
  p_group_by TEXT DEFAULT 'day'
)
RETURNS TABLE(period TEXT, revenue NUMERIC, sales_count BIGINT) AS $$
BEGIN
  RETURN QUERY
  SELECT
    CASE
      WHEN p_group_by = 'day' THEN to_char(s.sale_date, 'YYYY-MM-DD')
      WHEN p_group_by = 'week' THEN to_char(date_trunc('week', s.sale_date), 'YYYY-MM-DD')
      WHEN p_group_by = 'month' THEN to_char(s.sale_date, 'YYYY-MM')
      ELSE to_char(s.sale_date, 'YYYY-MM-DD')
    END AS period,
    COALESCE(SUM(s.total), 0) AS revenue,
    COUNT(*) AS sales_count
  FROM sales s
  WHERE s.organization_id = p_org_id
    AND s.payment_status = 'PAID'
    AND s.sale_date >= p_date_from
    AND s.sale_date <= p_date_to
  GROUP BY 1
  ORDER BY 1;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================================
-- Product performance
-- ============================================================================
CREATE OR REPLACE FUNCTION get_product_performance(
  p_org_id UUID,
  p_date_from DATE DEFAULT NULL,
  p_date_to DATE DEFAULT NULL
)
RETURNS TABLE(
  product_id UUID,
  product_name TEXT,
  units_sold BIGINT,
  revenue NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    pr.id AS product_id,
    pr.name AS product_name,
    COALESCE(SUM(si.quantity), 0) AS units_sold,
    COALESCE(SUM(si.total), 0) AS revenue
  FROM products pr
  LEFT JOIN sale_items si ON si.product_id = pr.id
    AND si.organization_id = p_org_id
  LEFT JOIN sales s ON s.id = si.sale_id
    AND s.payment_status = 'PAID'
    AND (p_date_from IS NULL OR s.sale_date >= p_date_from)
    AND (p_date_to IS NULL OR s.sale_date <= p_date_to)
  WHERE pr.organization_id = p_org_id
    AND pr.status = 'ACTIVE'
  GROUP BY pr.id, pr.name
  ORDER BY revenue DESC;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================================
-- Lead funnel (count per stage)
-- ============================================================================
CREATE OR REPLACE FUNCTION get_lead_funnel(
  p_org_id UUID
)
RETURNS TABLE(stage TEXT, count BIGINT) AS $$
BEGIN
  RETURN QUERY
  SELECT l.stage, COUNT(*) AS count
  FROM leads l
  WHERE l.organization_id = p_org_id
  GROUP BY l.stage
  ORDER BY
    CASE l.stage
      WHEN 'NEW' THEN 1
      WHEN 'CONTACTED' THEN 2
      WHEN 'QUALIFIED' THEN 3
      WHEN 'DEMO' THEN 4
      WHEN 'NEGOTIATION' THEN 5
      WHEN 'WON' THEN 6
      WHEN 'LOST' THEN 7
    END;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================================
-- Process sale qualification — award XP, calculate commission
-- Call this after a sale's payment_status changes to 'PAID'
-- ============================================================================
CREATE OR REPLACE FUNCTION process_sale_qualification(p_sale_id UUID)
RETURNS void AS $$
DECLARE
  v_sale RECORD;
  v_rule RECORD;
  v_xp_rule RECORD;
  v_commission_amount NUMERIC;
  v_existing_xp UUID;
  v_existing_commission UUID;
BEGIN
  -- Get sale details
  SELECT * INTO v_sale FROM sales WHERE id = p_sale_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Sale not found'; END IF;
  IF v_sale.payment_status != 'PAID' THEN RETURN; END IF;

  -- Award XP from rules
  FOR v_xp_rule IN
    SELECT * FROM xp_rules
    WHERE organization_id = v_sale.organization_id AND is_active = true AND action = 'SALE'
  LOOP
    -- Check if already awarded
    SELECT id INTO v_existing_xp FROM xp_transactions
    WHERE user_id = v_sale.user_id AND source_type = 'SALE' AND source_id = v_sale.id
    AND rule_id = v_xp_rule.id AND reversed_at IS NULL;

    IF NOT FOUND THEN
      INSERT INTO xp_transactions (organization_id, user_id, points, source_type, source_id, rule_id, description)
      VALUES (v_sale.organization_id, v_sale.user_id, v_xp_rule.reward_points, 'SALE', v_sale.id, v_xp_rule.id,
        'XP for sale #' || v_sale.id::text);
    END IF;
  END LOOP;

  -- Revenue-based XP
  FOR v_xp_rule IN
    SELECT * FROM xp_rules
    WHERE organization_id = v_sale.organization_id AND is_active = true AND action = 'REVENUE'
    AND (condition_value IS NULL OR v_sale.total >= condition_value::numeric)
  LOOP
    SELECT id INTO v_existing_xp FROM xp_transactions
    WHERE user_id = v_sale.user_id AND source_type = 'REVENUE' AND source_id = v_sale.id
    AND rule_id = v_xp_rule.id AND reversed_at IS NULL;

    IF NOT FOUND THEN
      INSERT INTO xp_transactions (organization_id, user_id, points, source_type, source_id, rule_id, description)
      VALUES (v_sale.organization_id, v_sale.user_id, v_xp_rule.reward_points, 'REVENUE', v_sale.id, v_xp_rule.id,
        'XP for revenue of ' || v_sale.total::text);
    END IF;
  END LOOP;

  -- Calculate commission from rules
  FOR v_rule IN
    SELECT * FROM commission_rules
    WHERE organization_id = v_sale.organization_id AND is_active = true
    AND (product_id IS NULL OR product_id IN (SELECT product_id FROM sale_items WHERE sale_id = v_sale.id))
    AND (user_id IS NULL OR user_id = v_sale.user_id)
    AND (team_id IS NULL OR team_id = v_sale.team_id)
    ORDER BY
      CASE WHEN user_id IS NOT NULL THEN 0 ELSE 1 END,
      CASE WHEN product_id IS NOT NULL THEN 0 ELSE 1 END
  LOOP
    -- Check if already calculated
    SELECT id INTO v_existing_commission FROM commission_records
    WHERE sale_id = v_sale.id AND rule_id = v_rule.id AND status != 'REVERSED';

    IF NOT FOUND THEN
      -- Calculate based on type
      IF v_rule.type = 'PERCENTAGE' THEN
        v_commission_amount := v_sale.total * (v_rule.rate / 100);
      ELSIF v_rule.type = 'FIXED' THEN
        v_commission_amount := v_rule.rate;
      ELSIF v_rule.type = 'TIERED' THEN
        -- For tiered, check if sale total falls in the tier
        IF (v_rule.tier_min IS NULL OR v_sale.total >= v_rule.tier_min)
           AND (v_rule.tier_max IS NULL OR v_sale.total <= v_rule.tier_max) THEN
          v_commission_amount := v_sale.total * (v_rule.rate / 100);
        ELSE
          CONTINUE;
        END IF;
      END IF;

      INSERT INTO commission_records (organization_id, user_id, sale_id, rule_id, base_amount, commission_rate, commission_amount, status)
      VALUES (v_sale.organization_id, v_sale.user_id, v_sale.id, v_rule.id, v_sale.total, v_rule.rate, v_commission_amount, 'PENDING');
    END IF;
  END LOOP;

  -- Update target progress
  UPDATE targets
  SET current_value = CASE
    WHEN type = 'SALES_COUNT' THEN current_value + 1
    WHEN type = 'REVENUE' THEN current_value + v_sale.total
    ELSE current_value
  END,
  updated_at = now()
  WHERE organization_id = v_sale.organization_id
    AND is_active = true
    AND v_sale.sale_date BETWEEN period_start AND period_end
    AND (
      (scope = 'INDIVIDUAL' AND user_id = v_sale.user_id)
      OR (scope = 'TEAM' AND team_id = v_sale.team_id)
      OR (scope = 'ORGANIZATION')
    );
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Process sale refund — reverse XP, commission, update targets
-- ============================================================================
CREATE OR REPLACE FUNCTION process_sale_refund(p_sale_id UUID)
RETURNS void AS $$
DECLARE
  v_sale RECORD;
BEGIN
  SELECT * INTO v_sale FROM sales WHERE id = p_sale_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Sale not found'; END IF;

  -- Reverse XP transactions
  UPDATE xp_transactions
  SET reversed_at = now()
  WHERE source_id = v_sale.id AND reversed_at IS NULL;

  -- Reverse commission records
  UPDATE commission_records
  SET status = 'REVERSED', updated_at = now()
  WHERE sale_id = v_sale.id AND status != 'REVERSED';

  -- Update target progress (subtract)
  UPDATE targets
  SET current_value = CASE
    WHEN type = 'SALES_COUNT' THEN GREATEST(current_value - 1, 0)
    WHEN type = 'REVENUE' THEN GREATEST(current_value - v_sale.total, 0)
    ELSE current_value
  END,
  updated_at = now()
  WHERE organization_id = v_sale.organization_id
    AND is_active = true
    AND v_sale.sale_date BETWEEN period_start AND period_end
    AND (
      (scope = 'INDIVIDUAL' AND user_id = v_sale.user_id)
      OR (scope = 'TEAM' AND team_id = v_sale.team_id)
      OR (scope = 'ORGANIZATION')
    );

  -- Update sale status
  UPDATE sales SET payment_status = 'REFUNDED', updated_at = now() WHERE id = p_sale_id;
END;
$$ LANGUAGE plpgsql;


-- ===== 004_triggers.sql =====
-- ============================================================================
-- SalesOS Database Schema — Migration 004: Triggers
-- Automated business logic triggers and timestamp maintenance
-- ============================================================================

-- Function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at trigger to all relevant tables
DO $$
DECLARE
  t text;
  tables text[] := ARRAY[
    'organizations',
    'organization_settings',
    'profiles',
    'teams',
    'products',
    'customers',
    'leads',
    'follow_ups',
    'sales',
    'targets',
    'xp_rules',
    'levels',
    'achievements',
    'commission_rules',
    'commission_records',
    'bonus_rules',
    'bonus_records',
    'employee_invitations',
    'lead_sources'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    EXECUTE format('
      DROP TRIGGER IF EXISTS trg_update_%I_updated_at ON %I;
      CREATE TRIGGER trg_update_%I_updated_at
        BEFORE UPDATE ON %I
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
    ', t, t, t, t);
  END LOOP;
END;
$$;

-- Trigger: Process sale qualification on payment status change to 'PAID'
CREATE OR REPLACE FUNCTION trg_handle_sale_status_change()
RETURNS TRIGGER AS $$
BEGIN
  -- If payment status changed to PAID, qualify the sale
  IF NEW.payment_status = 'PAID' AND (OLD.payment_status IS NULL OR OLD.payment_status != 'PAID') THEN
    PERFORM process_sale_qualification(NEW.id);
  END IF;

  -- If payment status changed to REFUNDED, process refund
  IF NEW.payment_status = 'REFUNDED' AND OLD.payment_status != 'REFUNDED' THEN
    PERFORM process_sale_refund(NEW.id);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sale_status_change ON sales;
CREATE TRIGGER trg_sale_status_change
  AFTER UPDATE OF payment_status ON sales
  FOR EACH ROW
  EXECUTE FUNCTION trg_handle_sale_status_change();

-- Trigger: Automatically handle new auth.users signup/invitation into profiles
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_org_id UUID;
  v_role TEXT;
  v_first_name TEXT;
  v_last_name TEXT;
BEGIN
  v_org_id := (NEW.raw_user_meta_data->>'organization_id')::UUID;
  v_role := COALESCE(NEW.raw_user_meta_data->>'role', 'SALES_REP');
  v_first_name := COALESCE(NEW.raw_user_meta_data->>'first_name', 'New');
  v_last_name := COALESCE(NEW.raw_user_meta_data->>'last_name', 'User');

  IF v_org_id IS NOT NULL THEN
    INSERT INTO profiles (
      id,
      organization_id,
      first_name,
      last_name,
      email,
      role,
      status
    ) VALUES (
      NEW.id,
      v_org_id,
      v_first_name,
      v_last_name,
      NEW.email,
      v_role,
      'ACTIVE'
    )
    ON CONFLICT (id) DO UPDATE SET
      first_name = EXCLUDED.first_name,
      last_name = EXCLUDED.last_name,
      role = EXCLUDED.role,
      updated_at = now();
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();


-- ===== 005_seed.sql =====
-- ============================================================================
-- SalesOS Database Schema — Migration 005: Realistic Seed Data
-- Demo company "Acme Learning" with teams, products, gamification, leads, and sales
-- ============================================================================

DO $$
DECLARE
  v_org_id UUID := '11111111-1111-1111-1111-111111111111';
  
  -- User IDs
  v_admin_id UUID := '22222222-2222-2222-2222-222222222222';
  v_manager1_id UUID := '33333333-3333-3333-3333-333333333331';
  v_manager2_id UUID := '33333333-3333-3333-3333-333333333332';
  v_rep1_id UUID := '44444444-4444-4444-4444-444444444441';
  v_rep2_id UUID := '44444444-4444-4444-4444-444444444442';
  v_rep3_id UUID := '44444444-4444-4444-4444-444444444443';
  v_rep4_id UUID := '44444444-4444-4444-4444-444444444444';

  -- Team IDs
  v_team_alpha UUID := '55555555-5555-5555-5555-555555555551';
  v_team_beta UUID := '55555555-5555-5555-5555-555555555552';

  -- Product IDs
  v_prod_python UUID := '66666666-6666-6666-6666-666666666661';
  v_prod_ai UUID := '66666666-6666-6666-6666-666666666662';
  v_prod_web UUID := '66666666-6666-6666-6666-666666666663';
  v_prod_excel UUID := '66666666-6666-6666-6666-666666666664';

  -- Customer IDs
  v_cust1 UUID := '77777777-7777-7777-7777-777777777771';
  v_cust2 UUID := '77777777-7777-7777-7777-777777777772';
  v_cust3 UUID := '77777777-7777-7777-7777-777777777773';
  v_cust4 UUID := '77777777-7777-7777-7777-777777777774';

  -- Lead IDs
  v_lead1 UUID := '88888888-8888-8888-8888-888888888881';
  v_lead2 UUID := '88888888-8888-8888-8888-888888888882';
  v_lead3 UUID := '88888888-8888-8888-8888-888888888883';

  -- Sale IDs
  v_sale1 UUID := '99999999-9999-9999-9999-999999999991';
  v_sale2 UUID := '99999999-9999-9999-9999-999999999992';

  -- Target IDs
  v_target1 UUID := 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  v_target2 UUID := 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';

BEGIN
  -- 1. Insert Organization
  INSERT INTO organizations (id, name, logo_url, email, phone, industry, country, currency, timezone, website, status)
  VALUES (
    v_org_id,
    'Acme Learning Technologies',
    'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=128&auto=format&fit=crop',
    'contact@acmelearning.io',
    '+91 98765 43210',
    'EdTech & Corporate Training',
    'India',
    'INR',
    'Asia/Kolkata',
    'https://acmelearning.io',
    'ACTIVE'
  ) ON CONFLICT (id) DO NOTHING;

  -- 2. Organization Settings
  INSERT INTO organization_settings (organization_id, setting_key, setting_value)
  VALUES 
    (v_org_id, 'sales_qualification_require_payment', 'true'::jsonb),
    (v_org_id, 'lead_auto_assignment', 'false'::jsonb),
    (v_org_id, 'commission_payment_schedule', '"monthly"'::jsonb),
    (v_org_id, 'gamification_enabled', 'true'::jsonb)
  ON CONFLICT (organization_id, setting_key) DO NOTHING;

  -- 3. Lead Sources
  INSERT INTO lead_sources (organization_id, name, is_active)
  VALUES
    (v_org_id, 'Website', true),
    (v_org_id, 'WhatsApp Campaign', true),
    (v_org_id, 'Direct Call', true),
    (v_org_id, 'Referral', true),
    (v_org_id, 'Meta Ads', true),
    (v_org_id, 'Google Search', true),
    (v_org_id, 'Campus Event', true)
  ON CONFLICT DO NOTHING;

  -- 4. Teams
  INSERT INTO teams (id, organization_id, name, description, status)
  VALUES
    (v_team_alpha, v_org_id, 'Alpha Squad (North)', 'North Region Enterprise & Retail Sales', 'ACTIVE'),
    (v_team_beta, v_org_id, 'Beta Sharks (West)', 'West Region Digital Growth & Acceleration', 'ACTIVE')
  ON CONFLICT (id) DO NOTHING;

  -- 5. Products
  -- Schema column is "cost" not "cost_price"
  INSERT INTO products (id, organization_id, name, sku, category, description, cost, selling_price, status)
  VALUES
    (v_prod_python, v_org_id, 'Full-Stack Python Bootcamp', 'SKU-PY-01', 'Software Development', 'Comprehensive 6-month Python, Django, React live bootcamp', 15000, 35000, 'ACTIVE'),
    (v_prod_ai, v_org_id, 'AI & GenAI Masterclass', 'SKU-AI-02', 'Data & AI', 'Cutting-edge LLM engineering, LangChain, RAG architecture masterclass', 22000, 65000, 'ACTIVE'),
    (v_prod_web, v_org_id, 'Full-Stack Web Development', 'SKU-WEB-03', 'Software Development', 'Modern TypeScript, Next.js, Node.js and cloud deployment', 18000, 45000, 'ACTIVE'),
    (v_prod_excel, v_org_id, 'Advanced Business Analytics with Excel & PowerBI', 'SKU-BI-04', 'Analytics', 'Business intelligence, dashboarding and advanced financial modeling', 8000, 25000, 'ACTIVE')
  ON CONFLICT (id) DO NOTHING;

  -- 6. Gamification Levels
  -- Schema has "icon" not "badge_color"
  INSERT INTO levels (organization_id, name, min_xp, level_order, icon)
  VALUES
    (v_org_id, 'Rookie', 0, 1, '🥉'),
    (v_org_id, 'Achiever', 1000, 2, '🥈'),
    (v_org_id, 'Closer', 2500, 3, '🥇'),
    (v_org_id, 'Top Gun', 5000, 4, '💎'),
    (v_org_id, 'Legend', 10000, 5, '👑')
  ON CONFLICT DO NOTHING;

  -- 7. Gamification Achievements
  INSERT INTO achievements (organization_id, name, description, icon, xp_reward, condition_type, condition_value)
  VALUES
    (v_org_id, 'First Blood', 'Closed your first sale on SalesOS', 'Zap', 150, 'SALES_COUNT', 1),
    (v_org_id, 'Centurion', 'Generated ₹1,00,000+ in revenue in a single month', 'Award', 500, 'REVENUE', 100000),
    (v_org_id, 'Hat-Trick Hero', 'Closed 3 deals in a single day', 'Flame', 300, 'SALES_COUNT', 3),
    (v_org_id, 'Target Destroyer', 'Achieved 100% of your monthly sales target', 'Target', 400, 'TARGET_ACHIEVEMENT', 100),
    (v_org_id, 'Pinnacle Master', 'Achieved 150% overachievement on your target', 'Crown', 1000, 'TARGET_ACHIEVEMENT', 150)
  ON CONFLICT DO NOTHING;

  -- 8. XP Rules
  -- Schema requires "name" column
  INSERT INTO xp_rules (organization_id, name, action, description, reward_points, is_active)
  VALUES
    (v_org_id, 'Sale Qualified Points', 'SALE_QUALIFIED', 'Points awarded for every qualified sale', 100, true),
    (v_org_id, 'Revenue Milestone', 'REVENUE_PER_10K', 'Points per ₹10,000 in generated revenue', 25, true),
    (v_org_id, 'Lead Won Bonus', 'LEAD_WON', 'Bonus points for transitioning lead to Won', 50, true),
    (v_org_id, 'Target Complete Bonus', 'TARGET_COMPLETED', 'Milestone achievement bonus', 300, true)
  ON CONFLICT DO NOTHING;

  -- 9. Commission Rules
  -- Schema column is "name" not "rule_name", and no "description" column
  INSERT INTO commission_rules (organization_id, name, type, rate, is_active)
  VALUES
    (v_org_id, 'Standard Base Commission', 'PERCENTAGE', 5.0, true),
    (v_org_id, 'AI Accelerator Incentive', 'PERCENTAGE', 8.0, true)
  ON CONFLICT DO NOTHING;

  -- 10. Bonus Rules
  INSERT INTO bonus_rules (organization_id, name, condition_type, condition_value, bonus_amount, period, is_active)
  VALUES
    (v_org_id, 'Monthly Revenue Champion', 'REVENUE', 300000, 20000, 'MONTHLY', true),
    (v_org_id, 'Over-Target Accelerator', 'TARGET_ACHIEVEMENT', 120, 15000, 'MONTHLY', true)
  ON CONFLICT DO NOTHING;

  -- 11. Customers
  INSERT INTO customers (id, organization_id, first_name, last_name, email, phone, city, state, country, status)
  VALUES
    (v_cust1, v_org_id, 'Rohan', 'Sharma', 'rohan.sharma@example.com', '+91 98111 22233', 'Bangalore', 'Karnataka', 'India', 'CUSTOMER'),
    (v_cust2, v_org_id, 'Priya', 'Verma', 'priya.verma@example.com', '+91 98222 33344', 'Mumbai', 'Maharashtra', 'India', 'CUSTOMER'),
    (v_cust3, v_org_id, 'Amit', 'Patel', 'amit.patel@example.com', '+91 98333 44455', 'Ahmedabad', 'Gujarat', 'India', 'PROSPECT'),
    (v_cust4, v_org_id, 'Sneha', 'Reddy', 'sneha.reddy@example.com', '+91 98444 55566', 'Hyderabad', 'Telangana', 'India', 'LEAD')
  ON CONFLICT (id) DO NOTHING;

  -- 12. Leads
  -- Schema has no "title" column; uses "lead_source" not "source"
  INSERT INTO leads (id, organization_id, customer_id, product_id, stage, expected_value, probability, lead_source, notes)
  VALUES
    (v_lead1, v_org_id, v_cust1, v_prod_ai, 'WON', 65000, 100, 'Website', 'Enterprise GenAI Upskilling — Converted after demo on Saturday'),
    (v_lead2, v_org_id, v_cust2, v_prod_python, 'WON', 35000, 100, 'Referral', 'Python Career Transition Bootcamp — Payment completed via UPI'),
    (v_lead3, v_org_id, v_cust3, v_prod_excel, 'NEGOTIATION', 50000, 75, 'Direct Call', 'Corporate PowerBI & Excel Analytics — Negotiating 2 seat discount')
  ON CONFLICT (id) DO NOTHING;

END;
$$;


-- ===== 006_email_threads.sql =====
-- =============================================================================
-- Migration 006: Email Threads & Messages
-- =============================================================================

-- Email threads (conversations)
CREATE TABLE IF NOT EXISTS email_threads (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  subject       TEXT NOT NULL,
  participants  TEXT[] NOT NULL DEFAULT '{}',
  last_message_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  unread_count  INT NOT NULL DEFAULT 0,
  folder        TEXT NOT NULL DEFAULT 'inbox' CHECK (folder IN ('inbox','sent','drafts','trash')),
  customer_id   UUID REFERENCES customers(id) ON DELETE SET NULL,
  lead_id       UUID REFERENCES leads(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Email messages
CREATE TABLE IF NOT EXISTS email_messages (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id     UUID NOT NULL REFERENCES email_threads(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  from_address  TEXT NOT NULL,
  from_name     TEXT NOT NULL DEFAULT '',
  to_addresses  TEXT[] NOT NULL DEFAULT '{}',
  cc_addresses  TEXT[] NOT NULL DEFAULT '{}',
  subject       TEXT NOT NULL,
  body_html     TEXT NOT NULL DEFAULT '',
  body_text     TEXT NOT NULL DEFAULT '',
  status        TEXT NOT NULL DEFAULT 'sent' CHECK (status IN ('sent','draft','failed')),
  is_read       BOOLEAN NOT NULL DEFAULT false,
  sent_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  resend_id     TEXT,
  customer_id   UUID REFERENCES customers(id) ON DELETE SET NULL,
  lead_id       UUID REFERENCES leads(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_email_threads_org ON email_threads(organization_id);
CREATE INDEX IF NOT EXISTS idx_email_threads_folder ON email_threads(organization_id, folder);
CREATE INDEX IF NOT EXISTS idx_email_messages_thread ON email_messages(thread_id);
CREATE INDEX IF NOT EXISTS idx_email_messages_org ON email_messages(organization_id);

-- RLS
ALTER TABLE email_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_members_can_view_threads" ON email_threads
  FOR SELECT USING (
    organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "org_members_can_insert_threads" ON email_threads
  FOR INSERT WITH CHECK (
    organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "org_members_can_update_threads" ON email_threads
  FOR UPDATE USING (
    organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "org_members_can_view_messages" ON email_messages
  FOR SELECT USING (
    organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "org_members_can_insert_messages" ON email_messages
  FOR INSERT WITH CHECK (
    organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid())
  );

-- updated_at trigger
CREATE OR REPLACE FUNCTION update_email_threads_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_email_threads_updated_at
  BEFORE UPDATE ON email_threads
  FOR EACH ROW EXECUTE FUNCTION update_email_threads_updated_at();



