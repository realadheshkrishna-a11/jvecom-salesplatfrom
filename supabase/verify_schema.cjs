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
  const tables = ['customers', 'leads', 'commission_rules', 'bonus_rules', 'sales', 'teams'];
  for (const t of tables) {
    const cols = await client.query(
      "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = $1 AND table_schema = 'public'",
      [t]
    );
    console.log(t + ': ' + cols.rows.map(r => r.column_name).join(', '));
  }
  await client.end();
}

f().catch(e => console.error(e));
