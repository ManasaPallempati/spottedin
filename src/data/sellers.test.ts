import { describe, expect, it } from 'vitest'
import type { Listing } from './listings'
import { UNKNOWN_SELLER, sellerFor } from './sellers'

const base: Listing = { id: 'l-1', brand: 'Silk saree', size: 'Free size', price: 2500, likes: 0, img: '', status: 'live' } as Listing

describe('sellerFor', () => {
  it('uses the seller profile embedded in the listing', () => {
    const seller = sellerFor({ ...base, sellerHandle: 'meera', sellerName: 'Meera', sellerRating: 4.8, sellerSales: 12 })
    expect(seller).toMatchObject({ handle: 'meera', name: 'Meera', rating: 4.8, sold: 12, reviews: [] })
  })

  it('shows no rating for a seller without one', () => {
    expect(sellerFor({ ...base, sellerHandle: 'ravi', sellerRating: null }).rating).toBeNull()
  })

  it('falls back to a placeholder, never a sample seller, when the seller is unknown', () => {
    expect(sellerFor(base)).toBe(UNKNOWN_SELLER)
    expect(UNKNOWN_SELLER.handle).toBe('')
  })
})
