import { Star } from 'lucide-react'
import './StarRating.css'

type Props = {
  rating: number
  size?: number
  // When set, the stars become buttons that pick a rating from 1 to 5.
  onChange?: (rating: number) => void
}

export default function StarRating({ rating, size = 14, onChange }: Props) {
  const filled = Math.round(rating)

  if (!onChange) {
    return (
      <span className="star-rating" role="img" aria-label={`${rating} out of 5 stars`}>
        {[1, 2, 3, 4, 5].map((i) => (
          <Star key={i} size={size} fill={i <= filled ? 'var(--text)' : 'none'} color="var(--text)" aria-hidden />
        ))}
      </span>
    )
  }

  return (
    <span className="star-rating star-rating-input" role="radiogroup" aria-label="Rating">
      {[1, 2, 3, 4, 5].map((i) => (
        <button
          key={i}
          type="button"
          role="radio"
          aria-checked={i === filled}
          aria-label={`${i} star${i === 1 ? '' : 's'}`}
          onClick={() => onChange(i)}
        >
          <Star size={size} fill={i <= filled ? 'var(--text)' : 'none'} color="var(--text)" aria-hidden />
        </button>
      ))}
    </span>
  )
}
