// Supabase-backed profile CRUD. This is the durable, RLS-protected source of
// truth for Supabase-authenticated accounts. Checkout/orders remain
// browser-local; the other first-beta data has dedicated Supabase adapters.
import { supabase } from './supabase';
import { cacheSellerProfile } from './store';
import { normalizeProfileHandle } from '../auth/validation';
import type { Seller, UpdateProfileInput } from './types';

interface ProfileRow {
  id: string;
  handle: string;
  name: string;
  avatar_emoji: string;
  bio: string;
  city: string;
  rating: number;
  sales: number;
}

export interface ClaimProfileInput {
  name: string;
  handle: string;
  city: string;
  bio: string;
  avatarEmoji: string;
}

export class HandleTakenError extends Error {
  constructor(handle: string) {
    super(`The handle ${handle} is already taken`);
    this.name = 'HandleTakenError';
  }
}

function rowToSeller(row: ProfileRow): Seller {
  return {
    id: row.id,
    handle: row.handle,
    name: row.name,
    avatarEmoji: row.avatar_emoji,
    bio: row.bio,
    city: row.city,
    rating: row.rating,
    sales: row.sales,
  };
}

function isUniqueViolation(error: { code?: string }): boolean {
  return error.code === '23505';
}

/** Fetches a profile by its Supabase auth user id. Returns undefined if none exists or Supabase isn't configured. */
export async function fetchProfile(id: string): Promise<Seller | undefined> {
  if (!supabase) return undefined;
  const { data, error } = await supabase.from('profiles').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  if (!data) return undefined;
  const seller = rowToSeller(data as ProfileRow);
  cacheSellerProfile(seller);
  return seller;
}

/** Best-effort availability pre-check (public read policy). The unique index remains authoritative. */
export async function isHandleAvailable(handle: string): Promise<boolean> {
  if (!supabase) return true;
  const normalized = normalizeProfileHandle(handle);
  const { data, error } = await supabase
    .from('profiles')
    .select('id')
    .ilike('handle', normalized)
    .maybeSingle();
  if (error) return true;
  return !data;
}

export async function claimProfile(userId: string, input: ClaimProfileInput): Promise<Seller> {
  if (!supabase) throw new Error('Supabase authentication is not configured for this build');
  const handle = normalizeProfileHandle(input.handle);
  const { data, error } = await supabase
    .from('profiles')
    .insert({
      id: userId,
      handle,
      name: input.name.trim(),
      avatar_emoji: input.avatarEmoji.trim().slice(0, 4) || '🙂',
      bio: input.bio.trim().slice(0, 500),
      city: input.city.trim() || 'India',
    })
    .select('*')
    .single();
  if (error) {
    if (isUniqueViolation(error)) throw new HandleTakenError(handle);
    throw error;
  }
  const seller = rowToSeller(data as ProfileRow);
  cacheSellerProfile(seller);
  return seller;
}

export async function updateProfileRemote(userId: string, input: UpdateProfileInput): Promise<Seller> {
  if (!supabase) throw new Error('Supabase authentication is not configured for this build');
  const handle = normalizeProfileHandle(input.handle);
  const { data, error } = await supabase
    .from('profiles')
    .update({
      handle,
      name: input.name.trim(),
      avatar_emoji: input.avatarEmoji.trim().slice(0, 4) || '🙂',
      bio: input.bio.trim().slice(0, 500) || 'New to Maanster Market',
      city: input.city.trim() || 'India',
    })
    .eq('id', userId)
    .select('*')
    .single();
  if (error) {
    if (isUniqueViolation(error)) throw new HandleTakenError(handle);
    throw error;
  }
  const seller = rowToSeller(data as ProfileRow);
  cacheSellerProfile(seller);
  return seller;
}

export type EnsureProfileResult =
  | { status: 'ready'; profile: Seller }
  | { status: 'conflict'; metadata: ClaimProfileInput }
  | { status: 'error'; error: unknown };

/**
 * Signup with email confirmation enabled normally returns no session, so the
 * profile row can't be created at signup time. This runs once a verified
 * session exists: read the profile, or claim it from the non-authoritative
 * signup metadata carried on the auth user. A fragile auth.users trigger is
 * deliberately avoided — a failed claim (e.g. handle race) surfaces as
 * 'conflict' instead of silently blocking signup.
 */
export async function ensureProfileForUser(
  userId: string,
  metadata: Record<string, unknown>,
): Promise<EnsureProfileResult> {
  try {
    const existing = await fetchProfile(userId);
    if (existing) return { status: 'ready', profile: existing };

    const claimInput: ClaimProfileInput = {
      name: typeof metadata.name === 'string' && metadata.name.trim() ? metadata.name : 'New seller',
      handle: typeof metadata.handle === 'string' && metadata.handle.trim()
        ? metadata.handle
        : `user${userId.slice(0, 8)}`,
      city: typeof metadata.city === 'string' ? metadata.city : 'India',
      bio: typeof metadata.bio === 'string' ? metadata.bio : '',
      avatarEmoji: typeof metadata.avatarEmoji === 'string' ? metadata.avatarEmoji : '🙂',
    };

    try {
      const profile = await claimProfile(userId, claimInput);
      return { status: 'ready', profile };
    } catch (err) {
      if (err instanceof HandleTakenError) {
        // Session restoration and SIGNED_IN/INITIAL_SESSION may race. If
        // another in-flight claim inserted this user's row first, the losing
        // insert also reports 23505. Refetch before calling it a handle clash.
        const racedProfile = await fetchProfile(userId);
        if (racedProfile) return { status: 'ready', profile: racedProfile };
        return { status: 'conflict', metadata: claimInput };
      }
      return { status: 'error', error: err };
    }
  } catch (err) {
    return { status: 'error', error: err };
  }
}
