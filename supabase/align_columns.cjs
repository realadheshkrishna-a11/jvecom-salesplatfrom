// Align all table columns to match both frontend service expectations and migration files
const { Client } = require('pg');

const client = new Client({
  host: 'aws-0-ap-south-1.pooler.supabase.com',
  port: 5432,
  database: 'postgres',
  user: 'postgres.qkwxsiezhyarpcfnbjja',
  password: 'yKhs50xrj31U4ljR',
  ssl: { rejectUnauthorized: false },
});

async function run() {
  await client.connect();
  console.log('Connected! Aligning table columns...');

  const statements = [
    // customers
    `ALTER TABLE customers ALTER COLUMN name DROP NOT NULL;`,
    `ALTER TABLE customers ADD COLUMN IF NOT EXISTS first_name TEXT;`,
    `ALTER TABLE customers ADD COLUMN IF NOT EXISTS last_name TEXT;`,
    `ALTER TABLE customers ADD COLUMN IF NOT EXISTS address TEXT;`,
    `ALTER TABLE customers ADD COLUMN IF NOT EXISTS city TEXT;`,
    `ALTER TABLE customers ADD COLUMN IF NOT EXISTS state TEXT;`,
    `ALTER TABLE customers ADD COLUMN IF NOT EXISTS country TEXT DEFAULT 'India';`,
    `ALTER TABLE customers ADD COLUMN IF NOT EXISTS lead_source TEXT;`,
    `ALTER TABLE customers ADD COLUMN IF NOT EXISTS notes TEXT;`,

    // If customers has name but first_name is null, populate first_name and last_name
    `UPDATE customers
     SET first_name = COALESCE(NULLIF(split_part(name, ' ', 1), ''), 'Client'),
         last_name = COALESCE(NULLIF(substr(name, length(split_part(name, ' ', 1)) + 2), ''), '')
     WHERE first_name IS NULL AND name IS NOT NULL;`,

    // If customers has first_name but name is null, populate name
    `UPDATE customers
     SET name = TRIM(CONCAT(COALESCE(first_name, ''), ' ', COALESCE(last_name, '')))
     WHERE name IS NULL;`,

    // leads
    `ALTER TABLE leads ALTER COLUMN first_name DROP NOT NULL;`,
    `ALTER TABLE leads ALTER COLUMN last_name DROP NOT NULL;`,
    `ALTER TABLE leads ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES customers(id) ON DELETE CASCADE;`,
    `ALTER TABLE leads ADD COLUMN IF NOT EXISTS product_id UUID REFERENCES products(id) ON DELETE SET NULL;`,
    `ALTER TABLE leads ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES teams(id) ON DELETE SET NULL;`,
    `ALTER TABLE leads ADD COLUMN IF NOT EXISTS lead_source_id UUID REFERENCES lead_sources(id) ON DELETE SET NULL;`,
    `ALTER TABLE leads ADD COLUMN IF NOT EXISTS source TEXT;`,
    `ALTER TABLE leads ADD COLUMN IF NOT EXISTS title TEXT;`,
    `ALTER TABLE leads ADD COLUMN IF NOT EXISTS stage TEXT DEFAULT 'NEW';`,
    `ALTER TABLE leads ADD COLUMN IF NOT EXISTS expected_value NUMERIC(14,2) DEFAULT 0;`,
    `ALTER TABLE leads ADD COLUMN IF NOT EXISTS probability NUMERIC(5,2) DEFAULT 0;`,
    `ALTER TABLE leads ADD COLUMN IF NOT EXISTS expected_close_date DATE;`,
    `ALTER TABLE leads ADD COLUMN IF NOT EXISTS next_follow_up_date DATE;`,

    // commission_rules
    `ALTER TABLE commission_rules ADD COLUMN IF NOT EXISTS rule_name TEXT;`,
    `ALTER TABLE commission_rules ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'PERCENTAGE';`,
    `ALTER TABLE commission_rules ADD COLUMN IF NOT EXISTS rate NUMERIC(10,4) DEFAULT 0;`,
    `ALTER TABLE commission_rules ADD COLUMN IF NOT EXISTS product_id UUID REFERENCES products(id) ON DELETE SET NULL;`,
    `ALTER TABLE commission_rules ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES profiles(id) ON DELETE SET NULL;`,
    `ALTER TABLE commission_rules ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES teams(id) ON DELETE SET NULL;`,
    `ALTER TABLE commission_rules ADD COLUMN IF NOT EXISTS tier_min NUMERIC(14,2);`,
    `ALTER TABLE commission_rules ADD COLUMN IF NOT EXISTS tier_max NUMERIC(14,2);`,

    // commission_records
    `ALTER TABLE commission_records ADD COLUMN IF NOT EXISTS product_id UUID REFERENCES products(id) ON DELETE SET NULL;`,
    `ALTER TABLE commission_records ADD COLUMN IF NOT EXISTS commission_rate NUMERIC(10,4) DEFAULT 0;`,

    // products
    `ALTER TABLE products ADD COLUMN IF NOT EXISTS image_url TEXT;`,

    // lead_activities
    `ALTER TABLE lead_activities ADD COLUMN IF NOT EXISTS outcome TEXT;`,
    `ALTER TABLE lead_activities ADD COLUMN IF NOT EXISTS activity_date TIMESTAMPTZ DEFAULT now();`,

    // follow_ups
    `ALTER TABLE follow_ups ADD COLUMN IF NOT EXISTS due_date DATE;`,
    `ALTER TABLE follow_ups ADD COLUMN IF NOT EXISTS due_time TIME;`,
    `ALTER TABLE follow_ups ADD COLUMN IF NOT EXISTS reminder BOOLEAN DEFAULT false;`,

    // teams
    `ALTER TABLE teams ALTER COLUMN created_by DROP NOT NULL;`,

    // email_threads & email_messages
    `ALTER TABLE email_threads ADD COLUMN IF NOT EXISTS is_draft BOOLEAN DEFAULT false;`,
    `ALTER TABLE email_messages ADD COLUMN IF NOT EXISTS delivery_status TEXT DEFAULT 'live_delivered';`,
    `ALTER TABLE email_messages ADD COLUMN IF NOT EXISTS delivery_error TEXT;`,
  ];

  for (const sql of statements) {
    try {
      await client.query(sql);
      console.log('✅ ' + sql.slice(0, 50) + '...');
    } catch (e) {
      console.warn('⚠️ ' + sql.slice(0, 50) + '... failed: ' + e.message);
    }
  }

  // Seed realistic initial records if empty
  const orgId = '11111111-1111-1111-1111-111111111111';
  const adminId = '22222222-2222-2222-2222-222222222222';

  // Seed Products if none
  const prodCount = await client.query('SELECT count(*) FROM products');
  if (parseInt(prodCount.rows[0].count) === 0) {
    console.log('Seeding products...');
    await client.query(`
      INSERT INTO products (id, organization_id, name, sku, category, description, cost, selling_price, status)
      VALUES
        ('66666666-6666-6666-6666-666666666661', '${orgId}', 'Custom B2B Product Sourcing', 'SKU-SRC-01', 'Sourcing', 'End-to-end custom product sourcing & supplier audit', 15000, 75000, 'ACTIVE'),
        ('66666666-6666-6666-6666-666666666662', '${orgId}', 'Dropship Order Fulfillment Suite', 'SKU-FUL-02', 'Fulfillment', 'Automated warehouse fulfillment, packaging, and dispatch', 5000, 25000, 'ACTIVE'),
        ('66666666-6666-6666-6666-666666666663', '${orgId}', 'VIP Dropship Mentorship Program', 'SKU-VIP-03', 'Mentorship', '1-on-1 mentorship, high-ticket ad funnels, and scaling roadmap', 25000, 150000, 'ACTIVE'),
        ('66666666-6666-6666-6666-666666666664', '${orgId}', 'Private Label Branding & Packaging', 'SKU-PL-04', 'Branding', 'Custom box, branded warranty cards, and OEM barcode labeling', 8000, 35000, 'ACTIVE')
      ON CONFLICT (id) DO NOTHING;
    `);
  }

  // Seed Teams if none
  const teamCount = await client.query('SELECT count(*) FROM teams');
  if (parseInt(teamCount.rows[0].count) === 0) {
    console.log('Seeding teams...');
    await client.query(`
      INSERT INTO teams (id, organization_id, name, description, manager_id, status)
      VALUES
        ('55555555-5555-5555-5555-555555555551', '${orgId}', 'Enterprise Sourcing Squad', 'High-volume wholesale retail & private label contracts', '${adminId}', 'ACTIVE'),
        ('55555555-5555-5555-5555-555555555552', '${orgId}', 'Dropship Growth & Expansion', 'E-commerce merchant scaling, mentorship, and fulfillment', '${adminId}', 'ACTIVE')
      ON CONFLICT (id) DO NOTHING;
    `);
  }

  // Seed Customers if none
  const custCount = await client.query('SELECT count(*) FROM customers');
  if (parseInt(custCount.rows[0].count) === 0) {
    console.log('Seeding customers...');
    await client.query(`
      INSERT INTO customers (id, organization_id, name, first_name, last_name, email, phone, company, city, state, country, status, assigned_to)
      VALUES
        ('77777777-7777-7777-7777-777777777771', '${orgId}', 'Rohan Sharma', 'Rohan', 'Sharma', 'rohan.sharma@clickze.com', '+91 98111 22233', 'Clickze Ecom', 'Bangalore', 'Karnataka', 'India', 'CUSTOMER', '${adminId}'),
        ('77777777-7777-7777-7777-777777777772', '${orgId}', 'Priya Verma', 'Priya', 'Verma', 'priya.verma@clovy.in', '+91 98222 33344', 'Clovy Apparel', 'Mumbai', 'Maharashtra', 'India', 'CUSTOMER', '${adminId}'),
        ('77777777-7777-7777-7777-777777777773', '${orgId}', 'Kadalundi Retailer', 'Kadalundi', 'Retailer', 'procurement@kadalundiretail.in', '+91 98333 44455', 'Kadalundi Retailers', 'Calicut', 'Kerala', 'India', 'PROSPECT', '${adminId}'),
        ('77777777-7777-7777-7777-777777777774', '${orgId}', 'Sulthan Bathery Retailer', 'Sulthan', 'Bathery Retailer', 'orders@sb-retail.in', '+91 98444 55566', 'Sulthan Bathery Stores', 'Wayanad', 'Kerala', 'India', 'CUSTOMER', '${adminId}')
      ON CONFLICT (id) DO NOTHING;
    `);
  }

  // Seed Leads if none
  const leadCount = await client.query('SELECT count(*) FROM leads');
  if (parseInt(leadCount.rows[0].count) === 0) {
    console.log('Seeding leads...');
    await client.query(`
      INSERT INTO leads (id, organization_id, customer_id, product_id, title, stage, expected_value, probability, source, lead_source, notes, assigned_to)
      VALUES
        ('88888888-8888-8888-8888-888888888881', '${orgId}', '77777777-7777-7777-7777-777777777771', '66666666-6666-6666-6666-666666666661', 'Clickze - Custom Sourcing Contract', 'WON', 75000, 100, 'Website', 'Website', 'Full sourcing and QC completed', '${adminId}'),
        ('88888888-8888-8888-8888-888888888882', '${orgId}', '77777777-7777-7777-7777-777777777772', '66666666-6666-6666-6666-666666666663', 'Clovy - VIP Dropship Mentorship', 'WON', 150000, 100, 'Referral', 'Referral', 'Mentorship onboarding started', '${adminId}'),
        ('88888888-8888-8888-8888-888888888883', '${orgId}', '77777777-7777-7777-7777-777777777773', '66666666-6666-6666-6666-666666666662', 'Kadalundi - Dropship Fulfillment 1k Units', 'DEMO', 45000, 60, 'Direct Call', 'Direct Call', 'Demo scheduled for Friday', '${adminId}'),
        ('88888888-8888-8888-8888-888888888884', '${orgId}', '77777777-7777-7777-7777-777777777774', '66666666-6666-6666-6666-666666666664', 'Sulthan Bathery - Private Label Box Design', 'QUALIFIED', 35000, 40, 'WhatsApp Campaign', 'WhatsApp Campaign', 'Sent sample quotation', '${adminId}')
      ON CONFLICT (id) DO NOTHING;
    `);
  }

  // Seed Sales if none
  const salesCount = await client.query('SELECT count(*) FROM sales');
  if (parseInt(salesCount.rows[0].count) === 0) {
    console.log('Seeding sales...');
    await client.query(`
      INSERT INTO sales (id, organization_id, sale_number, customer_id, lead_id, user_id, subtotal, total, cost_total, gross_profit, payment_status, payment_method, sale_date, notes)
      VALUES
        ('99999999-9999-9999-9999-999999999991', '${orgId}', 'INV-2026-001', '77777777-7777-7777-7777-777777777771', '88888888-8888-8888-8888-888888888881', '${adminId}', 75000, 75000, 15000, 60000, 'PAID', 'BANK_TRANSFER', CURRENT_DATE - 5, 'Custom Sourcing batch delivered'),
        ('99999999-9999-9999-9999-999999999992', '${orgId}', 'INV-2026-002', '77777777-7777-7777-7777-777777777772', '88888888-8888-8888-8888-888888888882', '${adminId}', 150000, 150000, 25000, 125000, 'PAID', 'UPI', CURRENT_DATE - 2, 'Annual VIP Mentorship subscription')
      ON CONFLICT (id) DO NOTHING;
    `);
  }

  // Seed Commission Rules if none
  const commCount = await client.query('SELECT count(*) FROM commission_rules');
  if (parseInt(commCount.rows[0].count) === 0) {
    console.log('Seeding commission rules...');
    await client.query(`
      INSERT INTO commission_rules (id, organization_id, name, rule_name, type, rule_type, rate, percentage, is_active)
      VALUES
        ('caaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '${orgId}', 'Standard Sourcing Commission', 'Standard Sourcing Commission', 'PERCENTAGE', 'PERCENTAGE', 5.0, 5.0, true),
        ('cbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '${orgId}', 'VIP High-Ticket Accelerator', 'VIP High-Ticket Accelerator', 'PERCENTAGE', 'PERCENTAGE', 10.0, 10.0, true)
      ON CONFLICT (id) DO NOTHING;
    `);
  }

  // Seed Levels if none
  const lvlCount = await client.query('SELECT count(*) FROM levels');
  if (parseInt(lvlCount.rows[0].count) === 0) {
    console.log('Seeding levels...');
    await client.query(`
      INSERT INTO levels (organization_id, name, min_xp, level_order, icon)
      VALUES
        ('${orgId}', 'Rookie Closer', 0, 1, 'Zap'),
        ('${orgId}', 'Rising Star', 1000, 2, 'Star'),
        ('${orgId}', 'Deal Hunter', 2500, 3, 'Shield'),
        ('${orgId}', 'Top Gun Closer', 5000, 4, 'Award'),
        ('${orgId}', 'Sales Legend', 10000, 5, 'Crown')
      ON CONFLICT DO NOTHING;
    `);
  }

  // Seed Achievements if none
  const achCount = await client.query('SELECT count(*) FROM achievements');
  if (parseInt(achCount.rows[0].count) === 0) {
    console.log('Seeding achievements...');
    await client.query(`
      INSERT INTO achievements (organization_id, name, description, icon, xp_reward, condition_type, condition_value, is_active)
      VALUES
        ('${orgId}', 'First Blood', 'Closed your first sale on SalesOS', 'Zap', 150, 'SALES_COUNT', 1, true),
        ('${orgId}', 'Centurion', 'Generated ₹1,00,000+ in revenue in a single month', 'Award', 500, 'REVENUE', 100000, true),
        ('${orgId}', 'Hat-Trick Hero', 'Closed 3 deals in a single day', 'Flame', 300, 'SALES_COUNT', 3, true),
        ('${orgId}', 'Target Destroyer', 'Achieved 100% of your monthly sales target', 'Target', 400, 'TARGET_ACHIEVEMENT', 100, true)
      ON CONFLICT DO NOTHING;
    `);
  }

  // Seed XP Rules if none
  const xpCount = await client.query('SELECT count(*) FROM xp_rules');
  if (parseInt(xpCount.rows[0].count) === 0) {
    console.log('Seeding xp rules...');
    await client.query(`
      INSERT INTO xp_rules (organization_id, name, action, description, reward_points, is_active)
      VALUES
        ('${orgId}', 'Sale Qualified Points', 'SALE_QUALIFIED', 'Points awarded for every qualified sale', 100, true),
        ('${orgId}', 'Revenue Multiplier Points', 'REVENUE_PER_10K', 'Points per ₹10,000 in generated revenue', 25, true),
        ('${orgId}', 'Lead Won Bonus', 'LEAD_WON', 'Bonus points for transitioning lead to Won', 50, true)
      ON CONFLICT DO NOTHING;
    `);
  }

  console.log('\n✨ Database alignment & seeding complete!');
  await client.end();
}

run().catch(e => {
  console.error('Fatal error:', e);
  client.end();
  process.exit(1);
});
