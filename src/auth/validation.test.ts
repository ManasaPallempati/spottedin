import { describe, expect, it } from 'vitest';
import {
  isValidEmail,
  isValidIndianPhone,
  isValidProfileHandle,
  normalizeEmail,
  normalizeIndianPhone,
  normalizeProfileHandle,
  toIndianE164,
} from './validation';

describe('authentication input normalization', () => {
  it('normalizes email without changing its meaning', () => {
    expect(normalizeEmail('  Manasa@Example.COM ')).toBe('manasa@example.com');
    expect(isValidEmail('manasa@example.com')).toBe(true);
    expect(isValidEmail('manasa@localhost')).toBe(false);
  });

  it('accepts national and +91 Indian mobile formats', () => {
    expect(normalizeIndianPhone('98765 43210')).toBe('9876543210');
    expect(normalizeIndianPhone('+91 98765-43210')).toBe('9876543210');
    expect(isValidIndianPhone('9876543210')).toBe(true);
    expect(isValidIndianPhone('5876543210')).toBe(false);
    expect(toIndianE164('91 98765 43210')).toBe('+919876543210');
  });

  it('rejects malformed numbers instead of silently taking the last ten digits', () => {
    expect(isValidIndianPhone('001919876543210')).toBe(false);
    expect(() => toIndianE164('12345')).toThrow('Enter a valid Indian mobile number');
  });

  it('canonicalizes and validates case-insensitive profile handles', () => {
    expect(normalizeProfileHandle(' @Manasa.Store! ')).toBe('@manasa.store');
    expect(isValidProfileHandle('@abc')).toBe(true);
    expect(isValidProfileHandle('@ab')).toBe(false);
  });
});
