import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Heart } from 'lucide-react'
import type { Listing } from '../data/listings'
import { useAppState } from '../lib/appState'
import { listingPath } from '../lib/listingUrls'
import ListingPhoto from './ListingPhoto'
import './ProductCard.css'

type ProductCardProps = {
  listing: Listing
}

function formatInr(value: number) {
  return `₹${value.toLocaleString('en-IN')}`
}

export default function ProductCard({ listing }: ProductCardProps) {
  const { id, brand, size, price, originalPrice, likes, img } = listing
  const { toggleLike, isLiked, likeCountFor } = useAppState()
  const liked = isLiked(id)
  const [justLiked, setJustLiked] = useState(false)

  return (
    <Link to={listingPath(id, brand)} className="product-card">
      <div className="product-card-image-wrap">
        <ListingPhoto src={img} alt={brand} loading="lazy" />
        {/* Contract (Round 4): only `status === 'sold'` means sold — undefined is live. */}
        {listing.status === 'sold' && <span className="product-card-sold">Sold</span>}
        {listing.boostedUntil != null && listing.boostedUntil > Date.now() && (
          <span className="product-card-boosted">Boosted</span>
        )}
        <button
          className={`product-card-like${justLiked ? ' heart-burst' : ''}`}
          aria-label="Like"
          onAnimationEnd={() => setJustLiked(false)}
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            if (!liked) setJustLiked(true)
            toggleLike(id)
          }}
        >
          <Heart size={20} fill={liked ? 'var(--accent)' : 'none'} color={liked ? 'var(--accent)' : 'currentColor'} />
          <span>{liked ? likeCountFor(listing) : likes}</span>
        </button>
      </div>
      <div className="product-card-info">
        <p className="product-card-price">
          {formatInr(price)}
          {originalPrice != null && originalPrice > price && (
            <s className="product-card-original" aria-label={`was ${formatInr(originalPrice)}`}>
              {formatInr(originalPrice)}
            </s>
          )}
        </p>
        <p className="product-card-meta">
          <span className="product-card-brand">{brand}</span>
          {size && <span className="product-card-size"> · {size}</span>}
        </p>
      </div>
    </Link>
  )
}
