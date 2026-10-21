import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import { Link } from 'react-router-dom'
import { UserPlus } from 'lucide-react'
import SearchBar from '../components/SearchBar'
import ProductCard from '../components/ProductCard'
import SkeletonCard from '../components/SkeletonCard'
import type { Listing } from '../data/listings'
import { sellerFor } from '../data/sellers'
import { FEATURED_CATEGORIES, listingMatchesCategory } from '../data/taxonomy'
import { useListings, useListingsByIds } from '../lib/useListings'
import { useAppState } from '../lib/appState'
import { listingPath } from '../lib/listingUrls'
import { readRecentlyViewed } from '../lib/recentlyViewed'
import { useAuth } from '../lib/auth'
import { readStoredPrefs, personalizeFeed, type StoredPrefs as Prefs } from '../lib/forYou'
import { setPageMeta } from '../lib/seo'
import { trackEvent } from '../lib/analytics'
import './home.css'

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

  const prefs = useMemo(() => readStoredPrefs(), [])
  const interest = profile?.interest ?? null
  const { listings: feedListings, personalized } = useMemo(
    () => personalizeFeed(listings, { ...prefs, interest }),
    [listings, prefs, interest],
  )
  const recentIds = useMemo(() => readRecentlyViewed(), [])
  const { listings: recentListings } = useListingsByIds(recentIds)
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

      {recentListings.length >= 1 && (
        <section className="home-recent" aria-labelledby="home-recent-title">
          <h2 id="home-recent-title" className="home-recent-title">
            Recently viewed
          </h2>
          <div className="home-recent-row">
            {recentListings.map((listing) => (
              <Link
                key={listing.id}
                to={listingPath(listing.id, listing.brand)}
                className="home-recent-card"
                onClick={() => trackEvent('home_recent_click', { listing: listing.id })}
              >
                <div className="home-recent-image-wrap">
                  <img src={listing.img} alt={listing.brand} loading="lazy" />
                  {listing.status === 'sold' && <span className="home-recent-sold">Sold</span>}
                </div>
                <span className="home-recent-price">₹{listing.price.toLocaleString('en-IN')}</span>
              </Link>
            ))}
          </div>
        </section>
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
          personalized && !loading ? (
            <section aria-labelledby="home-foryou-title">
              <div className="home-foryou-header">
                <h2 id="home-foryou-title" className="home-foryou-title">For You</h2>
                <p className="home-foryou-sub">Sorted by your sizes, brands and style — everything's still here.</p>
              </div>
              <div className="home-grid fade-in">
                {feedListings.map((listing) => (
                  <ProductCard key={listing.id} listing={listing} />
                ))}
              </div>
            </section>
          ) : (
            <div className={`home-grid${loading ? '' : ' fade-in'}`} aria-busy={loading}>
              {loading
                ? Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)
                : feedListings.map((listing) => <ProductCard key={listing.id} listing={listing} />)}
            </div>
          )
        ) : loading || !ready ? (
          // Wait for the listings query AND auth restore + follows hydration
          // (ready = !authLoading && !hydrating) — branching earlier would
          // flash "Sign in" during session restore, or the "follow sellers"
          // empty state at signed-in users who already follow people.
          <div className="home-grid" aria-busy="true">
            {Array.from({ length: 4 }).map((_, i) => (
              <SkeletonCard key={i} />
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
