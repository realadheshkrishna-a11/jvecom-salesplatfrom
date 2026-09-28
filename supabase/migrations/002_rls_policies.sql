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

