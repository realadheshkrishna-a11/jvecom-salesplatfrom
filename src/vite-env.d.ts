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
  /** Base public application URL for employee invitations (e.g. https://crm.jvecomb2b.com) */
  readonly VITE_APP_URL?: string;
  /** Optional custom Resend API key */
  readonly VITE_RESEND_API_KEY?: string;
  /** JVecom B2B Orders API URL */
  readonly VITE_JVECOM_API_URL?: string;
  /** JVecom B2B Orders API Key */
  readonly VITE_JVECOM_API_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
