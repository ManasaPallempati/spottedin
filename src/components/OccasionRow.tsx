import { Link } from 'react-router-dom'
import { OCCASIONS, filterByOccasion } from '../data/occasions'
import type { Listing } from '../data/listings'
import { trackEvent } from '../lib/analytics'
import './occasion.css'

type OccasionRowProps = {
  listings: Listing[]
  loading?: boolean
}

// Home-page row of occasion edits. Counts come from the listings Home already
// loaded, so this adds no query.
export default function OccasionRow({ listings, loading = false }: OccasionRowProps) {
  return (
    <section className="occasion-row" aria-labelledby="occasion-row-title">
      <div className="occasion-row-heading">
        <div>
          <p className="home-eyebrow">Occasion edits</p>
          <h2 id="occasion-row-title">Dress for the moment</h2>
        </div>
      </div>
      <nav className="occasion-row-scroll" aria-label="Occasion edits">
        {OCCASIONS.map((occasion) => {
          const count = filterByOccasion(listings, occasion).length
          return (
            <Link
              key={occasion.slug}
              to={`/edit/${occasion.slug}`}
              className="occasion-tile"
              onClick={() => trackEvent('home_occasion_click', { occasion: occasion.slug })}
            >
              <span className="occasion-tile-label">{occasion.label}</span>
              <span className="occasion-tile-sub">
                {loading ? 'Loading' : `${count} ${count === 1 ? 'piece' : 'pieces'}`}
              </span>
            </Link>
          )
        })}
      </nav>
    </section>
  )
}
