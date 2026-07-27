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

// Mock auth — phone-OTP always succeeds. `sellerId` is which seeded seller
// the logged-in demo user "is" (drives the Profile tab / SellerProfile screen).
export interface AuthUser {
  phone: string;
  sellerId: string;
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
