import type {
  CheckoutPrice,
  DeckSignal,
  Fit,
  Listing,
  Message,
  Offer,
  Order,
  Seller,
  Spot,
  Thread,
  ThreadPreview,
  WantedPost,
} from "./types";
import { createMockAdapter } from "./mock";

export interface NewListingDraft {
  title: string;
  brand: string;
  size: string;
  condition: string;
  category: Listing["category"];
  startPrice: number;
  floorPrice: number;
  dropRate: Listing["dropRate"];
  photoAlts: string[];
}

export interface NewMessageInput {
  from: "me" | "them";
  type?: "text" | "offer";
  body?: string;
  offerId?: string;
  offerAmount?: number;
}

export interface NewOrderInput {
  listingId: string;
  buyerHandle: string;
  offerId?: string;
  shippingOption: "tracked" | "express";
  now: Date;
}

// Single seam between the UI and its data source. Screens only ever talk to the
// adapter (directly or through the client store); mock mode needs zero
// credentials and is the default. Write methods on the Supabase adapter are
// explicit stubs until credentials + Phase 1 build-out land.
export interface SpottedData {
  /** No status filter returns every listing; screens filter for "live". */
  listListings(filter?: {
    category?: string;
    query?: string;
    status?: Listing["status"];
  }): Promise<Listing[]>;
  getListing(id: string): Promise<Listing | null>;
  getSeller(handle: string): Promise<Seller | null>;
  listFits(): Promise<Fit[]>;
  listThreads(): Promise<ThreadPreview[]>;
  getThread(id: string): Promise<Thread | null>;
  getOrder(id: string): Promise<Order | null>;
  listOrders(buyerHandle: string): Promise<Order[]>;

  listSpots(userHandle: string): Promise<Spot[]>;
  setSpot(userHandle: string, listingId: string, on: boolean): Promise<void>;
  recordDeckSignal(signal: DeckSignal): Promise<void>;

  createOffer(input: {
    listingId: string;
    buyerHandle: string;
    amount: number;
    now: Date;
  }): Promise<Offer>;
  acceptOffer(offerId: string): Promise<Offer>;
  /**
   * Server-side checkout price. Uses an accepted, non-expired offer belonging
   * to this buyer+listing when one exists; otherwise the live drop price.
   * URL-supplied prices are never trusted.
   */
  resolveCheckoutPrice(input: {
    listingId: string;
    buyerHandle: string;
    offerId?: string;
    now: Date;
  }): Promise<CheckoutPrice>;

  createListing(draft: NewListingDraft, sellerHandle: string, now: Date): Promise<Listing>;
  createOrder(input: NewOrderInput): Promise<Order>;
  sendMessage(threadId: string, message: NewMessageInput): Promise<Message>;
  openThread(listingId: string, withHandle: string): Promise<Thread>;
  createWantedPost(input: { tags: string[]; photoAlt: string; now: Date }): Promise<WantedPost>;
  joinWaitlist(email: string): Promise<void>;
}

export type DataMode = "mock" | "supabase";

export function resolveDataMode(env: Record<string, string | undefined> = process.env): DataMode {
  const explicit = env.SPOTTED_DATA_MODE?.toLowerCase();
  if (explicit === "mock" || explicit === "supabase") return explicit;
  if (env.NEXT_PUBLIC_SUPABASE_URL && env.NEXT_PUBLIC_SUPABASE_ANON_KEY) return "supabase";
  return "mock";
}

let cached: SpottedData | null = null;

export function getAdapter(): SpottedData {
  if (cached) return cached;
  if (resolveDataMode() === "supabase") {
    // Lazy import keeps @supabase/supabase-js out of mock-mode bundles.
    const { createSupabaseAdapter } = require("./supabase") as typeof import("./supabase");
    cached = createSupabaseAdapter();
  } else {
    cached = createMockAdapter();
  }
  return cached;
}
