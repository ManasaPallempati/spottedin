import SafetyMenu from '../components/SafetyMenu'
import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useAppState } from '../lib/appState'
import { useAuth } from '../lib/auth'
import { useListingsBySeller, useProfileByHandle } from '../lib/useListings'
import { supabase } from '../lib/supabase'
import { applyFilters, emptyFilters, type Filters, type Sort } from '../lib/filters'
import FilterBar from '../components/FilterBar'
import ProductCard from '../components/ProductCard'
import ShareButton from '../components/ShareButton'
import { canonicalUrl } from '../lib/seo'
import SellerAvatar from '../components/SellerAvatar'
import StarRating from '../components/StarRating'
import { averageRating, useSellerReviews } from '../lib/reviews'
import './shop.css'

const TABS = ['Shop', 'Likes', 'Reviews'] as const
type Tab = (typeof TABS)[number]

export default function Shop() {
  const { handle = '' } = useParams<{ handle: string }>()
  const { follow, unfollow, isFollowing } = useAppState()
  const { profile: myProfile } = useAuth()
  const { profile: realProfile, loading: profileLoading } = useProfileByHandle(handle)
  const { listings: realSellerListings } = useListingsBySeller(realProfile?.id ?? '')
  const { reviews } = useSellerReviews(realProfile?.id ?? '')
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

  const isOwnProfile = !!myProfile && myProfile.handle === handle

  if (profileLoading) {
    return <div className="shop-page shop-loading" />
  }

  if (!realProfile) {
    return (
      <div className="shop-not-found">
        <p className="shop-not-found-title">Shop not found</p>
        <Link to="/home" className="btn btn-primary">
          Back
        </Link>
      </div>
    )
  }

  // Absolutely positioned in the header's top corner (shop.css) so the
  // centered column is undisturbed.
  const shareButton = (
    <ShareButton
      className="shop-share-btn"
      title={`@${handle} on SPOTTED`}
      url={canonicalUrl(`/shop/${encodeURIComponent(handle)}`)}
      label="Share this shop"
    />
  )

  // Stars come from real buyer reviews (round 23), never from profiles.rating alone.
  const rating = averageRating(reviews)
  const followerCount = followerBase
    ? followerBase.count + (following === followerBase.wasFollowing ? 0 : following ? 1 : -1)
    : 0
  const sellerListings = realSellerListings

  const headerContent = (
    <header className="shop-header">
      {shareButton}
      <SellerAvatar className="shop-avatar" handle={realProfile.handle} name={realProfile.name} />
      <h1 className="shop-handle">@{realProfile.handle}</h1>

      {rating != null ? (
        <button type="button" className="shop-rating-row" onClick={() => setActiveTab('Reviews')}>
          <StarRating rating={rating} />
          <span className="shop-review-count">({reviews.length})</span>
        </button>
      ) : (
        <p className="shop-new-seller">New seller</p>
      )}

      <p className="shop-sold">{realProfile.sales ?? 0} sold</p>

      <SafetyMenu targetType="profile" targetId={realProfile.handle} handle={realProfile.handle} label="Report or block this account" />
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
      ) : activeTab === 'Reviews' ? (
        reviews.length === 0 ? (
          <div className="shop-likes-empty">
            <p>No reviews yet</p>
          </div>
        ) : (
          <ul className="shop-reviews">
            {reviews.map((review) => (
              <li key={review.id} className="shop-review">
                <div className="shop-review-head">
                  <StarRating rating={review.rating} />
                  <span className="shop-review-date">
                    {new Date(review.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </span>
                </div>
                {review.comment && <p className="shop-review-comment">{review.comment}</p>}
                {review.reviewerHandle && (
                  <Link to={`/shop/${encodeURIComponent(review.reviewerHandle)}`} className="shop-review-author">
                    @{review.reviewerHandle}
                  </Link>
                )}
              </li>
            ))}
          </ul>
        )
      ) : (
        <div className="shop-likes-empty">
          <p>Nothing to see here yet</p>
        </div>
      )}
    </div>
  )
}
