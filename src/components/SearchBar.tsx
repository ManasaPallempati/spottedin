import { useState, type ReactNode } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Search, Camera, Heart, ShoppingBag } from 'lucide-react'
import { useAppState } from '../lib/appState'
import './SearchBar.css'

type SearchBarProps = {
  rightIcons?: ReactNode
  initialQuery?: string
  onSubmit?: (q: string) => void
}

export default function SearchBar({ rightIcons, initialQuery, onSubmit }: SearchBarProps) {
  const [query, setQuery] = useState(initialQuery ?? '')
  const navigate = useNavigate()
  const { bagCount } = useAppState()

  function submit() {
    if (onSubmit) {
      onSubmit(query)
    } else {
      navigate(`/search?q=${encodeURIComponent(query)}`)
    }
  }

  return (
    <div className="search-bar-row">
      <div className="search-bar pill">
        <button type="button" className="search-bar-icon-btn" onClick={submit} aria-label="Search">
          <Search size={18} className="search-bar-icon" />
        </button>
        <input
          type="text"
          placeholder="Search for anything"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') submit()
          }}
        />
        <Camera size={18} className="search-bar-icon" />
      </div>
      <div className="search-bar-actions pill">
        {rightIcons ?? (
          <>
            <Link className="icon-btn" to="/likes" aria-label="Wishlist">
              <Heart size={20} />
            </Link>
            <Link className="icon-btn search-bar-bag" to="/bag" aria-label="Bag">
              <ShoppingBag size={20} />
              {bagCount > 0 && <span className="search-bar-badge">{bagCount}</span>}
            </Link>
          </>
        )}
      </div>
    </div>
  )
}
