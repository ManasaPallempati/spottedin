import type { Listing } from '../data/listings'
import { conditionForListing } from '../data/sellers'
import { normalizeCategory } from '../data/taxonomy'

export type Filters = {
  brands: string[]
  sizes: string[]
  categories: string[]
  price: 'any' | 'u500' | '500to1500' | '1500to3000' | 'over3000'
  conditions: string[]
  onSale: boolean
}

export type Sort = 'newest' | 'priceAsc' | 'priceDesc' | 'mostLiked'

export const emptyFilters: Filters = {
  brands: [],
  sizes: [],
  categories: [],
  price: 'any',
  conditions: [],
  onSale: false,
}

function inPriceBand(price: number, band: Filters['price']): boolean {
  switch (band) {
    case 'any':
      return true
    case 'u500':
      return price <= 500
    case '500to1500':
      return price >= 500 && price <= 1500
    case '1500to3000':
      return price >= 1500 && price <= 3000
    case 'over3000':
      return price >= 3000
  }
}

export function applyFilters(listings: Listing[], filters: Filters, sort: Sort): Listing[] {
  const filtered = listings.filter((listing) => {
    if (filters.brands.length > 0 && !filters.brands.includes(listing.brand)) return false
    if (filters.sizes.length > 0 && !filters.sizes.includes(listing.size)) return false
    if (filters.categories.length > 0) {
      const normalized = normalizeCategory(listing.category ?? '')
      if (!filters.categories.includes(normalized)) return false
    }
    if (!inPriceBand(listing.price, filters.price)) return false
    if (filters.conditions.length > 0 && !filters.conditions.includes(conditionForListing(listing.id))) return false
    if (filters.onSale && !listing.originalPrice) return false
    return true
  })

  switch (sort) {
    case 'newest':
      return filtered
    case 'priceAsc':
      return [...filtered].sort((a, b) => a.price - b.price)
    case 'priceDesc':
      return [...filtered].sort((a, b) => b.price - a.price)
    case 'mostLiked':
      return [...filtered].sort((a, b) => b.likes - a.likes)
  }
}
