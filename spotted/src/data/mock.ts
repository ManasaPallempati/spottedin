import type { NewListingDraft, NewOrderInput, SpottedData } from "./adapter";
import type { DeckSignal, Listing, Message, Offer, Order, Spot, Thread, WantedPost } from "./types";
import { currentPrice } from "@/lib/pricing";
import {
  SEED_FITS,
  SEED_LISTINGS,
  SEED_ORDERS,
  SEED_SELLERS,
  SEED_SPOTTED_IDS,
  SEED_THREADS,
} from "./seed";

const OFFER_TTL_MS = 24 * 3_600_000;

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function stamp(now: Date): string {
  const time = now
    .toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })
    .toUpperCase();
  return time;
}

function dateLabel(d: Date): string {
  return d
    .toLocaleDateString("en-US", { month: "short", day: "numeric" })
    .toUpperCase();
}

// In-memory session state. Real writes move behind Supabase in the
// credentialed build-out; the interface stays identical.
export function createMockAdapter(): SpottedData {
  const listings: Listing[] = clone(SEED_LISTINGS);
  const threads: Thread[] = clone(SEED_THREADS);
  const orders: Order[] = clone(SEED_ORDERS);
  const offers: Offer[] = [];
  const spots = new Map<string, Spot>();
  const deckSignals: DeckSignal[] = [];
  const wanted: WantedPost[] = [];
  const waitlist = new Set<string>();
  let nextId = 1;
  const id = (prefix: string) => `${prefix}${nextId++}`;

  for (const listingId of SEED_SPOTTED_IDS) {
    spots.set(`nat.spots:${listingId}`, { listingId, userHandle: "nat.spots", alertsOn: true });
  }

  function findListing(listingId: string): Listing {
    const listing = listings.find((l) => l.id === listingId);
    if (!listing) throw new Error(`unknown listing ${listingId}`);
    return listing;
  }

  function validOffer(offer: Offer | undefined, listingId: string, buyerHandle: string, now: Date) {
    return (
      !!offer &&
      offer.listingId === listingId &&
      offer.buyerHandle === buyerHandle &&
      offer.status === "accepted" &&
      new Date(offer.expiresAt).getTime() > now.getTime()
    );
  }

  return {
    async listListings(filter) {
      let rows = filter?.status ? listings.filter((l) => l.status === filter.status) : [...listings];
      if (filter?.category && filter.category !== "ALL") {
        rows = rows.filter((l) => l.category === filter.category);
      }
      if (filter?.query) {
        const q = filter.query.toLowerCase();
        rows = rows.filter((l) =>
          `${l.title} ${l.brand} ${l.era} ${l.category}`.toLowerCase().includes(q),
        );
      }
      return rows;
    },
    async getListing(listingId) {
      return listings.find((l) => l.id === listingId) ?? null;
    },
    async getSeller(handle) {
      return SEED_SELLERS.find((s) => s.handle === handle) ?? null;
    },
    async listFits() {
      return SEED_FITS;
    },
    async listThreads() {
      return threads.map(({ messages: _messages, ...preview }) => preview);
    },
    async getThread(threadId) {
      return threads.find((t) => t.id === threadId) ?? null;
    },
    async getOrder(orderId) {
      return orders.find((o) => o.id === orderId) ?? null;
    },
    async listOrders(buyerHandle) {
      return orders.filter((o) => o.buyerHandle === buyerHandle);
    },

    async listSpots(userHandle) {
      return [...spots.values()].filter((s) => s.userHandle === userHandle);
    },
    async setSpot(userHandle, listingId, on) {
      const key = `${userHandle}:${listingId}`;
      if (on) spots.set(key, { listingId, userHandle, alertsOn: true });
      else spots.delete(key);
    },
    async recordDeckSignal(signal) {
      deckSignals.push(signal);
      if (signal.signal === "spot") {
        await this.setSpot(signal.userHandle, signal.listingId, true);
      }
    },

    async createOffer({ listingId, buyerHandle, amount, now }) {
      findListing(listingId);
      const offer: Offer = {
        id: id("of"),
        listingId,
        buyerHandle,
        amount: Math.round(amount),
        status: "sent",
        createdAt: now.toISOString(),
        expiresAt: new Date(now.getTime() + OFFER_TTL_MS).toISOString(),
      };
      offers.push(offer);
      return offer;
    },
    async acceptOffer(offerId) {
      const offer = offers.find((o) => o.id === offerId);
      if (!offer) throw new Error(`unknown offer ${offerId}`);
      offer.status = "accepted";
      return offer;
    },
    async resolveCheckoutPrice({ listingId, buyerHandle, offerId, now }) {
      const listing = findListing(listingId);
      const offer = offerId
        ? offers.find((o) => o.id === offerId)
        : offers.find(
            (o) => o.listingId === listingId && o.buyerHandle === buyerHandle && o.status === "accepted",
          );
      if (validOffer(offer, listingId, buyerHandle, now)) {
        return { price: offer!.amount, source: "offer", offerId: offer!.id };
      }
      return { price: currentPrice(listing, now), source: "drop" };
    },

    async createListing(draft, sellerHandle, now) {
      const listing: Listing = {
        id: id("l"),
        title: draft.title.toUpperCase(),
        brand: draft.brand.toUpperCase(),
        size: draft.size,
        condition: draft.condition,
        era: "Y2K",
        category: draft.category,
        retailPrice: null,
        startPrice: draft.startPrice,
        floorPrice: draft.floorPrice,
        dropRate: draft.dropRate,
        listedAt: now.toISOString(),
        status: "live",
        sellerHandle,
        spots: 0,
        watching: 0,
        description: "Fresh on the rack — first drop at the top of the hour.",
        photos: (draft.photoAlts.length ? draft.photoAlts : ["your listing"]).map((alt) => ({
          src: null,
          alt,
          c1: "#4E5A57",
          c2: "#57645F",
        })),
      };
      listings.unshift(listing);
      return listing;
    },
    async createOrder(input: NewOrderInput) {
      const { listingId, buyerHandle, offerId, shippingOption, now } = input;
      const listing = findListing(listingId);
      const { price } = await this.resolveCheckoutPrice({ listingId, buyerHandle, offerId, now });
      const shippingCost = shippingOption === "express" ? 9.99 : 4.99;
      const etaDays = shippingOption === "express" ? 2 : 5;
      const eta = new Date(now.getTime() + etaDays * 86_400_000);
      const order: Order = {
        id: id("o-sp"),
        listingId,
        buyerHandle,
        pricePaid: price,
        shippingOption,
        shippingCost,
        total: Math.round((price + shippingCost) * 100) / 100,
        status: "confirmed",
        carrier: "USPS GROUND",
        eta: eta.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }).toUpperCase(),
        placedAt: now.toISOString(),
        steps: [
          { label: "ORDER CONFIRMED", detail: `${dateLabel(now)} · ${stamp(now)}`, state: "done" },
          { label: "LABEL CREATED", detail: "WAITING ON SELLER", state: "active" },
          { label: "IN TRANSIT", detail: "—", state: "next" },
          { label: "OUT FOR DELIVERY", detail: "—", state: "next" },
          { label: "DELIVERED", detail: "—", state: "next" },
        ],
      };
      orders.unshift(order);
      listing.status = "sold";
      return order;
    },
    async sendMessage(threadId, input) {
      const thread = threads.find((t) => t.id === threadId);
      if (!thread) throw new Error(`unknown thread ${threadId}`);
      const message: Message = {
        id: id("m-sp"),
        from: input.from,
        type: input.type ?? "text",
        body: input.body ?? "",
        offerId: input.offerId,
        offerAmount: input.offerAmount,
      };
      thread.messages.push(message);
      thread.lastMessage =
        message.type === "offer" ? `YOUR OFFER $${message.offerAmount}` : message.body;
      thread.lastAt = "NOW";
      return message;
    },
    async openThread(listingId, withHandle) {
      const existing = threads.find((t) => t.withHandle === withHandle);
      if (existing) {
        existing.listingId = listingId;
        return existing;
      }
      const thread: Thread = {
        id: id("t-sp"),
        listingId,
        withHandle,
        lastMessage: "",
        lastAt: "NOW",
        unread: false,
        messages: [],
      };
      threads.push(thread);
      return thread;
    },
    async createWantedPost({ tags, photoAlt, now }) {
      const post: WantedPost = { id: id("w"), tags, photoAlt, createdAt: now.toISOString() };
      wanted.push(post);
      return post;
    },
    async joinWaitlist(email) {
      waitlist.add(email.trim().toLowerCase());
    },
  };
}
