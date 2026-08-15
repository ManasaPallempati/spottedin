import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ChevronLeft, Send } from 'lucide-react'
import { useAppState } from '../lib/appState'
import { useListing, useProfileByHandle } from '../lib/useListings'
import { listingPath } from '../lib/listingUrls'
import { sellers } from '../data/sellers'
import OfferCard from '../components/OfferCard'
import './thread.css'

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
  const listingId = searchParams.get('listing')
  const { threadFor, sendMessage, offersWith } = useAppState()
  const { listing } = useListing(listingId ?? '')
  const { profile: realProfile } = useProfileByHandle(handle)
  const fictionalSeller = sellers.find((s) => s.handle === handle)
  const avatar = realProfile
    ? `https://picsum.photos/seed/spotted-seller-${handle}/300/300`
    : fictionalSeller?.avatar ?? `https://picsum.photos/seed/${handle}/200/200`
  const messages = threadFor(handle)?.messages ?? []
  const relevantOffers = offersWith(handle)
  const offer = relevantOffers[0]

  const [input, setInput] = useState('')

  // Prefill only when arriving fresh at a thread with a listing context and no history yet;
  // re-runs on handle change since this component is reused across /inbox/t/:handle visits.
  useEffect(() => {
    const existing = threadFor(handle)?.messages ?? []
    setInput(listingId && existing.length === 0 ? 'Hi, is this still available?' : '')
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
          <img className="thread-avatar" src={avatar} alt={handle} />
          <div className="thread-seller-info">
            <span className="thread-handle">@{handle}</span>
            <span className="thread-status">Active today</span>
          </div>
        </Link>
      </header>

      {listingId && listing && (
        <Link to={listingPath(listing.id, listing.brand)} className="thread-listing-card">
          <img className="thread-listing-thumb" src={listing.img} alt={listing.brand} />
          <div className="thread-listing-info">
            <span className="thread-listing-brand">{listing.brand}</span>
            <span className="thread-listing-price">₹{listing.price.toLocaleString('en-IN')}</span>
          </div>
        </Link>
      )}

      {offer && <OfferCard offer={offer} />}

      <div className="thread-messages">
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
          placeholder="Message..."
        />
        <button type="button" className="thread-send-btn" onClick={handleSend} aria-label="Send message">
          <Send size={18} />
        </button>
      </div>
    </div>
  )
}
