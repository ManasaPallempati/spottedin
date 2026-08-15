import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Heart } from 'lucide-react'
import ProductCard from '../components/ProductCard'
import type { Listing } from '../data/listings'
import { useListings } from '../lib/useListings'
import { useAppState } from '../lib/appState'
import './likes.css'

export default function Likes() {
  const { likedIds } = useAppState()
  const { listings } = useListings()

  const likedListings = useMemo(() => {
    const byId = new Map<string, Listing>()
    for (const listing of listings) byId.set(listing.id, listing)
    return likedIds.map((id) => byId.get(id)).filter((l): l is Listing => !!l)
  }, [likedIds, listings])

  return (
    <div className="likes-page">
      <header className="likes-header">
        <h1 className="likes-title">Likes</h1>
      </header>

      {likedListings.length === 0 ? (
        <div className="likes-empty">
          <div className="likes-empty-icon">
            <Heart size={40} strokeWidth={1.5} />
          </div>
          <h3 className="likes-empty-title">Nothing liked yet</h3>
          <p className="likes-empty-copy">Tap the heart on any item to save it here</p>
          <Link to="/home" className="btn btn-primary likes-empty-btn">
            Explore
          </Link>
        </div>
      ) : (
        <div className="likes-grid">
          {likedListings.map((listing) => (
            <ProductCard key={listing.id} listing={listing} />
          ))}
        </div>
      )}
    </div>
  )
}
