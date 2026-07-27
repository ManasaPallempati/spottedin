import { useEffect, useMemo, useState } from 'react';
import ListingCard from '../components/ListingCard';
import EmptyState from '../components/EmptyState';
import { getFeed, subscribe } from '../data/store';
import type { Category } from '../data/types';

const CHIPS: { key: Category | 'all'; label: string; emoji: string }[] = [
  { key: 'all', label: 'All', emoji: '✨' },
  { key: 'women', label: 'Women', emoji: '👗' },
  { key: 'men', label: 'Men', emoji: '👔' },
  { key: 'sneakers', label: 'Sneakers', emoji: '👟' },
  { key: 'electronics', label: 'Electronics', emoji: '🎧' },
  { key: 'home', label: 'Home', emoji: '🪔' },
  { key: 'vintage', label: 'Vintage', emoji: '📻' },
];

export default function Feed() {
  const [active, setActive] = useState<Category | 'all'>('all');
  const [tick, setTick] = useState(0);

  useEffect(() => subscribe(() => setTick((t) => t + 1)), []);

  const listings = useMemo(
    () => getFeed(active === 'all' ? undefined : active),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [active, tick]
  );

  return (
    <div className="feed">
      <style>{`
        .feed__header {
          position: sticky;
          top: 0;
          z-index: 10;
          background: var(--surface);
          border-bottom: 1px solid var(--border);
          padding: 16px 16px 12px;
        }
        .feed__brand {
          font-size: 20px;
          font-weight: 700;
          letter-spacing: -0.02em;
          margin-bottom: 2px;
        }
        .feed__tagline {
          font-size: 12px;
          color: var(--ink-soft);
          margin-bottom: 12px;
        }
        .feed__chips {
          display: flex;
          gap: 8px;
          overflow-x: auto;
          padding-bottom: 2px;
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .feed__chips::-webkit-scrollbar {
          display: none;
        }
        .feed__chip {
          flex-shrink: 0;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 8px 14px;
          border-radius: 999px;
          border: 1.5px solid var(--border);
          background: var(--bg);
          color: var(--ink);
          font-size: 13px;
          font-weight: 600;
          white-space: nowrap;
        }
        .feed__chip.is-active {
          background: var(--accent);
          border-color: var(--accent);
          color: #fff;
        }
      `}</style>

      <div className="feed__header">
        <div className="feed__brand">🛍️ Maanster Market</div>
        <div className="feed__tagline">Pre-loved. Re-loved.</div>
        <div className="feed__chips">
          {CHIPS.map((chip) => (
            <button
              key={chip.key}
              type="button"
              className={`feed__chip${active === chip.key ? ' is-active' : ''}`}
              onClick={() => setActive(chip.key)}
            >
              <span aria-hidden="true">{chip.emoji}</span>
              {chip.label}
            </button>
          ))}
        </div>
      </div>

      {listings.length === 0 ? (
        <EmptyState emoji="🔍" title="Nothing here yet" subtitle="Try a different category." />
      ) : (
        <div className="listing-grid">
          {listings.map((listing) => (
            <ListingCard key={listing.id} listing={listing} />
          ))}
        </div>
      )}
    </div>
  );
}
