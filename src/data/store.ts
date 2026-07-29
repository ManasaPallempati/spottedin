// Data layer — the ONLY module that touches localStorage. Screens/components
// must go through these functions, never read/write storage directly.

import type {
  AuthUser,
  Category,
  CreateListingInput,
  Listing,
  Order,
  PayMethod,
  RegisterInput,
  Seller,
  Thread,
  UpdateProfileInput,
} from './types';
import { listings as seedListings, sellers, threads as seedThreads } from './seed';
import { isValidProfileHandle, normalizeEmail, normalizeProfileHandle } from '../auth/validation';
import { isSupabaseConfigured, supabase } from './supabase';

const KEYS = {
  listings: 'maanster.listings',
  threads: 'maanster.threads',
  orders: 'maanster.orders',
  auth: 'maanster.auth',
  accounts: 'maanster.accounts',
  profiles: 'maanster.profiles',
  liked: 'maanster.likedIds',
} as const;

interface StoredAccount {
  user: AuthUser;
  passwordSalt: string;
  passwordHash: string;
}

const AUTO_REPLIES = [
  'Sounds good!',
  'Sure, that works for me.',
  'Let me check and get back to you.',
  'Yes, still available!',
  'Thanks for your interest 🙏',
  'Can do, deal!',
];

let remoteListings: Listing[] = [];

function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function save<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    console.error(`maanster: failed to persist "${key}"`, err);
  }
}

function emit(): void {
  window.dispatchEvent(new CustomEvent('maanster:update'));
}

/** Subscribe to any store mutation (listings, threads, orders, auth). Returns an unsubscribe fn. */
export function subscribe(cb: () => void): () => void {
  window.addEventListener('maanster:update', cb);
  return () => window.removeEventListener('maanster:update', cb);
}

function readListings(): Listing[] {
  if (isSupabaseConfigured) return remoteListings;
  return load<Listing[]>(KEYS.listings, seedListings);
}
function writeListings(list: Listing[]): void {
  if (isSupabaseConfigured) {
    remoteListings = list;
    return;
  }
  save(KEYS.listings, list);
}

/** Updates the in-memory read cache used by synchronous UI consumers in Supabase mode. */
export function cacheRemoteListings(listings: Listing[], replace = false): void {
  if (!isSupabaseConfigured) return;
  if (replace) {
    remoteListings = listings;
  } else {
    const incomingIds = new Set(listings.map((listing) => listing.id));
    remoteListings = [...listings, ...remoteListings.filter((listing) => !incomingIds.has(listing.id))];
  }
  emit();
}

/** Replaces only one seller's cached listings while preserving other fetched rows. */
export function cacheRemoteSellerListings(sellerId: string, listings: Listing[]): void {
  if (!isSupabaseConfigured) return;
  remoteListings = [
    ...listings,
    ...remoteListings.filter((listing) => listing.sellerId !== sellerId),
  ];
  emit();
}

function scopedKey(key: string, userId: string): string {
  return `${key}.${userId}`;
}

function cloneSeedThreads(): Thread[] {
  return seedThreads.map((thread) => ({
    ...thread,
    messages: thread.messages.map((message) => ({ ...message })),
  }));
}

function readThreads(userId: string): Thread[] {
  return load<Thread[]>(scopedKey(KEYS.threads, userId), cloneSeedThreads());
}

function writeThreads(userId: string, list: Thread[]): void {
  save(scopedKey(KEYS.threads, userId), list);
}

function readOrders(userId: string): Order[] {
  return load<Order[]>(scopedKey(KEYS.orders, userId), []);
}

function writeOrders(userId: string, list: Order[]): void {
  save(scopedKey(KEYS.orders, userId), list);
}

function readLiked(): string[] {
  return load<string[]>(KEYS.liked, []);
}
function writeLiked(ids: string[]): void {
  save(KEYS.liked, ids);
}

// ---- Feed / listings -------------------------------------------------

export function getFeed(filter?: Category): Listing[] {
  const all = readListings();
  return filter ? all.filter((l) => l.category === filter) : all;
}

export function getListing(id: string): Listing | undefined {
  return readListings().find((l) => l.id === id);
}

export function isLiked(id: string): boolean {
  return readLiked().includes(id);
}

export function toggleLike(id: string): void {
  const all = readListings();
  const idx = all.findIndex((l) => l.id === id);
  if (idx === -1) return;

  const liked = readLiked();
  const likedIdx = liked.indexOf(id);
  const nowLiked = likedIdx === -1;

  all[idx] = { ...all[idx], likes: all[idx].likes + (nowLiked ? 1 : -1) };
  writeListings(all);

  if (nowLiked) writeLiked([...liked, id]);
  else writeLiked(liked.filter((likedId) => likedId !== id));

  emit();
}

export function createListing(input: CreateListingInput): Listing {
  if (isSupabaseConfigured) {
    throw new Error('Use the cloud listing adapter when Supabase is configured');
  }
  const user = getUser();
  if (!user) throw new Error('Log in to create a listing');
  if (isSupabaseConfigured && !getSeller(user.sellerId)) {
    throw new Error('Finish setting up your profile before creating a listing');
  }

  const listing: Listing = {
    id: `l-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
    sellerId: user.sellerId,
    title: input.title,
    description: input.description,
    priceINR: input.priceINR,
    category: input.category,
    size: input.size,
    condition: input.condition,
    imageKind: 'gradient',
    gradient: input.gradient,
    emoji: input.emoji,
    photoDataUrl: input.photoDataUrl,
    likes: 0,
    status: 'live',
    createdAgo: 'just now',
  };

  writeListings([listing, ...readListings()]);
  emit();
  return listing;
}

// ---- Sellers -----------------------------------------------------------

export function getSeller(id: string): Seller | undefined {
  return load<Seller[]>(KEYS.profiles, []).find((s) => s.id === id)
    ?? sellers.find((s) => s.id === id);
}

/**
 * Upserts a profile into the local read cache (`KEYS.profiles`). Supabase is
 * the durable source of truth for Supabase-backed profiles; this cache only
 * lets synchronous screens (ListingDetail, Chat, Inbox…) render them without
 * an await, the same way it already does for the browser-local demo profiles.
 */
export function cacheSellerProfile(profile: Seller): void {
  const profiles = load<Seller[]>(KEYS.profiles, []);
  const index = profiles.findIndex((p) => p.id === profile.id);
  if (index === -1) profiles.push(profile);
  else profiles[index] = profile;
  save(KEYS.profiles, profiles);
  emit();
}

export function getSellerListings(id: string): Listing[] {
  return readListings().filter((l) => l.sellerId === id);
}

// ---- Threads / chat ------------------------------------------------------

export function getThreads(): Thread[] {
  const user = getUser();
  if (!user) return [];
  return readThreads(user.id);
}

export function getThread(id: string): Thread | undefined {
  const user = getUser();
  if (!user) return undefined;
  return readThreads(user.id).find((t) => t.id === id);
}

export function getOrCreateThreadForListing(listingId: string): Thread {
  const user = getUser();
  if (!user) throw new Error('Log in to message a seller');
  if (isSupabaseConfigured && !getSeller(user.sellerId)) {
    throw new Error('Finish setting up your profile before messaging a seller');
  }
  const threads = readThreads(user.id);
  const existing = threads.find((t) => t.listingId === listingId);
  if (existing) return existing;

  const listing = getListing(listingId);
  const thread: Thread = {
    id: `t-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
    listingId,
    peerId: listing?.sellerId ?? sellers[0].id,
    messages: [],
  };
  writeThreads(user.id, [thread, ...threads]);
  emit();
  return thread;
}

export function sendMessage(threadId: string, text: string): void {
  const user = getUser();
  if (!user) throw new Error('Log in to send a message');
  if (isSupabaseConfigured && !getSeller(user.sellerId)) {
    throw new Error('Finish setting up your profile before sending a message');
  }
  const userId = user.id;
  const all = readThreads(userId);
  const idx = all.findIndex((t) => t.id === threadId);
  if (idx === -1 || !text.trim()) return;

  all[idx] = {
    ...all[idx],
    messages: [...all[idx].messages, { from: 'me', text: text.trim(), timeAgo: 'just now' }],
  };
  writeThreads(userId, all);
  emit();

  window.setTimeout(() => {
    const latest = readThreads(userId);
    const i = latest.findIndex((t) => t.id === threadId);
    if (i === -1) return;
    const reply = AUTO_REPLIES[Math.floor(Math.random() * AUTO_REPLIES.length)];
    latest[i] = {
      ...latest[i],
      messages: [...latest[i].messages, { from: 'peer', text: reply, timeAgo: 'just now' }],
    };
    writeThreads(userId, latest);
    emit();
  }, 1200);
}

// ---- Checkout / orders ---------------------------------------------------

export function placeOrder(listingId: string, payMethod: PayMethod): Order {
  const user = getUser();
  if (!user) throw new Error('Log in to place an order');
  if (isSupabaseConfigured && !getSeller(user.sellerId)) {
    throw new Error('Finish setting up your profile before placing an order');
  }
  const all = readListings();
  const idx = all.findIndex((l) => l.id === listingId);
  if (idx === -1) throw new Error('Listing not found');
  if (all[idx].status === 'sold') throw new Error('This item has already been sold');

  const order: Order = {
    id: `ord-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
    listingId,
    status: 'placed',
    payMethod,
  };
  writeOrders(user.id, [order, ...readOrders(user.id)]);

  all[idx] = { ...all[idx], status: 'sold' };
  writeListings(all);

  emit();
  return order;
}

export function getOrder(id: string): Order | undefined {
  const user = getUser();
  if (!user) return undefined;
  return readOrders(user.id).find((o) => o.id === id);
}

// ---- Auth --------------------------------------------------------------
// When Supabase is configured, the session lives in Supabase and
// `setSessionUser` (called by AuthProvider's onAuthStateChange) is the only
// writer of `supabaseSessionUser` below — no synchronous localStorage read
// decides identity. When it isn't configured, this falls back to a
// browser-local demo account (PBKDF2-hashed password in localStorage — NOT
// production security).

let supabaseSessionUser: AuthUser | null = null;

/** Called by AuthProvider whenever the Supabase auth state resolves or changes. */
export function setSessionUser(user: AuthUser | null): void {
  supabaseSessionUser = user;
  emit();
}

export function getUser(): AuthUser | null {
  if (isSupabaseConfigured) return supabaseSessionUser;

  const user = load<AuthUser | null>(KEYS.auth, null);
  if (!user) return null;
  // Sessions from the old mocked-OTP build have no backing account/profile;
  // drop them so the app never shows an "own" profile it can't edit.
  if (!readAccounts().some((account) => account.user.id === user.id)) {
    localStorage.removeItem(KEYS.auth);
    return null;
  }
  return user;
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

async function hashPassword(password: string, saltHex: string): Promise<string> {
  const encoder = new TextEncoder();
  const saltParts = saltHex.match(/.{1,2}/g) ?? [];
  const salt = new Uint8Array(saltParts.map((part) => Number.parseInt(part, 16)));
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveBits'],
  );
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt, iterations: 120_000 },
    key,
    256,
  );
  return bytesToHex(new Uint8Array(bits));
}

function readAccounts(): StoredAccount[] {
  return load<StoredAccount[]>(KEYS.accounts, []);
}

// Local-demo-only account creation/login. Never called when Supabase is
// configured — Login.tsx routes to AuthProvider's signUp/signIn instead, and
// these guard clauses are defense in depth against accidental misuse.

export async function registerUser(input: RegisterInput): Promise<AuthUser> {
  if (isSupabaseConfigured) throw new Error('Supabase authentication is configured; local demo accounts are disabled');

  const email = normalizeEmail(input.email);
  const handle = normalizeProfileHandle(input.handle);
  const accounts = readAccounts();
  const profiles = load<Seller[]>(KEYS.profiles, []);

  if (!input.name.trim()) throw new Error('Enter your name');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Enter a valid email address');
  if (input.password.length < 8) throw new Error('Password must be at least 8 characters');
  if (!isValidProfileHandle(handle)) throw new Error('Handle must be 3–30 letters, numbers, dots, or underscores');
  if (accounts.some((account) => account.user.email === email)) throw new Error('That email is already registered');
  if ([...sellers, ...profiles].some((seller) => seller.handle.toLowerCase() === handle)) {
    throw new Error('That handle is already taken');
  }

  const id = `u-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  const sellerId = `seller-${id}`;
  const user: AuthUser = { id, email, sellerId };
  const profile: Seller = {
    id: sellerId,
    handle,
    name: input.name.trim(),
    avatarEmoji: input.avatarEmoji.trim().slice(0, 4) || '🙂',
    bio: input.bio.trim() || 'New to Maanster Market',
    city: input.city.trim() || 'India',
    rating: 0,
    sales: 0,
  };
  const passwordSalt = bytesToHex(crypto.getRandomValues(new Uint8Array(16)));
  const passwordHash = await hashPassword(input.password, passwordSalt);

  save(KEYS.accounts, [...accounts, { user, passwordSalt, passwordHash }]);
  save(KEYS.profiles, [...profiles, profile]);
  save(KEYS.auth, user);
  emit();
  return user;
}

export async function loginWithPassword(email: string, password: string): Promise<AuthUser> {
  if (isSupabaseConfigured) throw new Error('Supabase authentication is configured; local demo accounts are disabled');

  const normalized = normalizeEmail(email);
  const account = readAccounts().find((candidate) => candidate.user.email === normalized);

  if (!account || await hashPassword(password, account.passwordSalt) !== account.passwordHash) {
    throw new Error('Email or password is incorrect');
  }

  save(KEYS.auth, account.user);
  emit();
  return account.user;
}

export function updateMyProfile(input: UpdateProfileInput): Seller {
  if (isSupabaseConfigured) throw new Error('Supabase authentication is configured; update the profile via profiles.ts');
  const user = getUser();
  if (!user) throw new Error('Log in to update your profile');

  const profiles = load<Seller[]>(KEYS.profiles, []);
  const index = profiles.findIndex((profile) => profile.id === user.sellerId);
  if (index === -1) throw new Error('Profile not found');

  const handle = normalizeProfileHandle(input.handle);
  if (!input.name.trim()) throw new Error('Enter your name');
  if (!isValidProfileHandle(handle)) throw new Error('Handle must be 3–30 letters, numbers, dots, or underscores');
  if ([...sellers, ...profiles].some((profile) => (
    profile.id !== user.sellerId && profile.handle.toLowerCase() === handle
  ))) {
    throw new Error('That handle is already taken');
  }

  const profile: Seller = {
    ...profiles[index],
    name: input.name.trim(),
    handle,
    city: input.city.trim() || 'India',
    bio: input.bio.trim() || 'New to Maanster Market',
    avatarEmoji: input.avatarEmoji.trim().slice(0, 4) || '🙂',
  };
  profiles[index] = profile;
  save(KEYS.profiles, profiles);
  emit();
  return profile;
}

export async function logout(): Promise<void> {
  if (isSupabaseConfigured) {
    // onAuthStateChange fires setSessionUser(null) once Supabase confirms sign-out.
    await supabase?.auth.signOut();
    return;
  }
  localStorage.removeItem(KEYS.auth);
  emit();
}
