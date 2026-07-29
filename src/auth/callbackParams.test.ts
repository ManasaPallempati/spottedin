import { describe, expect, it } from 'vitest';
import { parseAuthCallback, planAuthCallback, scrubAuthCallbackParams } from './callbackParams';

describe('parseAuthCallback', () => {
  it('parses a token_hash/type confirmation or recovery callback', () => {
    expect(parseAuthCallback('?token_hash=abc123&type=signup')).toEqual({
      kind: 'otp',
      tokenHash: 'abc123',
      type: 'signup',
    });
    expect(parseAuthCallback('?token_hash=xyz&type=recovery')).toEqual({
      kind: 'otp',
      tokenHash: 'xyz',
      type: 'recovery',
    });
  });

  it('parses a PKCE code exchange callback', () => {
    expect(parseAuthCallback('?code=pkce-code-1')).toEqual({
      kind: 'pkce',
      code: 'pkce-code-1',
      type: null,
    });
    expect(parseAuthCallback('?code=pkce-code-1&type=recovery')).toEqual({
      kind: 'pkce',
      code: 'pkce-code-1',
      type: 'recovery',
    });
  });

  it('parses a Supabase error redirect', () => {
    expect(parseAuthCallback('?error=access_denied&error_description=Link+expired')).toEqual({
      kind: 'error',
      error: 'access_denied',
      description: 'Link expired',
    });
    expect(parseAuthCallback('?error_code=otp_expired&error_description=Link+expired')).toEqual({
      kind: 'error',
      error: 'otp_expired',
      description: 'Link expired',
    });
    expect(parseAuthCallback('?error=&error_code=otp_expired')).toEqual({
      kind: 'error',
      error: 'otp_expired',
      description: null,
    });
  });

  it('treats incomplete sensitive callback parameters as errors so they are scrubbed', () => {
    expect(parseAuthCallback('?token_hash=abc123')).toEqual({
      kind: 'error',
      error: 'invalid_callback',
      description: 'The confirmation link is missing its type',
    });
    expect(parseAuthCallback('?token_hash=')).toEqual({
      kind: 'error',
      error: 'invalid_callback',
      description: 'The confirmation link is incomplete',
    });
    expect(parseAuthCallback('?code=')).toEqual({
      kind: 'error',
      error: 'invalid_callback',
      description: 'The authentication link is incomplete',
    });
  });

  it('returns null when there is nothing to handle', () => {
    expect(parseAuthCallback('')).toBeNull();
    expect(parseAuthCallback('?foo=bar')).toBeNull();
  });
});

describe('planAuthCallback', () => {
  it('verifies a signup confirmation without leaving the current route', () => {
    expect(planAuthCallback({ kind: 'otp', tokenHash: 'abc', type: 'signup' })).toEqual({
      action: 'verify-otp',
      tokenHash: 'abc',
      otpType: 'signup',
      navigateTo: null,
    });
  });

  it('routes recovery callbacks to the reset-password screen', () => {
    expect(planAuthCallback({ kind: 'otp', tokenHash: 'xyz', type: 'recovery' })).toEqual({
      action: 'verify-otp',
      tokenHash: 'xyz',
      otpType: 'recovery',
      navigateTo: '/reset-password',
    });
    expect(planAuthCallback({ kind: 'pkce', code: 'c1', type: 'recovery' })).toEqual({
      action: 'exchange-code',
      code: 'c1',
      navigateTo: '/reset-password',
    });
  });

  it('exchanges a PKCE code without navigation when no type is given', () => {
    expect(planAuthCallback({ kind: 'pkce', code: 'c2', type: null })).toEqual({
      action: 'exchange-code',
      code: 'c2',
      navigateTo: null,
    });
  });

  it('fails on unknown OTP types instead of sending them to Supabase', () => {
    expect(planAuthCallback({ kind: 'otp', tokenHash: 'abc', type: 'sms' })).toEqual({
      action: 'fail',
      message: 'Unsupported confirmation link type: sms',
    });
  });

  it('surfaces provider error redirects, preferring the description', () => {
    expect(planAuthCallback({ kind: 'error', error: 'access_denied', description: 'Link expired' })).toEqual({
      action: 'fail',
      message: 'Link expired',
    });
    expect(planAuthCallback({ kind: 'error', error: 'access_denied', description: null })).toEqual({
      action: 'fail',
      message: 'access_denied',
    });
  });
});

describe('scrubAuthCallbackParams', () => {
  it('removes auth params but keeps unrelated ones', () => {
    expect(scrubAuthCallbackParams('?token_hash=abc&type=signup&ref=friend')).toBe('?ref=friend');
    expect(scrubAuthCallbackParams('?code=abc&other=1')).toBe('?other=1');
  });

  it('returns an empty string when nothing remains', () => {
    expect(scrubAuthCallbackParams('?token_hash=abc&type=signup')).toBe('');
    expect(scrubAuthCallbackParams('')).toBe('');
  });
});
