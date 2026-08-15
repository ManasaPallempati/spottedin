import type { Listing } from './listings'

const owner = { name: 'Manasa', handle: 'manasa' }

export type Review = { reviewer: string; stars: number; ago: string; text: string }

export type Seller = {
  handle: string
  name: string
  bio: string
  avatar: string
  rating: number
  reviewCount: number
  sold: number
  followers: number
  following: number
  reviews: Review[]
}

export const CONDITIONS = ['Brand new', 'Like new', 'Used – excellent', 'Used – good'] as const
export type Condition = (typeof CONDITIONS)[number]

export const sellers: Seller[] = [
  {
    handle: owner.handle,
    name: owner.name,
    bio: 'Clearing out my closet — mostly denim and streetwear. Shipping availability varies by style.',
    avatar: 'https://picsum.photos/seed/spotted-seller-manasa/300/300',
    rating: 4.9,
    reviewCount: 34,
    sold: 28,
    followers: 210,
    following: 88,
    reviews: [
      { reviewer: 'ritu.thrifts', stars: 5, ago: '2 weeks ago', text: 'Item was exactly as described, super quick shipping!' },
      { reviewer: 'bombayvintage', stars: 5, ago: '1 month ago', text: 'Great seller, would buy again.' },
      { reviewer: 'thriftedbyarjun', stars: 4, ago: '2 months ago', text: 'Good condition, packaging could be better.' },
    ],
  },
  {
    handle: 'ritu.thrifts',
    name: 'Ritu Sharma',
    bio: 'Curated pre-loved fashion from Mumbai. Listings are shared directly by the seller.',
    avatar: 'https://picsum.photos/seed/spotted-seller-1/300/300',
    rating: 4.8,
    reviewCount: 96,
    sold: 74,
    followers: 540,
    following: 120,
    reviews: [
      { reviewer: 'manasa', stars: 5, ago: '3 days ago', text: 'Beautiful piece, exactly as pictured!' },
      { reviewer: 'closetofpriya', stars: 5, ago: '1 week ago', text: 'So easy to deal with, highly recommend.' },
      { reviewer: 'bombayvintage', stars: 4, ago: '3 weeks ago', text: 'Nice quality, shipping took a bit long.' },
    ],
  },
  {
    handle: 'bombayvintage',
    name: 'Bombay Vintage Co.',
    bio: 'Vintage denim and retro streetwear sourced across India.',
    avatar: 'https://picsum.photos/seed/spotted-seller-2/300/300',
    rating: 4.7,
    reviewCount: 61,
    sold: 45,
    followers: 320,
    following: 40,
    reviews: [
      { reviewer: 'thriftedbyarjun', stars: 5, ago: '5 days ago', text: 'Rare find, arrived in perfect condition.' },
      { reviewer: 'ritu.thrifts', stars: 4, ago: '2 weeks ago', text: 'Good seller, minor delay in dispatch.' },
    ],
  },
  {
    handle: 'thriftedbyarjun',
    name: 'Arjun Mehta',
    bio: 'Selling rotation and daily wear carefully described before listing.',
    avatar: 'https://picsum.photos/seed/spotted-seller-3/300/300',
    rating: 4.6,
    reviewCount: 8,
    sold: 5,
    followers: 60,
    following: 95,
    reviews: [
      { reviewer: 'closetofpriya', stars: 5, ago: '1 week ago', text: 'Legit and fast, thank you!' },
      { reviewer: 'manasa', stars: 4, ago: '1 month ago', text: 'Solid seller, would buy again.' },
    ],
  },
  {
    handle: 'closetofpriya',
    name: 'Priya Nair',
    bio: 'Decluttering my closet — brands I no longer wear, all excellent condition.',
    avatar: 'https://picsum.photos/seed/spotted-seller-4/300/300',
    rating: 5.0,
    reviewCount: 140,
    sold: 90,
    followers: 780,
    following: 210,
    reviews: [
      { reviewer: 'bombayvintage', stars: 5, ago: '4 days ago', text: 'Perfect transaction, super sweet seller.' },
      { reviewer: 'ritu.thrifts', stars: 5, ago: '2 weeks ago', text: 'Item exceeded expectations!' },
      { reviewer: 'thriftedbyarjun', stars: 5, ago: '1 month ago', text: 'Will definitely shop again.' },
    ],
  },
]

const nonManasaSellers = sellers.filter((s) => s.handle !== owner.handle)

function hashString(s: string): number {
  let sum = 0
  for (let i = 0; i < s.length; i++) sum += s.charCodeAt(i)
  return sum
}

export function sellerForListing(listingId: string): Seller {
  const idx = hashString(listingId) % nonManasaSellers.length
  return nonManasaSellers[idx]
}

export function conditionForListing(id: string): Condition {
  const idx = hashString(id) % CONDITIONS.length
  return CONDITIONS[idx]
}

export function sellerFor(listing: Listing): Seller {
  if (listing.sellerHandle) {
    return {
      handle: listing.sellerHandle,
      name: listing.sellerName ?? listing.sellerHandle,
      bio: listing.sellerBio ?? '',
      avatar: `https://picsum.photos/seed/spotted-seller-${listing.sellerHandle}/300/300`,
      rating: listing.sellerRating ?? 0,
      reviewCount: 0,
      sold: listing.sellerSales ?? 0,
      followers: 0,
      following: 0,
      reviews: [],
    }
  }
  return sellerForListing(listing.id)
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
