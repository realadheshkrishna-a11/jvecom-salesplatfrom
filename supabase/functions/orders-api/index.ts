// Supabase Edge Function: orders-api
// Real-time proxy for JVecom B2B orders API

declare const Deno: {
  env: {
    get(key: string): string | undefined;
  };
  serve(handler: (request: Request) => Response | Promise<Response>): void;
};

const corsHeaders: Record<string, string> = {
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

Deno.serve(async (request: Request) => {
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  if (request.method !== 'GET') {
    return response(JSON.stringify({ error: 'Method not allowed' }), 405, { 'Content-Type': 'application/json' });
  }

  if (!apiKey) {
    return response(JSON.stringify({ error: 'JVecom API secret is not configured' }), 500, { 'Content-Type': 'application/json' });
  }

  const incomingUrl = new URL(request.url);
  const rawPath = incomingUrl.pathname.replace(/^\/?(?:functions\/v1\/)?(?:orders-api\/)?(?:v1)?/, '');
  const path = rawPath.startsWith('/') ? rawPath : `/${rawPath}`;
  const normalizedPath = path === '/' ? '/orders' : path;
  const upstreamUrl = `${upstreamBaseUrl}${normalizedPath}${incomingUrl.search}`;

  try {
    const upstream = await fetch(upstreamUrl, {
      headers: {
        Accept: 'application/json',
        Authorization: 'Bearer ' + apiKey,
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
