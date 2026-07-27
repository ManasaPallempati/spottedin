import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import TopBar from '../components/TopBar';
import Avatar from '../components/Avatar';
import EmptyState from '../components/EmptyState';
import ListingCard from '../components/ListingCard';
import { getSeller, getSellerListings, subscribe } from '../data/store';
import type { Listing, Seller } from '../data/types';
import './SellerProfile.css';

export default function SellerProfile() {
  const { id } = useParams();
  const [seller, setSeller] = useState<Seller | undefined>(() => (id ? getSeller(id) : undefined));
  const [listings, setListings] = useState<Listing[]>(() => (id ? getSellerListings(id) : []));

  useEffect(() => {
    if (!id) return;
    setSeller(getSeller(id));
    setListings(getSellerListings(id));
    return subscribe(() => {
      setSeller(getSeller(id));
      setListings(getSellerListings(id));
    });
  }, [id]);

  if (!seller) {
    return (
      <div>
        <TopBar title="Seller" />
        <EmptyState emoji="🧑" title="Seller not found" />
      </div>
    );
  }

  const liveCount = listings.filter((l) => l.status === 'live').length;

  return (
    <div className="seller-profile">
      <TopBar title={seller.handle} />

      <div className="seller-profile__header">
        <Avatar emoji={seller.avatarEmoji} size={72} />
        <h2 className="seller-profile__name">{seller.name}</h2>
        <p className="seller-profile__handle">{seller.handle}</p>
        <p className="seller-profile__bio">{seller.bio}</p>
        <p className="seller-profile__city">📍 {seller.city}</p>

        <div className="seller-profile__stats">
          <div className="seller-profile__stat">
            <span className="seller-profile__stat-value">⭐ {seller.rating.toFixed(1)}</span>
            <span className="seller-profile__stat-label">Rating</span>
          </div>
          <div className="seller-profile__stat">
            <span className="seller-profile__stat-value">{seller.sales}</span>
            <span className="seller-profile__stat-label">Sales</span>
          </div>
          <div className="seller-profile__stat">
            <span className="seller-profile__stat-value">{liveCount}</span>
            <span className="seller-profile__stat-label">Listed</span>
          </div>
        </div>
      </div>

      {listings.length === 0 ? (
        <EmptyState emoji="📦" title="Nothing listed yet" subtitle="Items this seller lists will show up here." />
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
