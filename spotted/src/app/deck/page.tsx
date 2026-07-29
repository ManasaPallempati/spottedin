"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { ListingImage } from "@/components/ListingImage";
import { ME } from "@/data/me";
import { useStore } from "@/state/store";

const SWIPE_THRESHOLD = 90;

export default function DeckPage() {
  const { listings, deckSeenIds, spottedIds, deckSignal, priceOf, stealOf } = useStore();
  const cards = listings.filter(
    (l) => l.status === "live" && l.sellerHandle !== ME.handle && !deckSeenIds.has(l.id),
  );
  const top = cards[0];
  const next = cards[1];

  const [drag, setDrag] = useState<{ x: number; y: number } | null>(null);
  const [flying, setFlying] = useState<null | "l" | "r">(null);
  const start = useRef<{ x: number; y: number } | null>(null);

  function settle(dir: "l" | "r") {
    if (!top || flying) return;
    setFlying(dir);
    window.setTimeout(() => {
      deckSignal(top.id, dir === "r" ? "spot" : "drop");
      setFlying(null);
      setDrag(null);
    }, 300);
  }

  const dragStyle =
    drag && !flying
      ? {
          transform: `translate(${drag.x}px, ${drag.y * 0.2}px) rotate(${drag.x / 18}deg)`,
          transition: "none",
        }
      : { transform: "none", transition: "transform 200ms ease" };

  return (
    <main className="screen flex min-h-[calc(100dvh-92px)] flex-col">
      <header className="flex items-baseline justify-between px-5 pt-5">
        <h1 className="display text-[21px]">SPOT OR DROP</h1>
        <span className="mono text-[9px] text-[rgba(237,235,228,.45)]">
          {spottedIds.size} SPOTTED
        </span>
      </header>
      <p className="mono px-5 pb-2.5 pt-1 text-[9px] tracking-[.3px] text-[rgba(237,235,228,.38)]">
        tuned to: {ME.tunedTo}
      </p>

      <div className="relative mx-6 mb-3 min-h-[380px] flex-1">
        {next && (
          <div
            className="absolute inset-x-2.5 -bottom-1.5 top-3.5 scale-95 overflow-hidden rounded-[20px] opacity-45"
            aria-hidden
          >
            <ListingImage photo={next.photos[0]} className="h-full w-full" />
          </div>
        )}
        {top ? (
          <div
            className={`absolute inset-0 touch-none select-none overflow-hidden rounded-[20px] shadow-[0_18px_44px_rgba(0,0,0,.45)] ${
              flying === "l" ? "deck-out-left" : flying === "r" ? "deck-out-right" : ""
            }`}
            style={dragStyle}
            onPointerDown={(e) => {
              start.current = { x: e.clientX, y: e.clientY };
              e.currentTarget.setPointerCapture(e.pointerId);
            }}
            onPointerMove={(e) => {
              if (!start.current) return;
              setDrag({ x: e.clientX - start.current.x, y: e.clientY - start.current.y });
            }}
            onPointerUp={() => {
              start.current = null;
              if (!drag) return;
              if (drag.x > SWIPE_THRESHOLD) settle("r");
              else if (drag.x < -SWIPE_THRESHOLD) settle("l");
              else setDrag(null);
            }}
            onPointerCancel={() => {
              start.current = null;
              setDrag(null);
            }}
          >
            <ListingImage photo={top.photos[0]} className="h-full w-full" />
            <span className="meta absolute left-3 top-3 rounded-full bg-[var(--acc)] px-2.5 py-1 text-[10px] tracking-[.5px] text-[var(--acc-ink)]">
              −{stealOf(top) ?? 0}% STEAL
            </span>
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[rgba(10,10,12,.88)] to-transparent px-4 pb-4 pt-10">
              <div className="flex items-baseline gap-2">
                <span className="display text-[24px]">${priceOf(top)}</span>
                {top.retailPrice !== null && (
                  <span className="mono text-[10px] text-[rgba(237,235,228,.45)] line-through">
                    ${top.retailPrice}
                  </span>
                )}
              </div>
              <p className="mt-0.5 text-[13px] font-semibold tracking-[.2px]">{top.title}</p>
              <p className="mono mt-0.5 text-[9px] text-[rgba(237,235,228,.5)]">
                {top.brand} · {top.size} · @{top.sellerHandle}
              </p>
            </div>
          </div>
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-[20px] border border-dashed border-[rgba(237,235,228,.2)] px-8 text-center">
            <span className="text-[var(--acc)]">●</span>
            <p className="mono text-[9.5px] leading-relaxed text-[var(--ink-dim)]">
              deck&apos;s dry — you&apos;ve called every card.
              <br />
              fresh drops hit at :00
            </p>
            <Link href="/" className="meta text-[9px] text-[var(--acc)]">
              BACK TO THE RACK
            </Link>
          </div>
        )}
      </div>

      <div className="flex justify-center gap-6 pb-3 pt-1">
        <button
          type="button"
          aria-label="Drop — not my taste"
          disabled={!top}
          onClick={() => settle("l")}
          className="flex h-[58px] w-[58px] items-center justify-center rounded-full border-[1.5px] border-[rgba(237,235,228,.25)] text-[20px] font-light text-[rgba(237,235,228,.7)] disabled:opacity-40"
        >
          ✕
        </button>
        <button
          type="button"
          aria-label="Spot — save + drop alerts"
          disabled={!top}
          onClick={() => settle("r")}
          className="flex h-[58px] w-[58px] items-center justify-center rounded-full bg-[var(--acc)] disabled:opacity-40"
          style={{ boxShadow: "0 8px 24px color-mix(in oklab, var(--acc) 35%, transparent)" }}
        >
          <span
            aria-hidden
            className="flex h-4 w-4 items-center justify-center rounded-full border-[3px] border-[var(--acc-ink)]"
          >
            <span className="block h-[5px] w-[5px] rounded-full bg-[var(--acc-ink)]" />
          </span>
        </button>
      </div>
      <p className="mono pb-4 text-center text-[8.5px] tracking-[.5px] text-[rgba(237,235,228,.3)]">
        ✕ DROP — teaches your taste · ● SPOT — saves + price alerts
      </p>
    </main>
  );
}
