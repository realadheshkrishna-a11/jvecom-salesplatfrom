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
  console.log('Connected to PostgreSQL.');

  await client.query('CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;');

  const sql = `
CREATE OR REPLACE FUNCTION public.create_employee_account(
  p_email text,
  p_password text,
  p_first_name text DEFAULT '',
  p_last_name text DEFAULT '',
  p_role text DEFAULT 'SALES_REP',
  p_org_id uuid DEFAULT '11111111-1111-1111-1111-111111111111'::uuid,
  p_access_only text DEFAULT 'ALL',
  p_phone text DEFAULT NULL,
  p_employee_id text DEFAULT NULL,
  p_team_id uuid DEFAULT NULL,
  p_manager_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
  v_user_id uuid;
  v_encrypted_pw text;
  v_normalized_email text;
BEGIN
  v_normalized_email := lower(trim(p_email));
  v_encrypted_pw := extensions.crypt(p_password, extensions.gen_salt('bf', 10));

  -- Check if user already exists in auth.users
  SELECT id INTO v_user_id FROM auth.users WHERE lower(email) = v_normalized_email;

  IF v_user_id IS NOT NULL THEN
    -- Update existing user password and ensure confirmed
    UPDATE auth.users
    SET 
      encrypted_password = v_encrypted_pw,
      email_confirmed_at = COALESCE(email_confirmed_at, NOW()),
      confirmation_token = '',
      recovery_token = '',
      email_change_token_new = '',
      email_change = '',
      phone_change = '',
      phone_change_token = '',
      email_change_token_current = '',
      reauthentication_token = '',
      raw_app_meta_data = '{"provider":"email","providers":["email"]}'::jsonb,
      raw_user_meta_data = jsonb_build_object('email_verified', true, 'first_name', p_first_name, 'last_name', p_last_name),
      is_super_admin = false,
      is_sso_user = false,
      deleted_at = null,
      is_anonymous = false,
      updated_at = NOW()
    WHERE id = v_user_id;

    -- Ensure identity exists
    IF NOT EXISTS (SELECT 1 FROM auth.identities WHERE user_id = v_user_id) THEN
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
        v_user_id::text,
        v_user_id,
        json_build_object('sub', v_user_id::text, 'email', v_normalized_email, 'email_verified', true),
        'email',
        NOW(),
        NOW(),
        NOW()
      );
    END IF;
  ELSE
    -- Generate new user_id
    v_user_id := gen_random_uuid();

    -- Insert into auth.users
    INSERT INTO auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      confirmation_token,
      recovery_token,
      email_change_token_new,
      email_change,
      phone_change,
      phone_change_token,
      email_change_token_current,
      reauthentication_token,
      raw_app_meta_data,
      raw_user_meta_data,
      is_super_admin,
      is_sso_user,
      deleted_at,
      is_anonymous,
      created_at,
      updated_at
    )
    VALUES (
      '00000000-0000-0000-0000-000000000000',
      v_user_id,
      'authenticated',
      'authenticated',
      v_normalized_email,
      v_encrypted_pw,
      NOW(),
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '{"provider":"email","providers":["email"]}'::jsonb,
      jsonb_build_object('email_verified', true, 'first_name', p_first_name, 'last_name', p_last_name),
      false,
      false,
      null,
      false,
      NOW(),
      NOW()
    );

    -- Insert into auth.identities
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
      v_user_id::text,
      v_user_id,
      json_build_object('sub', v_user_id::text, 'email', v_normalized_email, 'email_verified', true),
      'email',
      NOW(),
      NOW(),
      NOW()
    );
  END IF;

  -- Upsert into public.profiles
  INSERT INTO public.profiles (
    id,
    organization_id,
    first_name,
    last_name,
    email,
    phone,
    username,
    employee_id,
    role,
    team_id,
    manager_id,
    joining_date,
    status,
    access_only,
    created_at,
    updated_at
  )
  VALUES (
    v_user_id,
    p_org_id,
    p_first_name,
    p_last_name,
    v_normalized_email,
    p_phone,
    split_part(v_normalized_email, '@', 1),
    p_employee_id,
    p_role,
    p_team_id,
    p_manager_id,
    CURRENT_DATE,
    'ACTIVE',
    p_access_only,
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    organization_id = EXCLUDED.organization_id,
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name,
    email = EXCLUDED.email,
    phone = COALESCE(EXCLUDED.phone, profiles.phone),
    role = EXCLUDED.role,
    team_id = EXCLUDED.team_id,
    manager_id = EXCLUDED.manager_id,
    status = 'ACTIVE',
    access_only = EXCLUDED.access_only,
    updated_at = NOW();

  RETURN jsonb_build_object(
    'success', true,
    'user_id', v_user_id,
    'email', v_normalized_email
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_employee_account TO anon, authenticated, service_role;
  `;

  await client.query(sql);
  console.log('Function public.create_employee_account created successfully!');
  await client.query("NOTIFY pgrst, 'reload schema';");
  console.log('Notified PostgREST to reload schema.');
  // Wait 2 seconds for schema reload
  await new Promise(r => setTimeout(r, 2000));
  await client.end();

  console.log('\n--- Testing RPC call from client ---');
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false }
  });

  const testEmail = 'abhijithup750@gmail.com';
  const testPassword = 'Password@1234';

  const rpcRes = await supabase.rpc('create_employee_account', {
    p_email: testEmail,
    p_password: testPassword,
    p_first_name: 'Abhijith',
    p_last_name: 'UP',
    p_role: 'SALES_REP',
    p_access_only: 'dashboard,crm,mail'
  });

  console.log('RPC response:', rpcRes);

  console.log('\n--- Testing sign-in with newly created test employee ---');
  const testSignIn = await supabase.auth.signInWithPassword({
    email: testEmail,
    password: testPassword
  });

  if (testSignIn.error) {
    console.error('Test employee sign-in failed:', testSignIn.error);
  } else {
    console.log('>>> TEST EMPLOYEE SIGN-IN SUCCESSFUL! <<<');
    console.log('User ID:', testSignIn.data.user.id);
    console.log('Email:', testSignIn.data.user.email);
    console.log('Token exists:', !!testSignIn.data.session.access_token);
  }
}

run().catch(console.error);
