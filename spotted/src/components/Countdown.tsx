"use client";

import { useStore } from "@/state/store";
import { countdownLabel } from "@/lib/pricing";

// Fixed-width tabular countdown so surrounding layout never shifts as digits
// tick. Renders a placeholder until mounted (SSR-safe).
export function Countdown({ className = "" }: { className?: string }) {
  const { seconds } = useStore();
  return (
    <span
      className={`mono tnum inline-block text-right ${className}`}
      style={{ minWidth: "5ch" }}
      suppressHydrationWarning
    >
      {seconds === null ? "--:--" : countdownLabel(seconds)}
    </span>
  );
}
