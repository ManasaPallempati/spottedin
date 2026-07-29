import { describe, expect, it } from 'vitest';
import { validateShippingAddress, type ShippingAddress } from './commerce';

const validAddress: ShippingAddress = {
  name: 'Mira Patel',
  phone: '9876543210',
  email: 'mira@example.com',
  line1: '12 Market Road',
  line2: '',
  city: 'Mumbai',
  state: 'Maharashtra',
  postalCode: '400001',
};

describe('validateShippingAddress', () => {
  it('accepts a complete Indian delivery address', () => {
    expect(validateShippingAddress(validAddress)).toBeNull();
  });

  it('accepts a +91-prefixed mobile number', () => {
    expect(validateShippingAddress({ ...validAddress, phone: '+919876543210' })).toBeNull();
  });

  it.each([
    ['name', { name: '' }, 'recipient name'],
    ['phone', { phone: '123' }, 'mobile number'],
    ['email', { email: 'bad' }, 'email address'],
    ['line1', { line1: '' }, 'delivery address'],
    ['city', { city: '' }, 'city'],
    ['state', { state: '' }, 'state'],
    ['postalCode', { postalCode: '012345' }, 'PIN code'],
  ] as const)('rejects an invalid %s', (_field, patch, message) => {
    expect(validateShippingAddress({ ...validAddress, ...patch })).toContain(message);
  });
});
