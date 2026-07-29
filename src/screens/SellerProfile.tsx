import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import TopBar from '../components/TopBar';
import Avatar from '../components/Avatar';
import EmptyState from '../components/EmptyState';
import ListingCard from '../components/ListingCard';
import { useAuth } from '../auth/AuthProvider';
import { fetchProfile } from '../data/profiles';
import { loadSellerListings } from '../data/listings';
import { isSupabaseConfigured } from '../data/supabase';
import { getSeller, getSellerListings, subscribe, updateMyProfile } from '../data/store';
import type { Listing, Seller, UpdateProfileInput } from '../data/types';
import './SellerProfile.css';

export default function SellerProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const {
    status,
    user,
    profileStatus,
    profileConflict,
    updateProfile,
    retryClaimProfile,
    signOut,
  } = useAuth();
  const [seller, setSeller] = useState<Seller | undefined>(() => (id ? getSeller(id) : undefined));
  const [listings, setListings] = useState<Listing[]>(() => (id ? getSellerListings(id) : []));
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [profileError, setProfileError] = useState('');
  const [listingsLoading, setListingsLoading] = useState(isSupabaseConfigured);
  const [listingsError, setListingsError] = useState('');

  useEffect(() => {
    if (!id) return;
    let active = true;
    const sync = () => {
      setSeller(getSeller(id));
      setListings(getSellerListings(id));
    };
    sync();
    // Supabase profiles reach the synchronous local cache via
    // cacheSellerProfile; a seller not cached yet (first visit to someone
    // else's profile) is fetched once — success emits and sync() re-renders.
    if (isSupabaseConfigured && !getSeller(id)) {
      void fetchProfile(id).catch(() => {});
    }
    if (isSupabaseConfigured) {
      setListingsLoading(true);
      setListingsError('');
      void loadSellerListings(id)
        .catch((err: unknown) => {
          if (active) {
            setListingsError(err instanceof Error ? err.message : 'Could not load listings');
          }
        })
        .finally(() => {
          if (active) setListingsLoading(false);
        });
    } else {
      setListingsLoading(false);
    }
    const unsubscribe = subscribe(sync);
    return () => {
      active = false;
      unsubscribe();
    };
  }, [id]);

  const isOwnProfile = user?.sellerId === id;

  function handleProfileSave(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const input: UpdateProfileInput = {
      name: String(data.get('name') ?? ''),
      handle: String(data.get('handle') ?? ''),
      city: String(data.get('city') ?? ''),
      bio: String(data.get('bio') ?? ''),
      avatarEmoji: String(data.get('avatarEmoji') ?? ''),
    };
    void (async () => {
      setSaving(true);
      try {
        if (isSupabaseConfigured) await updateProfile(input);
        else updateMyProfile(input);
        setEditing(false);
        setProfileError('');
      } catch (err) {
        setProfileError(err instanceof Error ? err.message : 'Could not update profile');
      } finally {
        setSaving(false);
      }
    })();
  }

  function handleClaim(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!profileConflict) return;
    const handle = String(new FormData(e.currentTarget).get('handle') ?? '');
    void (async () => {
      setSaving(true);
      try {
        await retryClaimProfile({ ...profileConflict, handle });
        setProfileError('');
      } catch (err) {
        setProfileError(err instanceof Error ? err.message : 'Could not claim that handle');
      } finally {
        setSaving(false);
      }
    })();
  }

  function handleLogout() {
    void (async () => {
      try {
        await signOut();
        navigate('/login', { replace: true });
      } catch (err) {
        setProfileError(err instanceof Error ? err.message : 'Could not log out');
      }
    })();
  }

  if (!seller) {
    if (isSupabaseConfigured && isOwnProfile && profileStatus === 'conflict' && profileConflict) {
      return (
        <div className="seller-profile">
          <TopBar title="Finish your profile" />
          <form className="seller-profile__edit" onSubmit={handleClaim}>
            <p>
              The handle {profileConflict.handle} is already taken. Pick a
              different one to finish setting up your profile.
            </p>
            <label className="field-label" htmlFor="claim-handle">Handle</label>
            <input
              id="claim-handle"
              name="handle"
              className="input"
              defaultValue={profileConflict.handle}
              maxLength={31}
              required
            />
            {profileError && <p className="seller-profile__error" role="alert">{profileError}</p>}
            <div className="seller-profile__edit-actions">
              <button type="button" className="seller-profile__logout" onClick={handleLogout}>
                Log out
              </button>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? 'Saving…' : 'Claim handle'}
              </button>
            </div>
          </form>
        </div>
      );
    }
    if (isSupabaseConfigured && isOwnProfile && profileStatus === 'error') {
      return (
        <div className="seller-profile">
          <TopBar title="Profile" />
          <EmptyState
            emoji="⚠️"
            title="Could not load your profile"
            subtitle="Your account is fine — only the profile fetch failed. Check your connection and reload."
          />
        </div>
      );
    }
    if (isSupabaseConfigured && (status === 'initializing' || (isOwnProfile && profileStatus !== 'ready'))) {
      return (
        <div className="seller-profile">
          <TopBar title="Profile" />
          <EmptyState emoji="⏳" title="Loading profile…" />
        </div>
      );
    }
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

        {isOwnProfile && !editing && (
          <div className="seller-profile__actions">
            <button type="button" className="btn btn-outline" onClick={() => setEditing(true)}>
              Edit profile
            </button>
            <button type="button" className="seller-profile__logout" onClick={handleLogout}>
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
              <input
                id="profile-name"
                name="name"
                className="input"
                defaultValue={seller.name}
                maxLength={80}
                required
              />
            </div>
          </div>
          <label className="field-label" htmlFor="profile-handle">Handle</label>
          <input
            id="profile-handle"
            name="handle"
            className="input"
            defaultValue={seller.handle}
            maxLength={31}
            required
          />
          <label className="field-label" htmlFor="profile-city">City</label>
          <input
            id="profile-city"
            name="city"
            className="input"
            defaultValue={seller.city}
            maxLength={80}
          />
          <label className="field-label" htmlFor="profile-bio">Bio</label>
          <textarea id="profile-bio" name="bio" className="textarea" maxLength={160} defaultValue={seller.bio} />
          {profileError && <p className="seller-profile__error" role="alert">{profileError}</p>}
          <div className="seller-profile__edit-actions">
            <button type="button" className="btn btn-outline" onClick={() => setEditing(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Saving…' : 'Save profile'}
            </button>
          </div>
        </form>
      )}

      {listingsLoading ? (
        <EmptyState emoji="⏳" title="Loading listings…" />
      ) : listingsError ? (
        <EmptyState emoji="⚠️" title="Could not load listings" subtitle={listingsError} />
      ) : listings.length === 0 ? (
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
