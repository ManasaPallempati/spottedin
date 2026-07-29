"use client";

import Link from "next/link";
import { useState } from "react";
import { Countdown } from "@/components/Countdown";
import { ListingCard } from "@/components/ListingCard";
import { ListingImage } from "@/components/ListingImage";
import { ME } from "@/data/me";
import { useStore } from "@/state/store";

export default function ClosetPage() {
  const { listings, orders, spottedIds, priceOf } = useStore();
  const [tab, setTab] = useState<"closet" | "spotted">("closet");
  const [shared, setShared] = useState(false);

  const mine = listings.filter((l) => l.sellerHandle === ME.handle);
  const spotted = listings.filter((l) => spottedIds.has(l.id) && l.status === "live");

  // Stats derive from state: every order's retail-vs-paid delta counts.
  const orderSavings = orders.reduce((sum, o) => {
    const listing = listings.find((l) => l.id === o.listingId);
    return listing?.retailPrice ? sum + (listing.retailPrice - o.pricePaid) : sum;
  }, 0);
  const savedTotal = ME.baseline.savedDollars + orderSavings;
  const wrappedSteals = ME.baseline.wrappedSteals + orders.length;
  const wrappedSaved = ME.baseline.wrappedSaved + orderSavings;

  async function shareWrapped() {
    const text = `JULY WRAPPED — ${wrappedSteals} steals · $${wrappedSaved} saved on SPOTTED`;
    try {
      if (navigator.share) await navigator.share({ text });
      else await navigator.clipboard.writeText(text);
      setShared(true);
    } catch {
      setShared(false);
    }
  }

  return (
    <main className="screen px-4 pb-6 pt-6">
      <div className="flex items-center gap-3">
        <span className="mono flex h-[58px] w-[58px] flex-none items-center justify-center rounded-full border-2 border-[var(--acc)] bg-[#26262C] text-[14px] font-bold">
          {ME.initials}
        </span>
        <span className="min-w-0 flex-1">
          <span className="display block text-[17px]">@{ME.handle}</span>
          <span className="mono mt-0.5 block text-[8.5px] uppercase text-[rgba(237,235,228,.42)]">
            {ME.city} · MEMBER SINCE {ME.memberSince} · ★ {ME.rating.toFixed(1)}
          </span>
        </span>
        <Link
          href="/inbox"
          className="mono flex-none rounded-full border border-[rgba(237,235,228,.18)] px-3 py-1.5 text-[8.5px] font-bold"
        >
          INBOX
        </Link>
      </div>

      <div className="mt-3.5 flex gap-2">
        {(
          [
            [`$${savedTotal}`, "SAVED", "var(--acc)"],
            [String(spottedIds.size), "SPOTS", "var(--ink)"],
            [String(mine.length), "LISTED", "var(--ink)"],
          ] as const
        ).map(([value, label, color]) => (
          <div
            key={label}
            className="flex-1 rounded-[12px] border border-[rgba(237,235,228,.08)] bg-[var(--card)] py-2.5 text-center"
          >
            <p className="display tnum text-[16px]" style={{ color }}>
              {value}
            </p>
            <p className="mono mt-0.5 text-[7.5px] tracking-[1px] text-[rgba(237,235,228,.4)]">
              {label}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-3 rounded-[16px] bg-[var(--acc)] px-4 py-3.5 text-[var(--acc-ink)]">
        <div className="flex items-center justify-between">
          <span className="meta text-[8.5px] tracking-[1.5px]">JULY WRAPPED</span>
          <button
            type="button"
            onClick={shareWrapped}
            className="mono rounded-full border-[1.5px] border-[var(--acc-ink)] px-2.5 py-0.5 text-[8.5px] font-bold"
          >
            {shared ? "COPIED ✓" : "SHARE ↗"}
          </button>
        </div>
        <p className="display mt-2 text-[21px] leading-[1.15]">
          {wrappedSteals} STEALS · ${wrappedSaved} SAVED
        </p>
        <p className="mono mt-1.5 text-[8.5px] font-bold opacity-75">
          TOP ERA Y2K · TOP COP NIKE · TOP 4% OF THRIFTERS
        </p>
      </div>

      <div
        className="mt-4 flex gap-4 border-b border-[rgba(237,235,228,.09)] px-0.5"
        role="tablist"
        aria-label="Closet tabs"
      >
        {(["closet", "spotted"] as const).map((t) => (
          <button
            key={t}
            type="button"
            role="tab"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
            className="meta pb-2 text-[10px] tracking-[1.2px]"
            style={{
              color: tab === t ? "var(--acc)" : "rgba(237,235,228,.4)",
              borderBottom: `2px solid ${tab === t ? "var(--acc)" : "transparent"}`,
            }}
          >
            {t.toUpperCase()}
          </button>
        ))}
      </div>

      {tab === "closet" && (
        <section className="grid grid-cols-2 gap-x-2.5 gap-y-4 pt-3" aria-label="Your closet">
          {mine.map((l) => (
            <Link key={l.id} href={`/item/${l.id}`} className="block">
              <div className="relative">
                <ListingImage
                  photo={l.photos[0]}
                  className="aspect-[3/4] rounded-[14px] border border-[var(--hairline)]"
                />
                <span
                  className="mono absolute left-2 top-2 flex items-center gap-1 rounded-full px-2 py-1 text-[8px] font-bold text-[var(--acc)] backdrop-blur-sm"
                  style={{
                    background: "rgba(12,12,14,.6)",
                    border: "1px solid color-mix(in oklab, var(--acc) 50%, transparent)",
                  }}
                >
                  ● LIVE · DROPS <Countdown className="text-[8px]" />
                </span>
              </div>
              <p className="mt-2 flex items-baseline gap-1.5">
                <span className="display tnum text-[14px]">${priceOf(l)}</span>
                {/* Own listings only: the seller sees their private floor. */}
                <span className="mono text-[8.5px] text-[rgba(237,235,228,.4)]">
                  FLOOR ${l.floorPrice}
                </span>
              </p>
              <p className="mt-0.5 truncate text-[11px] font-medium text-[rgba(237,235,228,.8)]">
                {l.title}
              </p>
            </Link>
          ))}
          <Link
            href="/sell"
            className="flex aspect-[3/4] flex-col items-center justify-center gap-1.5 rounded-[14px] border-[1.5px] border-dashed border-[rgba(237,235,228,.2)]"
          >
            <span className="text-[22px] font-light text-[rgba(237,235,228,.5)]">+</span>
            <span className="mono text-[8.5px] text-[rgba(237,235,228,.4)]">list something</span>
          </Link>
        </section>
      )}

      {tab === "spotted" && (
        <section className="pt-3" aria-label="Spotted listings">
          {spotted.length > 0 ? (
            <div className="grid grid-cols-2 gap-x-2.5 gap-y-4">
              {spotted.map((l) => (
                <div key={l.id}>
                  <ListingCard listing={l} />
                  <p className="mono mt-1 text-[8.5px] text-[var(--acc)]">↓ DROP ALERTS ON</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="mono py-8 text-center text-[9.5px] text-[rgba(237,235,228,.35)]">
              nothing spotted yet — hit the deck ●
            </p>
          )}
        </section>
      )}
    </main>
  );
}
