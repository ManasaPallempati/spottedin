"use client";

import Link from "next/link";
import { useState } from "react";
import { GlobalDropTicker } from "@/components/GlobalDropTicker";
import { ListingCard } from "@/components/ListingCard";
import { useStore } from "@/state/store";

const CATEGORIES = ["ALL", "OUTERWEAR", "TOPS", "BOTTOMS", "SHOES", "BAGS"] as const;

export default function RackPage() {
  const { listings, unreadCount } = useStore();
  const [cat, setCat] = useState<(typeof CATEGORIES)[number]>("ALL");
  const [invited, setInvited] = useState(false);
  const live = listings.filter((l) => l.status === "live");
  const visible = cat === "ALL" ? live : live.filter((l) => l.category === cat);

  async function invite() {
    const url = `${window.location.origin}/landing?invite=mara`;
    try {
      if (navigator.share) {
        await navigator.share({
          title: "SPOTTED closet drop",
          text: "mara.vintage drops 32 pieces tonight at 21:00. catch it first.",
          url,
        });
      } else {
        await navigator.clipboard.writeText(url);
      }
      setInvited(true);
    } catch {
      setInvited(false);
    }
  }

  return (
    <main className="screen">
      <header className="flex items-center justify-between px-4 pt-5">
        <h1 className="display text-[19px]">
          SPOTTED<span className="text-[var(--acc)]">●</span>
        </h1>
        <div className="flex items-center gap-2">
          <Link
            href="/irl"
            aria-label="Spotted IRL — snap a fit"
            className="flex h-[34px] w-[34px] items-center justify-center rounded-full border border-[rgba(237,235,228,.16)]"
          >
            <span
              aria-hidden
              className="flex h-3 w-3 items-center justify-center rounded-full border-2 border-[var(--ink)]"
            >
              <span className="block h-1 w-1 rounded-full bg-[var(--acc)]" />
            </span>
          </Link>
          <Link
            href="/inbox"
            aria-label={`Inbox — ${unreadCount} unread`}
            className="relative flex h-[34px] w-[34px] items-center justify-center rounded-full border border-[rgba(237,235,228,.16)]"
          >
            <span
              aria-hidden
              className="block h-[11px] w-[13px] rounded-[4px] border-2 border-[var(--ink)]"
            />
            {unreadCount > 0 && (
              <span className="mono absolute -right-[3px] -top-[3px] flex h-[15px] min-w-[15px] items-center justify-center rounded-full bg-[var(--acc)] px-0.5 text-[8.5px] font-bold text-[var(--acc-ink)]">
                {unreadCount}
              </span>
            )}
          </Link>
        </div>
      </header>

      <GlobalDropTicker />

      <Link
        href="/search"
        className="mono mx-4 mt-2.5 block rounded-full border border-[rgba(237,235,228,.12)] px-4 py-2.5 text-[10.5px] tracking-[.3px] text-[rgba(237,235,228,.4)]"
      >
        search the rack — y2k, samba, gorpcore…
      </Link>

      <div className="mt-3 flex gap-1.5 overflow-x-auto px-4 pb-0.5" role="tablist" aria-label="Categories">
        {CATEGORIES.map((c) => (
          <button
            key={c}
            type="button"
            role="tab"
            aria-selected={c === cat}
            onClick={() => setCat(c)}
            className={`chip ${c === cat ? "chip-on" : ""}`}
          >
            {c}
          </button>
        ))}
      </div>

      <div className="px-4 pt-3.5">
        <button
          type="button"
          onClick={invite}
          className="flex w-full items-center gap-2.5 rounded-[13px] border border-dashed px-3.5 py-3 text-left"
          style={{ borderColor: "color-mix(in oklab, var(--acc) 45%, transparent)" }}
        >
          <span className="live-dot" aria-hidden />
          <span className="min-w-0 flex-1">
            <span className="block text-[11px] font-semibold tracking-[.3px]">
              CLOSET DROP — TONIGHT 21:00
            </span>
            <span className="mono mt-0.5 block text-[8.5px] text-[rgba(237,235,228,.45)]">
              @mara.vintage · 32 pieces · invite 2 friends → early access
            </span>
          </span>
          <span className="meta flex-none text-[9px] text-[var(--acc)]">
            {invited ? "LINK COPIED" : "INVITE ↗"}
          </span>
        </button>
      </div>

      <section className="grid grid-cols-2 gap-x-2.5 gap-y-4 px-4 py-3.5" aria-label="The rack">
        {visible.map((l) => (
          <ListingCard key={l.id} listing={l} />
        ))}
        {visible.length === 0 && (
          <p className="mono col-span-2 py-10 text-center text-[9.5px] text-[var(--ink-dim)]">
            nothing in {cat.toLowerCase()} right now — check back at :00
          </p>
        )}
      </section>
    </main>
  );
}
