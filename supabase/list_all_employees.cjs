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

  const invs = await client.query('SELECT * FROM public.employee_invitations ORDER BY created_at DESC');
  console.log('All employee invitations:');
  console.table(invs.rows.map(r => ({
    email: r.email,
    name: `${r.first_name} ${r.last_name}`,
    role: r.role,
    status: r.status,
    created_at: r.created_at
  })));

  const profs = await client.query('SELECT * FROM public.profiles WHERE email IS NOT NULL ORDER BY created_at DESC');
  console.log('All profiles with email:');
  console.table(profs.rows.map(r => ({
    id: r.id,
    email: r.email,
    name: `${r.first_name} ${r.last_name}`,
    role: r.role,
    access_only: r.access_only
  })));

  const users = await client.query('SELECT id, email, email_confirmed_at, created_at FROM auth.users ORDER BY created_at DESC');
  console.log('All auth.users:');
  console.table(users.rows);

  await client.end();
}

run().catch(console.error);

