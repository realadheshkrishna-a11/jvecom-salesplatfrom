const { Client } = require('pg');

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
  await client.connect();
  
  // List all tables and their columns
  const tables = await client.query(`
    SELECT table_name, column_name, data_type, is_nullable, column_default
    FROM information_schema.columns 
    WHERE table_schema = 'public'
    ORDER BY table_name, ordinal_position
  `);
  
  let currentTable = '';
  tables.rows.forEach(r => {
    if (r.table_name !== currentTable) {
      currentTable = r.table_name;
      console.log(`\n=== ${r.table_name} ===`);
    }
    console.log(`  ${r.column_name} (${r.data_type}) ${r.is_nullable === 'NO' ? 'NOT NULL' : ''} ${r.column_default || ''}`);
  });

  // Check RLS status
  console.log('\n\n=== RLS Status ===');
  const rls = await client.query(`
    SELECT tablename, rowsecurity 
    FROM pg_tables 
    WHERE schemaname = 'public'
    ORDER BY tablename
  `);
  rls.rows.forEach(r => console.log(`  ${r.tablename}: RLS ${r.rowsecurity ? 'ENABLED' : 'DISABLED'}`));

  // Check existing functions
  console.log('\n\n=== Functions ===');
  const funcs = await client.query(`
    SELECT routine_name 
    FROM information_schema.routines 
    WHERE routine_schema = 'public' AND routine_type = 'FUNCTION'
    ORDER BY routine_name
  `);
  funcs.rows.forEach(r => console.log(`  ${r.routine_name}`));

  // Check existing enums  
  console.log('\n\n=== Enums ===');
  const enums = await client.query(`
    SELECT t.typname, e.enumlabel
    FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    JOIN pg_namespace n ON t.typnamespace = n.oid
    WHERE n.nspname = 'public'
    ORDER BY t.typname, e.enumsortorder
  `);
  enums.rows.forEach(r => console.log(`  ${r.typname}: ${r.enumlabel}`));

  // Check existing policies
  console.log('\n\n=== RLS Policies ===');
  const policies = await client.query(`
    SELECT schemaname, tablename, policyname 
    FROM pg_policies 
    WHERE schemaname = 'public'
    ORDER BY tablename, policyname
  `);
  policies.rows.forEach(r => console.log(`  ${r.tablename}: ${r.policyname}`));

  // Check data counts
  console.log('\n\n=== Row counts ===');
  const tableNames = await client.query(`SELECT tablename FROM pg_tables WHERE schemaname = 'public'`);
  for (const t of tableNames.rows) {
    const count = await client.query(`SELECT count(*) FROM "${t.tablename}"`);
    console.log(`  ${t.tablename}: ${count.rows[0].count} rows`);
  }

  await client.end();
}

run().catch(err => { console.error(err.message); client.end(); });
