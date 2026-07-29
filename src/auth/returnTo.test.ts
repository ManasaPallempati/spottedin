import { describe, expect, it } from 'vitest';
import { sanitizeReturnTo } from './returnTo';

describe('sanitizeReturnTo', () => {
  it('accepts recognized internal routes, including params and query strings', () => {
    expect(sanitizeReturnTo('/')).toBe('/');
    expect(sanitizeReturnTo('/listing/abc123')).toBe('/listing/abc123');
    expect(sanitizeReturnTo('/seller/seller-1')).toBe('/seller/seller-1');
    expect(sanitizeReturnTo('/chat/t-1?x=1')).toBe('/chat/t-1?x=1');
    expect(sanitizeReturnTo('/checkout/l-1')).toBe('/checkout/l-1');
    expect(sanitizeReturnTo('/inbox')).toBe('/inbox');
    expect(sanitizeReturnTo('/saved')).toBe('/saved');
    expect(sanitizeReturnTo('/sell')).toBe('/sell');
  });

  it('falls back for unknown routes', () => {
    expect(sanitizeReturnTo('/not-a-route')).toBe('/');
    expect(sanitizeReturnTo('/listing/')).toBe('/');
    expect(sanitizeReturnTo('')).toBe('/');
    expect(sanitizeReturnTo(undefined)).toBe('/');
    expect(sanitizeReturnTo(null)).toBe('/');
    expect(sanitizeReturnTo(42)).toBe('/');
  });

  it('rejects protocol-relative and absolute URLs (open redirect protection)', () => {
    expect(sanitizeReturnTo('//evil.example.com')).toBe('/');
    expect(sanitizeReturnTo('/\\evil.example.com')).toBe('/');
    expect(sanitizeReturnTo('https://evil.example.com')).toBe('/');
    expect(sanitizeReturnTo('/seller/1://evil.com')).toBe('/');
  });

  it('honors a custom fallback', () => {
    expect(sanitizeReturnTo('/nope', '/login')).toBe('/login');
  });
});
