import type { DropRate } from "@/lib/pricing";

export interface ListingPhoto {
  /** Remote stock/product photo; the gradient renders behind it as a fallback. */
  src: string | null;
  alt: string;
  c1: string;
  c2: string;
}

export interface Listing {
  id: string;
  title: string;
  brand: string;
  size: string;
  condition: string;
  era: string;
  category: "OUTERWEAR" | "TOPS" | "BOTTOMS" | "SHOES" | "BAGS";
  retailPrice: number | null;
  startPrice: number;
  /** Seller-private. Never rendered on buyer-facing surfaces — "floor hidden". */
  floorPrice: number;
  dropRate: DropRate;
  listedAt: string;
  status: "live" | "sold" | "ended";
  sellerHandle: string;
  spots: number;
  watching: number;
  description: string;
  /** First photo is the cover. */
  photos: ListingPhoto[];
}

export interface Seller {
  handle: string;
  rating: number;
  sales: number;
  repliesIn: string;
}

export interface Fit {
  id: string;
  sellerHandle: string;
  caption: string;
  plays: string;
  lookListingIds: string[];
  videoUrl: string | null;
  poster: ListingPhoto;
}

export interface Spot {
  listingId: string;
  userHandle: string;
  alertsOn: boolean;
}

export interface DeckSignal {
  listingId: string;
  userHandle: string;
  signal: "spot" | "drop";
  at: string;
}

export interface Offer {
  id: string;
  listingId: string;
  buyerHandle: string;
  amount: number;
  status: "sent" | "accepted" | "declined" | "expired";
  createdAt: string;
  /** Offers auto-expire 24h after send. */
  expiresAt: string;
}

export interface WantedPost {
  id: string;
  tags: string[];
  photoAlt: string;
  createdAt: string;
}

export interface ThreadPreview {
  id: string;
  listingId: string;
  withHandle: string;
  lastMessage: string;
  lastAt: string;
  unread: boolean;
}

export interface Message {
  id: string;
  from: "me" | "them";
  type: "text" | "offer";
  body: string;
  offerId?: string;
  offerAmount?: number;
}

export interface Thread extends ThreadPreview {
  messages: Message[];
}

export interface Order {
  id: string;
  listingId: string;
  buyerHandle: string;
  pricePaid: number;
  shippingOption: "tracked" | "express";
  shippingCost: number;
  total: number;
  status: string;
  carrier: string;
  eta: string;
  placedAt: string;
  steps: { label: string; detail: string; state: "done" | "active" | "next" }[];
}

/** Result of server-side checkout price resolution. Never trusts URL prices. */
export interface CheckoutPrice {
  price: number;
  source: "offer" | "drop";
  offerId?: string;
}
