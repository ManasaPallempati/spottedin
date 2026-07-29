import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { SpottedData } from "./adapter";
import type { Listing } from "./types";

// Supabase-backed adapter. Table shapes follow the handoff data model; reads
// the screens need are implemented, writes are explicit stubs until the
// credentialed Phase 1 build-out wires auth + RLS.
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

/**
 * Build a safely quoted `or=` filter for a user-supplied search term.
 * PostgREST parses the or() grammar itself, so the term must be escaped for
 * LIKE wildcards (%/_) and double-quoted so commas/parens/dots in user input
 * stay literal instead of being parsed as filter syntax.
 */
export function buildSearchOrFilter(term: string, columns: string[]): string {
  const escaped = term
    .replace(/\\/g, "\\\\")
    .replace(/[%_]/g, (m) => `\\${m}`)
    .replace(/"/g, '\\"');
  const pattern = `"%${escaped}%"`;
  return columns.map((c) => `${c}.ilike.${pattern}`).join(",");
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
    // Anonymous reads come from public_listings and never receive start/floor.
    // Mirror the authoritative price into the private-shaped fields so older
    // components cannot infer seller limits from the browser payload.
    startPrice: row.current_price,
    floorPrice: row.current_price,
    serverPrice: row.current_price,
    dropRate: row.drop_rate,
    listedAt: row.listed_at,
    status: row.status,
    sellerHandle: row.seller_handle,
    spots: row.spots ?? 0,
    watching: row.watching ?? 0,
    description: row.description ?? "",
    photos: row.photos ?? [{ src: null, alt: row.title, c1: "#17171B", c2: "#1D1D22" }],
  };
}

function writeStub(method: string): never {
  throw new Error(
    `supabase adapter: ${method} is a write stub — wire it up in the credentialed Phase 1 build-out (mock mode covers it locally)`,
  );
}

export function createSupabaseAdapter(): SpottedData {
  const db = client();
  return {
    async listListings(filter) {
      let query = db
        .from("public_listings")
        .select(
          "id,title,brand,size,condition,era,category,retail_price,current_price,drop_rate,listed_at,status,seller_handle,spots,watching,description,photos",
        );
      if (filter?.status) {
        query = query.eq("status", filter.status);
      }
      if (filter?.category && filter.category !== "ALL") {
        query = query.eq("category", filter.category);
      }
      if (filter?.query) {
        // Same columns the mock adapter searches: title, brand, era, category.
        query = query.or(buildSearchOrFilter(filter.query, ["title", "brand", "era", "category"]));
      }
      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []).map(mapListing);
    },
    async getListing(id) {
      const { data, error } = await db
        .from("public_listings")
        .select(
          "id,title,brand,size,condition,era,category,retail_price,current_price,drop_rate,listed_at,status,seller_handle,spots,watching,description,photos",
        )
        .eq("id", id)
        .maybeSingle();
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
        poster: row.poster ?? { src: null, alt: row.caption, c1: "#17171B", c2: "#1D1D22" },
      }));
    },
    async listThreads() {
      const { data, error } = await db
        .from("threads")
        .select("id, listing_id, with_handle, last_message, last_at, unread");
      if (error) throw error;
      return (data ?? []).map((row) => ({
        id: String(row.id),
        listingId: String(row.listing_id),
        withHandle: row.with_handle,
        lastMessage: row.last_message ?? "",
        lastAt: row.last_at ?? "",
        unread: !!row.unread,
      }));
    },
    async getThread() {
      throw new Error("threads: implement with Supabase Realtime in the Phase 1 build-out");
    },
    async getOrder() {
      throw new Error("orders: implement with Supabase in the Phase 1 build-out");
    },
    async listOrders() {
      throw new Error("orders: implement with Supabase in the Phase 1 build-out");
    },
    async listSpots(userHandle) {
      const { data, error } = await db
        .from("spots")
        .select("listing_id, user_handle, alerts_on")
        .eq("user_handle", userHandle);
      if (error) throw error;
      return (data ?? []).map((row) => ({
        listingId: String(row.listing_id),
        userHandle: row.user_handle,
        alertsOn: !!row.alerts_on,
      }));
    },
    async setSpot() {
      writeStub("setSpot");
    },
    async recordDeckSignal() {
      writeStub("recordDeckSignal");
    },
    async createOffer() {
      writeStub("createOffer");
    },
    async acceptOffer() {
      writeStub("acceptOffer");
    },
    async resolveCheckoutPrice() {
      // Must run server-side against offers + listings; never from URL params.
      writeStub("resolveCheckoutPrice");
    },
    async createListing() {
      writeStub("createListing");
    },
    async createOrder() {
      writeStub("createOrder");
    },
    async sendMessage() {
      writeStub("sendMessage");
    },
    async openThread() {
      writeStub("openThread");
    },
    async createWantedPost() {
      writeStub("createWantedPost");
    },
    async joinWaitlist(email) {
      const { error } = await db.from("waitlist").insert({ email });
      if (error) throw error;
    },
  };
}
