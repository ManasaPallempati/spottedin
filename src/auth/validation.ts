const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const INDIAN_PHONE_PATTERN = /^[6-9]\d{9}$/;
const HANDLE_PATTERN = /^@[a-z0-9][a-z0-9._]{2,29}$/;

export function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

export function isValidEmail(value: string): boolean {
  return EMAIL_PATTERN.test(normalizeEmail(value));
}

export function normalizeIndianPhone(value: string): string {
  const digits = value.replace(/\D/g, '');
  return digits.length === 12 && digits.startsWith('91') ? digits.slice(2) : digits;
}

export function isValidIndianPhone(value: string): boolean {
  return INDIAN_PHONE_PATTERN.test(normalizeIndianPhone(value));
}

export function toIndianE164(value: string): string {
  const phone = normalizeIndianPhone(value);
  if (!isValidIndianPhone(phone)) {
    throw new Error('Enter a valid Indian mobile number');
  }
  return `+91${phone}`;
}

export function normalizeProfileHandle(value: string): string {
  const handle = value
    .trim()
    .toLowerCase()
    .replace(/^@/, '')
    .replace(/[^a-z0-9._]/g, '')
    .slice(0, 30);
  return `@${handle}`;
}

export function isValidProfileHandle(value: string): boolean {
  return HANDLE_PATTERN.test(normalizeProfileHandle(value));
}
