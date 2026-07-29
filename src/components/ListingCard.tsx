import { useEffect, useState, type MouseEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider';
import type { Listing } from '../data/types';
import {
  isMarketplaceFavorite,
  toggleMarketplaceFavorite,
} from '../data/favorites';
import PriceTag from './PriceTag';

interface ListingCardProps {
  listing: Listing;
}

export default function ListingCard({ listing }: ListingCardProps) {
  const navigate = useNavigate();
  const { status, user } = useAuth();
  const [liked, setLiked] = useState(false);
  const [likes, setLikes] = useState(listing.likes);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setLikes(listing.likes);
  }, [listing.likes]);

  useEffect(() => {
    if (status !== 'authenticated' || !user) {
      setLiked(false);
      return;
    }
    let active = true;
    void isMarketplaceFavorite(listing.id, user.id)
      .then((favorite) => {
        if (active) setLiked(favorite);
      })
      .catch(() => {
        if (active) setLiked(false);
      });
    return () => {
      active = false;
    };
  }, [listing.id, status, user]);

  function handleLike(e: MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (status !== 'authenticated' || !user) {
      navigate('/login', { state: { returnTo: `/listing/${listing.id}` } });
      return;
    }
    if (saving) return;
    void (async () => {
      setSaving(true);
      try {
        const next = await toggleMarketplaceFavorite(listing.id, user.id);
        setLiked(next);
        setLikes((prev) => Math.max(0, prev + (next ? 1 : -1)));
      } finally {
        setSaving(false);
      }
    })();
  }

  return (
    <Link to={`/listing/${listing.id}`} className="listing-card">
      <div
        className="listing-card__tile"
        style={
          listing.photoDataUrl
            ? undefined
            : { background: `linear-gradient(135deg, ${listing.gradient[0]}, ${listing.gradient[1]})` }
        }
      >
        {listing.photoDataUrl ? (
          <img src={listing.photoDataUrl} alt="" className="listing-card__img" />
        ) : (
          <span aria-hidden="true">{listing.emoji}</span>
        )}
        {listing.status === 'sold' && <span className="listing-card__sold">Sold</span>}
        <button
          type="button"
          className="listing-card__like"
          aria-label={liked ? 'Unlike' : 'Like'}
          onClick={handleLike}
          disabled={saving}
        >
          {liked ? '❤️' : '🤍'}
        </button>
      </div>
      <div className="listing-card__body">
        <span className="listing-card__title">{listing.title}</span>
        <PriceTag priceINR={listing.priceINR} />
        <span className="listing-card__meta">{likes} likes · {listing.createdAgo}</span>
      </div>
    </Link>
  );
}
