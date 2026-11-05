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
  console.log('Connected to Supabase PostgreSQL!');

  // 1. Run migration 007 to ensure columns exist
  console.log('Applying migration 007 columns (access_only)...');
  await client.query(`
    ALTER TABLE profiles
      ADD COLUMN IF NOT EXISTS access_only TEXT NOT NULL DEFAULT 'ALL';

    ALTER TABLE employee_invitations
      ADD COLUMN IF NOT EXISTS access_only TEXT NOT NULL DEFAULT 'ALL';

    ALTER TABLE employee_invitations
      ADD COLUMN IF NOT EXISTS invited_by UUID REFERENCES profiles(id) ON DELETE SET NULL;

    ALTER TABLE employee_invitations
      ADD COLUMN IF NOT EXISTS user_id UUID;
  `);

  const uid = '95ae2633-7ac4-4e89-a777-f42f1228270a';
  const email = 'realadheshkrishna@gmail.com';
  const orgId = '11111111-1111-1111-1111-111111111111';

  // 2. Ensure default organization exists
  await client.query(`
    INSERT INTO organizations (id, name, email, status)
    VALUES ($1, 'JVECOM B2B Sales & Distribution', 'contact@jvecom.in', 'ACTIVE')
    ON CONFLICT (id) DO NOTHING;
  `, [orgId]);

  // 3. Insert or update profile for realadheshkrishna@gmail.com
  const res = await client.query(`
    INSERT INTO profiles (
      id,
      organization_id,
      first_name,
      last_name,
      email,
      username,
      employee_id,
      role,
      status,
      access_only
    ) VALUES (
      $1, $2, 'Adhesh', 'Krishna', $3, 'adhesh', 'EMP-001', 'ORG_ADMIN', 'ACTIVE', 'ALL'
    )
    ON CONFLICT (id) DO UPDATE SET
      role = 'ORG_ADMIN',
      status = 'ACTIVE',
      access_only = 'ALL',
      email = EXCLUDED.email,
      first_name = 'Adhesh',
      last_name = 'Krishna',
      updated_at = now()
    RETURNING id, email, role, status, access_only;
  `, [uid, orgId, email]);

  console.log('✅ Successfully configured realadheshkrishna@gmail.com profile in Supabase:');
  console.log(res.rows[0]);

  await client.end();
}

run().catch(err => {
  console.error('Error adding profile:', err);
  process.exit(1);
});
