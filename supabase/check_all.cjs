const { Client } = require('pg');
const client = new Client({
  host: 'aws-0-ap-south-1.pooler.supabase.com',
  port: 5432,
  database: 'postgres',
  user: 'postgres.qkwxsiezhyarpcfnbjja',
  password: 'yKhs50xrj31U4ljR',
  ssl: { rejectUnauthorized: false },
});

async function f() {
  await client.connect();
  const tables = await client.query("SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename");
  console.log(`Found ${tables.rows.length} tables in Supabase public schema:`);
  for (const t of tables.rows) {
    try {
      const c = await client.query(`SELECT count(*) FROM "${t.tablename}"`);
      console.log(`  • ${t.tablename.padEnd(25)}: ${c.rows[0].count} rows`);
    } catch(err) {
      console.log(`  • ${t.tablename.padEnd(25)}: error (${err.message})`);
    }
  }
  await client.end();
}

f().catch(e => console.error(e));
