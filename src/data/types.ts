// Core data model — shared by every screen/agent. Do not fork these shapes locally;
// import from here so the whole app stays on one source of truth.

export type Category = 'women' | 'men' | 'sneakers' | 'electronics' | 'home' | 'vintage';
export type Condition = 'new' | 'like-new' | 'good' | 'fair';
export type ListingStatus = 'live' | 'sold';
export type PayMethod = 'upi' | 'card' | 'cod';
export type MsgSender = 'me' | 'peer';

export interface Seller {
  id: string;
  handle: string;
  name: string;
  avatarEmoji: string;
  bio: string;
  city: string;
  rating: number; // 0–5
  sales: number;
}

export interface Listing {
  id: string;
  sellerId: string;
  title: string;
  description: string;
  priceINR: number;
  category: Category;
  size?: string;
  condition: Condition;
  imageKind: 'gradient';
  gradient: [string, string];
  emoji: string;
  photoDataUrl?: string;
  likes: number;
  status: ListingStatus;
  createdAgo: string;
}

export interface Msg {
  from: MsgSender;
  text: string;
  timeAgo: string;
}

export interface Thread {
  id: string;
  listingId: string;
  peerId: string;
  messages: Msg[];
}

export interface Order {
  id: string;
  listingId: string;
  status: 'placed';
  payMethod: PayMethod;
}

// Browser-local demo auth (email or mobile + password, PBKDF2-hashed in
// localStorage — NOT production security). `sellerId` points at the Seller
// profile created for this account (drives the Profile tab / SellerProfile).
export interface AuthUser {
  id: string;
  email: string;
  phone: string;
  sellerId: string;
}

export interface RegisterInput {
  name: string;
  handle: string;
  email: string;
  phone: string;
  password: string;
  city: string;
  bio: string;
  avatarEmoji: string;
}

export interface UpdateProfileInput {
  name: string;
  handle: string;
  city: string;
  bio: string;
  avatarEmoji: string;
}

// Input shape for creating a listing — everything the data layer fills in
// (id, sellerId, likes, status, createdAgo) is omitted here.
export interface CreateListingInput {
  title: string;
  description: string;
  priceINR: number;
  category: Category;
  size?: string;
  condition: Condition;
  gradient: [string, string];
  emoji: string;
  photoDataUrl?: string;
}
