// Migration runner - connects directly to Supabase PostgreSQL
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
  query_timeout: 120000,
});

const migrations = [
  '001_initial_schema.sql',
  '002_rls_policies.sql',
  '003_functions.sql',
  '004_triggers.sql',
  '005_seed.sql',
  '006_email_threads.sql',
];

async function run() {
  console.log('Connecting to Supabase PostgreSQL...');
  await client.connect();
  console.log('✅ Connected!\n');

  for (const file of migrations) {
    const filePath = path.join(__dirname, 'migrations', file);
    console.log(`▶ Running ${file}...`);
    const sql = fs.readFileSync(filePath, 'utf8');
    try {
      await client.query(sql);
      console.log(`  ✅ ${file} completed successfully`);
    } catch (err) {
      console.error(`  ❌ ${file} failed: ${err.message}`);
      if (err.message.includes('already exists')) {
        console.log('  ⚠️  Skipping (already exists)...');
        continue;
      }
      // Don't stop on non-critical errors
      if (!err.message.includes('already exists') && !err.message.includes('duplicate key')) {
        console.error('  Stopping migrations due to critical error.');
        break;
      }
    }
  }

  // Verify tables
  console.log('\n📋 Verifying created tables...');
  const result = await client.query(
    "SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename"
  );
  console.log(`Found ${result.rows.length} tables:`);
  result.rows.forEach(r => console.log(`  • ${r.tablename}`));

  await client.end();
  console.log('\n🎉 Migration complete!');
}

run().catch(err => {
  console.error('Fatal error:', err.message);
  client.end();
  process.exit(1);
});
