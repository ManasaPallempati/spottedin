import { useState, type MouseEvent } from 'react';
import { Link } from 'react-router-dom';
import type { Listing } from '../data/types';
import { isLiked, toggleLike } from '../data/store';
import PriceTag from './PriceTag';

interface ListingCardProps {
  listing: Listing;
}

export default function ListingCard({ listing }: ListingCardProps) {
  const [liked, setLiked] = useState(() => isLiked(listing.id));
  const [likes, setLikes] = useState(listing.likes);

  function handleLike(e: MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    toggleLike(listing.id);
    setLiked((prev) => !prev);
    setLikes((prev) => prev + (liked ? -1 : 1));
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
