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

  console.log('Updating auth.users for:', email);
  await client.query(`
    UPDATE auth.users
    SET 
      encrypted_password = extensions.crypt($1, extensions.gen_salt('bf', 10)),
      confirmation_token = '',
      recovery_token = '',
      email_change_token_new = '',
      email_change = '',
      phone_change = '',
      phone_change_token = '',
      email_change_token_current = '',
      reauthentication_token = '',
      raw_app_meta_data = '{"provider":"email","providers":["email"]}'::jsonb,
      raw_user_meta_data = '{"email_verified":true}'::jsonb,
      is_super_admin = false,
      is_sso_user = false,
      deleted_at = null,
      is_anonymous = false
    WHERE email = $2;
  `, [password, email]);

  console.log('Update complete.');
  await client.end();

  console.log('\n--- Testing Supabase Auth sign-in with adheshkrishna6@gmail.com ---');
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false }
  });

  const res = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (res.error) {
    console.error('Sign-in failed:', res.error);
  } else {
    console.log('====================================');
    console.log('>>> SIGN-IN 100% SUCCESSFUL! <<<');
    console.log('User ID:', res.data.user.id);
    console.log('User Email:', res.data.user.email);
    console.log('Access Token Length:', res.data.session.access_token.length);
    console.log('====================================');
  }
}

run().catch(console.error);

