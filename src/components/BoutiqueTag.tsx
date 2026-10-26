import './BoutiqueTag.css'

type BoutiqueTagProps = {
  children: React.ReactNode
  /** `solid` for a filled label (e.g. on top of a photo), `outline` for inline use. */
  tone?: 'outline' | 'solid'
  className?: string
}

/** A small boutique-packaging style label: narrow border, tracked uppercase text. */
export function BoutiqueTag({ children, tone = 'outline', className }: BoutiqueTagProps) {
  return <span className={`boutique-tag boutique-tag--${tone}${className ? ` ${className}` : ''}`}>{children}</span>
}

type PrelovedSealProps = {
  /** Diameter in px. */
  size?: number
  label?: string
  className?: string
}

/**
 * The PRE·LOVED seal: a small rotated, stamped mark with a dashed ring, used as a quiet
 * brand accent instead of a big generic marketplace icon.
 */
export function PrelovedSeal({ size = 44, label = 'Pre·Loved', className }: PrelovedSealProps) {
  return (
    <span
      className={`preloved-seal${className ? ` ${className}` : ''}`}
      style={{ width: size, height: size, fontSize: Math.max(7, Math.round(size / 6)) }}
      role="img"
      aria-label={label.replace('·', '-')}
    >
      <span aria-hidden="true" className="preloved-seal-text">
        {label.split('·').map((part, i, parts) => (
          <span key={part}>
            {part}
            {i < parts.length - 1 ? '·' : ''}
          </span>
        ))}
      </span>
    </span>
  )
}
