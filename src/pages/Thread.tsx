import SafetyMenu from '../components/SafetyMenu'
import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ChevronLeft, ChevronRight, Send, Star } from 'lucide-react'
import { useAppState } from '../lib/appState'
import { useAuth } from '../lib/auth'
import { useListing, useProfileByHandle } from '../lib/useListings'
import { listingPath } from '../lib/listingUrls'
import OfferCard from '../components/OfferCard'
import ListingPhoto from '../components/ListingPhoto'
import SellerAvatar from '../components/SellerAvatar'
import './thread.css'

// The listing a chat started from, kept per seller so the card stays on the
// chat when it is reopened from the inbox (which links without ?listing=).
const LISTING_KEY = 'spotted:thread-listing:'

function rememberedListing(handle: string): string | null {
  try {
    return window.localStorage.getItem(LISTING_KEY + handle)
  } catch {
    return null
  }
}

function rememberListing(handle: string, listingId: string) {
  try {
    window.localStorage.setItem(LISTING_KEY + handle, listingId)
  } catch {
    // Storage blocked: the card just won't persist.
  }
}

function formatRelativeTime(at: number): string {
  const diffSec = Math.max(0, Math.floor((Date.now() - at) / 1000))
  if (diffSec < 60) return 'now'
  const diffMin = Math.floor(diffSec / 60)
  if (diffMin < 60) return `${diffMin}m`
  const diffHr = Math.floor(diffMin / 60)
  if (diffHr < 24) return `${diffHr}h`
  const diffDay = Math.floor(diffHr / 24)
  if (diffDay < 7) return `${diffDay}d`
  const diffWeek = Math.floor(diffDay / 7)
  if (diffWeek < 5) return `${diffWeek}w`
  return `${Math.floor(diffDay / 30)}mo`
}

export default function Thread() {
  const navigate = useNavigate()
  const { handle = '' } = useParams<{ handle: string }>()
  const [searchParams] = useSearchParams()
  const listingParam = searchParams.get('listing')
  const listingId = listingParam ?? rememberedListing(handle)
  const { threadFor, sendMessage, offersWith } = useAppState()
  const { profile: me } = useAuth()
  const { listing } = useListing(listingId ?? '')
  const { profile: realProfile } = useProfileByHandle(handle)
  const messages = threadFor(handle)?.messages ?? []
  const relevantOffers = offersWith(handle)
  const offer = relevantOffers[0]

  const [input, setInput] = useState('')

  useEffect(() => {
    if (listingParam) rememberListing(handle, listingParam)
  }, [handle, listingParam])

  const canOffer = !!listing && listing.status !== 'sold' && !(listing.sellerId && me?.id === listing.sellerId)

  // Prefill only when arriving fresh at a thread with a listing context and no history yet;
  // re-runs on handle change since this component is reused across /inbox/t/:handle visits.
  useEffect(() => {
    const existing = threadFor(handle)?.messages ?? []
    setInput(listingParam && existing.length === 0 ? 'Hi, is this still available?' : '')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [handle])

  function handleSend() {
    const text = input.trim()
    if (!text) return
    sendMessage(handle, text)
    setInput('')
  }

  return (
    <div className="thread-page">
      <header className="thread-header">
        <button type="button" className="icon-btn" onClick={() => navigate(-1)} aria-label="Back">
          <ChevronLeft size={22} />
        </button>
        <Link to={`/shop/${handle}`} className="thread-seller">
          <SellerAvatar className="thread-avatar" handle={handle} name={realProfile?.name} />
          <div className="thread-seller-info">
            <span className="thread-handle">@{handle}</span>
            {realProfile?.name && <span className="thread-status">{realProfile.name}</span>}
          </div>
        </Link>
        <SafetyMenu targetType="thread" targetId={handle} handle={handle} label="Report or block this chat" />
      </header>

      {listingId && listing && (
        <div className="thread-listing">
          <Link to={listingPath(listing.id, listing.brand)} className="thread-listing-card">
            <ListingPhoto className="thread-listing-thumb" src={listing.img} alt={listing.brand} compact />
            <div className="thread-listing-info">
              <span className="thread-listing-brand">{listing.brand}</span>
              <span className="thread-listing-price">₹{listing.price.toLocaleString('en-IN')}</span>
            </div>
            <ChevronRight size={20} className="thread-listing-chevron" />
          </Link>
          {canOffer && (
            <button
              type="button"
              className="btn btn-outline thread-offer-btn"
              onClick={() => navigate(`${listingPath(listing.id, listing.brand)}?offer=1`)}
            >
              Offer ₹{Math.round(listing.price * 0.9).toLocaleString('en-IN')}
            </button>
          )}
        </div>
      )}

      {offer && <OfferCard offer={offer} />}

      <div className="thread-messages">
        {messages.length === 0 && (
          <div className="thread-intro">
            <SellerAvatar className="thread-intro-avatar" handle={handle} name={realProfile?.name} />
            <span className="thread-intro-handle">@{handle}</span>
            {realProfile?.sales ? (
              <span className="thread-intro-meta">
                <Star size={14} fill="currentColor" /> {realProfile.rating?.toFixed(1) ?? 'New'} · {realProfile.sales} sold
              </span>
            ) : (
              <span className="thread-intro-meta">New on Spotted</span>
            )}
          </div>
        )}
        {messages.map((message, i) => (
          <div
            key={message.at + '-' + i}
            className={'thread-bubble-row ' + (message.from === 'me' ? 'from-me' : 'from-them')}
          >
            <div className="thread-bubble">{message.text}</div>
            <span className="thread-timestamp">{formatRelativeTime(message.at)}</span>
          </div>
        ))}
      </div>

      <div className="thread-composer">
        <input
          className="thread-input"
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSend()
          }}
          placeholder="Write a private message..."
        />
        <button type="button" className="thread-send-btn" onClick={handleSend} aria-label="Send message">
          <Send size={18} />
        </button>
      </div>
    </div>
  )
}
