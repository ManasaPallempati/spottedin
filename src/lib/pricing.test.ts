import { describe, expect, it } from 'vitest'
import { BUYER_FEE_MIN_INR, SHIPPING_INR, buyerFeeInr, chargesFor } from './pricing'

describe('buyerFeeInr', () => {
  it('charges 8% of the item total, rounded', () => {
    expect(buyerFeeInr(1550)).toBe(124)
    expect(buyerFeeInr(1000)).toBe(80)
  })

  it('never charges less than the ₹29 minimum', () => {
    expect(BUYER_FEE_MIN_INR).toBe(29)
    expect(buyerFeeInr(100)).toBe(29)
    expect(buyerFeeInr(362)).toBe(29)
    expect(buyerFeeInr(363)).toBe(29)
    expect(buyerFeeInr(375)).toBe(30)
  })

  it('charges nothing on an empty order', () => {
    expect(buyerFeeInr(0)).toBe(0)
  })
})

describe('chargesFor', () => {
  it('adds ₹79 flat shipping and the buyer fee', () => {
    expect(SHIPPING_INR).toBe(79)
    expect(chargesFor(1550)).toEqual({ itemTotal: 1550, shipping: 79, buyerFee: 124, total: 1753 })
  })

  it('charges nothing for an empty order', () => {
    expect(chargesFor(0)).toEqual({ itemTotal: 0, shipping: 0, buyerFee: 0, total: 0 })
  })

  it('charges shipping once per seller order', () => {
    // The bag checks out each seller group on its own subtotal.
    const groups = [
      [600, 950], // seller A: two items, one parcel
      [200], // seller B
    ]
    const totals = groups.map((items) => chargesFor(items.reduce((sum, p) => sum + p, 0)))
    expect(totals.map((c) => c.shipping)).toEqual([79, 79])
    expect(totals.map((c) => c.buyerFee)).toEqual([124, 29])
    expect(totals.map((c) => c.total)).toEqual([1753, 308])
  })
})
