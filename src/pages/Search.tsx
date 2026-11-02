import SkeletonCard from '../components/SkeletonCard'
import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Bookmark, BookmarkCheck, SearchX, X } from 'lucide-react'
import SearchBar from '../components/SearchBar'
import Chip from '../components/Chip'
import FilterBar from '../components/FilterBar'
import ProductCard from '../components/ProductCard'
import { INDIAN_CATEGORIES, normalizeCategory } from '../data/taxonomy'
import { useListings, searchListings } from '../lib/useListings'
import { applyFilters, emptyFilters, type Filters, type Sort } from '../lib/filters'
import { usePeopleSearch, personAvatarUrl, personInitials } from '../lib/people'
import { normalizeSize } from '../lib/sizes'
import {
  listSavedSearches,
  removeSavedSearch,
  saveSearch,
  savedSearchKey,
  savedSearchLabel,
  savedSearchPath,
  type SavedSearch,
} from '../lib/savedSearches'
import './search.css'

const POPULAR_BRANDS = ['Nike', 'Adidas', "Levi's", 'Zara', 'Carhartt', 'H&M']

export default function Search() {
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  const q = searchParams.get('q') ?? ''
  const categorySlug = normalizeCategory(searchParams.get('category') ?? '')
  const category = INDIAN_CATEGORIES.find((item) => item.slug === categorySlug)

  // Search/browse shows sold items too (with a Sold chip) so results reflect
  // the market; the "Hide sold" filter chip lets the shopper opt out.
  const { listings, loading } = useListings({ includeSold: true })
  // Only when there is a text query: browsing a category is looking for items,
  // not sellers.
  const { people } = usePeopleSearch(category ? '' : q)
  // Sizes live in the URL (?size=M&size=L) so a filtered search can be shared, saved and
  // restored; every other filter stays local as before.
  const urlSizes = searchParams.getAll('size').map(normalizeSize).filter(Boolean)
  const urlSizesKey = urlSizes.join(',')
  const [filters, setFiltersState] = useState<Filters>({ ...emptyFilters, sizes: urlSizes })
  useEffect(() => {
    setFiltersState((current) =>
      current.sizes.join(',') === urlSizesKey ? current : { ...current, sizes: urlSizesKey ? urlSizesKey.split(',') : [] },
    )
  }, [urlSizesKey])
  function setFilters(next: Filters) {
    setFiltersState(next)
    if (next.sizes.join(',') !== urlSizesKey) {
      const params = new URLSearchParams(searchParams)
      params.delete('size')
      for (const size of next.sizes) params.append('size', size)
      setSearchParams(params, { replace: true })
    }
  }
  const [saved, setSaved] = useState<SavedSearch[]>(() => listSavedSearches())
  const current = { q: q.trim(), sizes: filters.sizes }
  const isSaved = saved.some((s) => savedSearchKey(s) === savedSearchKey(current))
  const [sort, setSort] = useState<Sort>('newest')

  const searched = useMemo(() => {
    const queryMatches = q.trim() ? searchListings(listings, q) : listings
    if (!category) return queryMatches
    return queryMatches.filter((listing) => normalizeCategory(listing.category ?? '') === category.slug)
  }, [listings, q, category])
  const results = useMemo(() => applyFilters(searched, filters, sort), [searched, filters, sort])

  function goToBrand(brand: string) {
    navigate(`/search?q=${encodeURIComponent(brand)}`)
  }

  return (
    <div className="search-page">
      <div className="search-page-bar">
        <SearchBar key={q} initialQuery={q} />
      </div>

      {!q.trim() && !category && saved.length > 0 && (
        <div className="search-page-saved">
          <p className="search-page-brands-label">Saved searches</p>
          <div className="search-page-saved-row">
            {saved.map((search) => (
              <span key={savedSearchKey(search)} className="search-page-saved-chip">
                <Link to={savedSearchPath(search)}>{savedSearchLabel(search)}</Link>
                <button
                  type="button"
                  aria-label={`Remove saved search ${savedSearchLabel(search)}`}
                  onClick={() => setSaved(removeSavedSearch(search))}
                >
                  <X size={14} aria-hidden="true" />
                </button>
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="search-page-brands">
        <p className="search-page-brands-label">Popular brands</p>
        <div className="search-page-brands-row">
          {POPULAR_BRANDS.map((brand) => (
            <Chip
              key={brand}
              label={brand}
              selected={q.trim().toLowerCase() === brand.toLowerCase()}
              onClick={() => goToBrand(brand)}
            />
          ))}
        </div>
      </div>

      <div className="search-page-heading">
        {category ? (
          <>
            <p className="search-page-kicker">Category</p>
            <h1 className="search-page-title">{category.label}</h1>
            <p className="search-page-count">
              <strong>{results.length}</strong> {results.length === 1 ? 'listing' : 'listings'} available
            </p>
          </>
        ) : q.trim() ? (
          <p className="search-page-count">
            <strong>{results.length}</strong> results for '{q}'
          </p>
        ) : (
          <h2 className="search-page-browse">Browse all</h2>
        )}
      </div>

      {/* People before filters, because a name query has no useful item results
          to filter — someone searching "manasa" wants the seller, and burying
          that under an empty item grid is why the search felt broken. */}
      {people.length > 0 && (
        <section className="search-people">
          <h2 className="search-people-title">People</h2>
          <ul className="search-people-list">
            {people.map((person) => {
              const avatar = personAvatarUrl(person)
              return (
                <li key={person.handle}>
                  <Link to={`/shop/${person.handle}`} className="search-person">
                    {avatar ? (
                      <img className="search-person-avatar" src={avatar} alt="" />
                    ) : (
                      <span className="search-person-avatar search-person-avatar-fallback">
                        {person.avatarEmoji || personInitials(person.name)}
                      </span>
                    )}
                    <span className="search-person-text">
                      <span className="search-person-name">{person.name}</span>
                      <span className="search-person-handle">@{person.handle}</span>
                    </span>
                  </Link>
                </li>
              )
            })}
          </ul>
        </section>
      )}

      <div className="search-page-filters">
        <FilterBar
          listings={searched}
          filters={filters}
          onChange={setFilters}
          sort={sort}
          onSort={setSort}
          showSoldToggle
        />
      </div>

      {!loading && results.length === 0 ? (
        <div className="search-page-empty" role="status">
          <SearchX size={56} strokeWidth={1.25} className="search-page-empty-icon" aria-hidden="true" />
          <p className="search-page-empty-title">
            {category
              ? `No ${category.label.toLowerCase()} yet`
              : q
                ? `Nothing for '${q}' yet`
                : 'Nothing matches those filters yet'}
          </p>
          <p className="search-page-empty-text">
            We won’t pad this with things you didn’t ask for. Save this search and it waits at the top of Search,
            or try a broader word (“kurta” instead of “blue silk kurta”) and fewer filters.
          </p>
          <div className="search-page-empty-actions">
            {!category && (q.trim() || filters.sizes.length > 0) && (
              <button
                type="button"
                className="btn btn-primary search-page-clear-btn"
                aria-pressed={isSaved}
                onClick={() => setSaved(isSaved ? removeSavedSearch(current) : saveSearch(current))}
              >
                {isSaved ? <BookmarkCheck size={16} aria-hidden="true" /> : <Bookmark size={16} aria-hidden="true" />}
                {isSaved ? 'Saved on this device' : 'Save this search'}
              </button>
            )}
            <button type="button" className="btn btn-outline search-page-clear-btn" onClick={() => navigate('/search')}>
              Clear search
            </button>
            <Link to="/sell" className="btn btn-outline search-page-clear-btn">
              Sell something like it
            </Link>
          </div>
        </div>
      ) : (
        <div className="search-page-grid" aria-busy={loading}>
          {loading
            ? Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)
            : results.map((listing) => <ProductCard key={listing.id} listing={listing} />)}
        </div>
      )}
    </div>
  )
}
