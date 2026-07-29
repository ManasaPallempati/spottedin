import type { DropRate } from "@/lib/pricing";

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
  floorPrice: number;
  dropRate: DropRate;
  listedAt: string;
  status: "live" | "sold" | "ended";
  sellerHandle: string;
  spots: number;
  watching: number;
  description: string;
  /** Placeholder art until real photos exist: gradient stops + alt text. */
  photo: { c1: string; c2: string; alt: string };
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
}

export interface ThreadPreview {
  id: string;
  listingId: string;
  withHandle: string;
  lastMessage: string;
  unread: boolean;
}

export interface Message {
  id: string;
  from: "me" | "them";
  type: "text" | "offer";
  body: string;
  offerAmount?: number;
  offerStatus?: "sent" | "accepted" | "declined" | "expired";
}

export interface Thread extends ThreadPreview {
  messages: Message[];
}

export interface Order {
  id: string;
  listingId: string;
  pricePaid: number;
  shippingOption: "tracked" | "express";
  status: string;
  carrier: string;
  eta: string;
  steps: { label: string; state: "done" | "active" | "next" }[];
}
