import { useState } from 'react'
import { Link } from 'react-router-dom'
import { SlidersHorizontal, Bell } from 'lucide-react'
import Chip from '../components/Chip'
import { useAppState } from '../lib/appState'
import { sellers } from '../data/sellers'
import './inbox.css'

const FILTERS = ['All', 'Messages', 'Selling', 'Buying'] as const

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

export default function Inbox() {
  const [activeFilter, setActiveFilter] = useState<(typeof FILTERS)[number]>('All')
  const { threads, offersWith } = useAppState()

  const sortedThreads = [...threads].sort((a, b) => {
    const aLast = a.messages[a.messages.length - 1]?.at ?? 0
    const bLast = b.messages[b.messages.length - 1]?.at ?? 0
    return bLast - aLast
  })

  const filteredThreads = sortedThreads.filter((thread) => {
    const threadOffers = offersWith(thread.handle)
    if (activeFilter === 'Buying') return threadOffers.some((o) => o.direction === 'made')
    if (activeFilter === 'Selling') return threadOffers.some((o) => o.direction === 'received')
    if (activeFilter === 'Messages') return threadOffers.length === 0
    return true
  })

  return (
    <div className="inbox-page">
      <header className="inbox-header">
        <span className="inbox-header-spacer" aria-hidden="true" />
        <h1 className="inbox-title">Inbox</h1>
        <div className="inbox-header-actions pill">
          <button type="button" className="icon-btn" aria-label="Filter">
            <SlidersHorizontal size={20} />
          </button>
          <button type="button" className="icon-btn" aria-label="Notifications">
            <Bell size={20} />
          </button>
        </div>
      </header>

      <div className="inbox-chip-row">
        {FILTERS.map((filter) => (
          <Chip
            key={filter}
            label={filter}
            selected={activeFilter === filter}
            onClick={() => setActiveFilter(filter)}
          />
        ))}
      </div>

      {threads.length > 0 ? (
        filteredThreads.length > 0 ? (
          <div className="inbox-thread-list">
            {filteredThreads.map((thread) => {
              const lastMessage = thread.messages[thread.messages.length - 1]
              if (!lastMessage) return null
              const avatar = thread.peerIsReal
                ? `https://picsum.photos/seed/spotted-seller-${thread.handle}/300/300`
                : sellers.find((s) => s.handle === thread.handle)?.avatar ??
                  `https://picsum.photos/seed/${thread.handle}/200/200`
              const hasPendingOffer = offersWith(thread.handle).some((o) => o.status === 'pending')
              return (
                <Link key={thread.id} to={`/inbox/t/${thread.handle}`} className="inbox-thread-row">
                  <img className="inbox-thread-avatar" src={avatar} alt={thread.handle} />
                  <div className="inbox-thread-main">
                    <div className="inbox-thread-handle-row">
                      <span className="inbox-thread-handle">@{thread.handle}</span>
                      {hasPendingOffer && <span className="inbox-offer-badge">Offer</span>}
                    </div>
                    <span className="inbox-thread-snippet">{lastMessage.text}</span>
                  </div>
                  <span className="inbox-thread-time">{formatRelativeTime(lastMessage.at)}</span>
                </Link>
              )
            })}
          </div>
        ) : (
          <div className="inbox-filter-empty">
            <p className="inbox-filter-empty-text">
              No {activeFilter.toLowerCase()} conversations yet.
            </p>
          </div>
        )
      ) : (
        <div className="inbox-empty">
          <div className="inbox-empty-icon-wrap">
            <div className="inbox-empty-square">
              <svg width="40" height="36" viewBox="0 0 40 36" fill="none" aria-hidden="true">
                <rect x="5" y="4" width="30" height="20" rx="8" fill="#fff" />
                <path d="M12 24 L12 33 L22 24 Z" fill="#fff" />
              </svg>
            </div>
            <span className="inbox-empty-badge">0</span>
          </div>
          <div className="inbox-empty-shadow" aria-hidden="true" />
          <p className="inbox-empty-text">No messages yet.</p>
        </div>
      )}
    </div>
  )
}
