import { useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import SearchBar from '../components/SearchBar'
import { DEPARTMENTS, categoriesForDepartment } from '../data/taxonomy'
import { useListings } from '../lib/useListings'
import './discover.css'

const heroSlides = [
  {
    title: 'Wedding Guest Ready',
    subtitle: 'Lehengas, shararas and sarees worth wearing again',
    img: '/images/catalog/banarasi-lehenga-navy.webp',
    to: '/category/lehengas',
  },
  {
    title: 'Heritage Sarees',
    subtitle: 'Shop regional weaves with clearer seller disclosures',
    img: '/images/catalog/kanjeevaram-ruby.webp',
    to: '/category/sarees',
  },
  {
    title: "Men's Occasionwear",
    subtitle: 'Measured sherwanis and kurta sets already in the U.S.',
    img: '/images/catalog/sherwani-forest.webp',
    to: '/category/sherwanis',
  },
]

export default function Discover() {
  const [activeSlide, setActiveSlide] = useState(0)
  const trackRef = useRef<HTMLDivElement>(null)
  const { listings } = useListings()
  const outfitCollages = useMemo(
    () => [listings.slice(0, 4), listings.slice(2, 6), listings.slice(4, 8)].filter((group) => group.length > 0),
    [listings],
  )

  function handleScroll() {
    const el = trackRef.current
    if (!el) return
    const index = Math.round(el.scrollLeft / el.clientWidth)
    setActiveSlide(index)
  }

  return (
    <div className="discover-page">
      <div className="discover-header">
        <SearchBar />
      </div>

      <div className="hero-carousel" ref={trackRef} onScroll={handleScroll}>
        {heroSlides.map((slide) => (
          <Link className="hero-slide" key={slide.title} to={slide.to}>
            <img src={slide.img} alt={slide.title} />
            <div className="hero-slide-gradient" />
            <div className="hero-slide-overlay">
              <h2 className="hero-slide-title">{slide.title}</h2>
              <p className="hero-slide-subtitle">{slide.subtitle}</p>
              <div className="hero-dots" aria-hidden="true">
                {heroSlides.map((_, i) => (
                  <span
                    key={i}
                    className={'hero-dot' + (i === activeSlide ? ' active' : '')}
                  />
                ))}
              </div>
            </div>
          </Link>
        ))}
      </div>

      <div className="discover-content">
        <div className="outfit-card">
          <div className="outfit-card-header">
            <h2>Discover your next look</h2>
            <span className="outfit-pill-new">New</span>
          </div>
          <p className="outfit-card-body">
            Explore current listings together, then open any piece for its seller, size and condition details.
          </p>
          <div className="outfit-collages">
            {outfitCollages.map((group, i) => (
              <div className="outfit-collage" key={i}>
                {group.map((item) => (
                  <img key={item.id} src={item.img} alt={item.brand} />
                ))}
              </div>
            ))}
          </div>
          <Link to="/search" className="btn btn-outline outfit-browse-btn">
            Browse outfits
          </Link>
        </div>

        <h2 className="category-heading">Shop by category</h2>
        <div className="category-groups">
          {DEPARTMENTS.map((department) => (
            <section className="category-group" key={department.slug} aria-labelledby={`department-${department.slug}`}>
              <div className="category-group-heading">
                <h3 id={`department-${department.slug}`}>{department.label}</h3>
                <p>{department.description}</p>
              </div>
              <div className="category-list">
                {categoriesForDepartment(department.slug).map((category) => (
                  <Link className="category-row" key={category.slug} to={`/category/${category.slug}`}>
                    <span>{category.label}</span>
                    <ChevronRight size={20} aria-hidden="true" />
                  </Link>
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  )
}
