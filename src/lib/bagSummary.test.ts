import { describe, expect, it } from 'vitest'
import type { Listing } from '../data/listings'
import { SHIPPING_INR, summarizeBag } from './bagSummary'

function listing(id: string, price: number, status: Listing['status'] = 'live'): Listing {
  return { id, brand: id, size: 'M', price, likes: 0, img: '', status }
}

describe('summarizeBag', () => {
  it('is empty and free for an empty bag', () => {
    expect(summarizeBag([], {})).toEqual({
      availableIds: [],
      unavailableIds: [],
      pending: false,
      subtotal: 0,
      shipping: 0,
      total: 0,
    })
  })

  it('adds flat shipping once to the live items', () => {
    const s = summarizeBag(['a', 'b'], { a: listing('a', 1200), b: listing('b', 800) })
    expect(s.availableIds).toEqual(['a', 'b'])
    expect(s.subtotal).toBe(2000)
    expect(s.shipping).toBe(SHIPPING_INR)
    expect(s.total).toBe(2000 + SHIPPING_INR)
  })

  it('leaves sold items out of the subtotal and the payable ids', () => {
    const s = summarizeBag(['a', 'b'], { a: listing('a', 1200), b: listing('b', 800, 'sold') })
    expect(s.availableIds).toEqual(['a'])
    expect(s.unavailableIds).toEqual(['b'])
    expect(s.subtotal).toBe(1200)
    expect(s.total).toBe(1200 + SHIPPING_INR)
  })

  it('treats a listing that no longer exists as unavailable', () => {
    const s = summarizeBag(['a', 'gone'], { a: listing('a', 500), gone: null })
    expect(s.availableIds).toEqual(['a'])
    expect(s.unavailableIds).toEqual(['gone'])
    expect(s.total).toBe(500 + SHIPPING_INR)
  })

  it('charges no shipping when nothing in the bag can be bought', () => {
    const s = summarizeBag(['a', 'gone'], { a: listing('a', 500, 'sold'), gone: null })
    expect(s.availableIds).toEqual([])
    expect(s.subtotal).toBe(0)
    expect(s.shipping).toBe(0)
    expect(s.total).toBe(0)
  })

  it('reports pending until every row is looked up, and never prices an unknown row', () => {
    const s = summarizeBag(['a', 'b'], { a: listing('a', 700) })
    expect(s.pending).toBe(true)
    expect(s.availableIds).toEqual(['a'])
    expect(summarizeBag(['a', 'b'], { a: listing('a', 700), b: listing('b', 300) }).pending).toBe(false)
  })
})
