// Data layer — the ONLY module that touches localStorage. Screens/components
// must go through these functions, never read/write storage directly.

import type {
  AuthUser,
  Category,
  CreateListingInput,
  Listing,
  Order,
  PayMethod,
  Seller,
  Thread,
} from './types';
import { listings as seedListings, sellers, threads as seedThreads } from './seed';

const KEYS = {
  listings: 'maanster.listings',
  threads: 'maanster.threads',
  orders: 'maanster.orders',
  auth: 'maanster.auth',
  liked: 'maanster.likedIds',
} as const;

const AUTO_REPLIES = [
  'Sounds good!',
  'Sure, that works for me.',
  'Let me check and get back to you.',
  'Yes, still available!',
  'Thanks for your interest 🙏',
  'Can do, deal!',
];

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
  return load<Listing[]>(KEYS.listings, seedListings);
}
function writeListings(list: Listing[]): void {
  save(KEYS.listings, list);
}

function readThreads(): Thread[] {
  return load<Thread[]>(KEYS.threads, seedThreads);
}
function writeThreads(list: Thread[]): void {
  save(KEYS.threads, list);
}

function readOrders(): Order[] {
  return load<Order[]>(KEYS.orders, []);
}
function writeOrders(list: Order[]): void {
  save(KEYS.orders, list);
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
  const user = getUser();
  const listing: Listing = {
    id: `l-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
    sellerId: user?.sellerId ?? sellers[0].id,
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
  return sellers.find((s) => s.id === id);
}

export function getSellerListings(id: string): Listing[] {
  return readListings().filter((l) => l.sellerId === id);
}

// ---- Threads / chat ------------------------------------------------------

export function getThreads(): Thread[] {
  return readThreads();
}

export function getThread(id: string): Thread | undefined {
  return readThreads().find((t) => t.id === id);
}

export function getOrCreateThreadForListing(listingId: string): Thread {
  const existing = readThreads().find((t) => t.listingId === listingId);
  if (existing) return existing;

  const listing = getListing(listingId);
  const thread: Thread = {
    id: `t-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
    listingId,
    peerId: listing?.sellerId ?? sellers[0].id,
    messages: [],
  };
  writeThreads([thread, ...readThreads()]);
  emit();
  return thread;
}

export function sendMessage(threadId: string, text: string): void {
  const all = readThreads();
  const idx = all.findIndex((t) => t.id === threadId);
  if (idx === -1 || !text.trim()) return;

  all[idx] = {
    ...all[idx],
    messages: [...all[idx].messages, { from: 'me', text: text.trim(), timeAgo: 'just now' }],
  };
  writeThreads(all);
  emit();

  window.setTimeout(() => {
    const latest = readThreads();
    const i = latest.findIndex((t) => t.id === threadId);
    if (i === -1) return;
    const reply = AUTO_REPLIES[Math.floor(Math.random() * AUTO_REPLIES.length)];
    latest[i] = {
      ...latest[i],
      messages: [...latest[i].messages, { from: 'peer', text: reply, timeAgo: 'just now' }],
    };
    writeThreads(latest);
    emit();
  }, 1200);
}

// ---- Checkout / orders ---------------------------------------------------

export function placeOrder(listingId: string, payMethod: PayMethod): Order {
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
  writeOrders([order, ...readOrders()]);

  all[idx] = { ...all[idx], status: 'sold' };
  writeListings(all);

  emit();
  return order;
}

export function getOrder(id: string): Order | undefined {
  return readOrders().find((o) => o.id === id);
}

// ---- Auth (mocked phone-OTP) ---------------------------------------------

export function getUser(): AuthUser | null {
  return load<AuthUser | null>(KEYS.auth, null);
}

export function loginWithOtp(phone: string, _otp: string): AuthUser {
  const digits = phone.replace(/\D/g, '');
  const digitSum = digits.split('').reduce((sum, d) => sum + Number(d), 0);
  const sellerId = sellers[digitSum % sellers.length].id;
  const user: AuthUser = { phone: digits, sellerId };
  save(KEYS.auth, user);
  emit();
  return user;
}

export function logout(): void {
  localStorage.removeItem(KEYS.auth);
  emit();
}
