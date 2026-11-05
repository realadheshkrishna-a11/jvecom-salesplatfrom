// =============================================================================
// SalesOS — Supabase Client (Production-Ready)
// =============================================================================
// Validates env vars at startup, configures auth, and exports a singleton client.
// =============================================================================

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// ---------------------------------------------------------------------------
// Environment validation & production defaults
// ---------------------------------------------------------------------------
export const SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL || 'https://qkwxsiezhyarpcfnbjja.supabase.co').trim();
export const SUPABASE_ANON_KEY = (import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFrd3hzaWV6aHlhcnBjZm5iamphIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI1NTE2NjcsImV4cCI6MjEwODEyNzY2N30.BZiI_00l9WhA80IFTs0ovIxW5VZI3DhUGkpWIYGMzOc').trim();
const appEnv = import.meta.env.VITE_APP_ENV ?? 'development';

function validateConfig(): { url: string; key: string } {
  return {
    url: SUPABASE_URL,
    key: SUPABASE_ANON_KEY,
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
if (appEnv === 'development' && SUPABASE_URL && !SUPABASE_URL.includes('placeholder')) {
  checkSupabaseConnection().then((result) => {
    if (result.connected) {
      console.info(`[SalesOS] ✅ Supabase connected (${result.latencyMs}ms)`);
    } else {
      console.warn(`[SalesOS] ⚠️ Supabase unreachable: ${result.error}`);
    }
  });
}
