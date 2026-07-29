"use client";

import { useStore } from "@/state/store";
import { Countdown } from "./Countdown";

// The hourly Global Drop bar. Display-only: prices are always computed by the
// shared pricing util, never by this ticker. Height is reserved for the flash
// line so the layout never shifts at :00.
export function GlobalDropTicker() {
  const { seconds, justDropped } = useStore();
  const progress = seconds === null ? 0 : 1 - seconds / 3600;

  return (
    <div
      className="mx-4 mt-3 rounded-[12px] px-3.5 py-2.5"
      style={{
        border: "1px solid color-mix(in oklab, var(--acc) 35%, transparent)",
        background: "color-mix(in oklab, var(--acc) 7%, transparent)",
      }}
    >
      <div className="flex items-center justify-between">
        <span className="meta flex items-center gap-2 text-[9.5px] text-[var(--acc)]">
          <span className="live-dot" />
          GLOBAL DROP −$1
        </span>
        <Countdown className="text-[12px] font-bold tracking-[1px] text-[var(--ink)]" />
      </div>
      <div className="mt-2 h-[3px] overflow-hidden rounded-full bg-[rgba(237,235,228,.1)]">
        <div
          className="h-full rounded-full bg-[var(--acc)] transition-[width] duration-1000"
          style={{ width: `${Math.round(progress * 100)}%` }}
        />
      </div>
      <p
        className="meta mt-1.5 h-[13px] text-[9px] leading-[13px] text-[var(--acc)]"
        aria-live="polite"
      >
        {justDropped ? "● EVERYTHING JUST DROPPED — GRIDS UPDATED" : ""}
      </p>
    </div>
  );
}
