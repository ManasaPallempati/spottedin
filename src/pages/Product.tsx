import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { ChevronRight, Heart, ShieldCheck, Star } from 'lucide-react'
import { useListing, useListings } from '../lib/useListings'
import { useAppState } from '../lib/appState'
import { useAuth } from '../lib/auth'
import type { BoostResult } from '../lib/payments'
import { conditionForListing, describeListing, sellerFor } from '../data/sellers'
import ProductCard from '../components/ProductCard'
import BottomSheet from '../components/BottomSheet'
import BoostSheet from '../components/BoostSheet'
import Chip from '../components/Chip'
import { INDIAN_CATEGORIES, normalizeCategory } from '../data/taxonomy'
import { listingPath } from '../lib/listingUrls'
import { setPageMeta } from '../lib/seo'
import './product.css'

function formatInr(value: number) {
  return `₹${value.toLocaleString('en-IN')}`
}

function StarRow({ rating }: { rating: number }) {
  const rounded = Math.round(rating)
  return (
    <span className="product-star-row">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          size={14}
          fill={i < rounded ? 'var(--text)' : 'none'}
          color={i < rounded ? 'var(--text)' : 'var(--text-dim)'}
        />
      ))}
    </span>
  )
}

export default function Product() {
  const { id = '' } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const { listing, loading } = useListing(id)
  const { toggleLike, isLiked, likeCountFor, addToBag, makeOffer } = useAppState()
  const { profile } = useAuth()
  const { listings: allListings } = useListings()

  const [boostOpen, setBoostOpen] = useState(false)
  const [justBoostedUntil, setJustBoostedUntil] = useState<number | null>(null)
  const [offerOpen, setOfferOpen] = useState(false)
  const [offerSent, setOfferSent] = useState(false)
  const [offerAmount, setOfferAmount] = useState(0)
  const [toastVisible, setToastVisible] = useState(false)
  const toastTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (loading) return

    if (!listing) {
      setPageMeta({
        title: 'Listing Unavailable | SPOTTED',
        description: 'This listing is no longer available. Browse current pre-owned Indian clothing on SPOTTED.',
        canonicalPath: `/listing/${encodeURIComponent(id)}`,
        noIndex: true,
      })
      return
    }

    const canonicalPath = listingPath(listing.id, listing.brand)
    const listingTitle = `${listing.brand} - Size ${listing.size}`
    const description =
      listing.status === 'sold'
        ? `${listingTitle} has sold on SPOTTED. Browse similar pre-owned Indian clothing.`
        : `Shop ${listingTitle} for ${formatInr(listing.price)} on SPOTTED, a marketplace for pre-owned Indian clothing.`

    setPageMeta({
      title: `${listingTitle} | SPOTTED`,
      description,
      canonicalPath,
      ogImage: listing.img,
      ogType: 'product',
    })

    if (location.pathname !== canonicalPath) {
      navigate(canonicalPath, { replace: true })
    }
  }, [id, listing, loading, location.pathname, navigate])

  useEffect(() => {
    return () => {
      if (toastTimeout.current) clearTimeout(toastTimeout.current)
    }
  }, [])

  if (loading) {
    return <div className="product-loading" />
  }

  if (!listing) {
    return (
      <main className="product-notfound">
        <p className="product-notfound-kicker">Listing unavailable</p>
        <h1>This item cannot be found</h1>
        <p className="product-notfound-text">It may have been removed, or the address may be incorrect.</p>
        <Link to="/home" className="btn btn-primary">
          Browse current listings
        </Link>
      </main>
    )
  }

  const liked = isLiked(listing.id)
  const count = liked ? likeCountFor(listing) : listing.likes
  const seller = sellerFor(listing)
  const condition = conditionForListing(listing.id)
  const { text: descText, hashtags } = describeListing(listing)
  const title = `${listing.brand} — size ${listing.size}`
  const categorySlug = normalizeCategory(listing.category ?? '')
  const category = INDIAN_CATEGORIES.find((item) => item.slug === categorySlug)

  const offerPreset10 = Math.round(listing.price * 0.9)
  const offerPreset20 = Math.round(listing.price * 0.8)

  // Mock listings have no sellerId, so they can never look owned (or boosted).
  const isOwner = !!listing.sellerId && profile?.id === listing.sellerId
  const boostedUntil =
    justBoostedUntil ?? (listing.boostedUntil && listing.boostedUntil > Date.now() ? listing.boostedUntil : null)

  const others = allListings.filter((l) => l.id !== listing.id)
  const moreFromSeller = others.filter((l) => sellerFor(l).handle === seller.handle).slice(0, 8)
  const sameBrand = others.filter((l) => l.brand === listing.brand)
  const restBrand = others.filter((l) => l.brand !== listing.brand)
  const recommended = [...sameBrand, ...restBrand].slice(0, 8)

  const handleBuyNow = () => {
    addToBag(listing.id)
    navigate('/bag?checkout=1')
  }

  function openOfferSheet() {
    setOfferAmount(offerPreset10)
    setOfferSent(false)
    setOfferOpen(true)
  }

  function closeOfferSheet() {
    setOfferOpen(false)
    setOfferSent(false)
  }

  const handleSendOffer = () => {
    makeOffer(listing, offerAmount)
    setOfferSent(true)
  }

  const handleAddToBag = () => {
    addToBag(listing.id)
    setToastVisible(true)
    if (toastTimeout.current) clearTimeout(toastTimeout.current)
    toastTimeout.current = setTimeout(() => setToastVisible(false), 1800)
  }

  return (
    <div className="product-page">
      <nav className="product-breadcrumb" aria-label="Breadcrumb">
        <Link to="/home">Home</Link>
        <ChevronRight size={14} aria-hidden="true" />
        {category ? (
          <Link to={`/category/${category.slug}`}>{category.label}</Link>
        ) : (
          <Link to="/search">All listings</Link>
        )}
        <ChevronRight size={14} aria-hidden="true" />
        <span className="product-breadcrumb-current">{title}</span>
      </nav>

      <div className="product-image-wrap">
        <img src={listing.img} alt={listing.brand} />
      </div>

      <div className="product-like-row">
        <button type="button" className="product-like-btn" aria-label="Like" onClick={() => toggleLike(listing.id)}>
          <Heart size={22} fill={liked ? 'var(--accent)' : 'none'} color={liked ? 'var(--accent)' : 'currentColor'} />
        </button>
        <span className="product-like-count">{count} likes</span>
      </div>

      <h1 className="product-title">{title}</h1>

      <div className="product-price-row">
        <span className="product-price">{formatInr(listing.price)}</span>
        {listing.originalPrice && <span className="product-price-original">{formatInr(listing.originalPrice)}</span>}
        {listing.status === 'sold' && <span className="product-sold-badge">Sold</span>}
        {listing.status !== 'sold' && boostedUntil && <span className="product-boosted-badge">Boosted</span>}
      </div>

      {listing.status === 'sold' ? (
        <div className="product-sold-row">
          <span className="product-sold-indicator">This item has sold and cannot be purchased.</span>
          <Link to={category ? `/category/${category.slug}` : '/search'} className="product-sold-more">
            Browse similar listings
          </Link>
        </div>
      ) : isOwner ? (
        <div className="product-ctas">
          {boostedUntil ? (
            <p className="product-boost-note">
              Boosted until {new Date(boostedUntil).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} —
              this listing appears at the top of the Home feed.
            </p>
          ) : (
            <button type="button" className="btn btn-primary" onClick={() => setBoostOpen(true)}>
              Boost listing
            </button>
          )}
        </div>
      ) : (
        <div className="product-ctas">
          <button type="button" className="btn btn-primary" onClick={handleBuyNow}>
            Buy now
          </button>
          <button type="button" className="btn btn-outline" onClick={openOfferSheet}>
            Make offer
          </button>
          <button type="button" className="btn btn-outline" onClick={handleAddToBag}>
            Add to bag
          </button>
        </div>
      )}

      {toastVisible && <div className="toast">Added to bag ✓</div>}

      <div className="product-protection">
        <ShieldCheck size={20} />
        <p>
          <strong>Spotted Protection</strong> — get a full refund if your item never arrives
        </p>
      </div>

      <div className="product-description">
        <p>{descText}</p>
        <div className="product-hashtags">
          {hashtags.map((tag) => (
            <Link key={tag} to={`/search?q=%23${tag}`} className="product-hashtag">
              #{tag}
            </Link>
          ))}
        </div>
        <p className="product-condition">Condition: {condition}</p>
      </div>

      <div className="product-seller-card">
        <div className="product-seller-top">
          <img src={seller.avatar} alt={seller.handle} className="product-seller-avatar" />
          <div>
            <p className="product-seller-handle">@{seller.handle}</p>
            <div className="product-seller-rating">
              <StarRow rating={seller.rating} />
              <span>{seller.reviewCount} reviews</span>
            </div>
            <p className="product-seller-active">Active this week</p>
          </div>
        </div>
        <Link to={`/shop/${seller.handle}`} className="product-seller-visit">
          <span>Visit shop</span>
          <ChevronRight size={18} />
        </Link>
        <Link to={`/inbox/t/${seller.handle}?listing=${listing.id}`} className="product-ask-link">
          Ask a question
        </Link>
      </div>

      {seller.reviews.length > 0 && (
        <div className="product-reviews">
          <h2>Reviews for @{seller.handle}</h2>
          {seller.reviews.map((r, i) => (
            <div className="product-review" key={`${r.reviewer}-${i}`}>
              <div className="product-review-head">
                <span className="product-review-reviewer">@{r.reviewer}</span>
                <StarRow rating={r.stars} />
              </div>
              <p className="product-review-ago">{r.ago}</p>
              <p className="product-review-text">{r.text}</p>
            </div>
          ))}
        </div>
      )}

      {moreFromSeller.length > 0 && (
        <div className="product-section">
          <h2>More from this seller</h2>
          <div className="product-hscroll">
            {moreFromSeller.map((l) => (
              <div className="product-hscroll-item" key={l.id}>
                <ProductCard listing={l} />
              </div>
            ))}
          </div>
        </div>
      )}

      {recommended.length > 0 && (
        <div className="product-section">
          <h2>You might also like</h2>
          <div className="product-grid">
            {recommended.map((l) => (
              <ProductCard key={l.id} listing={l} />
            ))}
          </div>
        </div>
      )}

      {isOwner && (
        <BoostSheet
          listingId={listing.id}
          open={boostOpen}
          onClose={() => setBoostOpen(false)}
          onBoosted={(boost: BoostResult) => setJustBoostedUntil(boost.expiresAt)}
        />
      )}

      <BottomSheet open={offerOpen} onClose={closeOfferSheet} title={offerSent ? undefined : 'Make an offer'}>
        {!offerSent ? (
          <div className="product-offer-body">
            <p className="product-offer-price">Item price: {formatInr(listing.price)}</p>
            <div className="product-offer-presets">
              <Chip
                label={`-10% (${formatInr(offerPreset10)})`}
                selected={offerAmount === offerPreset10}
                onClick={() => setOfferAmount(offerPreset10)}
              />
              <Chip
                label={`-20% (${formatInr(offerPreset20)})`}
                selected={offerAmount === offerPreset20}
                onClick={() => setOfferAmount(offerPreset20)}
              />
            </div>
            <label className="product-offer-input-label">
              Your offer (₹)
              <input
                type="number"
                className="product-offer-input"
                value={offerAmount}
                min={1}
                onChange={(e) => setOfferAmount(e.target.value === '' ? 0 : Number(e.target.value))}
              />
            </label>
            <button
              type="button"
              className="btn btn-primary product-offer-send"
              disabled={!offerAmount || offerAmount <= 0}
              onClick={handleSendOffer}
            >
              Send offer
            </button>
          </div>
        ) : (
          <div className="product-offer-confirm">
            <p>Offer sent to @{seller.handle}</p>
            <button type="button" className="btn btn-primary" onClick={closeOfferSheet}>
              OK
            </button>
          </div>
        )}
      </BottomSheet>
    </div>
  )
}
