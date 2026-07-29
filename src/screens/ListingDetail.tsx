import { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import TopBar from '../components/TopBar';
import Avatar from '../components/Avatar';
import PriceTag from '../components/PriceTag';
import EmptyState from '../components/EmptyState';
import {
  getListing,
  getSeller,
  getOrCreateThreadForListing,
  subscribe,
} from '../data/store';
import { useAuth } from '../auth/AuthProvider';
import { isSupabaseConfigured } from '../data/supabase';
import { loadListing } from '../data/listings';
import {
  isMarketplaceFavorite,
  toggleMarketplaceFavorite,
} from '../data/favorites';
import { startMarketplaceConversation } from '../data/messages';

const CONDITION_LABEL: Record<string, string> = {
  new: 'New with tags',
  'like-new': 'Like new',
  good: 'Good',
  fair: 'Fair',
};

export default function ListingDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { status, user, profileStatus } = useAuth();
  const [, setTick] = useState(0);
  const [loading, setLoading] = useState(isSupabaseConfigured);
  const [loadError, setLoadError] = useState('');
  const [favorite, setFavorite] = useState(false);
  const [favoriteSaving, setFavoriteSaving] = useState(false);
  const [actionError, setActionError] = useState('');

  useEffect(() => subscribe(() => setTick((t) => t + 1)), []);
  useEffect(() => {
    if (!id) return;
    let active = true;
    setLoading(true);
    setLoadError('');
    void loadListing(id)
      .catch((err: unknown) => {
        if (active) setLoadError(err instanceof Error ? err.message : 'Could not load listing');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [id]);

  useEffect(() => {
    if (!id || status !== 'authenticated' || !user) {
      setFavorite(false);
      return;
    }
    let active = true;
    void isMarketplaceFavorite(id, user.id)
      .then((next) => {
        if (active) setFavorite(next);
      })
      .catch((err: unknown) => {
        if (active) setActionError(err instanceof Error ? err.message : 'Could not load favorite');
      });
    return () => {
      active = false;
    };
  }, [id, status, user]);

  const listing = id ? getListing(id) : undefined;
  const seller = listing ? getSeller(listing.sellerId) : undefined;

  if (loading && (!listing || !seller)) {
    return (
      <>
        <TopBar title="Listing" />
        <EmptyState emoji="⏳" title="Loading listing…" />
      </>
    );
  }

  if (!listing || !seller) {
    return (
      <>
        <TopBar title="Listing" />
        <EmptyState
          emoji={loadError ? '⚠️' : '🕵️'}
          title={loadError ? 'Could not load listing' : 'Listing not found'}
          subtitle={loadError || 'It may have been removed.'}
        />
      </>
    );
  }

  const sold = listing.status === 'sold';

  function handleLike() {
    if (status !== 'authenticated' || !user) {
      navigate('/login', {
        state: { returnTo: `/listing/${listing!.id}` },
      });
      return;
    }
    if (favoriteSaving) return;
    void (async () => {
      setFavoriteSaving(true);
      setActionError('');
      try {
        setFavorite(await toggleMarketplaceFavorite(listing!.id, user.id));
      } catch (err) {
        setActionError(err instanceof Error ? err.message : 'Could not update favorite');
      } finally {
        setFavoriteSaving(false);
      }
    })();
  }

  function handleMessage() {
    if (status === 'initializing') return;
    if (status !== 'authenticated') {
      navigate('/login', {
        state: { returnTo: `/listing/${listing!.id}` },
      });
      return;
    }
    if (isSupabaseConfigured && profileStatus !== 'ready') {
      navigate(`/seller/${user!.sellerId}`);
      return;
    }
    void (async () => {
      setActionError('');
      try {
        const thread = isSupabaseConfigured
          ? await startMarketplaceConversation(listing!.id, user!.id)
          : getOrCreateThreadForListing(listing!.id);
        navigate(`/chat/${thread.id}`);
      } catch (err) {
        setActionError(err instanceof Error ? err.message : 'Could not start conversation');
      }
    })();
  }

  function handleBuy() {
    navigate(`/checkout/${listing!.id}`);
  }

  return (
    <div className="listing-detail">
      <style>{`
        .listing-detail__tile {
          aspect-ratio: 1 / 1;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 96px;
          position: relative;
          background-size: cover;
          background-position: center;
        }
        .listing-detail__sold {
          position: absolute;
          top: 16px;
          left: 16px;
          background: var(--lime);
          color: var(--ink);
          font-size: 12px;
          font-weight: 700;
          padding: 4px 10px;
          border-radius: var(--radius-sm);
          text-transform: uppercase;
          letter-spacing: 0.02em;
        }
        .listing-detail__like {
          position: absolute;
          top: 16px;
          right: 16px;
          width: 40px;
          height: 40px;
          border-radius: 50%;
          border: none;
          background: rgba(255, 255, 255, 0.9);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 18px;
          backdrop-filter: blur(4px);
        }
        .listing-detail__body {
          padding: 16px;
          display: flex;
          flex-direction: column;
          gap: 14px;
        }
        .listing-detail__title {
          font-size: 19px;
        }
        .listing-detail__price-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .listing-detail__tags {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }
        .listing-detail__tag {
          font-size: 12px;
          font-weight: 600;
          color: var(--ink-soft);
          background: var(--bg);
          border: 1px solid var(--border);
          padding: 5px 10px;
          border-radius: var(--radius-sm);
        }
        .listing-detail__desc {
          font-size: 14px;
          line-height: 1.5;
          color: var(--ink);
        }
        .listing-detail__meta {
          font-size: 12px;
          color: var(--ink-soft);
        }
        .listing-detail__seller {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px;
          border: 1px solid var(--border);
          border-radius: var(--radius);
        }
        .listing-detail__seller-info {
          flex: 1;
          min-width: 0;
        }
        .listing-detail__seller-name {
          font-size: 14px;
          font-weight: 700;
        }
        .listing-detail__seller-meta {
          font-size: 12px;
          color: var(--ink-soft);
        }
        .listing-detail__seller-chevron {
          color: var(--ink-soft);
          font-size: 18px;
        }
        .listing-detail__actions {
          display: flex;
          gap: 10px;
        }
      `}</style>

      <TopBar title={listing.title} />

      <div
        className="listing-detail__tile"
        style={
          listing.photoDataUrl
            ? { backgroundImage: `url(${listing.photoDataUrl})` }
            : { background: `linear-gradient(135deg, ${listing.gradient[0]}, ${listing.gradient[1]})` }
        }
      >
        {!listing.photoDataUrl && <span aria-hidden="true">{listing.emoji}</span>}
        {sold && <span className="listing-detail__sold">Sold</span>}
        <button
          type="button"
          className="listing-detail__like"
          aria-label={favorite ? 'Unlike' : 'Like'}
          onClick={handleLike}
          disabled={favoriteSaving}
        >
          {favorite ? '❤️' : '🤍'}
        </button>
      </div>

      <div className="listing-detail__body">
        <h2 className="listing-detail__title">{listing.title}</h2>

        <div className="listing-detail__price-row">
          <PriceTag priceINR={listing.priceINR} size="lg" />
          <span className="listing-detail__meta">{listing.likes} likes · {listing.createdAgo}</span>
        </div>

        <div className="listing-detail__tags">
          <span className="listing-detail__tag">{CONDITION_LABEL[listing.condition]}</span>
          {listing.size && <span className="listing-detail__tag">Size {listing.size}</span>}
          <span className="listing-detail__tag">{listing.category}</span>
        </div>

        <p className="listing-detail__desc">{listing.description}</p>
        {actionError && <p className="listing-detail__meta" role="alert">{actionError}</p>}

        <Link to={`/seller/${seller.id}`} className="listing-detail__seller">
          <Avatar emoji={seller.avatarEmoji} size={44} />
          <div className="listing-detail__seller-info">
            <div className="listing-detail__seller-name">{seller.name}</div>
            <div className="listing-detail__seller-meta">
              {seller.handle} · ⭐ {seller.rating.toFixed(1)} · {seller.sales} sales
            </div>
          </div>
          <span className="listing-detail__seller-chevron" aria-hidden="true">›</span>
        </Link>

        <div className="listing-detail__actions">
          <button type="button" className="btn btn-outline" onClick={handleMessage}>
            💬 Message
          </button>
          <button
            type="button"
            className="btn btn-primary btn-block"
            onClick={handleBuy}
            disabled={sold}
          >
            {sold ? 'Sold out' : 'Buy now'}
          </button>
        </div>
      </div>
    </div>
  );
}
