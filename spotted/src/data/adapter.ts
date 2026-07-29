import type { Fit, Listing, Order, Seller, Thread, ThreadPreview } from "./types";
import { createMockAdapter } from "./mock";

// Single seam between the UI and its data source. Screens only ever import
// getAdapter(); mock mode needs zero credentials and is the default.
export interface SpottedData {
  listListings(filter?: { category?: string; query?: string }): Promise<Listing[]>;
  getListing(id: string): Promise<Listing | null>;
  getSeller(handle: string): Promise<Seller | null>;
  listFits(): Promise<Fit[]>;
  listThreads(): Promise<ThreadPreview[]>;
  getThread(id: string): Promise<Thread | null>;
  getOrder(id: string): Promise<Order | null>;
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
