import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import TopBar from '../components/TopBar';
import Avatar from '../components/Avatar';
import EmptyState from '../components/EmptyState';
import ListingCard from '../components/ListingCard';
import {
  getSeller,
  getSellerListings,
  getUser,
  logout,
  subscribe,
  updateMyProfile,
} from '../data/store';
import type { Listing, Seller } from '../data/types';
import './SellerProfile.css';

export default function SellerProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [seller, setSeller] = useState<Seller | undefined>(() => (id ? getSeller(id) : undefined));
  const [listings, setListings] = useState<Listing[]>(() => (id ? getSellerListings(id) : []));
  const [editing, setEditing] = useState(false);
  const [profileError, setProfileError] = useState('');

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
  const isOwnProfile = getUser()?.sellerId === seller.id;

  function handleProfileSave(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    try {
      updateMyProfile({
        name: String(data.get('name') ?? ''),
        handle: String(data.get('handle') ?? ''),
        city: String(data.get('city') ?? ''),
        bio: String(data.get('bio') ?? ''),
        avatarEmoji: String(data.get('avatarEmoji') ?? ''),
      });
      setEditing(false);
      setProfileError('');
    } catch (err) {
      setProfileError(err instanceof Error ? err.message : 'Could not update profile');
    }
  }

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

        {isOwnProfile && !editing && (
          <div className="seller-profile__actions">
            <button type="button" className="btn btn-outline" onClick={() => setEditing(true)}>
              Edit profile
            </button>
            <button
              type="button"
              className="seller-profile__logout"
              onClick={() => {
                logout();
                navigate('/login', { replace: true });
              }}
            >
              Log out
            </button>
          </div>
        )}
      </div>

      {isOwnProfile && editing && (
        <form className="seller-profile__edit" onSubmit={handleProfileSave}>
          <div className="seller-profile__edit-row">
            <div>
              <label className="field-label" htmlFor="profile-avatar">Avatar</label>
              <input
                id="profile-avatar"
                name="avatarEmoji"
                className="input seller-profile__avatar-input"
                defaultValue={seller.avatarEmoji}
                maxLength={4}
              />
            </div>
            <div>
              <label className="field-label" htmlFor="profile-name">Full name</label>
              <input id="profile-name" name="name" className="input" defaultValue={seller.name} required />
            </div>
          </div>
          <label className="field-label" htmlFor="profile-handle">Handle</label>
          <input id="profile-handle" name="handle" className="input" defaultValue={seller.handle} required />
          <label className="field-label" htmlFor="profile-city">City</label>
          <input id="profile-city" name="city" className="input" defaultValue={seller.city} />
          <label className="field-label" htmlFor="profile-bio">Bio</label>
          <textarea id="profile-bio" name="bio" className="textarea" maxLength={160} defaultValue={seller.bio} />
          {profileError && <p className="seller-profile__error" role="alert">{profileError}</p>}
          <div className="seller-profile__edit-actions">
            <button type="button" className="btn btn-outline" onClick={() => setEditing(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary">Save profile</button>
          </div>
        </form>
      )}

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
