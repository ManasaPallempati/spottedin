import type { Listing } from '../data/listings'
import type { Interest } from './auth'
import { categoryForListing } from '../data/taxonomy'

// Personalizes the Home feed from the onboarding preferences the app already
// collects: sizes + brands (localStorage, written by src/pages/onboarding/*)
// and the account-level interest (womenswear/menswear/both, from the profile).
// Pure reorder only — every listing stays in the feed, matches just rise.

export type StoredPrefs = { sizes: string[]; brands: string[] }

export type FeedPrefs = StoredPrefs & { interest: Interest | null }

const PREFS_KEY = 'spotted_prefs_v1'

export function readStoredPrefs(): StoredPrefs {
  try {
    const raw = localStorage.getItem(PREFS_KEY)
    if (!raw) return { sizes: [], brands: [] }
    const parsed = JSON.parse(raw)
    const sizes = Array.isArray(parsed?.sizes) ? parsed.sizes.filter((s: unknown) => typeof s === 'string') : []
    const brands = Array.isArray(parsed?.brands) ? parsed.brands.filter((b: unknown) => typeof b === 'string') : []
    return { sizes, brands }
  } catch {
    return { sizes: [], brands: [] }
  }
}

// Onboarding stores sizes like `US M` / `US 32"`; sellers type sizes free-form
// (`M`, `32`). Normalize both sides the same way before comparing.
export function normalizeSize(size: string): string {
  return size
    .replace(/^US\s+/i, '')
    .replace(/"/g, '')
    .trim()
    .toLowerCase()
}

// Brand is the strongest signal (explicitly picked one-by-one), size next
// (wearability), interest last (broad department). Weights are spaced so a
// brand match always outranks size + interest combined.
const BRAND_MATCH = 4
const SIZE_MATCH = 2
const INTEREST_MATCH = 1

function interestMatchesDepartment(interest: Interest, department: string | undefined): boolean {
  if (department === 'women') return interest === 'womenswear' || interest === 'both'
  if (department === 'men') return interest === 'menswear' || interest === 'both'
  return false
}

export function scoreListingForUser(listing: Listing, prefs: FeedPrefs): number {
  let score = 0

  const title = listing.brand.toLowerCase()
  if (prefs.brands.some((brand) => brand && title.includes(brand.toLowerCase()))) {
    score += BRAND_MATCH
  }

  const listingSize = normalizeSize(listing.size)
  if (listingSize && prefs.sizes.some((size) => normalizeSize(size) === listingSize)) {
    score += SIZE_MATCH
  }

  if (prefs.interest && interestMatchesDepartment(prefs.interest, categoryForListing(listing)?.department)) {
    score += INTEREST_MATCH
  }

  return score
}

// Reorders listings so likely matches come first; ties keep their original
// (recency) order via stable sort. Returns the input array untouched — and
// `personalized: false` — when the user has no preferences or nothing matches,
// so an un-onboarded or logged-out feed is provably unchanged.
export function personalizeFeed(
  listings: Listing[],
  prefs: FeedPrefs,
): { listings: Listing[]; personalized: boolean } {
  if (prefs.brands.length === 0 && prefs.sizes.length === 0 && !prefs.interest) {
    return { listings, personalized: false }
  }

  const scores = new Map<string, number>()
  let anyMatch = false
  for (const listing of listings) {
    const score = scoreListingForUser(listing, prefs)
    if (score > 0) anyMatch = true
    scores.set(listing.id, score)
  }

  if (!anyMatch) return { listings, personalized: false }

  const ranked = [...listings].sort((a, b) => (scores.get(b.id) ?? 0) - (scores.get(a.id) ?? 0))
  return { listings: ranked, personalized: true }
}
