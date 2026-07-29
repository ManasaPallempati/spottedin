import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { SpottedData } from "./adapter";
import type { Listing } from "./types";

// Phase 1 scaffold of the Supabase-backed adapter. Table shapes follow the
// handoff data model; only the reads the screens need are implemented.
// Requires NEXT_PUBLIC_SUPABASE_URL + NEXT_PUBLIC_SUPABASE_ANON_KEY.

function client(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error(
      "Supabase data mode requires NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY",
    );
  }
  return createClient(url, key);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapListing(row: any): Listing {
  return {
    id: String(row.id),
    title: row.title,
    brand: row.brand,
    size: row.size,
    condition: row.condition,
    era: row.era,
    category: row.category,
    retailPrice: row.retail_price,
    startPrice: row.start_price,
    floorPrice: row.floor_price,
    dropRate: row.drop_rate,
    listedAt: row.listed_at,
    status: row.status,
    sellerHandle: row.seller_handle,
    spots: row.spots ?? 0,
    watching: row.watching ?? 0,
    description: row.description ?? "",
    photo: row.photo ?? { c1: "#17171B", c2: "#1D1D22", alt: row.title },
  };
}

export function createSupabaseAdapter(): SpottedData {
  const db = client();
  return {
    async listListings(filter) {
      let query = db.from("listings").select("*").eq("status", "live");
      if (filter?.category && filter.category !== "ALL") {
        query = query.eq("category", filter.category);
      }
      if (filter?.query) {
        query = query.or(`title.ilike.%${filter.query}%,brand.ilike.%${filter.query}%`);
      }
      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []).map(mapListing);
    },
    async getListing(id) {
      const { data, error } = await db.from("listings").select("*").eq("id", id).maybeSingle();
      if (error) throw error;
      return data ? mapListing(data) : null;
    },
    async getSeller(handle) {
      const { data, error } = await db
        .from("users")
        .select("handle, rating, sales, replies_in")
        .eq("handle", handle)
        .maybeSingle();
      if (error) throw error;
      return data
        ? { handle: data.handle, rating: data.rating, sales: data.sales, repliesIn: data.replies_in }
        : null;
    },
    async listFits() {
      const { data, error } = await db.from("fits").select("*");
      if (error) throw error;
      return (data ?? []).map((row) => ({
        id: String(row.id),
        sellerHandle: row.seller_handle,
        caption: row.caption,
        plays: row.plays ?? "0",
        lookListingIds: (row.look_listing_ids ?? []).map(String),
        videoUrl: row.video_url,
      }));
    },
    async listThreads() {
      const { data, error } = await db
        .from("threads")
        .select("id, listing_id, with_handle, last_message, unread");
      if (error) throw error;
      return (data ?? []).map((row) => ({
        id: String(row.id),
        listingId: String(row.listing_id),
        withHandle: row.with_handle,
        lastMessage: row.last_message ?? "",
        unread: !!row.unread,
      }));
    },
    async getThread() {
      throw new Error("threads: implement with Supabase Realtime in Phase 1 build-out");
    },
    async getOrder() {
      throw new Error("orders: implement with Supabase in Phase 1 build-out");
    },
  };
}
