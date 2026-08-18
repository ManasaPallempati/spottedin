import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Heart } from 'lucide-react'
import type { Listing } from '../data/listings'
import { useAppState } from '../lib/appState'
import { listingPath } from '../lib/listingUrls'
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
        <img src={img} alt={brand} loading="lazy" />
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
        <p className="product-card-brand">{brand}</p>
        <p className="product-card-size">{size}</p>
        <p className="product-card-price">
          {formatInr(price)}
          {originalPrice && <span className="product-card-original">{formatInr(originalPrice)}</span>}
        </p>
      </div>
    </Link>
  )
}
