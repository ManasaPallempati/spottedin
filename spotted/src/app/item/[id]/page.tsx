"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { use, useMemo, useState } from "react";
import { Countdown } from "@/components/Countdown";
import { ListingImage } from "@/components/ListingImage";
import { SpotButton } from "@/components/SpotButton";
import { SEED_SELLERS } from "@/data/seed";
import { useStore } from "@/state/store";

export default function ItemPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const store = useStore();
  const { listings, seconds, priceOf, stealOf, openThread, sendOffer } = store;
  const listing = listings.find((l) => l.id === id);

  const [photoIdx, setPhotoIdx] = useState(0);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [offerAmt, setOfferAmt] = useState<number | null>(null);
  const [sending, setSending] = useState(false);

  const seller = useMemo(
    () =>
      listing
        ? {
            handle: listing.sellerHandle,
            initials: listing.sellerHandle.slice(0, 2).toUpperCase(),
          }
        : null,
    [listing],
  );

  if (!listing || !seller) {
    return (
      <main className="screen flex min-h-[60dvh] flex-col items-center justify-center gap-3">
        <p className="mono text-[10px] text-[var(--ink-dim)]">this one left the rack</p>
        <Link href="/" className="meta text-[9px] text-[var(--acc)]">
          BACK TO THE RACK
        </Link>
      </main>
    );
  }

  const price = priceOf(listing);
  const steal = stealOf(listing);
  const atFloor = price <= listing.floorPrice;
  const amount = offerAmt ?? Math.round(price * 0.9);
  const progress = seconds === null ? 0 : 1 - seconds / 3600;
  const rateStep =
    listing.dropRate === "TURBO" ? "−$2" : listing.dropRate === "CHILL" ? "−$1/DAY" : "−$1";
  const sellerRecord = SEED_SELLERS.find((s) => s.handle === listing.sellerHandle);
  const sellerMeta = {
    rating: (sellerRecord?.rating ?? 5).toFixed(1),
    sales: sellerRecord?.sales ?? 1,
    replies: (sellerRecord?.repliesIn ?? "<1h").toUpperCase(),
  };

  async function ask() {
    const threadId = await openThread(listing!.id, listing!.sellerHandle);
    router.push(`/inbox/${threadId}`);
  }

  async function submitOffer() {
    if (sending) return;
    setSending(true);
    const threadId = await sendOffer(listing!.id, amount);
    router.push(`/inbox/${threadId}`);
  }

  return (
    <main className="screen pb-24">
      <div className="relative">
        <div
          className="flex snap-x snap-mandatory overflow-x-auto"
          onScroll={(e) => {
            const el = e.currentTarget;
            setPhotoIdx(Math.round(el.scrollLeft / el.clientWidth));
          }}
          aria-label={`${listing.title} photos`}
        >
          {listing.photos.map((photo, i) => (
            <ListingImage
              key={i}
              photo={photo}
              className="aspect-[4/5] w-full flex-none snap-center"
            />
          ))}
        </div>
        <div className="absolute left-3.5 right-3.5 top-4 flex justify-between">
          <button
            type="button"
            onClick={() => router.back()}
            aria-label="Back"
            className="flex h-8 w-8 items-center justify-center rounded-full bg-[rgba(12,12,14,.55)] text-[13px] backdrop-blur-sm"
          >
            ←
          </button>
          <SpotButton listingId={listing.id} className="h-8 w-8" />
        </div>
        {steal !== null && (
          <span className="meta absolute bottom-3 left-3.5 rounded-full bg-[var(--acc)] px-2.5 py-1 text-[10px] tracking-[.5px] text-[var(--acc-ink)]">
            −{steal}% UNDER RETAIL
          </span>
        )}
        {listing.photos.length > 1 && (
          <div className="absolute bottom-3 right-3.5 flex gap-1" aria-hidden>
            {listing.photos.map((_, i) => (
              <span
                key={i}
                className="block h-1.5 w-1.5 rounded-full"
                style={{ background: i === photoIdx ? "var(--acc)" : "rgba(237,235,228,.35)" }}
              />
            ))}
          </div>
        )}
      </div>

      <div className="px-4 pt-4">
        <div className="flex items-baseline gap-2.5">
          <span className="display text-[30px]">${price}</span>
          {listing.retailPrice !== null && (
            <span className="mono text-[11px] text-[rgba(237,235,228,.4)] line-through">
              RETAIL ${listing.retailPrice}
            </span>
          )}
        </div>

        <div
          className="mt-2.5 rounded-[12px] px-3 py-2.5"
          style={{ border: "1px solid color-mix(in oklab, var(--acc) 32%, transparent)" }}
        >
          <div className="flex items-center justify-between">
            <span className="meta text-[9px] tracking-[1px] text-[var(--acc)]">
              {atFloor ? "AT FLOOR — WON'T DROP FURTHER" : `NEXT DROP ${rateStep} IN`}
            </span>
            <span className="flex items-baseline gap-2">
              {!atFloor && <Countdown className="text-[10px] font-bold text-[var(--acc)]" />}
              {/* Seller floor stays private — display only that it exists. */}
              <span className="mono text-[9px] text-[rgba(237,235,228,.45)]">FLOOR HIDDEN</span>
            </span>
          </div>
          <div className="mt-2 h-[3px] overflow-hidden rounded-full bg-[rgba(237,235,228,.1)]">
            <div
              className="h-full bg-[var(--acc)] transition-[width] duration-1000"
              style={{ width: `${Math.round(progress * 100)}%` }}
            />
          </div>
          <p className="mono mt-2 text-[8.5px] text-[rgba(237,235,228,.38)]">
            buy now or gamble it drops — {listing.watching} others are watching
          </p>
        </div>

        <h1 className="display mt-4 text-[19px]">{listing.title}</h1>
        <p className="mono mt-1.5 text-[9.5px] uppercase tracking-[.4px] text-[rgba(237,235,228,.45)]">
          {listing.brand} · SIZE {listing.size} · COND {listing.condition} · {listing.era}
        </p>
        <p className="mono mt-2.5 flex items-center gap-2 text-[9px] uppercase text-[var(--acc)]">
          <span className="live-dot" aria-hidden />
          {listing.watching} WATCHING · {listing.spots} SPOTS
        </p>
        <p className="mt-3 text-[12.5px] leading-[1.6] text-[rgba(237,235,228,.75)]">
          {listing.description}
        </p>

        <div className="card-surface mt-4 flex items-center gap-2.5 rounded-[13px] p-3">
          <span className="mono flex h-9 w-9 flex-none items-center justify-center rounded-full border-[1.5px] border-[var(--acc)] bg-[#26262C] text-[10px] font-bold">
            {seller.initials}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[12px] font-semibold">@{seller.handle}</span>
            <span className="mono mt-0.5 block text-[8.5px] uppercase text-[rgba(237,235,228,.42)]">
              ★ {sellerMeta.rating} · {sellerMeta.sales} SALES · REPLIES {sellerMeta.replies}
            </span>
          </span>
          <button
            type="button"
            onClick={ask}
            className="mono flex-none rounded-full border border-[rgba(237,235,228,.2)] px-3.5 py-1.5 text-[9.5px] font-bold"
          >
            ASK
          </button>
        </div>
        <p className="mono mt-3 text-[8.5px] tracking-[.3px] text-[rgba(237,235,228,.32)]">
          steal % verified against retail archive · 0% buyer fees
        </p>
      </div>

      <div className="fixed bottom-[84px] left-1/2 z-30 flex w-full max-w-[430px] -translate-x-1/2 gap-2 px-4 pb-3 pt-2.5"
        style={{ background: "linear-gradient(transparent, var(--bg-screen) 34%)" }}
      >
        {listing.status === "live" ? (
          <>
            <button type="button" onClick={() => setSheetOpen(true)} className="pill-outline flex-1">
              MAKE OFFER
            </button>
            <Link href={`/checkout?item=${listing.id}`} className="pill-primary flex-[1.2]">
              BUY ${price}
            </Link>
          </>
        ) : (
          <span className="pill-outline flex-1 opacity-60">SOLD — GONE IN A BLINK</span>
        )}
      </div>

      {sheetOpen && (
        <div className="fixed inset-0 z-50 mx-auto w-full max-w-[430px]">
          <button
            type="button"
            aria-label="Close offer sheet"
            onClick={() => setSheetOpen(false)}
            className="absolute inset-0 bg-[rgba(6,6,8,.6)]"
          />
          <div className="sheet absolute inset-x-0 bottom-0 rounded-t-[22px] bg-[var(--card)] px-5 pb-6 pt-3.5">
            <div className="mx-auto mb-3.5 h-1 w-9 rounded-full bg-[rgba(237,235,228,.18)]" aria-hidden />
            <h2 className="display text-[17px]">MAKE AN OFFER</h2>
            <p className="mono mt-1 text-[9px] text-[rgba(237,235,228,.45)]">
              asking ${price} · floor hidden · offers expire in 24h
            </p>
            <div className="mt-3.5 flex gap-2">
              {[10, 15, 20].map((pct) => {
                const chipAmt = Math.round(price * (1 - pct / 100));
                const on = amount === chipAmt;
                return (
                  <button
                    key={pct}
                    type="button"
                    onClick={() => setOfferAmt(chipAmt)}
                    className="flex-1 rounded-[11px] border px-1 py-2 text-center"
                    style={{
                      borderColor: on ? "var(--acc)" : "rgba(237,235,228,.16)",
                      color: on ? "var(--acc)" : "rgba(237,235,228,.75)",
                    }}
                  >
                    <span className="block text-[12px] font-bold">${chipAmt}</span>
                    <span className="mono mt-0.5 block text-[8px] opacity-70">−{pct}%</span>
                  </button>
                );
              })}
            </div>
            <div className="my-4 flex items-center justify-center gap-5">
              <button
                type="button"
                aria-label="Lower offer by one dollar"
                onClick={() => setOfferAmt(Math.max(5, amount - 1))}
                className="flex h-[38px] w-[38px] items-center justify-center rounded-full border border-[rgba(237,235,228,.2)] text-[16px]"
              >
                −
              </button>
              <span className="display tnum text-[34px]">${amount}</span>
              <button
                type="button"
                aria-label="Raise offer by one dollar"
                onClick={() => setOfferAmt(amount + 1)}
                className="flex h-[38px] w-[38px] items-center justify-center rounded-full border border-[rgba(237,235,228,.2)] text-[16px]"
              >
                +
              </button>
            </div>
            <p className="mono text-center text-[8.5px] text-[rgba(237,235,228,.38)]">
              sellers accept 71% of offers within −15%
            </p>
            <button
              type="button"
              onClick={submitOffer}
              disabled={sending}
              className="pill-primary mt-3.5 w-full disabled:opacity-60"
            >
              {sending ? "SENDING…" : "SEND OFFER"}
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
