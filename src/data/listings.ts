import {
  cacheRemoteListings,
  cacheRemoteSellerListings,
  createListing as createLocalListing,
  getFeed,
  getListing,
  getSellerListings,
} from './store';
import { fetchProfile } from './profiles';
import { isSupabaseConfigured, requireSupabase } from './supabase';
import type { Category, Condition, CreateListingInput, Listing, ListingStatus } from './types';

const LISTING_COLUMNS = [
  'id',
  'seller_id',
  'title',
  'description',
  'price_inr',
  'category',
  'size',
  'condition',
  'gradient_start',
  'gradient_end',
  'emoji',
  'image_path',
  'likes',
  'status',
  'created_at',
].join(',');

const IMAGE_BUCKET = 'listing-images';
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const IMAGE_EXTENSIONS: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/heic': 'heic',
  'image/heif': 'heif',
};

export interface ListingRow {
  id: string;
  seller_id: string;
  title: string;
  description: string;
  price_inr: number;
  category: Category;
  size: string | null;
  condition: Condition;
  gradient_start: string;
  gradient_end: string;
  emoji: string;
  image_path: string | null;
  likes: number;
  status: ListingStatus;
  created_at: string;
}

export interface ListingImage {
  size: number;
  type: string;
}

function formatCreatedAgo(createdAt: string, now = Date.now()): string {
  const created = new Date(createdAt).getTime();
  if (!Number.isFinite(created)) return 'recently';
  const seconds = Math.max(0, Math.floor((now - created) / 1000));
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo`;
  return `${Math.floor(months / 12)}y`;
}

export function validateListingImage(image: ListingImage): string {
  if (!IMAGE_EXTENSIONS[image.type]) {
    throw new Error('Upload a JPEG, PNG, WebP, HEIC, or HEIF image');
  }
  if (image.size <= 0) throw new Error('The selected image is empty');
  if (image.size > MAX_IMAGE_BYTES) throw new Error('Listing images must be 8 MB or smaller');
  return IMAGE_EXTENSIONS[image.type];
}

export function listingRowToListing(
  row: ListingRow,
  publicImageUrl?: string,
  now?: number,
): Listing {
  return {
    id: row.id,
    sellerId: row.seller_id,
    title: row.title,
    description: row.description,
    priceINR: row.price_inr,
    category: row.category,
    size: row.size ?? undefined,
    condition: row.condition,
    imageKind: 'gradient',
    gradient: [row.gradient_start, row.gradient_end],
    emoji: row.emoji,
    photoDataUrl: publicImageUrl,
    likes: row.likes,
    status: row.status,
    createdAgo: formatCreatedAgo(row.created_at, now),
  };
}

function mapRemoteRow(row: ListingRow): Listing {
  const client = requireSupabase();
  const publicImageUrl = row.image_path
    ? client.storage.from(IMAGE_BUCKET).getPublicUrl(row.image_path).data.publicUrl
    : undefined;
  return listingRowToListing(row, publicImageUrl);
}

export async function loadFeed(category?: Category): Promise<Listing[]> {
  if (!isSupabaseConfigured) return getFeed(category);
  let query = requireSupabase()
    .from('listings')
    .select(LISTING_COLUMNS)
    .eq('status', 'live')
    .order('created_at', { ascending: false });
  if (category) query = query.eq('category', category);
  const { data, error } = await query;
  if (error) throw error;
  const listings = (data as unknown as ListingRow[]).map(mapRemoteRow);
  cacheRemoteListings(listings, !category);
  return listings;
}

export async function loadListing(id: string): Promise<Listing | undefined> {
  if (!isSupabaseConfigured) return getListing(id);
  const { data, error } = await requireSupabase()
    .from('listings')
    .select(LISTING_COLUMNS)
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return undefined;
  const listing = mapRemoteRow(data as unknown as ListingRow);
  await fetchProfile(listing.sellerId);
  cacheRemoteListings([listing]);
  return listing;
}

export async function loadSellerListings(sellerId: string): Promise<Listing[]> {
  if (!isSupabaseConfigured) return getSellerListings(sellerId);
  const { data, error } = await requireSupabase()
    .from('listings')
    .select(LISTING_COLUMNS)
    .eq('seller_id', sellerId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  const listings = (data as unknown as ListingRow[]).map(mapRemoteRow);
  cacheRemoteSellerListings(sellerId, listings);
  return listings;
}

export async function createMarketplaceListing(
  input: CreateListingInput,
  sellerId: string,
  image?: File,
): Promise<Listing> {
  if (!isSupabaseConfigured) return createLocalListing(input);

  const client = requireSupabase();
  const id = crypto.randomUUID();
  let imagePath: string | null = null;

  if (image) {
    const extension = validateListingImage(image);
    imagePath = `${sellerId}/${id}.${extension}`;
    const { error } = await client.storage.from(IMAGE_BUCKET).upload(imagePath, image, {
      cacheControl: '31536000',
      contentType: image.type,
      upsert: false,
    });
    if (error) throw error;
  }

  const { data, error } = await client
    .from('listings')
    .insert({
      id,
      seller_id: sellerId,
      title: input.title.trim(),
      description: input.description.trim(),
      price_inr: input.priceINR,
      category: input.category,
      size: input.size?.trim() || null,
      condition: input.condition,
      gradient_start: input.gradient[0],
      gradient_end: input.gradient[1],
      emoji: input.emoji,
      image_path: imagePath,
    })
    .select(LISTING_COLUMNS)
    .single();

  if (error) {
    if (imagePath) {
      // Best-effort rollback; report the database failure even if cleanup also fails.
      await client.storage.from(IMAGE_BUCKET).remove([imagePath]);
    }
    throw error;
  }

  const listing = mapRemoteRow(data as unknown as ListingRow);
  cacheRemoteListings([listing]);
  return listing;
}
