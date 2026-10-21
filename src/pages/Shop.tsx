import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Star } from 'lucide-react'
import { sellers, sellerForListing } from '../data/sellers'
import type { Listing } from '../data/listings'
import { useAppState } from '../lib/appState'
import { useAuth } from '../lib/auth'
import { useListings, useListingsBySeller, useProfileByHandle } from '../lib/useListings'
import { supabase } from '../lib/supabase'
import { applyFilters, emptyFilters, type Filters, type Sort } from '../lib/filters'
import FilterBar from '../components/FilterBar'
import ProductCard from '../components/ProductCard'
import ShareButton from '../components/ShareButton'
import { canonicalUrl } from '../lib/seo'
import './shop.css'

const TABS = ['Shop', 'Likes'] as const
type Tab = (typeof TABS)[number]

export default function Shop() {
  const { handle = '' } = useParams<{ handle: string }>()
  const { follow, unfollow, isFollowing } = useAppState()
  const { profile: myProfile } = useAuth()
  const { listings: liveListings } = useListings()
  const { profile: realProfile, loading: profileLoading } = useProfileByHandle(handle)
  const { listings: realSellerListings } = useListingsBySeller(realProfile?.id ?? '')
  const [activeTab, setActiveTab] = useState<Tab>('Shop')
  const [filters, setFilters] = useState<Filters>(emptyFilters)
  const [sort, setSort] = useState<Sort>('newest')
  const [followerBase, setFollowerBase] = useState<{ count: number; wasFollowing: boolean } | null>(null)

  const following = isFollowing(handle)

  // Live follower count for a real profile — baseline fetched once per handle, then
  // adjusted by a local delta so the Follow button feels responsive before the
  // background write in appState lands.
  useEffect(() => {
    if (!realProfile) {
      setFollowerBase(null)
      return
    }
    let cancelled = false
    supabase
      .from('follows')
      .select('*', { count: 'exact', head: true })
      .eq('followee_handle', handle)
      .then(({ count }) => {
        if (!cancelled) setFollowerBase({ count: count ?? 0, wasFollowing: following })
      })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [realProfile, handle])

  const fictionalSeller = sellers.find((s) => s.handle === handle)
  const isOwnProfile = !!myProfile && myProfile.handle === handle

  if (profileLoading) {
    return <div className="shop-page shop-loading" />
  }

  if (!realProfile && !fictionalSeller) {
    return (
      <div className="shop-not-found">
        <p className="shop-not-found-title">Shop not found</p>
        <Link to="/home" className="btn btn-primary">
          Back
        </Link>
      </div>
    )
  }

  let headerContent: React.ReactNode
  let sellerListings: Listing[]

  // Same control for both header variants below; absolutely positioned in the
  // header's top corner (shop.css) so the centered column is undisturbed.
  const shareButton = (
    <ShareButton
      className="shop-share-btn"
      title={`@${handle} on SPOTTED`}
      url={canonicalUrl(`/shop/${encodeURIComponent(handle)}`)}
      label="Share this shop"
    />
  )

  if (realProfile) {
    const avatar = `https://picsum.photos/seed/spotted-seller-${handle}/300/300`
    const rating = realProfile.rating
    const followerCount = followerBase
      ? followerBase.count + (following === followerBase.wasFollowing ? 0 : following ? 1 : -1)
      : 0
    sellerListings = realSellerListings

    headerContent = (
      <header className="shop-header">
        {shareButton}
        <img className="shop-avatar" src={avatar} alt={realProfile.name} />
        <h1 className="shop-handle">@{realProfile.handle}</h1>

        {rating != null ? (
          <div className="shop-rating-row">
            <div className="shop-stars">
              {[1, 2, 3, 4, 5].map((i) => (
                <Star key={i} size={14} fill={i <= Math.round(rating) ? 'var(--text)' : 'none'} color="var(--text)" />
              ))}
            </div>
          </div>
        ) : (
          <p className="shop-new-seller">New seller</p>
        )}

        <p className="shop-sold">{realProfile.sales ?? 0} sold</p>

        <div className="shop-follow-row">
          <span className="shop-follow-stat">{followerCount} followers</span>
          {!isOwnProfile && (
            <button
              type="button"
              className={'shop-follow-btn' + (following ? ' shop-follow-btn-outline' : ' shop-follow-btn-solid')}
              onClick={() => (following ? unfollow(handle) : follow(handle))}
            >
              {following ? 'Following' : 'Follow'}
            </button>
          )}
        </div>

        <p className="shop-name">{realProfile.name}</p>
        {realProfile.bio && <p className="shop-bio">{realProfile.bio}</p>}

        {!isOwnProfile && (
          <Link to={`/inbox/t/${handle}`} className="shop-message-btn">
            New message
          </Link>
        )}
      </header>
    )
  } else {
    const seller = fictionalSeller!
    const followerCount = seller.followers + (following ? 1 : 0)
    sellerListings = liveListings.filter((listing) => sellerForListing(listing.id).handle === handle)

    headerContent = (
      <header className="shop-header">
        {shareButton}
        <img className="shop-avatar" src={seller.avatar} alt={seller.name} />
        <h1 className="shop-handle">@{seller.handle}</h1>

        <div className="shop-rating-row">
          <div className="shop-stars">
            {[1, 2, 3, 4, 5].map((i) => (
              <Star
                key={i}
                size={14}
                fill={i <= Math.round(seller.rating) ? 'var(--text)' : 'none'}
                color="var(--text)"
              />
            ))}
          </div>
          <span className="shop-review-count">{seller.reviewCount} reviews</span>
        </div>

        <p className="shop-sold">{seller.sold} sold · Active today</p>

        <div className="shop-follow-row">
          <span className="shop-follow-stat">{followerCount} followers</span>
          <span className="shop-follow-stat">{seller.following} following</span>
          {!isOwnProfile && (
            <button
              type="button"
              className={'shop-follow-btn' + (following ? ' shop-follow-btn-outline' : ' shop-follow-btn-solid')}
              onClick={() => (following ? unfollow(handle) : follow(handle))}
            >
              {following ? 'Following' : 'Follow'}
            </button>
          )}
        </div>

        <p className="shop-name">{seller.name}</p>
        <p className="shop-bio">{seller.bio}</p>

        {!isOwnProfile && (
          <Link to={`/inbox/t/${handle}`} className="shop-message-btn">
            New message
          </Link>
        )}
      </header>
    )
  }

  const filteredListings = applyFilters(sellerListings, filters, sort)

  return (
    <div className="shop-page">
      {headerContent}

      <nav className="shop-tabs">
        {TABS.map((tab) => (
          <button
            key={tab}
            type="button"
            className={'shop-tab' + (activeTab === tab ? ' active' : '')}
            onClick={() => setActiveTab(tab)}
          >
            {tab}
          </button>
        ))}
      </nav>

      {activeTab === 'Shop' ? (
        <div className="shop-body">
          <FilterBar
            listings={sellerListings}
            filters={filters}
            onChange={setFilters}
            sort={sort}
            onSort={setSort}
          />
          <div className="shop-grid">
            {filteredListings.map((listing) => (
              <ProductCard key={listing.id} listing={listing} />
            ))}
          </div>
        </div>
      ) : (
        <div className="shop-likes-empty">
          <p>Nothing to see here yet</p>
        </div>
      )}
    </div>
  )
}
