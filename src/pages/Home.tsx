import { useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import SearchBar from '../components/SearchBar'
import ProductCard from '../components/ProductCard'
import SkeletonCard from '../components/SkeletonCard'
import type { Listing } from '../data/listings'
import { FEATURED_CATEGORIES, listingMatchesCategory } from '../data/taxonomy'
import { useListings } from '../lib/useListings'
import { useAuth } from '../lib/auth'
import { setPageMeta } from '../lib/seo'
import { trackEvent } from '../lib/analytics'
import './home.css'

const PREFS_KEY = 'spotted_prefs_v1'

type Prefs = { sizes: string[]; brands: string[] }

function readPrefs(): Prefs {
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

function stripUsPrefix(size: string): string {
  return size.replace(/^US\s+/i, '').trim().toLowerCase()
}

function computePicks(listings: Listing[], prefs: Prefs): Listing[] {
  if (prefs.brands.length === 0) return []

  const prefBrands = prefs.brands.map((b) => b.toLowerCase())
  const prefSizes = prefs.sizes.map(stripUsPrefix)

  const matches = listings.filter((listing) => {
    const brand = listing.brand.toLowerCase()
    return prefBrands.some((pb) => brand.includes(pb))
  })

  const sizeMatches = matches.filter((l) => prefSizes.includes(l.size.toLowerCase()))
  const rest = matches.filter((l) => !prefSizes.includes(l.size.toLowerCase()))

  return [...sizeMatches, ...rest].slice(0, 10)
}

export default function Home() {
  const { listings, loading } = useListings()
  const { isAuthed, profile } = useAuth()
  const showShopLink = true

  const prefs = useMemo(() => readPrefs(), [])
  const picks = useMemo(() => computePicks(listings, prefs), [listings, prefs])
  const categoryCounts = useMemo(
    () =>
      Object.fromEntries(
        FEATURED_CATEGORIES.map((category) => [
          category.slug,
          listings.filter((listing) => listingMatchesCategory(listing, category)).length,
        ]),
      ) as Record<string, number>,
    [listings],
  )

  const greetingTitle = isAuthed && profile ? `Hey ${profile.name.split(' ')[0]}!` : 'Fresh finds, zero fees'

  useEffect(() => {
    setPageMeta({
      title: 'Buy & Sell Pre-Owned Indian Clothing | SPOTTED',
      description:
        'Shop and resell sarees, lehengas, kurtas, sherwanis and Indian wedding wear across the United States and India.',
      canonicalPath: '/home',
    })
  }, [])

  return (
    <div className="home">
      <div className="home-search">
        <SearchBar />
      </div>

      <section className="home-hero">
        <p className="home-eyebrow">New season</p>
        <h1 className="home-hero-title">Buy and sell pre-owned Indian clothing</h1>
        <p className="home-hero-copy">
          Find occasion wear worth repeating, or turn outfits in your closet into cash. Browse by style, size,
          condition and shipping location.
        </p>
        <div className="home-hero-ctas">
          <Link
            to="/search"
            className="btn btn-primary home-hero-btn"
            onClick={() => trackEvent('home_cta_click', { cta: 'shop_pre_owned' })}
          >
            Shop pre-owned styles
          </Link>
          {showShopLink ? (
            <Link
              to="/sell"
              className="btn btn-outline home-hero-btn"
              onClick={() => trackEvent('home_cta_click', { cta: 'sell_outfit' })}
            >
              Sell an outfit
            </Link>
          ) : null}
        </div>
      </section>

      <section className="home-categories" aria-labelledby="home-categories-title">
        <div className="home-categories-heading">
          <p className="home-eyebrow">Shop the wardrobe</p>
          <h2 id="home-categories-title">Browse Indian fashion by category</h2>
        </div>
        <nav className="home-category-grid" aria-label="Indian clothing categories">
          {FEATURED_CATEGORIES.map((category) => {
            const count = categoryCounts[category.slug] ?? 0
            return (
              <Link
                key={category.slug}
                to={`/category/${category.slug}`}
                className="home-category-link"
                onClick={() => trackEvent('home_category_click', { category: category.slug })}
              >
                <span className="home-category-label">{category.label}</span>
                <span className="home-category-count">
                  {loading ? 'Loading listings' : `${count} ${count === 1 ? 'listing' : 'listings'}`}
                </span>
              </Link>
            )
          })}
        </nav>
      </section>

      <div className="home-promo">
        <div className="home-promo-polaroid">
          <img
            className="home-promo-photo"
            src="/images/catalog/paithani-purple.webp"
            alt="Purple Paithani-style saree with magenta border and peacock pallu"
          />
          <p className="home-promo-title">Shop the fit, not just the size</p>
          <p className="home-promo-sub">Compare measurements, alterations and every included piece before you buy.</p>
        </div>
      </div>

      <div className="home-greeting">
        <h2 className="home-greeting-title">{greetingTitle}</h2>
        <p className="home-greeting-sub">Tap into a few items to unlock better picks</p>
      </div>

      {picks.length >= 1 && (
        <div className="home-picks">
          <div className="home-picks-header">
            <h2 className="home-picks-title">Picks for you</h2>
            <p className="home-picks-sub">Based on the brands you love</p>
          </div>
          <div className="home-picks-row">
            {picks.map((listing) => (
              <div className="home-picks-item" key={listing.id}>
                <ProductCard listing={listing} />
              </div>
            ))}
          </div>
        </div>
      )}

      <div className={`home-grid${loading ? '' : ' fade-in'}`} aria-busy={loading}>
        {loading
          ? Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)
          : listings.map((listing) => <ProductCard key={listing.id} listing={listing} />)}
      </div>
    </div>
  )
}
