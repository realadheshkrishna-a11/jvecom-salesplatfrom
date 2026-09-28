// =============================================================================
// SalesOS — Supabase Client (Production-Ready)
// =============================================================================
// Validates env vars at startup, configures auth, and exports a singleton client.
// =============================================================================

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// ---------------------------------------------------------------------------
// Environment validation
// ---------------------------------------------------------------------------
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const appEnv = import.meta.env.VITE_APP_ENV ?? 'development';

function validateConfig(): { url: string; key: string } {
  const missing: string[] = [];

  if (!supabaseUrl) missing.push('VITE_SUPABASE_URL');
  if (!supabaseAnonKey) missing.push('VITE_SUPABASE_ANON_KEY');

  if (missing.length > 0) {
    const message = `[SalesOS] Missing required environment variables: ${missing.join(', ')}. ` +
      `Copy .env.example to .env and fill in your Supabase credentials.`;

    if (appEnv === 'production') {
      throw new Error(message);
    }
    console.warn(message);
    console.info('[SalesOS] Running in offline/demo mode with localStorage fallback.');
  }

  return {
    url: supabaseUrl || 'https://placeholder.supabase.co',
    key: supabaseAnonKey || 'placeholder-key',
  };
}

const config = validateConfig();

// ---------------------------------------------------------------------------
// Client singleton
// ---------------------------------------------------------------------------
export const supabase: SupabaseClient = createClient(config.url, config.key, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    // Use localStorage for session persistence (default)
    storage: globalThis.localStorage,
    // Better UX: redirect flow for OAuth providers
    flowType: 'pkce',
  },
  global: {
    headers: {
      'x-app-name': 'SalesOS',
      'x-app-env': appEnv,
    },
  },
  // Retry on transient network failures
  db: {
    schema: 'public',
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});

// ---------------------------------------------------------------------------
// Connection health check (dev-only diagnostic)
// ---------------------------------------------------------------------------
export async function checkSupabaseConnection(): Promise<{
  connected: boolean;
  latencyMs: number;
  error?: string;
}> {
  const start = performance.now();
  try {
    const { error } = await supabase.from('organizations').select('id').limit(1);
    const latencyMs = Math.round(performance.now() - start);
    if (error) {
      return { connected: false, latencyMs, error: error.message };
    }
    return { connected: true, latencyMs };
  } catch (err) {
    const latencyMs = Math.round(performance.now() - start);
    return {
      connected: false,
      latencyMs,
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  }
}

// Log connection status in development
if (appEnv === 'development' && supabaseUrl && !supabaseUrl.includes('placeholder')) {
  checkSupabaseConnection().then((result) => {
    if (result.connected) {
      console.info(`[SalesOS] ✅ Supabase connected (${result.latencyMs}ms)`);
    } else {
      console.warn(`[SalesOS] ⚠️ Supabase unreachable: ${result.error}`);
    }
  });
}
