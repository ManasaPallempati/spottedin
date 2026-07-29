"use client";

import { useEffect, useState } from "react";
import { countdownLabel, secondsToNextHour } from "@/lib/pricing";

// Display-only countdown to the top of the hour. Prices themselves are always
// server-computed; this never touches a price.
export function GlobalDropTicker() {
  const [seconds, setSeconds] = useState<number | null>(null);

  useEffect(() => {
    const tick = () => setSeconds(secondsToNextHour(new Date()));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  const progress = seconds === null ? 0 : 1 - seconds / 3600;

  return (
    <div className="card-surface mx-4 mt-3 px-4 py-3">
      <div className="flex items-center justify-between">
        <span className="meta flex items-center gap-2 text-[9.5px] text-[var(--ink-muted)]">
          <span className="live-dot" />
          GLOBAL DROP −$1
        </span>
        <span className="meta text-[10px] text-[var(--acc)]" suppressHydrationWarning>
          {seconds === null ? "--:--" : countdownLabel(seconds)}
        </span>
      </div>
      <div className="mt-2 h-[3px] overflow-hidden rounded-full bg-[var(--elevated)]">
        <div
          className="h-full rounded-full bg-[var(--acc)] transition-[width] duration-1000"
          style={{ width: `${Math.round(progress * 100)}%` }}
        />
      </div>
    </div>
  );
}
