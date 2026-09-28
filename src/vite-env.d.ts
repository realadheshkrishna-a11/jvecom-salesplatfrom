/// <reference types="vite/client" />

// =============================================================================
// SalesOS — Type-safe Environment Variables
// =============================================================================
// All VITE_ prefixed env vars are exposed to the client bundle.
// Add new env vars here to get IntelliSense and type-checking.
// =============================================================================

interface ImportMetaEnv {
  /** Supabase project URL (e.g. https://xxx.supabase.co) */
  readonly VITE_SUPABASE_URL: string;
  /** Supabase anonymous/public API key */
  readonly VITE_SUPABASE_ANON_KEY: string;
  /** Application display name */
  readonly VITE_APP_NAME: string;
  /** Current environment: development | staging | production */
  readonly VITE_APP_ENV: 'development' | 'staging' | 'production';
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
