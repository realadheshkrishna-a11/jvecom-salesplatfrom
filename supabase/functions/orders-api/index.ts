const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
};

const upstreamBaseUrl = (Deno.env.get('JVECOM_API_URL') || 'https://www.jvecomb2b.com/api/v1').replace(/\/+$/, '');
const apiKey = Deno.env.get('JVECOM_API_KEY') || Deno.env.get('JVECOM_B2B_API_KEY');

function response(body: BodyInit | null, status = 200, headers: HeadersInit = {}) {
  return new Response(body, {
    status,
    headers: { ...corsHeaders, ...headers },
  });
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return response(null, 204);
  if (request.method !== 'GET') return response(JSON.stringify({ error: 'Method not allowed' }), 405, { 'Content-Type': 'application/json' });
  if (!apiKey) return response(JSON.stringify({ error: 'JVecom API secret is not configured' }), 500, { 'Content-Type': 'application/json' });

  const incomingUrl = new URL(request.url);
  const path = incomingUrl.pathname.replace(/^\/functions\/v1\/orders-api\/v1/, '').replace(/^\/v1/, '') || '/orders';
  const upstreamUrl = `${upstreamBaseUrl}${path.startsWith('/') ? path : `/${path}`}${incomingUrl.search}`;

  try {
    const upstream = await fetch(upstreamUrl, {
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
    });
    const headers = new Headers(corsHeaders);
    const contentType = upstream.headers.get('content-type');
    if (contentType) headers.set('content-type', contentType);
    for (const name of ['x-ratelimit-limit', 'x-ratelimit-remaining', 'x-ratelimit-reset', 'x-request-id']) {
      const value = upstream.headers.get(name);
      if (value) headers.set(name, value);
    }
    return new Response(await upstream.text(), { status: upstream.status, headers });
  } catch (error) {
    console.error('JVecom upstream request failed', error);
    return response(JSON.stringify({ error: 'Unable to reach JVecom API' }), 502, { 'Content-Type': 'application/json' });
  }
});
