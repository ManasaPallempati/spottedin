import { isLiked, toggleLike } from './store';
import { isSupabaseConfigured, requireSupabase } from './supabase';
import { loadListing } from './listings';
import type { Listing } from './types';

interface FavoriteRow {
  listing_id: string;
  created_at: string;
}

export async function loadFavoriteIds(userId: string): Promise<string[]> {
  if (!isSupabaseConfigured) {
    return [];
  }

  const { data, error } = await requireSupabase()
    .from('favorites')
    .select('listing_id,created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data as FavoriteRow[]).map((favorite) => favorite.listing_id);
}

export async function isMarketplaceFavorite(
  listingId: string,
  userId: string,
): Promise<boolean> {
  if (!isSupabaseConfigured) return isLiked(listingId);

  const { data, error } = await requireSupabase()
    .from('favorites')
    .select('listing_id')
    .eq('user_id', userId)
    .eq('listing_id', listingId)
    .maybeSingle();
  if (error) throw error;
  return Boolean(data);
}

export async function loadSavedListings(userId: string): Promise<Listing[]> {
  if (!isSupabaseConfigured) {
    return [];
  }

  const ids = await loadFavoriteIds(userId);
  const listings = await Promise.all(ids.map((id) => loadListing(id)));
  return listings.filter((listing): listing is Listing => Boolean(listing));
}

export async function setMarketplaceFavorite(
  listingId: string,
  userId: string,
  favorite: boolean,
): Promise<boolean> {
  if (!isSupabaseConfigured) {
    if (isLiked(listingId) !== favorite) toggleLike(listingId);
    return favorite;
  }

  const client = requireSupabase();
  if (favorite) {
    const { error } = await client
      .from('favorites')
      .upsert(
        { listing_id: listingId, user_id: userId },
        { onConflict: 'user_id,listing_id', ignoreDuplicates: true },
      );
    if (error) throw error;
  } else {
    const { error } = await client
      .from('favorites')
      .delete()
      .eq('user_id', userId)
      .eq('listing_id', listingId);
    if (error) throw error;
  }
  await loadListing(listingId);
  return favorite;
}

export async function toggleMarketplaceFavorite(
  listingId: string,
  userId: string,
): Promise<boolean> {
  if (!isSupabaseConfigured) {
    const favorite = !isLiked(listingId);
    toggleLike(listingId);
    return favorite;
  }

  const favorite = await isMarketplaceFavorite(listingId, userId);
  return setMarketplaceFavorite(listingId, userId, !favorite);
}
