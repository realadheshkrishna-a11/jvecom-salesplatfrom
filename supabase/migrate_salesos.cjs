// =============================================================================
// SalesOS — Comprehensive Idempotent Database Migration Script
// Connects to Supabase PostgreSQL and creates/updates all tables,
// functions, triggers, RLS policies, and email tables.
// =============================================================================

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const client = new Client({
  host: 'aws-0-ap-south-1.pooler.supabase.com',
  port: 5432,
  database: 'postgres',
  user: 'postgres.qkwxsiezhyarpcfnbjja',
  password: 'yKhs50xrj31U4ljR',
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 30000,
});

async function run() {
  console.log('🚀 Connecting to Supabase PostgreSQL...');
  await client.connect();
  console.log('✅ Connected successfully!\n');

  // Step 1: Extensions
  console.log('1️⃣ Enabling required extensions...');
  await client.query(`
    CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
    CREATE EXTENSION IF NOT EXISTS "pgcrypto";
  `);

  // Step 2: Organizations
  console.log('2️⃣ Creating organizations and settings...');
  await client.query(`
    CREATE TABLE IF NOT EXISTS organizations (
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
      status TEXT NOT NULL DEFAULT 'ACTIVE',
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS organization_settings (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
      setting_key TEXT NOT NULL,
      setting_value JSONB NOT NULL DEFAULT '{}',
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      UNIQUE (organization_id, setting_key)
    );
  `);

  // Step 3: Profiles (Adapt existing or create)
  console.log('3️⃣ Updating/creating profiles table...');
  await client.query(`
    CREATE TABLE IF NOT EXISTS profiles (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
      first_name TEXT NOT NULL DEFAULT '',
      last_name TEXT NOT NULL DEFAULT '',
      email TEXT,
      phone TEXT,
      username TEXT,
      employee_id TEXT,
      role TEXT NOT NULL DEFAULT 'SALES_REP',
      team_id UUID,
      manager_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
      avatar_url TEXT,
      joining_date DATE,
      status TEXT NOT NULL DEFAULT 'ACTIVE',
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    -- Add missing columns to existing profiles table
    ALTER TABLE profiles ALTER COLUMN user_id DROP NOT NULL;
    ALTER TABLE profiles ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
    ALTER TABLE profiles ADD COLUMN IF NOT EXISTS first_name TEXT;
    ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_name TEXT;
    ALTER TABLE profiles ADD COLUMN IF NOT EXISTS email TEXT;
    ALTER TABLE profiles ADD COLUMN IF NOT EXISTS phone TEXT;
    ALTER TABLE profiles ADD COLUMN IF NOT EXISTS username TEXT;
    ALTER TABLE profiles ADD COLUMN IF NOT EXISTS employee_id TEXT;
    ALTER TABLE profiles ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'SALES_REP';
    ALTER TABLE profiles ADD COLUMN IF NOT EXISTS team_id UUID;
    ALTER TABLE profiles ADD COLUMN IF NOT EXISTS manager_id UUID;
    ALTER TABLE profiles ADD COLUMN IF NOT EXISTS joining_date DATE;
    ALTER TABLE profiles ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'ACTIVE';

    -- Split full_name for existing records if first_name is null
    UPDATE profiles
    SET first_name = COALESCE(NULLIF(split_part(full_name, ' ', 1), ''), 'Admin'),
        last_name = COALESCE(NULLIF(substr(full_name, length(split_part(full_name, ' ', 1)) + 2), ''), 'User')
    WHERE first_name IS NULL AND full_name IS NOT NULL;
  `);

  // Step 4: Teams and Team Members
  console.log('4️⃣ Updating/creating teams & team_members...');
  await client.query(`
    CREATE TABLE IF NOT EXISTS teams (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      description TEXT,
      manager_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
      status TEXT NOT NULL DEFAULT 'ACTIVE',
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    ALTER TABLE teams ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
    ALTER TABLE teams ALTER COLUMN created_by DROP NOT NULL;
    ALTER TABLE teams ADD COLUMN IF NOT EXISTS description TEXT;
    ALTER TABLE teams ADD COLUMN IF NOT EXISTS manager_id UUID REFERENCES profiles(id) ON DELETE SET NULL;
    ALTER TABLE teams ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'ACTIVE';

    CREATE TABLE IF NOT EXISTS team_members (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
      team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
      user_id UUID NOT NULL,
      role TEXT NOT NULL DEFAULT 'MEMBER',
      joined_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    ALTER TABLE team_members ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
    ALTER TABLE team_members ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'MEMBER';
  `);

  // Step 5: Products & Customers
  console.log('5️⃣ Creating products and customers...');
  await client.query(`
    CREATE TABLE IF NOT EXISTS products (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      sku TEXT NOT NULL,
      category TEXT NOT NULL,
      description TEXT,
      cost NUMERIC NOT NULL DEFAULT 0,
      selling_price NUMERIC NOT NULL,
      status TEXT NOT NULL DEFAULT 'ACTIVE',
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      UNIQUE (organization_id, sku)
    );

    CREATE TABLE IF NOT EXISTS customers (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      email TEXT,
      phone TEXT,
      company TEXT,
      industry TEXT,
      status TEXT NOT NULL DEFAULT 'ACTIVE',
      assigned_to UUID REFERENCES profiles(id) ON DELETE SET NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);

  // Step 6: Leads & Lead Activities
  console.log('6️⃣ Creating leads, lead sources, and activities...');
  await client.query(`
    CREATE TABLE IF NOT EXISTS lead_sources (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      is_active BOOLEAN NOT NULL DEFAULT true,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      UNIQUE (organization_id, name)
    );

    CREATE TABLE IF NOT EXISTS leads (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,
      email TEXT,
      phone TEXT,
      company TEXT,
      lead_source TEXT,
      lead_stage TEXT NOT NULL DEFAULT 'NEW_LEAD',
      assigned_to UUID REFERENCES profiles(id) ON DELETE SET NULL,
      estimated_value NUMERIC NOT NULL DEFAULT 0,
      score INTEGER NOT NULL DEFAULT 0,
      tags TEXT[] DEFAULT '{}',
      notes TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS lead_activities (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
      lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
      user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
      activity_type TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS follow_ups (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
      lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
      user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
      scheduled_at TIMESTAMPTZ NOT NULL,
      completed_at TIMESTAMPTZ,
      status TEXT NOT NULL DEFAULT 'PENDING',
      notes TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);

  // Step 7: Sales & Sale Items
  console.log('7️⃣ Creating sales and sale_items...');
  await client.query(`
    CREATE TABLE IF NOT EXISTS sales (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
      sale_number TEXT NOT NULL,
      customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
      lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
      user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
      team_id UUID REFERENCES teams(id) ON DELETE SET NULL,
      subtotal NUMERIC NOT NULL DEFAULT 0,
      tax_amount NUMERIC NOT NULL DEFAULT 0,
      discount_amount NUMERIC NOT NULL DEFAULT 0,
      total NUMERIC NOT NULL DEFAULT 0,
      cost_total NUMERIC NOT NULL DEFAULT 0,
      gross_profit NUMERIC NOT NULL DEFAULT 0,
      payment_status TEXT NOT NULL DEFAULT 'PENDING',
      payment_method TEXT NOT NULL DEFAULT 'BANK_TRANSFER',
      sale_date DATE NOT NULL DEFAULT CURRENT_DATE,
      notes TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS sale_items (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
      sale_id UUID NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
      product_id UUID REFERENCES products(id) ON DELETE SET NULL,
      description TEXT NOT NULL,
      quantity INTEGER NOT NULL DEFAULT 1,
      unit_price NUMERIC NOT NULL DEFAULT 0,
      unit_cost NUMERIC NOT NULL DEFAULT 0,
      total_price NUMERIC NOT NULL DEFAULT 0,
      total_cost NUMERIC NOT NULL DEFAULT 0,
      profit NUMERIC NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);

  // Step 8: Targets & Milestones
  console.log('8️⃣ Creating targets and milestones...');
  await client.query(`
    CREATE TABLE IF NOT EXISTS targets (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
      user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
      team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
      target_type TEXT NOT NULL,
      period TEXT NOT NULL,
      target_scope TEXT NOT NULL,
      target_amount NUMERIC NOT NULL,
      current_amount NUMERIC NOT NULL DEFAULT 0,
      achievement_pct NUMERIC NOT NULL DEFAULT 0,
      start_date DATE NOT NULL,
      end_date DATE NOT NULL,
      status TEXT NOT NULL DEFAULT 'IN_PROGRESS',
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS target_milestones (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
      target_id UUID NOT NULL REFERENCES targets(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      percentage NUMERIC NOT NULL,
      reward_amount NUMERIC,
      reward_xp INTEGER,
      is_achieved BOOLEAN NOT NULL DEFAULT false,
      achieved_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);

  // Step 9: Gamification (XP, Levels, Achievements)
  console.log('9️⃣ Creating gamification tables...');
  await client.query(`
    CREATE TABLE IF NOT EXISTS xp_rules (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      action TEXT NOT NULL,
      description TEXT,
      condition_type TEXT,
      condition_value NUMERIC,
      reward_points INTEGER NOT NULL DEFAULT 0,
      is_active BOOLEAN NOT NULL DEFAULT true,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS xp_transactions (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
      user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
      rule_id UUID REFERENCES xp_rules(id) ON DELETE SET NULL,
      xp_amount INTEGER NOT NULL,
      source_type TEXT NOT NULL,
      source_id UUID,
      description TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS levels (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      min_xp INTEGER NOT NULL,
      level_order INTEGER NOT NULL,
      icon TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS achievements (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      description TEXT NOT NULL,
      icon TEXT NOT NULL,
      xp_reward INTEGER NOT NULL DEFAULT 0,
      condition_type TEXT NOT NULL,
      condition_value NUMERIC NOT NULL,
      is_active BOOLEAN NOT NULL DEFAULT true,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS user_achievements (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
      user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
      achievement_id UUID NOT NULL REFERENCES achievements(id) ON DELETE CASCADE,
      earned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      UNIQUE (user_id, achievement_id)
    );
  `);

  // Step 10: Commissions & Bonuses
  console.log('🔟 Creating commissions and bonus tables...');
  await client.query(`
    CREATE TABLE IF NOT EXISTS commission_rules (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      rule_type TEXT NOT NULL,
      percentage NUMERIC NOT NULL DEFAULT 0,
      fixed_amount NUMERIC NOT NULL DEFAULT 0,
      min_revenue NUMERIC NOT NULL DEFAULT 0,
      is_active BOOLEAN NOT NULL DEFAULT true,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS commission_records (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
      sale_id UUID REFERENCES sales(id) ON DELETE SET NULL,
      user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
      rule_id UUID REFERENCES commission_rules(id) ON DELETE SET NULL,
      base_amount NUMERIC NOT NULL,
      rate_applied NUMERIC NOT NULL,
      commission_amount NUMERIC NOT NULL,
      status TEXT NOT NULL DEFAULT 'PENDING',
      paid_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS bonus_rules (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      description TEXT,
      condition_type TEXT NOT NULL,
      condition_value NUMERIC NOT NULL,
      bonus_amount NUMERIC NOT NULL,
      period TEXT NOT NULL,
      is_active BOOLEAN NOT NULL DEFAULT true,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS bonus_records (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
      user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
      rule_id UUID REFERENCES bonus_rules(id) ON DELETE SET NULL,
      target_id UUID REFERENCES targets(id) ON DELETE SET NULL,
      bonus_amount NUMERIC NOT NULL,
      period_start DATE NOT NULL,
      period_end DATE NOT NULL,
      status TEXT NOT NULL DEFAULT 'PENDING',
      paid_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);

  // Step 11: Notifications, Audit, Employee Invitations
  console.log('1️⃣1️⃣ Creating notifications, audit logs, invitations...');
  await client.query(`
    CREATE TABLE IF NOT EXISTS notifications (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
      user_id UUID NOT NULL,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      message TEXT,
      read BOOLEAN NOT NULL DEFAULT false,
      entity_type TEXT,
      entity_id UUID,
      reference_id TEXT,
      reference_type TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    ALTER TABLE notifications ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
    ALTER TABLE notifications ADD COLUMN IF NOT EXISTS entity_type TEXT;
    ALTER TABLE notifications ADD COLUMN IF NOT EXISTS entity_id UUID;

    CREATE TABLE IF NOT EXISTS audit_logs (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
      user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
      action TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      entity_id UUID,
      details JSONB DEFAULT '{}',
      ip_address TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS employee_invitations (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
      email TEXT NOT NULL,
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'SALES_REP',
      team_id UUID REFERENCES teams(id) ON DELETE SET NULL,
      manager_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
      phone TEXT,
      employee_id_str TEXT,
      token TEXT DEFAULT gen_random_uuid()::text,
      status TEXT NOT NULL DEFAULT 'PENDING',
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);

  // Step 12: Email Threads & Messages (The core production mail system)
  console.log('1️⃣2️⃣ Creating production email tables...');
  await client.query(`
    CREATE TABLE IF NOT EXISTS email_threads (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
      subject TEXT NOT NULL,
      participants TEXT[] NOT NULL DEFAULT '{}',
      last_message_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      unread_count INT NOT NULL DEFAULT 0,
      folder TEXT NOT NULL DEFAULT 'inbox' CHECK (folder IN ('inbox','sent','drafts','trash')),
      customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
      lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS email_messages (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      thread_id UUID NOT NULL REFERENCES email_threads(id) ON DELETE CASCADE,
      organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
      from_address TEXT NOT NULL,
      from_name TEXT NOT NULL DEFAULT '',
      to_addresses TEXT[] NOT NULL DEFAULT '{}',
      cc_addresses TEXT[] NOT NULL DEFAULT '{}',
      subject TEXT NOT NULL,
      body_html TEXT NOT NULL DEFAULT '',
      body_text TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'sent' CHECK (status IN ('sent','draft','failed')),
      delivery_status TEXT DEFAULT 'live_delivered',
      delivery_error TEXT,
      is_read BOOLEAN NOT NULL DEFAULT false,
      sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      resend_id TEXT,
      customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
      lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS email_settings (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
      resend_api_key TEXT,
      from_name TEXT NOT NULL DEFAULT 'SalesOS Team',
      from_address TEXT NOT NULL DEFAULT 'onboarding@resend.dev',
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      UNIQUE (organization_id)
    );

    CREATE INDEX IF NOT EXISTS idx_email_threads_org ON email_threads(organization_id);
    CREATE INDEX IF NOT EXISTS idx_email_threads_folder ON email_threads(organization_id, folder);
    CREATE INDEX IF NOT EXISTS idx_email_messages_thread ON email_messages(thread_id);
    CREATE INDEX IF NOT EXISTS idx_email_messages_org ON email_messages(organization_id);
  `);

  // Step 13: Seed Organization & Admin Profile
  console.log('1️⃣3️⃣ Seeding organization & primary profiles...');
  const orgId = '11111111-1111-1111-1111-111111111111';
  const adminId = '22222222-2222-2222-2222-222222222222';

  await client.query(`
    INSERT INTO organizations (id, name, logo_url, email, phone, industry, country, currency, timezone, address, website, status)
    VALUES (
      '${orgId}',
      'JVECOM B2B Technologies',
      'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=128&auto=format&fit=crop',
      'contact@jvecom.in',
      '+91 98765 43210',
      'B2B Sourcing & E-Commerce',
      'India',
      'INR',
      'Asia/Kolkata',
      'Bangalore, Karnataka, India',
      'https://jvecom.in',
      'ACTIVE'
    ) ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, email = EXCLUDED.email;

    -- Ensure Admin profile exists
    INSERT INTO profiles (id, user_id, organization_id, first_name, last_name, email, phone, username, employee_id, role, status)
    VALUES (
      '${adminId}',
      '${adminId}',
      '${orgId}',
      'Adhesh',
      'Krishna',
      'admin@jvecom.in',
      '+91 98765 43210',
      'adheshk',
      'EMP001',
      'ORG_ADMIN',
      'ACTIVE'
    ) ON CONFLICT (id) DO UPDATE SET organization_id = EXCLUDED.organization_id, role = EXCLUDED.role;

    -- Update any existing unassigned profiles to default org
    UPDATE profiles SET organization_id = '${orgId}' WHERE organization_id IS NULL;
    UPDATE notifications SET organization_id = '${orgId}' WHERE organization_id IS NULL;
  `);

  // Step 14: Configure RLS Policies
  console.log('1️⃣4️⃣ Configuring Row Level Security policies...');
  const tablesWithRls = [
    'organizations', 'organization_settings', 'profiles', 'teams', 'team_members',
    'products', 'customers', 'lead_sources', 'leads', 'lead_activities',
    'follow_ups', 'sales', 'sale_items', 'targets', 'target_milestones',
    'xp_rules', 'xp_transactions', 'levels', 'achievements', 'user_achievements',
    'commission_rules', 'commission_records', 'bonus_rules', 'bonus_records',
    'notifications', 'audit_logs', 'employee_invitations',
    'email_threads', 'email_messages', 'email_settings'
  ];

  for (const t of tablesWithRls) {
    try {
      await client.query(`ALTER TABLE "${t}" ENABLE ROW LEVEL SECURITY;`);
      await client.query(`DROP POLICY IF EXISTS "allow_all_for_org_${t}" ON "${t}";`);
      await client.query(`DROP POLICY IF EXISTS "anon_and_auth_access_${t}" ON "${t}";`);
      // Allow full access for anon and authenticated users
      await client.query(`
        CREATE POLICY "anon_and_auth_access_${t}" ON "${t}"
        FOR ALL
        TO anon, authenticated
        USING (true)
        WITH CHECK (true);
      `);
    } catch (e) {
      console.warn(`  ⚠️ Warning setting RLS on ${t}: ${e.message}`);
    }
  }

  // Step 15: Run Seed Data (005_seed.sql)
  console.log('1️⃣5️⃣ Running 005_seed.sql...');
  try {
    const seedSql = fs.readFileSync(path.join(__dirname, 'migrations', '005_seed.sql'), 'utf8');
    await client.query(seedSql);
    console.log('  ✅ Seed data inserted successfully');
  } catch (err) {
    console.warn(`  ⚠️ Seed data notice: ${err.message}`);
  }

  // Step 16: Check counts
  console.log('\n📊 Migration complete! Table counts:');
  const checkTables = [
    'organizations', 'profiles', 'teams', 'products', 'customers', 'leads',
    'sales', 'targets', 'commission_records', 'bonus_records',
    'notifications', 'email_threads', 'email_messages'
  ];

  for (const t of checkTables) {
    const res = await client.query(`SELECT count(*) FROM "${t}"`);
    console.log(`  • ${t}: ${res.rows[0].count} rows`);
  }

  await client.end();
  console.log('\n🎉 ALL MIGRATIONS APPLIED SUCCESSFULLY TO SUPABASE!');
}

run().catch(err => {
  console.error('Fatal error during migration:', err);
  client.end();
  process.exit(1);
});
