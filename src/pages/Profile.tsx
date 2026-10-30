import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Plus, Menu, Star, BarChart2, SlidersHorizontal } from 'lucide-react'
import type { Listing } from '../data/listings'
import { useListings, useMyListings } from '../lib/useListings'
import { useAppState, type Order } from '../lib/appState'
import { useAuth } from '../lib/auth'
import { supabase } from '../lib/supabase'
import { applyFilters, emptyFilters, type Sort } from '../lib/filters'
import ProductCard from '../components/ProductCard'
import BottomSheet from '../components/BottomSheet'
import ListingPhoto from '../components/ListingPhoto'
import './profile.css'

const TABS = ['Shop', 'Sold', 'Purchases', 'Likes', 'Saves'] as const
type Tab = (typeof TABS)[number]

const SORT_OPTIONS: { value: Sort; label: string }[] = [
  { value: 'newest', label: 'Newest' },
  { value: 'priceAsc', label: 'Price: low to high' },
  { value: 'priceDesc', label: 'Price: high to low' },
  { value: 'mostLiked', label: 'Most liked' },
]

function formatInr(value: number) {
  return `₹${value.toLocaleString('en-IN')}`
}

function formatOrderDate(placedAt: number) {
  return new Date(placedAt).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

const STATUS_LABEL: Record<Order['status'], string> = {
  paid: 'Purchased',
  shipped: 'Shipped',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
}

function initialsFor(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean)
  if (words.length === 0) return ''
  if (words.length === 1) return words[0].slice(0, 1).toUpperCase()
  return (words[0].slice(0, 1) + words[1].slice(0, 1)).toUpperCase()
}

export default function Profile() {
  const { isAuthed, profile, profileError, loading, signOut, hasPassword } = useAuth()
  const navigate = useNavigate()

  const [activeTab, setActiveTab] = useState<Tab>('Shop')
  const [sortOpen, setSortOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [sort, setSort] = useState<Sort>('newest')
  const [followerCount, setFollowerCount] = useState(0)

  const { follows, orders, sales, likedIds, savedIds } = useAppState()
  const { listings: liveListings } = useListings()
  const { listings: myLiveListings } = useMyListings('live')
  const { listings: mySoldListings } = useMyListings('sold')

  useEffect(() => {
    if (!profile) {
      setFollowerCount(0)
      return
    }
    let cancelled = false
    supabase
      .from('follows')
      .select('*', { count: 'exact', head: true })
      .eq('followee_handle', profile.handle)
      .then(({ count, error }) => {
        if (cancelled) return
        if (error) {
          console.warn(error)
          return
        }
        setFollowerCount(count ?? 0)
      })
    return () => {
      cancelled = true
    }
  }, [profile])

  // Resolution map for likes/purchases thumbnails. Order and like rows carry a
  // listing ID, so the current live catalog provides the display details.
  const knownListings = useMemo(() => {
    const byId = new Map<string, Listing>()
    for (const listing of liveListings) byId.set(listing.id, listing)
    return byId
  }, [liveListings])

  const sortedMyListings = useMemo(
    () => applyFilters(myLiveListings, emptyFilters, sort),
    [myLiveListings, sort]
  )

  const likedListings = useMemo(
    () => likedIds.map((id) => knownListings.get(id)).filter((l): l is Listing => !!l),
    [likedIds, knownListings]
  )

  const savedListings = useMemo(
    () => savedIds.map((id) => knownListings.get(id)).filter((l): l is Listing => !!l),
    [savedIds, knownListings]
  )

  const sortedOrders = useMemo(() => [...orders].sort((a, b) => b.placedAt - a.placedAt), [orders])
  // Orders waiting to ship first, then newest.
  const sortedSales = useMemo(
    () =>
      [...sales].sort((a, b) => Number(b.status === 'paid') - Number(a.status === 'paid') || b.placedAt - a.placedAt),
    [sales]
  )
  const toShipCount = sales.filter((o) => o.status === 'paid').length

  function thumbFor(item: Order['items'][number]): string {
    return item.img || knownListings.get(item.listingId)?.img || ''
  }

  function orderRow(order: Order, label: string) {
    return (
      <Link to={`/order/${order.uuid}`} className="profile-order-row" key={order.uuid}>
        <div className="profile-order-thumbs">
          {order.items.map((item, i) => (
            <ListingPhoto key={item.listingId + i} className="profile-order-thumb" src={thumbFor(item)} alt="Ordered item" compact />
          ))}
        </div>
        <div className="profile-order-details">
          <p className="profile-order-date">{formatOrderDate(order.placedAt)}</p>
          <p className="profile-order-count">
            {order.items.length} item{order.items.length === 1 ? '' : 's'} · <span className="profile-order-status">{label}</span>
          </p>
        </div>
        <p className="profile-order-total">{formatInr(order.totalInr)}</p>
      </Link>
    )
  }

  async function handleLogout() {
    setMenuOpen(false)
    await signOut()
    navigate('/')
  }


  const headerTitle = isAuthed && profile ? profile.handle : 'Profile'

  return (
    <div className="profile-page">
      <header className="profile-header">
        <div className="profile-header-spacer" />
        <h1 className="profile-title">{headerTitle}</h1>
        <div className="profile-header-actions pill">
          <Link to="/sell/new" className="icon-btn" aria-label="Add listing">
            <Plus size={20} />
          </Link>
          <button type="button" className="icon-btn" aria-label="Menu" onClick={() => setMenuOpen(true)}>
            <Menu size={20} />
          </button>
        </div>
      </header>

      {/* `loading` is checked before the guest view because a signed-in visitor
          whose profile has not resolved yet is not a guest. Without this, the
          signed-out prompt flashes on every OAuth return, and stays put if the
          profile lookup is slow. */}
      {loading ? (
        <div className="profile-guest">
          <p className="profile-guest-copy">Loading your closet…</p>
        </div>
      ) : isAuthed && !profile && profileError ? (
        /* Signed in, but their profile could not be created. Showing the
           signed-out prompt here tells them to log in when they already are,
           which is both useless and misleading. */
        <div className="profile-guest">
          <h2 className="profile-guest-title">Something went wrong</h2>
          <p className="profile-guest-copy" role="alert">
            {profileError}
          </p>
          <div className="profile-guest-actions">
            <button
              type="button"
              className="btn btn-primary profile-guest-btn"
              onClick={() => window.location.reload()}
            >
              Try again
            </button>
          </div>
        </div>
      ) : !isAuthed || !profile ? (
        <div className="profile-guest">
          <h2 className="profile-guest-title">Your closet lives here</h2>
          <p className="profile-guest-copy">Log in to see your likes, orders and listings</p>
          <div className="profile-guest-actions">
            <Link to="/login?next=%2Fprofile" className="btn btn-primary profile-guest-btn">
              Log in
            </Link>
            <Link to="/signup?next=%2Fprofile" className="btn btn-outline profile-guest-btn">
              Sign up
            </Link>
          </div>
        </div>
      ) : (
        <>
          <nav className="profile-tabs">
            {TABS.map((tab) => (
              <button
                key={tab}
                type="button"
                className={'profile-tab' + (activeTab === tab ? ' active' : '')}
                onClick={() => setActiveTab(tab)}
              >
                {tab}
              </button>
            ))}
          </nav>

          <div className="profile-body">
            <div className="profile-summary">
              <div className="profile-avatar">{initialsFor(profile.name)}</div>
              <div className="profile-stats">
                <div className="profile-stat">
                  <span className="profile-stat-value">{followerCount}</span>
                  <span className="profile-stat-label">followers</span>
                </div>
                <div className="profile-stat">
                  <span className="profile-stat-value">{follows.length}</span>
                  <span className="profile-stat-label">following</span>
                </div>
                <div className="profile-stat">
                  <Star size={20} />
                  <span className="profile-stat-label">no reviews</span>
                </div>
              </div>
            </div>

            <button type="button" className="profile-earnings pill">
              <BarChart2 size={18} />
              <span>Earnings</span>
            </button>

            {activeTab === 'Shop' && (
              <>
                <div className="profile-active-row">
                  <div className="profile-active-heading">
                    <span className="profile-active-title">Active</span>
                    <span className="profile-active-count">({myLiveListings.length} listings)</span>
                  </div>
                  <button
                    type="button"
                    className="profile-filter-btn"
                    aria-label="Sort listings"
                    onClick={() => setSortOpen(true)}
                  >
                    <SlidersHorizontal size={18} />
                  </button>
                </div>

                {myLiveListings.length === 0 ? (
                  <div className="profile-empty">
                    <ClothesRack />
                    <h3 className="profile-empty-title">No active listings</h3>
                    <p className="profile-empty-copy">List an item so buyers can discover your shop.</p>
                    <Link to="/sell" className="btn btn-primary profile-empty-btn">
                      Start selling
                    </Link>
                  </div>
                ) : (
                  <div className="profile-grid">
                    {sortedMyListings.map((listing) => (
                      <ProductCard key={listing.id} listing={listing} />
                    ))}
                  </div>
                )}
              </>
            )}

            {activeTab === 'Sold' && sortedSales.length > 0 && (
              <div className="profile-orders profile-sales">
                <p className="profile-sales-title">
                  Orders{toShipCount > 0 ? ` · ${toShipCount} to ship` : ''}
                </p>
                {sortedSales.map((order) =>
                  orderRow(order, order.status === 'paid' ? 'To ship' : STATUS_LABEL[order.status])
                )}
              </div>
            )}

            {activeTab === 'Sold' && (
              <div className="profile-grid">
                {mySoldListings.map((listing) => (
                  <div className="profile-sold-item" key={listing.id}>
                    <ProductCard listing={listing} />
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'Purchases' &&
              (sortedOrders.length === 0 ? (
                <div className="profile-empty-simple">
                  <p className="profile-empty-simple-copy">No purchases yet</p>
                  <Link to="/home" className="btn btn-primary profile-empty-btn">
                    Browse
                  </Link>
                </div>
              ) : (
                <div className="profile-orders">
                  {sortedOrders.map((order) => orderRow(order, STATUS_LABEL[order.status]))}
                </div>
              ))}

            {activeTab === 'Likes' &&
              (likedListings.length === 0 ? (
                <div className="profile-empty-simple">
                  <p className="profile-empty-simple-title">Nothing liked yet</p>
                  <p className="profile-empty-simple-copy">Tap the heart on any item to save it here</p>
                </div>
              ) : (
                <div className="profile-grid">
                  {likedListings.map((listing) => (
                    <ProductCard key={listing.id} listing={listing} />
                  ))}
                </div>
              ))}

            {activeTab === 'Saves' &&
              (savedListings.length === 0 ? (
                <div className="profile-empty-simple">
                  <p className="profile-empty-simple-title">Nothing saved yet</p>
                  <p className="profile-empty-simple-copy">Tap the bookmark on any item to keep it here. Only you can see your saves.</p>
                </div>
              ) : (
                <div className="profile-grid">
                  {savedListings.map((listing) => (
                    <ProductCard key={listing.id} listing={listing} />
                  ))}
                </div>
              ))}
          </div>

          <BottomSheet open={sortOpen} onClose={() => setSortOpen(false)} title="Sort by">
            <div className="profile-sort-list">
              {SORT_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  className="profile-sort-option"
                  onClick={() => {
                    setSort(opt.value)
                    setSortOpen(false)
                  }}
                >
                  {opt.label}
                  {sort === opt.value && <span className="profile-sort-check">✓</span>}
                </button>
              ))}
            </div>
          </BottomSheet>
        </>
      )}

      <BottomSheet open={menuOpen} onClose={() => setMenuOpen(false)}>
        <div className="profile-sort-list">
          {isAuthed && (
            <Link to="/account/password" className="profile-sort-option" onClick={() => setMenuOpen(false)}>
              {hasPassword ? 'Change password' : 'Set password'}
            </Link>
          )}
          {isAuthed && (
            <button
              type="button"
              className="profile-sort-option"
              onClick={() => {
                setMenuOpen(false)
                navigate('/account')
              }}
            >
              Account details
            </button>
          )}
          <button type="button" className="profile-sort-option" onClick={handleLogout}>
            Log out
          </button>
        </div>
      </BottomSheet>
    </div>
  )
}

function ClothesRack() {
  return (
    <svg
      className="profile-rack"
      viewBox="0 0 200 190"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {/* top rail */}
      <line x1="20" y1="34" x2="180" y2="34" stroke="#b6b6ba" strokeWidth="3" strokeLinecap="round" />
      {/* legs */}
      <line x1="24" y1="34" x2="24" y2="166" stroke="#b6b6ba" strokeWidth="3" strokeLinecap="round" />
      <line x1="176" y1="34" x2="176" y2="166" stroke="#b6b6ba" strokeWidth="3" strokeLinecap="round" />
      {/* feet */}
      <line x1="6" y1="166" x2="42" y2="166" stroke="#b6b6ba" strokeWidth="3" strokeLinecap="round" />
      <line x1="158" y1="166" x2="194" y2="166" stroke="#b6b6ba" strokeWidth="3" strokeLinecap="round" />
      {/* corner braces */}
      <line x1="24" y1="52" x2="52" y2="34" stroke="#b6b6ba" strokeWidth="3" strokeLinecap="round" />
      <line x1="176" y1="52" x2="148" y2="34" stroke="#b6b6ba" strokeWidth="3" strokeLinecap="round" />
      {/* red clip at rail center */}
      <rect x="93" y="29" width="14" height="10" rx="2" fill="var(--accent)" />
      {/* wooden hanger hook */}
      <path
        d="M100 39 L90 50 L100 55"
        stroke="#b8875a"
        strokeWidth="3"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* wooden hanger body */}
      <path
        d="M100 55 L64 94 L136 94 Z"
        stroke="#b8875a"
        strokeWidth="3"
        fill="none"
        strokeLinejoin="round"
      />
    </svg>
  )
}
