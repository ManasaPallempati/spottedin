import type { Listing } from './listings'
import { describeListing } from './sellers'
import { normalizeCategory } from './taxonomy'

// "Occasion edits": curated collections that cut across the category tree.
// They own no data: a collection is a filter over the listings the app already
// loads, matched on the stored category slug or on a keyword in the title,
// description or hashtags (describeListing). Add an edit by adding an entry.
export type Occasion = {
  slug: string
  label: string
  blurb: string
  // Taxonomy category slugs (src/data/taxonomy.ts) that always belong.
  categories: string[]
  // Lowercase whole-word keywords matched against title, description and hashtags.
  keywords: string[]
}

export const OCCASIONS: Occasion[] = [
  {
    slug: 'shaadi',
    label: 'Shaadi',
    blurb: 'Lehengas, sherwanis and bridal-season pieces for the big day and every function around it.',
    categories: ['lehengas', 'sherwanis', 'sharara-gharara-sets', 'girls-lehenga-saree-sets', 'boys-sherwani-dhoti-sets'],
    keywords: ['wedding', 'shaadi', 'bridal', 'bride', 'groom', 'sangeet', 'mehendi', 'haldi', 'reception'],
  },
  {
    slug: 'diwali',
    label: 'Diwali',
    blurb: 'Light-catching silks and festive sets to wear to the puja and the parties after.',
    categories: ['anarkalis'],
    keywords: ['diwali', 'deepavali', 'puja', 'pooja', 'silk', 'zari', 'banarasi', 'kanjivaram', 'kanchipuram'],
  },
  {
    slug: 'festive',
    label: 'Festive',
    blurb: 'Garba nights, Navratri, Eid, Raksha Bandhan and every celebration in between.',
    categories: ['salwar-kameez-punjabi-suits', 'girls-salwar-kurta-sets', 'boys-kurta-pajama-sets'],
    keywords: ['festive', 'festival', 'navratri', 'garba', 'eid', 'rakhi', 'holi', 'onam', 'pongal', 'celebration'],
  },
  {
    slug: 'office',
    label: 'Office',
    blurb: 'Easy, polished everyday Indian wear for work: cotton kurtas, linen sets and quiet sarees.',
    categories: ['womens-kurtas-kurtis', 'mens-kurtas', 'nehru-jackets-bandhgalas'],
    keywords: ['office', 'work', 'workwear', 'formal', 'cotton', 'linen', 'daily', 'everyday', 'casual'],
  },
  {
    slug: 'date-night',
    label: 'Date night',
    blurb: 'Indo-western gowns, blouses and statement jewelry for an evening out.',
    categories: ['womens-indo-western-gowns', 'mens-indo-western-suits', 'blouses-separates', 'jewelry'],
    keywords: ['date', 'evening', 'cocktail', 'party', 'gown', 'indo-western', 'fusion', 'sequin', 'satin'],
  },
]

export function occasionBySlug(slug: string): Occasion | undefined {
  const wanted = normalizeCategory(slug)
  return OCCASIONS.find((occasion) => occasion.slug === wanted)
}

function words(listing: Listing): Set<string> {
  const { hashtags } = describeListing(listing)
  const text = [listing.brand, listing.description ?? '', listing.category ?? '', ...hashtags].join(' ')
  const found = new Set<string>()
  for (const word of text.toLowerCase().split(/[^a-z0-9]+/)) {
    if (word) found.add(word)
  }
  // Also keep the joined form so hyphenated keywords ("indo-western") match.
  found.add(text.toLowerCase())
  return found
}

export function listingMatchesOccasion(listing: Listing, occasion: Occasion): boolean {
  const category = normalizeCategory(listing.category ?? '')
  if (category && occasion.categories.includes(category)) return true

  const tokens = words(listing)
  const joined = [...tokens].find((token) => token.includes(' ')) ?? ''
  return occasion.keywords.some((keyword) =>
    keyword.includes('-') ? joined.includes(keyword) || joined.includes(keyword.replace('-', ' ')) : tokens.has(keyword),
  )
}

// Sold listings are not shown in an edit; the order of the input is kept.
export function filterByOccasion(listings: Listing[], occasion: Occasion): Listing[] {
  return listings.filter((listing) => listing.status !== 'sold' && listingMatchesOccasion(listing, occasion))
}
