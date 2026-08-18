import './SkeletonCard.css'

// Placeholder card shown while listings load. Mirrors ProductCard's layout
// (square image, two-line title area, short meta line) so the grid doesn't
// shift when real cards swap in. Purely decorative: hidden from AT.
export default function SkeletonCard() {
  return (
    <div className="skeleton-card" aria-hidden="true">
      <div className="skeleton-card-image skeleton-shimmer" />
      <div className="skeleton-card-info">
        <div className="skeleton-card-bar skeleton-card-bar-title skeleton-shimmer" />
        <div className="skeleton-card-bar skeleton-card-bar-meta skeleton-shimmer" />
      </div>
    </div>
  )
}
