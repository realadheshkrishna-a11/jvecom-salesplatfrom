// =============================================================================
// SalesOS — Local credential store (development / offline mode ONLY)
// =============================================================================
// When no real Supabase session is available (local dev, demo mode), invited
// employees' passwords are stored here as salted PBKDF2-SHA256 hashes so the
// invitation → login flow can be exercised end to end in one browser.
//
// This store lives in the browser's localStorage, so it is NOT a security
// boundary and does not work across devices. Production builds disable it
// (see isLocalAuthEnabled) and rely solely on Supabase Auth.
// =============================================================================

const STORAGE_KEY = 'salesos_credentials';
const ITERATIONS = 100_000;

export interface LocalCredential {
  profile_id: string;
  email: string;
  salt: string;
  hash: string;
  iterations: number;
  created_at: string;
}

/** Local (browser-only) auth is allowed in dev builds or when explicitly enabled. */
export function isLocalAuthEnabled(): boolean {
  return import.meta.env.DEV || import.meta.env.VITE_ENABLE_LOCAL_AUTH === 'true';
}

function toBase64(bytes: Uint8Array): string {
  let s = '';
  bytes.forEach(b => { s += String.fromCharCode(b); });
  return btoa(s);
}

function fromBase64(b64: string): Uint8Array {
  return Uint8Array.from(atob(b64), c => c.charCodeAt(0));
}

async function derive(password: string, salt: Uint8Array, iterations: number): Promise<string> {
  const keyMaterial = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits'],
  );
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt: salt as BufferSource, iterations },
    keyMaterial,
    256,
  );
  return toBase64(new Uint8Array(bits));
}

function readAll(): LocalCredential[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as LocalCredential[]) : [];
  } catch {
    return [];
  }
}

function writeAll(list: LocalCredential[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

export async function saveLocalCredential(profileId: string, email: string, password: string): Promise<void> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const hash = await derive(password, salt, ITERATIONS);
  const normalized = email.trim().toLowerCase();
  const list = readAll().filter(c => c.email !== normalized && c.profile_id !== profileId);
  list.push({
    profile_id: profileId,
    email: normalized,
    salt: toBase64(salt),
    hash,
    iterations: ITERATIONS,
    created_at: new Date().toISOString(),
  });
  writeAll(list);
}

/** Returns the profile id when the email/password pair matches, otherwise null. */
export async function verifyLocalCredential(email: string, password: string): Promise<string | null> {
  const normalized = email.trim().toLowerCase();
  const cred = readAll().find(c => c.email === normalized);
  if (!cred) return null;
  const candidate = await derive(password, fromBase64(cred.salt), cred.iterations);
  // Constant-time-ish comparison
  if (candidate.length !== cred.hash.length) return null;
  let diff = 0;
  for (let i = 0; i < candidate.length; i++) diff |= candidate.charCodeAt(i) ^ cred.hash.charCodeAt(i);
  return diff === 0 ? cred.profile_id : null;
}

export function hasLocalCredential(profileId: string): boolean {
  return readAll().some(c => c.profile_id === profileId);
}

export function removeLocalCredential(profileId: string): void {
  writeAll(readAll().filter(c => c.profile_id !== profileId));
}

