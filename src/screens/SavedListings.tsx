import { useEffect, useState } from 'react';
import ListingCard from '../components/ListingCard';
import EmptyState from '../components/EmptyState';
import { useAuth } from '../auth/AuthProvider';
import { loadSavedListings } from '../data/favorites';
import { getFeed, isLiked, subscribe } from '../data/store';
import { isSupabaseConfigured } from '../data/supabase';
import type { Listing } from '../data/types';

function loadLocalSavedListings(): Listing[] {
  return getFeed().filter((listing) => isLiked(listing.id));
}

export default function SavedListings() {
  const { user } = useAuth();
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user) return;
    let active = true;
    setLoading(true);
    setError('');

    if (isSupabaseConfigured) {
      void loadSavedListings(user.id)
        .then((next) => {
          if (active) setListings(next);
        })
        .catch((err: unknown) => {
          if (active) setError(err instanceof Error ? err.message : 'Could not load saved listings');
        })
        .finally(() => {
          if (active) setLoading(false);
        });
      return () => {
        active = false;
      };
    }

    const sync = () => {
      setListings(loadLocalSavedListings());
      setLoading(false);
    };
    sync();
    const unsubscribe = subscribe(sync);
    return () => {
      active = false;
      unsubscribe();
    };
  }, [user]);

  return (
    <div>
      <div className="top-bar">
        <h1 className="top-bar__title">Saved</h1>
      </div>
      {loading ? (
        <EmptyState emoji="⏳" title="Loading saved listings…" />
      ) : error ? (
        <EmptyState emoji="⚠️" title="Could not load saved listings" subtitle={error} />
      ) : listings.length === 0 ? (
        <EmptyState emoji="🤍" title="Nothing saved yet" subtitle="Tap the heart on a listing to keep it here." />
      ) : (
        <div className="listing-grid">
          {listings.map((listing) => <ListingCard key={listing.id} listing={listing} />)}
        </div>
      )}
    </div>
  );
}
