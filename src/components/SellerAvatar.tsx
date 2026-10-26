import { useState } from 'react'
import { personInitials } from '../lib/people'
import './SellerAvatar.css'

type SellerAvatarProps = {
  handle: string
  name?: string | null
  // The seller's own uploaded picture, already resolved to a URL. Absent for
  // nearly everyone today, which is why the initials fallback is the norm.
  url?: string | null
  className?: string
}

// A seller's own picture, or their initials. Never a stock or random photo: a
// face that isn't the seller's is a false claim about who you're dealing with.
export default function SellerAvatar({ handle, name, url, className }: SellerAvatarProps) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null)
  const label = name?.trim() || handle

  if (url && failedUrl !== url) {
    return <img className={className} src={url} alt={label} onError={() => setFailedUrl(url)} />
  }

  return (
    <span className={['seller-avatar-initials', className ?? ''].filter(Boolean).join(' ')} role="img" aria-label={label}>
      {personInitials(label)}
    </span>
  )
}
