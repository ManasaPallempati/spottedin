import { useEffect, useMemo } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import ProductCard from '../components/ProductCard'
import SkeletonCard from '../components/SkeletonCard'
import { PrelovedSeal } from '../components/BoutiqueTag'
import { OCCASIONS, filterByOccasion, occasionBySlug } from '../data/occasions'
import { setPageMeta } from '../lib/seo'
import { useListings } from '../lib/useListings'
import '../components/occasion.css'
import './category.css'

// /edit/:slug — an occasion edit. Reuses the category page's layout classes and
// the shared ProductCard, so it looks like the rest of browse.
export default function OccasionEdit() {
  const { slug = '' } = useParams<{ slug: string }>()
  const occasion = occasionBySlug(slug)
  const { listings, loading } = useListings()

  const matches = useMemo(() => (occasion ? filterByOccasion(listings, occasion) : []), [occasion, listings])

  useEffect(() => {
    setPageMeta({
      title: occasion ? `${occasion.label} edit - Pre-Owned Indian Clothing | SPOTTED` : 'Edit Not Found | SPOTTED',
      description: occasion ? occasion.blurb : 'Browse occasion edits of pre-owned Indian clothing on SPOTTED.',
      canonicalPath: `/edit/${occasion?.slug ?? 'not-found'}`,
      noIndex: true,
    })
  }, [occasion])

  if (!occasion) {
    return (
      <main className="category-page">
        <nav className="category-breadcrumbs" aria-label="Breadcrumb">
          <Link to="/home">Home</Link>
          <ChevronRight size={14} aria-hidden="true" />
          <span aria-current="page">Edit not found</span>
        </nav>
        <section className="category-state">
          <p className="category-kicker">That edit is not in our closet</p>
          <h1>Pick an occasion that exists</h1>
          <p>The address may be outdated or mistyped.</p>
          <Link to="/home" className="btn btn-primary category-state-action">
            Back to home
          </Link>
        </section>
      </main>
    )
  }

  return (
    <main className="category-page">
      <nav className="category-breadcrumbs" aria-label="Breadcrumb">
        <Link to="/home">Home</Link>
        <ChevronRight size={14} aria-hidden="true" />
        <span>Occasion edits</span>
        <ChevronRight size={14} aria-hidden="true" />
        <span aria-current="page">{occasion.label}</span>
      </nav>

      <header className="category-header">
        <PrelovedSeal size={46} className="occasion-page-seal" />
        <p className="category-kicker">Occasion edit</p>
        <h1>{occasion.label}</h1>
        <p className="category-description">{occasion.blurb}</p>
        <p className="category-result-count" role="status" aria-live="polite">
          {loading
            ? 'Loading available listings'
            : `${matches.length} ${matches.length === 1 ? 'listing' : 'listings'} available`}
        </p>
      </header>

      <nav className="occasion-switcher" aria-label="Other occasion edits">
        {OCCASIONS.map((item) => (
          <Link key={item.slug} to={`/edit/${item.slug}`} aria-current={item.slug === occasion.slug ? 'page' : undefined}>
            {item.label}
          </Link>
        ))}
      </nav>

      {loading ? (
        <div className="category-grid" aria-label="Loading listings" aria-busy="true">
          {Array.from({ length: 6 }).map((_, index) => (
            <SkeletonCard key={index} />
          ))}
        </div>
      ) : matches.length === 0 ? (
        <section className="category-state">
          <p className="category-kicker">Nothing listed right now</p>
          <h2>Be first to list for {occasion.label.toLowerCase()}</h2>
          <p>New pieces arrive as sellers list them. Browse everything available or create a listing of your own.</p>
          <div className="category-state-actions">
            <Link to="/search" className="btn btn-primary category-state-action">
              Browse all listings
            </Link>
            <Link to="/sell" className="btn btn-outline category-state-action">
              Sell an outfit
            </Link>
          </div>
        </section>
      ) : (
        <div className="category-grid">
          {matches.map((listing) => (
            <ProductCard key={listing.id} listing={listing} />
          ))}
        </div>
      )}
    </main>
  )
}
