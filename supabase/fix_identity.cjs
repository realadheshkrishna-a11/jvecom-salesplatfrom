const { Client } = require('pg');
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://qkwxsiezhyarpcfnbjja.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFrd3hzaWV6aHlhcnBjZm5iamphIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI1NTE2NjcsImV4cCI6MjEwODEyNzY2N30.BZiI_00l9WhA80IFTs0ovIxW5VZI3DhUGkpWIYGMzOc';

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

  const email = 'adheshkrishna6@gmail.com';
  const password = 'VnSP@8q!r79G';

  const userRes = await client.query('SELECT * FROM auth.users WHERE email = $1', [email]);
  if (userRes.rows.length === 0) {
    console.error('User not found in auth.users!');
    await client.end();
    return;
  }
  const user = userRes.rows[0];
  console.log('Found user in auth.users:', user.id, user.email);

  // Check identities
  const idCheck = await client.query('SELECT * FROM auth.identities WHERE user_id = $1', [user.id]);
  console.log('Identities count:', idCheck.rows.length);

  if (idCheck.rows.length === 0) {
    console.log('Inserting identity...');
    await client.query(`
      INSERT INTO auth.identities (
        id,
        provider_id,
        user_id,
        identity_data,
        provider,
        last_sign_in_at,
        created_at,
        updated_at
      )
      VALUES (
        gen_random_uuid(),
        $1::text,
        $1::uuid,
        json_build_object('sub', $1::text, 'email', $2::text, 'email_verified', true),
        'email',
        NOW(),
        NOW(),
        NOW()
      );
    `, [user.id, email]);
    console.log('Identity inserted successfully.');
  }

  await client.end();

  console.log('\n--- Testing Supabase Auth sign-in ---');
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false }
  });

  const signInRes = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (signInRes.error) {
    console.error('Sign-in failed:', signInRes.error);
  } else {
    console.log('>>> SIGN-IN SUCCESSFUL! <<<');
    console.log('User ID:', signInRes.data.user.id);
    console.log('User email:', signInRes.data.user.email);
    console.log('Session Access Token exists:', !!signInRes.data.session.access_token);
  }
}

run().catch(console.error);

