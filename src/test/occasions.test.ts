import { describe, expect, it } from 'vitest'
import type { Listing } from '../data/listings'
import { OCCASIONS, filterByOccasion, occasionBySlug } from '../data/occasions'

function listing(over: Partial<Listing>): Listing {
  return { id: 'x', brand: 'Plain piece', size: 'M', price: 1000, likes: 0, img: '', ...over }
}

describe('occasion edits filter', () => {
  const shaadi = occasionBySlug('shaadi')!
  const date = occasionBySlug('date-night')!

  it('knows all five edits and rejects unknown slugs', () => {
    expect(OCCASIONS.map((o) => o.slug)).toEqual(['shaadi', 'diwali', 'festive', 'office', 'date-night'])
    expect(occasionBySlug('nope')).toBeUndefined()
  })

  it('matches by category slug or by keyword, and never by substring', () => {
    const byCategory = listing({ id: 'a', category: 'lehengas' })
    const byKeyword = listing({ id: 'b', category: 'other', description: 'Worn once at a wedding.' })
    const bySubstring = listing({ id: 'c', category: 'other', description: 'Receptionist desk chair' })
    const unrelated = listing({ id: 'd', category: 'other' })

    expect(filterByOccasion([byCategory, byKeyword, bySubstring, unrelated], shaadi).map((l) => l.id)).toEqual(['a', 'b'])
  })

  it('matches hyphenated keywords, hides sold listings and keeps order', () => {
    const gown = listing({ id: 'g', brand: 'Indo-western gown', category: 'other' })
    const sold = listing({ id: 's', category: 'jewelry', status: 'sold' })
    const jewelry = listing({ id: 'j', category: 'jewelry' })

    expect(filterByOccasion([gown, sold, jewelry], date).map((l) => l.id)).toEqual(['g', 'j'])
  })
})
