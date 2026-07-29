import { describe, expect, it } from 'vitest';
import { isLegacyServiceRoleKey } from './supabase';

function fakeJwt(payload: object): string {
  const base64url = (input: string) =>
    btoa(input).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  const header = base64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = base64url(JSON.stringify(payload));
  return `${header}.${body}.signature`;
}

describe('isLegacyServiceRoleKey', () => {
  it('flags a legacy service-role JWT', () => {
    expect(isLegacyServiceRoleKey(fakeJwt({ role: 'service_role' }))).toBe(true);
  });

  it('does not flag a legacy anon JWT', () => {
    expect(isLegacyServiceRoleKey(fakeJwt({ role: 'anon' }))).toBe(false);
  });

  it('does not flag a new-format publishable key', () => {
    expect(isLegacyServiceRoleKey('sb_publishable_abc123')).toBe(false);
  });

  it('does not throw on garbage input', () => {
    expect(isLegacyServiceRoleKey('not.a.jwt')).toBe(false);
    expect(isLegacyServiceRoleKey('')).toBe(false);
  });
});
