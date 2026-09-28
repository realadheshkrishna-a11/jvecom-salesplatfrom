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
