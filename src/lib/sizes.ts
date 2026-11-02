// Sellers type sizes freely ("m", "Medium", "free size", "2XL"). Filtering on the raw
// string meant picking "M" silently dropped "Medium" and "m" — the Depop bug where the
// size filter "doesn't filter". Every size goes through normalizeSize before it is
// offered as an option or compared.

const ALIASES: Record<string, string> = {
  XXXS: 'XXXS',
  XXS: 'XXS',
  '2XS': 'XXS',
  XS: 'XS',
  'EXTRA SMALL': 'XS',
  S: 'S',
  SMALL: 'S',
  M: 'M',
  MED: 'M',
  MEDIUM: 'M',
  L: 'L',
  LARGE: 'L',
  XL: 'XL',
  'EXTRA LARGE': 'XL',
  XLARGE: 'XL',
  XXL: 'XXL',
  '2XL': 'XXL',
  XXXL: 'XXXL',
  '3XL': 'XXXL',
  '4XL': '4XL',
  '5XL': '5XL',
  '6XL': '6XL',
  FREE: 'Free size',
  'FREE SIZE': 'Free size',
  FREESIZE: 'Free size',
  'ONE SIZE': 'Free size',
  OS: 'Free size',
}

const ORDER = ['XXXS', 'XXS', 'XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL', '4XL', '5XL', '6XL', 'Free size']

export function normalizeSize(raw: string | null | undefined): string {
  const trimmed = (raw ?? '').trim().replace(/\s+/g, ' ')
  if (!trimmed) return ''
  const key = trimmed.toUpperCase().replace(/[-_.]/g, ' ').replace(/\s+/g, ' ')
  return ALIASES[key] ?? ALIASES[key.replace(/ /g, '')] ?? trimmed
}

/** Letter sizes in wearing order, then Free size, then numeric sizes ascending, then anything else A–Z. */
export function compareSizes(a: string, b: string): number {
  const ia = ORDER.indexOf(a)
  const ib = ORDER.indexOf(b)
  if (ia !== -1 || ib !== -1) return (ia === -1 ? ORDER.length + 1 : ia) - (ib === -1 ? ORDER.length + 1 : ib)
  const na = parseFloat(a)
  const nb = parseFloat(b)
  if (!Number.isNaN(na) && !Number.isNaN(nb) && na !== nb) return na - nb
  return a.localeCompare(b, 'en', { numeric: true })
}

export function sizeOptionsFor(sizes: Array<string | null | undefined>): string[] {
  return Array.from(new Set(sizes.map(normalizeSize).filter(Boolean))).sort(compareSizes)
}
