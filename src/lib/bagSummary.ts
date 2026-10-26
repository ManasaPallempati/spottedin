import type { Listing } from '../data/listings'

// Flat shipping per order, in rupees. Must match SHIPPING_INR in
// supabase/functions/_shared/razorpay.ts, which recomputes the charge.
export const SHIPPING_INR = 49

// What the bag knows about a listing id once its row has been looked up:
//   undefined → still loading, null → no such listing any more (deleted or
//   hidden), otherwise the listing (which may have sold since it was bagged).
export type ResolvedBag = Record<string, Listing | null | undefined>

export type BagSummary = {
  // Ids a buyer can actually pay for right now (live listings only).
  availableIds: string[]
  // Ids that can no longer be bought (sold or gone); the buyer must remove them.
  unavailableIds: string[]
  // True while any bag row has not been looked up yet: prices are unknown.
  pending: boolean
  subtotal: number
  shipping: number
  total: number
}

// Only live listings count towards the subtotal, shipping and the payment
// request. A sold or deleted item used to inflate the total and made the
// server reject the whole payment ("An item in your bag has already sold")
// with no visible way to fix it.
export function summarizeBag(bagIds: string[], resolved: ResolvedBag): BagSummary {
  const availableIds: string[] = []
  const unavailableIds: string[] = []
  let pending = false
  let subtotal = 0

  for (const id of bagIds) {
    const listing = resolved[id]
    if (listing === undefined) {
      pending = true
    } else if (listing === null || listing.status === 'sold') {
      unavailableIds.push(id)
    } else {
      availableIds.push(id)
      subtotal += listing.price
    }
  }

  const shipping = availableIds.length > 0 ? SHIPPING_INR : 0
  return { availableIds, unavailableIds, pending, subtotal, shipping, total: subtotal + shipping }
}
