import { useState } from 'react'
import { ImageOff } from 'lucide-react'
import './ListingPhoto.css'

type ListingPhotoProps = {
  src: string | null | undefined
  alt: string
  className?: string
  loading?: 'lazy' | 'eager'
  // Thumbnails are too small for the caption; the icon and aria-label remain.
  compact?: boolean
}

// A listing's own photo, or a plainly neutral "Photo unavailable" tile when it
// has none or the file fails to load. Never substitute stock or placeholder
// photography: a buyer must not mistake an unrelated image for the item.
export default function ListingPhoto({ src, alt, className, loading, compact = false }: ListingPhotoProps) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null)

  if (!src || failedSrc === src) {
    return (
      <div
        className={['listing-photo-missing', compact ? 'listing-photo-missing--compact' : '', className ?? '']
          .filter(Boolean)
          .join(' ')}
        role="img"
        aria-label={`${alt}: photo unavailable`}
      >
        <ImageOff size={compact ? 18 : 28} strokeWidth={1.5} aria-hidden="true" />
        {!compact && <span className="listing-photo-missing-text">Photo unavailable</span>}
      </div>
    )
  }

  return <img className={className} src={src} alt={alt} loading={loading} onError={() => setFailedSrc(src)} />
}
