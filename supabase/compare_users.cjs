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

  const u1 = await client.query('SELECT * FROM auth.users WHERE email = $1', ['realadheshkrishna@gmail.com']);
  const u2 = await client.query('SELECT * FROM auth.users WHERE email = $1', ['adheshkrishna6@gmail.com']);

  console.log('=== REAL ADHESH USER ===');
  console.log(u1.rows[0]);

  console.log('\n=== ADHESH 6 USER ===');
  console.log(u2.rows[0]);

  const i1 = await client.query('SELECT * FROM auth.identities WHERE user_id = $1', [u1.rows[0]?.id]);
  const i2 = await client.query('SELECT * FROM auth.identities WHERE user_id = $1', [u2.rows[0]?.id]);

  console.log('\n=== REAL ADHESH IDENTITY ===');
  console.log(i1.rows[0]);

  console.log('\n=== ADHESH 6 IDENTITY ===');
  console.log(i2.rows[0]);

  await client.end();
}

run().catch(console.error);

