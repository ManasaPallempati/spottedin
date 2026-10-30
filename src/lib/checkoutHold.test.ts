import { describe, expect, it } from 'vitest'
import { HOLD_MINUTES, heldListingIds, holdCutoffIso } from '../../supabase/functions/_shared/checkoutHold'

describe('holdCutoffIso', () => {
  it('is HOLD_MINUTES before now', () => {
    const now = new Date('2026-10-26T12:00:00.000Z')
    expect(holdCutoffIso(now)).toBe('2026-10-26T11:45:00.000Z')
    expect(HOLD_MINUTES).toBe(15)
  })
})

describe('heldListingIds', () => {
  const open = [
    { user_id: 'other', items: [{ listing_id: 'a' }, { listing_id: 'b' }] },
    { user_id: 'me', items: [{ listing_id: 'c' }] },
    { user_id: 'third', items: null },
  ]

  it('reports listings another buyer is paying for', () => {
    expect(heldListingIds(open, ['a', 'z'], 'me')).toEqual(['a'])
  })

  it('never blocks the buyer on their own open payment (retry after a dismissed window)', () => {
    expect(heldListingIds(open, ['c'], 'me')).toEqual([])
  })

  it('returns each held listing once, even across several holders', () => {
    const rows = [...open, { user_id: 'fourth', items: [{ listing_id: 'a' }] }]
    expect(heldListingIds(rows, ['a', 'b'], 'me').sort()).toEqual(['a', 'b'])
  })

  it('ignores payments with no usable items', () => {
    expect(heldListingIds([{ user_id: 'x', items: [{}] }], ['a'], 'me')).toEqual([])
  })
})
