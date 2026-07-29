import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim();
const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim();

if (Boolean(supabaseUrl) !== Boolean(publishableKey)) {
  throw new Error('VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY must be configured together');
}

if (publishableKey?.startsWith('sb_secret_')) {
  throw new Error('A Supabase secret key must never be included in a browser build');
}

if (publishableKey && isLegacyServiceRoleKey(publishableKey)) {
  throw new Error('A legacy Supabase service-role key must never be included in a browser build');
}

/**
 * Legacy (pre-2025) Supabase API keys are JWTs. The anon key is safe for the
 * browser, but the service-role JWT carries `role: "service_role"` and must
 * never ship client-side. New-format keys (`sb_publishable_...`) aren't
 * JWT-shaped at all, so this only fires for the legacy format.
 */
export function isLegacyServiceRoleKey(key: string): boolean {
  const parts = key.split('.');
  if (parts.length !== 3) return false;
  try {
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
    const payload = JSON.parse(atob(padded)) as { role?: string };
    return payload.role === 'service_role';
  } catch {
    return false;
  }
}

export const isSupabaseConfigured = Boolean(supabaseUrl && publishableKey);

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(supabaseUrl!, publishableKey!, {
      auth: {
        autoRefreshToken: true,
        // The app scrubs and exchanges token_hash/code itself (HashRouter
        // owns the fragment); letting the client also auto-detect risks a
        // double-consumed one-time code.
        detectSessionInUrl: false,
        persistSession: true,
        flowType: 'pkce',
      },
    })
  : null;

export function requireSupabase(): SupabaseClient {
  if (!supabase) {
    throw new Error('Supabase authentication is not configured for this build');
  }
  return supabase;
}

/**
 * Email templates should return token_hash and type as query parameters on this
 * URL. They must not use the fragment because HashRouter owns window.location.hash.
 */
export function getAuthCallbackBaseUrl(): string {
  return new URL(import.meta.env.BASE_URL, window.location.origin).toString();
}
