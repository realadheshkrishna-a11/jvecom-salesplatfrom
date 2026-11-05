// =============================================================================
// Supabase Edge Function: invite-employee
// -----------------------------------------------------------------------------
// Creates a real, login-ready Supabase Auth account for an invited employee and
// stores the role + module permissions chosen by the Org Admin.
//
// Security:
//  - Caller must send their own Supabase JWT (supabase.functions.invoke does this).
//  - Caller must be an ACTIVE ORG_ADMIN (or SUPER_ADMIN) profile.
//  - ORG_ADMINs can only invite into their own organization.
//  - The service-role key never leaves the server.
//
// Deploy:  supabase functions deploy invite-employee
// Requires migration 007_employee_permissions.sql.
// SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are injected automatically.
// =============================================================================

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// Keep in sync with src/lib/permissions.ts
const MODULE_IDS = [
  'dashboard', 'crm', 'sales', 'b2b-orders', 'products', 'customers', 'mail',
  'targets', 'leaderboard', 'gamification', 'commissions', 'bonuses', 'analytics',
  'employees', 'teams', 'reports', 'notifications', 'audit-logs', 'settings',
];
const INVITABLE_ROLES = ['ORG_ADMIN', 'MANAGER', 'SALES_REP'];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function sanitizeAccess(raw: unknown): string {
  const requested = String(raw ?? '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter((s) => MODULE_IDS.includes(s));
  const set = new Set(['dashboard', ...requested]);
  return MODULE_IDS.filter((id) => set.has(id)).join(',');
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !serviceKey) return json({ error: 'Server is not configured' }, 500);

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  try {
    // ---- 1. Authenticate & authorise the caller -----------------------------
    const jwt = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
    if (!jwt) return json({ error: 'Not authenticated' }, 401);

    const { data: callerAuth, error: callerErr } = await admin.auth.getUser(jwt);
    if (callerErr || !callerAuth?.user) return json({ error: 'Invalid or expired session' }, 401);

    const { data: caller } = await admin
      .from('profiles')
      .select('id, organization_id, role, status')
      .eq('id', callerAuth.user.id)
      .maybeSingle();

    if (!caller || caller.status !== 'ACTIVE' || !['ORG_ADMIN', 'SUPER_ADMIN'].includes(caller.role)) {
      return json({ error: 'Only active organization admins can invite employees' }, 403);
    }

    // ---- 2. Validate input --------------------------------------------------
    const body = await req.json().catch(() => ({}));
    const email = String(body.email ?? '').trim().toLowerCase();
    const password = String(body.password ?? '');
    const firstName = String(body.first_name ?? '').trim();
    const lastName = String(body.last_name ?? '').trim();
    const role = String(body.role ?? 'SALES_REP');
    const organizationId = caller.role === 'SUPER_ADMIN' && body.organization_id
      ? String(body.organization_id)
      : caller.organization_id;

    if (!EMAIL_RE.test(email)) return json({ error: 'A valid email is required' }, 400);
    if (password.length < 8) return json({ error: 'Password must be at least 8 characters' }, 400);
    if (!firstName || !lastName) return json({ error: 'First and last name are required' }, 400);
    if (!INVITABLE_ROLES.includes(role)) return json({ error: 'Invalid role' }, 400);

    const accessOnly = sanitizeAccess(body.access_only);

    const { data: existing } = await admin
      .from('profiles')
      .select('id')
      .ilike('email', email)
      .maybeSingle();
    if (existing) return json({ error: 'An employee with this email already exists' }, 409);

    // ---- 3. Create the auth account (pre-confirmed so they can log in now) ---
    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        organization_id: organizationId,
        role,
        first_name: firstName,
        last_name: lastName,
      },
    });
    if (createErr || !created?.user) {
      const msg = createErr?.message ?? 'Could not create account';
      const status = /already|registered|exists/i.test(msg) ? 409 : 400;
      return json({ error: msg }, status);
    }
    const userId = created.user.id;

    // ---- 4. Write the profile with role + permissions -----------------------
    // (the on_auth_user_created trigger may already have inserted a basic row)
    const { error: profileErr } = await admin.from('profiles').upsert({
      id: userId,
      organization_id: organizationId,
      first_name: firstName,
      last_name: lastName,
      email,
      phone: body.phone || null,
      username: body.username || email.split('@')[0],
      employee_id: body.employee_id || null,
      role,
      team_id: body.team_id || null,
      manager_id: body.manager_id || null,
      joining_date: new Date().toISOString().slice(0, 10),
      status: 'ACTIVE',
      access_only: accessOnly,
    }, { onConflict: 'id' });

    if (profileErr) {
      // Roll back so we never leave a login without a permissions profile
      await admin.auth.admin.deleteUser(userId).catch(() => undefined);
      return json({ error: `Could not save employee profile: ${profileErr.message}` }, 500);
    }

    // ---- 5. Audit record (best effort) --------------------------------------
    await admin.from('employee_invitations').insert({
      organization_id: organizationId,
      email,
      first_name: firstName,
      last_name: lastName,
      role,
      team_id: body.team_id || null,
      manager_id: body.manager_id || null,
      phone: body.phone || null,
      employee_id_str: body.employee_id || null,
      access_only: accessOnly,
      invited_by: caller.id,
      user_id: userId,
      status: 'ACCEPTED',
    }).then(({ error }) => {
      if (error) console.warn('[invite-employee] invitation log skipped:', error.message);
    });

    return json({ success: true, profile_id: userId, access_only: accessOnly });
  } catch (err) {
    console.error('[invite-employee] Unexpected error:', err);
    return json({ error: 'Internal server error' }, 500);
  }
});

