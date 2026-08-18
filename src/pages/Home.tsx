import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import { Link } from 'react-router-dom'
import { UserPlus } from 'lucide-react'
import SearchBar from '../components/SearchBar'
import ProductCard from '../components/ProductCard'
import type { Listing } from '../data/listings'
import { sellerFor } from '../data/sellers'
import { FEATURED_CATEGORIES, listingMatchesCategory } from '../data/taxonomy'
import { useListings } from '../lib/useListings'
import { useAppState } from '../lib/appState'
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

type FeedTab = 'for-you' | 'following'

const FEED_TABS: { id: FeedTab; label: string }[] = [
  { id: 'for-you', label: 'For you' },
  { id: 'following', label: 'Following' },
]

export default function Home() {
  const { listings, loading } = useListings()
  const { isAuthed, profile } = useAuth()
  const { follows, ready } = useAppState()
  const showShopLink = true

  const [feedTab, setFeedTab] = useState<FeedTab>('for-you')
  const tabRefs = useRef<Partial<Record<FeedTab, HTMLButtonElement | null>>>({})

  const prefs = useMemo(() => readPrefs(), [])
  const picks = useMemo(() => computePicks(listings, prefs), [listings, prefs])
  // Same handle resolution as the follow button on Shop.tsx (sellerFor), so
  // followed demo sellers match too, not just listings with a real profile.
  const followingListings = useMemo(
    () => listings.filter((listing) => follows.includes(sellerFor(listing).handle)),
    [listings, follows],
  )

  // Roving tabindex + automatic activation (arrow moves focus AND selects) —
  // the standard pattern for a two-tab tablist.
  function onTabKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    const idx = FEED_TABS.findIndex((t) => t.id === feedTab)
    let next: number | null = null
    if (e.key === 'ArrowRight') next = (idx + 1) % FEED_TABS.length
    else if (e.key === 'ArrowLeft') next = (idx - 1 + FEED_TABS.length) % FEED_TABS.length
    else if (e.key === 'Home') next = 0
    else if (e.key === 'End') next = FEED_TABS.length - 1
    if (next === null) return
    e.preventDefault()
    const tab = FEED_TABS[next]
    setFeedTab(tab.id)
    tabRefs.current[tab.id]?.focus()
  }
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

      <div className="home-feed-tabs" role="tablist" aria-label="Latest listings feed" onKeyDown={onTabKeyDown}>
        {FEED_TABS.map((tab) => (
          <button
            key={tab.id}
            ref={(el) => {
              tabRefs.current[tab.id] = el
            }}
            type="button"
            role="tab"
            id={`home-feed-tab-${tab.id}`}
            aria-controls={`home-feed-panel-${tab.id}`}
            aria-selected={feedTab === tab.id}
            tabIndex={feedTab === tab.id ? 0 : -1}
            className="home-feed-tab"
            onClick={() => {
              setFeedTab(tab.id)
              trackEvent('home_feed_tab_click', { tab: tab.id })
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div
        role="tabpanel"
        id={`home-feed-panel-${feedTab}`}
        aria-labelledby={`home-feed-tab-${feedTab}`}
        className="home-feed-panel"
      >
        {feedTab === 'for-you' ? (
          <div className={`home-grid${loading ? '' : ' fade-in'}`}>
            {loading
              ? Array.from({ length: 8 }).map((_, i) => (
                  <div className="home-skeleton" key={i} />
                ))
              : listings.map((listing) => <ProductCard key={listing.id} listing={listing} />)}
          </div>
        ) : loading || (isAuthed && !ready) ? (
          // Wait for both the listings query and follows hydration — branching
          // on follows before hydrate would flash the "follow sellers" empty
          // state at every signed-in user who already follows people.
          <div className="home-grid">
            {Array.from({ length: 4 }).map((_, i) => (
              <div className="home-skeleton" key={i} />
            ))}
          </div>
        ) : !isAuthed ? (
          <div className="home-feed-empty">
            <div className="home-feed-empty-icon">
              <UserPlus size={40} strokeWidth={1.5} />
            </div>
            <h3 className="home-feed-empty-title">See sellers you follow</h3>
            <p className="home-feed-empty-copy">Sign in to catch the newest listings from sellers you follow.</p>
            <Link to="/login" className="btn btn-primary home-feed-empty-btn">
              Sign in
            </Link>
          </div>
        ) : follows.length === 0 ? (
          <div className="home-feed-empty">
            <div className="home-feed-empty-icon">
              <UserPlus size={40} strokeWidth={1.5} />
            </div>
            <h3 className="home-feed-empty-title">You&rsquo;re not following anyone yet</h3>
            <p className="home-feed-empty-copy">Follow sellers to see their latest here.</p>
            <Link to="/search" className="btn btn-primary home-feed-empty-btn">
              Find sellers
            </Link>
          </div>
        ) : followingListings.length === 0 ? (
          <div className="home-feed-empty">
            <div className="home-feed-empty-icon">
              <UserPlus size={40} strokeWidth={1.5} />
            </div>
            <h3 className="home-feed-empty-title">Nothing new from your sellers</h3>
            <p className="home-feed-empty-copy">
              The sellers you follow haven&rsquo;t listed anything recently. Check back soon.
            </p>
          </div>
        ) : (
          <div className="home-grid fade-in">
            {followingListings.map((listing) => (
              <ProductCard key={listing.id} listing={listing} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
