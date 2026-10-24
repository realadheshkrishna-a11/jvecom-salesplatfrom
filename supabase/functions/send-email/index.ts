// =============================================================================
// Supabase Edge Function: send-email
// Receives email payload and sends via Resend API.
// Deploy with: supabase functions deploy send-email
// Set secret:  supabase secrets set RESEND_API_KEY=re_xxxx
// =============================================================================

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
    const FROM_DOMAIN = Deno.env.get('FROM_DOMAIN') ?? 'onboarding@resend.dev';

    if (!RESEND_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'RESEND_API_KEY not configured. Set it via: supabase secrets set RESEND_API_KEY=re_xxxx' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body = await req.json();
    const { to, cc, subject, html, text, from_name, from_address } = body;

    if (!to || !subject || !html) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: to, subject, html' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Use custom from address if domain is verified, otherwise fallback to Resend sandbox
    const fromField = from_address && !from_address.includes('@resend.dev')
      ? `${from_name ?? 'SalesOS'} <${from_address}>`
      : `${from_name ?? 'SalesOS'} <${FROM_DOMAIN}>`;

    const resendPayload: Record<string, unknown> = {
      from: fromField,
      to: Array.isArray(to) ? to : [to],
      subject,
      html,
      text: text ?? '',
    };

    if (cc && Array.isArray(cc) && cc.length > 0) {
      resendPayload.cc = cc;
    }

    const resendRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify(resendPayload),
    });

    const resendData = await resendRes.json();

    if (!resendRes.ok) {
      console.error('[send-email] Resend error:', resendData);
      return new Response(
        JSON.stringify({ error: resendData.message ?? 'Resend API error', details: resendData }),
        { status: resendRes.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, id: resendData.id }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('[send-email] Unexpected error:', err);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: String(err) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
