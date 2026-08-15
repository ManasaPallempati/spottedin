import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, IndianRupee, Truck, ShieldCheck, ShoppingBag, Tag, Recycle } from 'lucide-react'
import { FEATURED_CATEGORIES } from '../data/taxonomy'
import { setPageMeta, setStructuredData } from '../lib/seo'
import './landing.css'

const HERO_TILES = ['Sarees', 'Lehengas', 'Suits', 'Sherwanis', 'Kidswear', 'Jewelry']

export default function Landing() {
  useEffect(() => {
    setPageMeta({
      title: 'Spotted — Buy & Sell Pre-Owned Indian Fashion',
      description:
        'Spotted is the resale marketplace for Indian fashion. Buy and sell pre-owned sarees, lehengas, kurtas, sherwanis and wedding wear across India and the United States — with zero selling fees.',
      canonicalPath: '/about',
    })
    setStructuredData({
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: 'Spotted',
      url: 'https://spottedin.co/',
      description: 'Resale marketplace for pre-owned Indian fashion.',
    })
  }, [])

  return (
    <div className="landing">
      <a className="landing-skip-link" href="#landing-main">
        Skip to content
      </a>

      <header className="landing-header">
        <Link to="/" className="landing-wordmark" aria-label="Spotted home">
          Spotted
        </Link>
        <nav className="landing-header-nav" aria-label="Primary">
          <Link to="/home" className="landing-nav-link landing-nav-browse">
            Browse
          </Link>
          <Link to="/login" className="landing-nav-link">
            Log in
          </Link>
          <Link to="/login?next=%2Fhome" className="btn btn-primary landing-nav-cta">
            Get started
          </Link>
        </nav>
      </header>

      <main id="landing-main" className="landing-main">
        <section className="landing-hero" aria-labelledby="landing-hero-title">
          <div className="landing-hero-content">
            <p className="landing-eyebrow">Pre-loved Indian fashion</p>
            <h1 id="landing-hero-title" className="landing-hero-title">
              The resale home for Indian fashion
            </h1>
            <p className="landing-hero-copy">
              Buy and sell pre-owned sarees, lehengas, kurtas, sherwanis and wedding wear. Give occasion
              pieces a second life — and keep your cash with zero selling fees.
            </p>
            <div className="landing-hero-ctas">
              <Link to="/home" className="btn btn-primary landing-cta">
                Start shopping
                <ArrowRight size={18} aria-hidden="true" />
              </Link>
              <Link to="/sell" className="btn btn-outline landing-cta">
                Sell an outfit
              </Link>
            </div>
            <ul className="landing-hero-points">
              <li>
                <IndianRupee size={18} aria-hidden="true" />
                Zero selling fees
              </li>
              <li>
                <Truck size={18} aria-hidden="true" />
                Made for India &amp; the US
              </li>
              <li>
                <ShieldCheck size={18} aria-hidden="true" />
                Clear prices and offers
              </li>
            </ul>
          </div>

          <div className="landing-hero-visual" aria-hidden="true">
            {HERO_TILES.map((tile, i) => (
              <span className={`landing-hero-tile landing-hero-tile-${i + 1}`} key={tile}>
                {tile}
              </span>
            ))}
          </div>
        </section>

        <section className="landing-section landing-categories" aria-labelledby="landing-cat-title">
          <div className="landing-section-head">
            <p className="landing-eyebrow">Shop the wardrobe</p>
            <h2 id="landing-cat-title">Every occasion, second-hand</h2>
          </div>
          <nav className="landing-cat-grid" aria-label="Shop by category">
            {FEATURED_CATEGORIES.map((category) => (
              <Link key={category.slug} to={`/category/${category.slug}`} className="landing-cat-card">
                <span className="landing-cat-label">{category.label}</span>
                <span className="landing-cat-desc">{category.description}</span>
                <ArrowRight size={18} aria-hidden="true" className="landing-cat-arrow" />
              </Link>
            ))}
          </nav>
        </section>

        <section className="landing-section landing-how" aria-labelledby="landing-how-title">
          <div className="landing-section-head">
            <p className="landing-eyebrow">How Spotted works</p>
            <h2 id="landing-how-title">Buy, sell, repeat</h2>
          </div>
          <div className="landing-steps">
            <article className="landing-step">
              <span className="landing-step-icon">
                <ShoppingBag size={24} aria-hidden="true" />
              </span>
              <h3 className="landing-step-title">Discover the find</h3>
              <p className="landing-step-copy">
                Browse pre-loved ethnic pieces by style, size, condition and where they ship from.
              </p>
            </article>
            <article className="landing-step">
              <span className="landing-step-icon">
                <Tag size={24} aria-hidden="true" />
              </span>
              <h3 className="landing-step-title">List in minutes</h3>
              <p className="landing-step-copy">
                Snap your outfit, set a price and post. No listing fees, and you keep every rupee of the sale.
              </p>
            </article>
            <article className="landing-step">
              <span className="landing-step-icon">
                <Recycle size={24} aria-hidden="true" />
              </span>
              <h3 className="landing-step-title">Give it a second life</h3>
              <p className="landing-step-copy">
                Every resale keeps a beautiful garment in rotation and out of the landfill. Fashion that comes back around.
              </p>
            </article>
          </div>
        </section>

        <section className="landing-section landing-join" aria-labelledby="landing-join-title">
          <div className="landing-join-card">
            <h2 id="landing-join-title" className="landing-join-title">
              Join the Spotted community
            </h2>
            <p className="landing-join-copy">
              A place for buyers and sellers to bring Indian wardrobes back into rotation. Create an account to
              save finds, follow sellers and start selling.
            </p>
            <div className="landing-join-actions">
              <Link to="/login?next=%2Fhome" className="btn btn-primary landing-cta">
                Create your account
              </Link>
              <Link to="/home" className="btn btn-outline landing-cta">
                Browse the feed
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="landing-footer">
        <div className="landing-footer-inner">
          <span className="landing-wordmark">Spotted</span>
          <nav className="landing-footer-nav" aria-label="Footer">
            <Link to="/home">Browse</Link>
            <Link to="/sell">Sell</Link>
            <Link to="/login">Log in</Link>
          </nav>
          <p className="landing-footer-copy">Pre-loved Indian fashion, resold with care.</p>
        </div>
      </footer>
    </div>
  )
}
