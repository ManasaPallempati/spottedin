import type { Listing } from './listings'

// Everything shown about a seller or an item comes from what the seller entered
// and what the database records. Nothing here is invented: no sample sellers,
// ratings, reviews or follower counts, and no guessed item condition.

export const CONDITIONS = ['Brand new', 'Like new', 'Used – excellent', 'Used – good'] as const
export type Condition = (typeof CONDITIONS)[number]

// listings.condition values, as written by the sell flow.
export const CONDITION_DB: Record<Condition, string> = {
  'Brand new': 'new',
  'Like new': 'like-new',
  'Used – excellent': 'good',
  'Used – good': 'fair',
}

const CONDITION_FROM_DB = new Map<string, Condition>(
  (Object.entries(CONDITION_DB) as [Condition, string][]).map(([label, value]) => [value, label]),
)

// null when the listing has no recorded condition: show nothing rather than guess.
export function conditionLabel(value: string | null | undefined): Condition | null {
  return value ? CONDITION_FROM_DB.get(value) ?? null : null
}

export type Seller = {
  // '' when the listing's seller could not be resolved (e.g. a deleted account).
  handle: string
  name: string
  bio: string
  // null until the seller has sales and a real rating; there is no review system yet.
  rating: number | null
  sold: number
}

export function sellerFor(listing: Listing): Seller {
  const sold = listing.sellerSales ?? 0
  return {
    handle: listing.sellerHandle ?? '',
    name: listing.sellerName ?? listing.sellerHandle ?? '',
    bio: listing.sellerBio ?? '',
    rating: sold > 0 && listing.sellerRating ? listing.sellerRating : null,
    sold,
  }
}

function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '')
}

export function describeListing(listing: Listing): { text: string; hashtags: string[] } {
  const condition = listing.condition ? `, ${listing.condition.toLowerCase()} condition` : ''
  const text =
    listing.description?.trim() ||
    `${listing.brand} in size ${listing.size}${condition}. Ask the seller about fit, alterations and included pieces.`
  const hashtags = [
    slugify(listing.category ?? listing.brand),
    `size${slugify(listing.size)}`,
    'prelovedindianwear',
  ].filter(Boolean)
  return { text, hashtags }
}
