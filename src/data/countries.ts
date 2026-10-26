// ISO 3166-1 alpha-2 codes, stored rather than display names so a label can be
// corrected or translated without a data migration.
//
// This is a working subset, not the full list of ~250. Spotted is an India-first
// marketplace and the app cannot ship to most of these yet, so the list covers
// India, the diaspora markets the brand copy already targets, and immediate
// neighbours. It is ordered by likelihood rather than alphabetically — India is
// the default and belongs at the top, not filed under I.

export type Country = { code: string; name: string }

export const COUNTRIES: Country[] = [
  { code: 'IN', name: 'India' },
  { code: 'US', name: 'United States' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'CA', name: 'Canada' },
  { code: 'AU', name: 'Australia' },
  { code: 'AE', name: 'United Arab Emirates' },
  { code: 'SG', name: 'Singapore' },
  { code: 'MY', name: 'Malaysia' },
  { code: 'NZ', name: 'New Zealand' },
  { code: 'IE', name: 'Ireland' },
  { code: 'DE', name: 'Germany' },
  { code: 'FR', name: 'France' },
  { code: 'NL', name: 'Netherlands' },
  { code: 'QA', name: 'Qatar' },
  { code: 'SA', name: 'Saudi Arabia' },
  { code: 'KW', name: 'Kuwait' },
  { code: 'OM', name: 'Oman' },
  { code: 'BH', name: 'Bahrain' },
  { code: 'LK', name: 'Sri Lanka' },
  { code: 'NP', name: 'Nepal' },
  { code: 'BD', name: 'Bangladesh' },
  { code: 'BT', name: 'Bhutan' },
  { code: 'MV', name: 'Maldives' },
  { code: 'ZA', name: 'South Africa' },
]

export const DEFAULT_COUNTRY = 'IN'

export function countryName(code: string | null): string {
  if (!code) return ''
  return COUNTRIES.find((c) => c.code === code)?.name ?? code
}
