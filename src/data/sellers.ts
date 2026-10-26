import type { Listing } from './listings'

export type Review = { reviewer: string; stars: number; ago: string; text: string }

// Everything here comes from the seller's profile row, embedded in each
// listing by useListings. There are no sample sellers: a listing whose seller
// can't be resolved (still loading, or a deleted account) gets UNKNOWN_SELLER.
export type Seller = {
  // '' for UNKNOWN_SELLER
  handle: string
  name: string
  bio: string
  avatar: string
  // null until the seller has a real rating
  rating: number | null
  reviewCount: number
  sold: number
  followers: number
  following: number
  reviews: Review[]
}

export const CONDITIONS = ['Brand new', 'Like new', 'Used – excellent', 'Used – good'] as const
export type Condition = (typeof CONDITIONS)[number]

function hashString(s: string): number {
  let sum = 0
  for (let i = 0; i < s.length; i++) sum += s.charCodeAt(i)
  return sum
}

export function conditionForListing(id: string): Condition {
  const idx = hashString(id) % CONDITIONS.length
  return CONDITIONS[idx]
}

export function sellerAvatar(handle: string): string {
  return `https://picsum.photos/seed/spotted-seller-${handle}/300/300`
}

export const UNKNOWN_SELLER: Seller = {
  handle: '',
  name: 'Seller',
  bio: '',
  avatar: sellerAvatar('unknown'),
  rating: null,
  reviewCount: 0,
  sold: 0,
  followers: 0,
  following: 0,
  reviews: [],
}

export function sellerFor(listing: Listing): Seller {
  if (!listing.sellerHandle) return UNKNOWN_SELLER
  return {
    handle: listing.sellerHandle,
    name: listing.sellerName ?? listing.sellerHandle,
    bio: listing.sellerBio ?? '',
    avatar: sellerAvatar(listing.sellerHandle),
    rating: listing.sellerRating ?? null,
    reviewCount: 0,
    sold: listing.sellerSales ?? 0,
    followers: 0,
    following: 0,
    reviews: [],
  }
}

function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '')
}

export function describeListing(listing: Listing): { text: string; hashtags: string[] } {
  const condition = conditionForListing(listing.id)
  const text =
    listing.description?.trim() ||
    `${listing.brand} in size ${listing.size}, ${condition.toLowerCase()} condition. Ask the seller about fit, alterations and included pieces.`
  const hashtags = [
    slugify(listing.category ?? listing.brand),
    `size${slugify(listing.size)}`,
    'prelovedindianwear',
  ].filter(Boolean)
  return { text, hashtags }
}
