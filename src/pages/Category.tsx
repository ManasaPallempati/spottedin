import { useEffect, useMemo } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import ProductCard from '../components/ProductCard'
import { DEPARTMENTS, categoryBySlug, listingMatchesCategory, normalizeCategory } from '../data/taxonomy'
import { setPageMeta } from '../lib/seo'
import { useListings } from '../lib/useListings'
import './category.css'

export default function Category() {
  const { slug: routeSlug } = useParams<{ slug: string }>()
  const slug = normalizeCategory(routeSlug ?? '')
  const category = categoryBySlug(slug)
  const department = category ? DEPARTMENTS.find((item) => item.slug === category.department) : undefined
  const { listings, loading } = useListings()

  const categoryListings = useMemo(() => {
    if (!category) return []
    return listings.filter((listing) => listingMatchesCategory(listing, category))
  }, [category, listings])

  useEffect(() => {
    if (!category) {
      setPageMeta({
        title: 'Category Not Found | SPOTTED',
        description: 'Browse pre-owned Indian clothing categories on SPOTTED.',
        canonicalPath: `/category/${slug || 'not-found'}`,
        noIndex: true,
      })
      return
    }

    setPageMeta({
      title: `${category.label} - Pre-Owned Indian Clothing | SPOTTED`,
      description: `${category.description} Shop pre-owned styles and list outfits for resale on SPOTTED.`,
      canonicalPath: `/category/${category.slug}`,
    })
  }, [category, slug])

  if (!category) {
    return (
      <main className="category-page">
        <nav className="category-breadcrumbs" aria-label="Breadcrumb">
          <Link to="/home">Home</Link>
          <ChevronRight size={14} aria-hidden="true" />
          <span aria-current="page">Category not found</span>
        </nav>
        <section className="category-state">
          <p className="category-kicker">That category is not in our closet</p>
          <h1>Browse a category that exists</h1>
          <p>The address may be outdated or mistyped. Start from the current Indian fashion categories.</p>
          <Link to="/home" className="btn btn-primary category-state-action">
            Browse categories
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
        {department && <span>{department.label}</span>}
        {department && <ChevronRight size={14} aria-hidden="true" />}
        <span aria-current="page">{category.label}</span>
      </nav>

      <header className="category-header">
        <p className="category-kicker">Pre-owned Indian fashion</p>
        <h1>{category.label}</h1>
        <p className="category-description">{category.description}</p>
        <p className="category-result-count" role="status" aria-live="polite">
          {loading
            ? 'Loading available listings'
            : `${categoryListings.length} ${categoryListings.length === 1 ? 'listing' : 'listings'} available`}
        </p>
      </header>

      {loading ? (
        <div className="category-grid" aria-label="Loading listings">
          {Array.from({ length: 6 }).map((_, index) => (
            <div className="category-skeleton" key={index} />
          ))}
        </div>
      ) : categoryListings.length === 0 ? (
        <section className="category-state">
          <p className="category-kicker">Nothing listed right now</p>
          <h2>Be first to add {category.label.toLowerCase()}</h2>
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
          {categoryListings.map((listing) => (
            <ProductCard key={listing.id} listing={listing} />
          ))}
        </div>
      )}
    </main>
  )
}
