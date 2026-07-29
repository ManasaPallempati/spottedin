// HashRouter owns window.location.hash for routing, so Supabase confirmation
// and recovery links must deliver token_hash/type (or a PKCE code) as query
// parameters on the app's base URL — never in the fragment. These helpers are
// pure string/URLSearchParams logic so they're testable without a DOM.

import type { EmailOtpType } from '@supabase/supabase-js';

export type ParsedAuthCallback =
  | { kind: 'otp'; tokenHash: string; type: string }
  | { kind: 'pkce'; code: string; type: string | null }
  | { kind: 'error'; error: string; description: string | null };

const AUTH_CALLBACK_KEYS = [
  'token_hash',
  'type',
  'code',
  'error',
  'error_code',
  'error_description',
] as const;

/** Parses Supabase auth callback parameters out of a `location.search` string. */
export function parseAuthCallback(search: string): ParsedAuthCallback | null {
  const params = new URLSearchParams(search);

  const error = params.get('error') || params.get('error_code');
  if (error) {
    return { kind: 'error', error, description: params.get('error_description') };
  }

  const tokenHash = params.get('token_hash');
  const type = params.get('type');
  if (tokenHash) {
    if (!type) {
      return {
        kind: 'error',
        error: 'invalid_callback',
        description: 'The confirmation link is missing its type',
      };
    }
    return { kind: 'otp', tokenHash, type };
  }
  if (params.has('token_hash')) {
    return {
      kind: 'error',
      error: 'invalid_callback',
      description: 'The confirmation link is incomplete',
    };
  }

  const code = params.get('code');
  if (code) {
    return { kind: 'pkce', code, type };
  }
  if (params.has('code')) {
    return {
      kind: 'error',
      error: 'invalid_callback',
      description: 'The authentication link is incomplete',
    };
  }

  return null;
}

const KNOWN_OTP_TYPES: ReadonlySet<string> = new Set([
  'signup',
  'invite',
  'magiclink',
  'recovery',
  'email_change',
  'email',
]);

export type AuthCallbackPlan =
  | { action: 'verify-otp'; tokenHash: string; otpType: EmailOtpType; navigateTo: '/reset-password' | null }
  | { action: 'exchange-code'; code: string; navigateTo: '/reset-password' | null }
  | { action: 'fail'; message: string };

/**
 * Pure decision step between parsing a callback and calling Supabase: which
 * API to invoke, and whether to land on the reset-password screen afterwards.
 */
export function planAuthCallback(callback: ParsedAuthCallback): AuthCallbackPlan {
  if (callback.kind === 'error') {
    return { action: 'fail', message: callback.description ?? callback.error };
  }
  const navigateTo = callback.type === 'recovery' ? '/reset-password' as const : null;
  if (callback.kind === 'otp') {
    if (!KNOWN_OTP_TYPES.has(callback.type)) {
      return { action: 'fail', message: `Unsupported confirmation link type: ${callback.type}` };
    }
    return { action: 'verify-otp', tokenHash: callback.tokenHash, otpType: callback.type as EmailOtpType, navigateTo };
  }
  return { action: 'exchange-code', code: callback.code, navigateTo };
}

/** Returns `search` with every auth-callback key removed, for scrubbing browser history. */
export function scrubAuthCallbackParams(search: string): string {
  const params = new URLSearchParams(search);
  for (const key of AUTH_CALLBACK_KEYS) params.delete(key);
  const rest = params.toString();
  return rest ? `?${rest}` : '';
}
