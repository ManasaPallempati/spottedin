import { describe, expect, it } from "vitest";
import { resolveDataMode } from "./adapter";
import { createMockAdapter } from "./mock";
import { buildSearchOrFilter } from "./supabase";
import { currentPrice } from "@/lib/pricing";

const NOW = new Date("2026-07-29T12:00:00Z");
const BUYER = "nat.spots";

describe("resolveDataMode", () => {
  it("defaults to mock with zero credentials", () => {
    expect(resolveDataMode({})).toBe("mock");
  });

  it("honors an explicit SPOTTED_DATA_MODE", () => {
    expect(resolveDataMode({ SPOTTED_DATA_MODE: "mock", NEXT_PUBLIC_SUPABASE_URL: "x", NEXT_PUBLIC_SUPABASE_ANON_KEY: "y" })).toBe("mock");
    expect(resolveDataMode({ SPOTTED_DATA_MODE: "supabase" })).toBe("supabase");
  });

  it("auto-selects supabase only when both env vars exist", () => {
    expect(resolveDataMode({ NEXT_PUBLIC_SUPABASE_URL: "x" })).toBe("mock");
    expect(resolveDataMode({ NEXT_PUBLIC_SUPABASE_URL: "x", NEXT_PUBLIC_SUPABASE_ANON_KEY: "y" })).toBe("supabase");
  });
});

describe("mock adapter reads", () => {
  const data = createMockAdapter();

  it("serves the 10 seed listings", async () => {
    expect(await data.listListings()).toHaveLength(10);
  });

  it("filters by category and searches title/brand/era/category", async () => {
    const shoes = await data.listListings({ category: "SHOES" });
    expect(shoes.map((l) => l.title)).toEqual(["1461 LOAFERS", "SAMBA OG"]);
    expect((await data.listListings({ query: "y2k" })).length).toBeGreaterThan(0);
    // Era parity: "90s" only appears in the era field.
    expect((await data.listListings({ query: "90s" })).length).toBeGreaterThan(0);
    expect((await data.listListings({ query: "outerwear" })).length).toBe(3);
  });

  it("returns null for unknown ids", async () => {
    expect(await data.getListing("nope")).toBeNull();
    expect(await data.getListing("4")).not.toBeNull();
  });

  it("serves sellers, fits, threads, orders", async () => {
    expect((await data.getSeller("y2kcloset"))?.rating).toBe(5.0);
    expect(await data.listFits()).toHaveLength(3);
    expect(await data.listThreads()).toHaveLength(3);
    expect((await data.getThread("t1"))?.messages.length).toBe(3);
    expect((await data.getOrder("o1"))?.carrier).toContain("USPS");
    expect(await data.listOrders(BUYER)).toHaveLength(1);
  });
});

describe("spots + deck signals", () => {
  it("seeds two spots and toggles them", async () => {
    const data = createMockAdapter();
    expect(await data.listSpots(BUYER)).toHaveLength(2);
    await data.setSpot(BUYER, "1", true);
    expect(await data.listSpots(BUYER)).toHaveLength(3);
    await data.setSpot(BUYER, "1", false);
    expect(await data.listSpots(BUYER)).toHaveLength(2);
  });

  it("a deck SPOT signal creates a spot; DROP does not", async () => {
    const data = createMockAdapter();
    await data.recordDeckSignal({ listingId: "5", userHandle: BUYER, signal: "spot", at: NOW.toISOString() });
    await data.recordDeckSignal({ listingId: "6", userHandle: BUYER, signal: "drop", at: NOW.toISOString() });
    const ids = (await data.listSpots(BUYER)).map((s) => s.listingId);
    expect(ids).toContain("5");
    expect(ids).not.toContain("6");
  });
});

describe("checkout price resolution (never trusts the URL)", () => {
  it("falls back to the server drop price with no offer", async () => {
    const data = createMockAdapter();
    const listing = (await data.getListing("1"))!;
    const result = await data.resolveCheckoutPrice({ listingId: "1", buyerHandle: BUYER, now: NOW });
    expect(result.source).toBe("drop");
    expect(result.price).toBe(currentPrice(listing, NOW));
  });

  it("ignores an offer that was never accepted", async () => {
    const data = createMockAdapter();
    const offer = await data.createOffer({ listingId: "1", buyerHandle: BUYER, amount: 5, now: NOW });
    const result = await data.resolveCheckoutPrice({ listingId: "1", buyerHandle: BUYER, offerId: offer.id, now: NOW });
    expect(result.source).toBe("drop");
  });

  it("uses an accepted, unexpired offer tied to this buyer + listing", async () => {
    const data = createMockAdapter();
    const offer = await data.createOffer({ listingId: "1", buyerHandle: BUYER, amount: 61, now: NOW });
    await data.acceptOffer(offer.id);
    const result = await data.resolveCheckoutPrice({ listingId: "1", buyerHandle: BUYER, offerId: offer.id, now: NOW });
    expect(result).toEqual({ price: 61, source: "offer", offerId: offer.id });
  });

  it("rejects an accepted offer after its 24h expiry", async () => {
    const data = createMockAdapter();
    const offer = await data.createOffer({ listingId: "1", buyerHandle: BUYER, amount: 61, now: NOW });
    await data.acceptOffer(offer.id);
    const later = new Date(NOW.getTime() + 25 * 3_600_000);
    const result = await data.resolveCheckoutPrice({ listingId: "1", buyerHandle: BUYER, offerId: offer.id, now: later });
    expect(result.source).toBe("drop");
  });

  it("rejects offers belonging to another buyer or listing", async () => {
    const data = createMockAdapter();
    const offer = await data.createOffer({ listingId: "1", buyerHandle: "someone.else", amount: 1, now: NOW });
    await data.acceptOffer(offer.id);
    const wrongBuyer = await data.resolveCheckoutPrice({ listingId: "1", buyerHandle: BUYER, offerId: offer.id, now: NOW });
    expect(wrongBuyer.source).toBe("drop");
    const wrongListing = await data.resolveCheckoutPrice({ listingId: "2", buyerHandle: "someone.else", offerId: offer.id, now: NOW });
    expect(wrongListing.source).toBe("drop");
  });
});

describe("sell, orders, chat, wanted, waitlist", () => {
  it("createListing goes live immediately and prices from the shared util", async () => {
    const data = createMockAdapter();
    const listing = await data.createListing(
      { title: "knit cardigan", brand: "vintage", size: "M", condition: "GREAT", category: "TOPS", startPrice: 46, floorPrice: 30, dropRate: "STANDARD", photoAlts: [] },
      "nat.spots",
      NOW,
    );
    expect(listing.title).toBe("KNIT CARDIGAN");
    expect((await data.listListings()).map((l) => l.id)).toContain(listing.id);
    expect(currentPrice(listing, NOW)).toBe(46);
  });

  it("createOrder derives the total from resolved price + shipping and marks the listing sold", async () => {
    const data = createMockAdapter();
    const offer = await data.createOffer({ listingId: "1", buyerHandle: BUYER, amount: 61, now: NOW });
    await data.acceptOffer(offer.id);
    const order = await data.createOrder({ listingId: "1", buyerHandle: BUYER, offerId: offer.id, shippingOption: "express", now: NOW });
    expect(order.pricePaid).toBe(61);
    expect(order.total).toBeCloseTo(70.99, 2);
    expect((await data.getListing("1"))?.status).toBe("sold");
    expect(await data.listOrders(BUYER)).toHaveLength(2);
  });

  it("openThread reuses a seller thread; sendMessage appends text and offer cards", async () => {
    const data = createMockAdapter();
    const thread = await data.openThread("1", "mara.vintage");
    expect(thread.id).toBe("t1");
    await data.sendMessage(thread.id, { from: "me", body: "hi" });
    await data.sendMessage(thread.id, { from: "me", type: "offer", offerId: "of9", offerAmount: 61 });
    const updated = (await data.getThread(thread.id))!;
    expect(updated.messages).toHaveLength(5);
    expect(updated.lastMessage).toBe("YOUR OFFER $61");
    const fresh = await data.openThread("2", "nobody.yet");
    expect(fresh.messages).toHaveLength(0);
  });

  it("records wanted posts and waitlist emails", async () => {
    const data = createMockAdapter();
    const post = await data.createWantedPost({ tags: ["y2k"], photoAlt: "snap", now: NOW });
    expect(post.id).toBeTruthy();
    await expect(data.joinWaitlist("a@b.co")).resolves.toBeUndefined();
  });
});

describe("supabase search filter", () => {
  it("covers title/brand/era/category with a quoted pattern", () => {
    expect(buildSearchOrFilter("y2k", ["title", "brand", "era", "category"])).toBe(
      'title.ilike."%y2k%",brand.ilike."%y2k%",era.ilike."%y2k%",category.ilike."%y2k%"',
    );
  });

  it("escapes LIKE wildcards and quotes PostgREST syntax characters", () => {
    const filter = buildSearchOrFilter('50%_off,"(moto)"', ["title"]);
    expect(filter).toBe('title.ilike."%50\\%\\_off,\\"(moto)\\"%"');
  });
});
