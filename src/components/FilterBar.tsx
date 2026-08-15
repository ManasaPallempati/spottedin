import { useState } from 'react'
import { ArrowUpDown } from 'lucide-react'
import type { Listing } from '../data/listings'
import { CONDITIONS } from '../data/sellers'
import { applyFilters, type Filters, type Sort } from '../lib/filters'
import Chip from './Chip'
import BottomSheet from './BottomSheet'
import './FilterBar.css'

type FilterBarProps = {
  listings: Listing[]
  filters: Filters
  onChange: (f: Filters) => void
  sort: Sort
  onSort: (s: Sort) => void
}

type SheetKind = 'brand' | 'size' | 'price' | 'condition' | 'sort' | null

const PRICE_OPTIONS: { value: Filters['price']; label: string }[] = [
  { value: 'u500', label: 'Under ₹500' },
  { value: '500to1500', label: '₹500 – ₹1,500' },
  { value: '1500to3000', label: '₹1,500 – ₹3,000' },
  { value: 'over3000', label: 'Over ₹3,000' },
]

const SORT_OPTIONS: { value: Sort; label: string }[] = [
  { value: 'newest', label: 'Newest' },
  { value: 'priceAsc', label: 'Price: low to high' },
  { value: 'priceDesc', label: 'Price: high to low' },
  { value: 'mostLiked', label: 'Most liked' },
]

function toggleValue(arr: string[], v: string): string[] {
  return arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]
}

function chipLabel(base: string, count: number): string {
  return count > 0 ? `${base} · ${count}` : base
}

export default function FilterBar({ listings, filters, onChange, sort, onSort }: FilterBarProps) {
  const [openSheet, setOpenSheet] = useState<SheetKind>(null)

  const brandOptions = Array.from(new Set(listings.map((l) => l.brand))).sort()
  const sizeOptions = Array.from(new Set(listings.map((l) => l.size))).sort()
  const resultCount = applyFilters(listings, filters, sort).length

  return (
    <div className="filter-bar">
      <button
        type="button"
        className={'filter-bar-chip' + (filters.brands.length > 0 ? ' filter-bar-chip-active' : '')}
        onClick={() => setOpenSheet('brand')}
      >
        {chipLabel('Brand', filters.brands.length)}
      </button>
      <button
        type="button"
        className={'filter-bar-chip' + (filters.sizes.length > 0 ? ' filter-bar-chip-active' : '')}
        onClick={() => setOpenSheet('size')}
      >
        {chipLabel('Size', filters.sizes.length)}
      </button>
      <button
        type="button"
        className={'filter-bar-chip' + (filters.price !== 'any' ? ' filter-bar-chip-active' : '')}
        onClick={() => setOpenSheet('price')}
      >
        {chipLabel('Price', filters.price !== 'any' ? 1 : 0)}
      </button>
      <button
        type="button"
        className={'filter-bar-chip' + (filters.conditions.length > 0 ? ' filter-bar-chip-active' : '')}
        onClick={() => setOpenSheet('condition')}
      >
        {chipLabel('Condition', filters.conditions.length)}
      </button>
      <button
        type="button"
        className={'filter-bar-chip' + (filters.onSale ? ' filter-bar-chip-active' : '')}
        onClick={() => onChange({ ...filters, onSale: !filters.onSale })}
      >
        On sale
      </button>
      <button type="button" className="filter-bar-chip filter-bar-sort" onClick={() => setOpenSheet('sort')}>
        <ArrowUpDown size={14} />
        Sort
      </button>

      <BottomSheet open={openSheet === 'brand'} onClose={() => setOpenSheet(null)} title="Brand">
        <div className="filter-bar-chip-grid">
          {brandOptions.map((b) => (
            <Chip
              key={b}
              label={b}
              selected={filters.brands.includes(b)}
              onClick={() => onChange({ ...filters, brands: toggleValue(filters.brands, b) })}
            />
          ))}
        </div>
        <div className="filter-bar-sheet-actions">
          <button type="button" className="filter-bar-clear" onClick={() => onChange({ ...filters, brands: [] })}>
            Clear
          </button>
          <button type="button" className="btn btn-primary filter-bar-show" onClick={() => setOpenSheet(null)}>
            Show {resultCount} results
          </button>
        </div>
      </BottomSheet>

      <BottomSheet open={openSheet === 'size'} onClose={() => setOpenSheet(null)} title="Size">
        <div className="filter-bar-chip-grid">
          {sizeOptions.map((s) => (
            <Chip
              key={s}
              label={s}
              selected={filters.sizes.includes(s)}
              onClick={() => onChange({ ...filters, sizes: toggleValue(filters.sizes, s) })}
            />
          ))}
        </div>
        <div className="filter-bar-sheet-actions">
          <button type="button" className="filter-bar-clear" onClick={() => onChange({ ...filters, sizes: [] })}>
            Clear
          </button>
          <button type="button" className="btn btn-primary filter-bar-show" onClick={() => setOpenSheet(null)}>
            Show {resultCount} results
          </button>
        </div>
      </BottomSheet>

      <BottomSheet open={openSheet === 'price'} onClose={() => setOpenSheet(null)} title="Price">
        <div className="filter-bar-chip-grid">
          {PRICE_OPTIONS.map((opt) => (
            <Chip
              key={opt.value}
              label={opt.label}
              selected={filters.price === opt.value}
              onClick={() => onChange({ ...filters, price: opt.value })}
            />
          ))}
        </div>
        <div className="filter-bar-sheet-actions">
          <button type="button" className="filter-bar-clear" onClick={() => onChange({ ...filters, price: 'any' })}>
            Clear
          </button>
          <button type="button" className="btn btn-primary filter-bar-show" onClick={() => setOpenSheet(null)}>
            Show {resultCount} results
          </button>
        </div>
      </BottomSheet>

      <BottomSheet open={openSheet === 'condition'} onClose={() => setOpenSheet(null)} title="Condition">
        <div className="filter-bar-chip-grid">
          {CONDITIONS.map((c) => (
            <Chip
              key={c}
              label={c}
              selected={filters.conditions.includes(c)}
              onClick={() => onChange({ ...filters, conditions: toggleValue(filters.conditions, c) })}
            />
          ))}
        </div>
        <div className="filter-bar-sheet-actions">
          <button
            type="button"
            className="filter-bar-clear"
            onClick={() => onChange({ ...filters, conditions: [] })}
          >
            Clear
          </button>
          <button type="button" className="btn btn-primary filter-bar-show" onClick={() => setOpenSheet(null)}>
            Show {resultCount} results
          </button>
        </div>
      </BottomSheet>

      <BottomSheet open={openSheet === 'sort'} onClose={() => setOpenSheet(null)} title="Sort by">
        <div className="filter-bar-sort-list">
          {SORT_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              className="filter-bar-sort-option"
              onClick={() => {
                onSort(opt.value)
                setOpenSheet(null)
              }}
            >
              {opt.label}
              {sort === opt.value && <span className="filter-bar-sort-check">✓</span>}
            </button>
          ))}
        </div>
      </BottomSheet>
    </div>
  )
}
