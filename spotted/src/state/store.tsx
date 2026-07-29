"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { getAdapter, type NewListingDraft } from "@/data/adapter";
import { ME } from "@/data/me";
import {
  SEED_FITS,
  SEED_LISTINGS,
  SEED_OFFERS,
  SEED_ORDERS,
  SEED_SPOTTED_IDS,
  SEED_THREADS,
} from "@/data/seed";
import type {
  CheckoutPrice,
  DeckSignal,
  Fit,
  Listing,
  Offer,
  Order,
  Thread,
  WantedPost,
} from "@/data/types";
import { currentPrice, stealPercent } from "@/lib/pricing";

interface Snapshot {
  listings: Listing[];
  fits: Fit[];
  threads: Thread[];
  orders: Order[];
}

export interface SpottedStore extends Snapshot {
  /** Seconds to the top of the hour; null until mounted (SSR-safe). */
  seconds: number | null;
  justDropped: boolean;
  priceOf(listing: Listing): number;
  stealOf(listing: Listing): number | null;

  spottedIds: ReadonlySet<string>;
  deckSeenIds: ReadonlySet<string>;
  offers: Readonly<Record<string, Offer>>;
  unreadCount: number;
  waitlistJoined: boolean;

  toggleSpot(listingId: string): void;
  deckSignal(listingId: string, signal: DeckSignal["signal"]): void;
  markThreadRead(threadId: string): void;
  openThread(listingId: string, withHandle: string): Promise<string>;
  sendOffer(listingId: string, amount: number): Promise<string>;
  sendChat(threadId: string, body: string): Promise<void>;
  resolveCheckout(listingId: string, offerId?: string): Promise<CheckoutPrice>;
  pay(input: {
    listingId: string;
    offerId?: string;
    shippingOption: "tracked" | "express";
  }): Promise<Order>;
  createListing(draft: NewListingDraft): Promise<Listing>;
  postWanted(tags: string[], photoAlt: string): Promise<WantedPost>;
  joinWaitlist(email: string): Promise<void>;
}

const StoreContext = createContext<SpottedStore | null>(null);

const INITIAL: Snapshot = {
  listings: SEED_LISTINGS,
  fits: SEED_FITS,
  threads: SEED_THREADS,
  orders: SEED_ORDERS,
};

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const adapter = useMemo(() => getAdapter(), []);
  const [snapshot, setSnapshot] = useState<Snapshot>(INITIAL);
  const [seconds, setSeconds] = useState<number | null>(null);
  const [justDropped, setJustDropped] = useState(false);
  const [spottedIds, setSpottedIds] = useState<ReadonlySet<string>>(new Set(SEED_SPOTTED_IDS));
  const [deckSeenIds, setDeckSeenIds] = useState<ReadonlySet<string>>(new Set());
  const [offers, setOffers] = useState<Record<string, Offer>>(
    Object.fromEntries(SEED_OFFERS.map((offer) => [offer.id, offer])),
  );
  const [readThreadIds, setReadThreadIds] = useState<ReadonlySet<string>>(new Set());
  const [waitlistJoined, setWaitlistJoined] = useState(false);
  const repliedThreads = useRef(new Set<string>());

  const refresh = useCallback(async () => {
    const previews = await adapter.listThreads();
    const threads = (
      await Promise.all(previews.map((p) => adapter.getThread(p.id)))
    ).filter((t): t is Thread => t !== null);
    const [listings, fits, orders, spots] = await Promise.all([
      adapter.listListings(),
      adapter.listFits(),
      adapter.listOrders(ME.handle),
      adapter.listSpots(ME.handle),
    ]);
    setSnapshot({ listings, fits, threads, orders });
    setSpottedIds(new Set(spots.map((s) => s.listingId)));
  }, [adapter]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    let prev = -1;
    const tick = () => {
      const now = new Date();
      const s = now.getMinutes() * 60 + now.getSeconds();
      const remaining = s === 0 ? 0 : 3600 - s;
      setSeconds(remaining);
      // Wrapped past :00 — everything just dropped.
      if (prev >= 0 && remaining > prev) {
        setJustDropped(true);
        void refresh();
        window.setTimeout(() => setJustDropped(false), 6000);
      }
      prev = remaining;
    };
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [refresh]);

  const priceOf = useCallback(
    (listing: Listing) => listing.serverPrice ?? currentPrice(listing, new Date()),
    [],
  );
  const stealOf = useCallback(
    (listing: Listing) =>
      stealPercent(listing.serverPrice ?? currentPrice(listing, new Date()), listing.retailPrice),
    [],
  );

  const toggleSpot = useCallback(
    (listingId: string) => {
      const on = !spottedIds.has(listingId);
      const next = new Set(spottedIds);
      if (on) next.add(listingId);
      else next.delete(listingId);
      setSpottedIds(next);
      void adapter.setSpot(ME.handle, listingId, on);
    },
    [adapter, spottedIds],
  );

  const deckSignal = useCallback(
    (listingId: string, signal: DeckSignal["signal"]) => {
      setDeckSeenIds((prev) => new Set(prev).add(listingId));
      if (signal === "spot") {
        setSpottedIds((prev) => new Set(prev).add(listingId));
      }
      void adapter.recordDeckSignal({
        listingId,
        userHandle: ME.handle,
        signal,
        at: new Date().toISOString(),
      });
    },
    [adapter],
  );

  const markThreadRead = useCallback((threadId: string) => {
    setReadThreadIds((prev) => (prev.has(threadId) ? prev : new Set(prev).add(threadId)));
  }, []);

  const openThread = useCallback(
    async (listingId: string, withHandle: string) => {
      const thread = await adapter.openThread(listingId, withHandle);
      await refresh();
      return thread.id;
    },
    [adapter, refresh],
  );

  const sendOffer = useCallback(
    async (listingId: string, amount: number) => {
      const listing = await adapter.getListing(listingId);
      if (!listing) throw new Error(`unknown listing ${listingId}`);
      const now = new Date();
      const thread = await adapter.openThread(listingId, listing.sellerHandle);
      const offer = await adapter.createOffer({
        listingId,
        buyerHandle: ME.handle,
        amount,
        now,
      });
      await adapter.sendMessage(thread.id, {
        from: "me",
        type: "offer",
        offerId: offer.id,
        offerAmount: offer.amount,
      });
      setOffers((prev) => ({ ...prev, [offer.id]: offer }));
      await refresh();
      // Demo loop: the seller accepts shortly after — real accept arrives over
      // realtime in the credentialed build-out.
      window.setTimeout(async () => {
        const accepted = await adapter.acceptOffer(offer.id);
        await adapter.sendMessage(thread.id, {
          from: "them",
          body: "deal — accepting now. ships tomorrow AM.",
        });
        setOffers((prev) => ({ ...prev, [accepted.id]: { ...accepted } }));
        await refresh();
      }, 2600);
      return thread.id;
    },
    [adapter, refresh],
  );

  const sendChat = useCallback(
    async (threadId: string, body: string) => {
      await adapter.sendMessage(threadId, { from: "me", body });
      await refresh();
      if (!repliedThreads.current.has(threadId)) {
        repliedThreads.current.add(threadId);
        window.setTimeout(async () => {
          await adapter.sendMessage(threadId, {
            from: "them",
            body: "yes — still up. it drops again in under an hour tho",
          });
          await refresh();
        }, 1800);
      }
    },
    [adapter, refresh],
  );

  const resolveCheckout = useCallback(
    (listingId: string, offerId?: string) =>
      adapter.resolveCheckoutPrice({
        listingId,
        buyerHandle: ME.handle,
        offerId,
        now: new Date(),
      }),
    [adapter],
  );

  const pay = useCallback(
    async (input: { listingId: string; offerId?: string; shippingOption: "tracked" | "express" }) => {
      const order = await adapter.createOrder({
        ...input,
        buyerHandle: ME.handle,
        now: new Date(),
      });
      await refresh();
      return order;
    },
    [adapter, refresh],
  );

  const createListing = useCallback(
    async (draft: NewListingDraft) => {
      const listing = await adapter.createListing(draft, ME.handle, new Date());
      await refresh();
      return listing;
    },
    [adapter, refresh],
  );

  const postWanted = useCallback(
    (tags: string[], photoAlt: string) =>
      adapter.createWantedPost({ tags, photoAlt, now: new Date() }),
    [adapter],
  );

  const joinWaitlist = useCallback(
    async (email: string) => {
      await adapter.joinWaitlist(email);
      setWaitlistJoined(true);
    },
    [adapter],
  );

  const unreadCount = snapshot.threads.filter((t) => t.unread && !readThreadIds.has(t.id)).length;

  const value: SpottedStore = {
    ...snapshot,
    seconds,
    justDropped,
    priceOf,
    stealOf,
    spottedIds,
    deckSeenIds,
    offers,
    unreadCount,
    waitlistJoined,
    toggleSpot,
    deckSignal,
    markThreadRead,
    openThread,
    sendOffer,
    sendChat,
    resolveCheckout,
    pay,
    createListing,
    postWanted,
    joinWaitlist,
  };

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): SpottedStore {
  const store = useContext(StoreContext);
  if (!store) throw new Error("useStore must be used inside StoreProvider");
  return store;
}
