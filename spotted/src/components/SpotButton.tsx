"use client";

import { useStore } from "@/state/store";

// The spot toggle (the dot). Saves the listing + turns on drop alerts.
export function SpotButton({
  listingId,
  className = "",
}: {
  listingId: string;
  className?: string;
}) {
  const { spottedIds, toggleSpot } = useStore();
  const on = spottedIds.has(listingId);
  return (
    <button
      type="button"
      aria-label={on ? "Remove spot" : "Spot this — save + drop alerts"}
      aria-pressed={on}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        toggleSpot(listingId);
      }}
      className={`flex h-7 w-7 items-center justify-center rounded-full bg-[rgba(12,12,14,.55)] backdrop-blur-sm ${className}`}
    >
      <span
        className="block h-[9px] w-[9px] rounded-full border-2 box-border"
        style={{
          background: on ? "var(--acc)" : "transparent",
          borderColor: on ? "var(--acc)" : "rgba(237,235,228,.6)",
        }}
      />
    </button>
  );
}
