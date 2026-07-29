"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ListingCard } from "@/components/ListingCard";
import { useStore } from "@/state/store";

const TRENDING = ["Y2K", "SAMBA", "CARPENTER", "LEATHER MOTO", "90s NIKE", "GORPCORE"];

export default function SearchPage() {
  const router = useRouter();
  const { listings } = useStore();
  const [q, setQ] = useState("");

  const query = q.trim().toLowerCase();
  const results = listings.filter(
    (l) =>
      l.status === "live" &&
      (!query || `${l.title} ${l.brand} ${l.era} ${l.category}`.toLowerCase().includes(query)),
  );

  return (
    <main className="screen px-4 pt-5">
      <div className="flex items-center gap-2.5">
        <button
          type="button"
          onClick={() => router.back()}
          aria-label="Back"
          className="mono flex-none text-[12px] text-[rgba(237,235,228,.55)]"
        >
          ←
        </button>
        <label className="sr-only" htmlFor="rack-search">
          Search the rack
        </label>
        <input
          id="rack-search"
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="brands, eras, fits…"
          autoFocus
          className="min-w-0 flex-1 rounded-full border border-[rgba(237,235,228,.14)] bg-[var(--card)] px-4 py-2.5 text-[12px] text-[var(--ink)] outline-none"
        />
      </div>

      <p className="meta mb-1.5 mt-3.5 text-[8.5px] text-[rgba(237,235,228,.32)]">TRENDING</p>
      <div className="flex flex-wrap gap-1.5">
        {TRENDING.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setQ(t.toLowerCase())}
            className={`chip ${query === t.toLowerCase() ? "chip-on" : ""}`}
          >
            {t}
          </button>
        ))}
      </div>

      <p className="mono mt-4 text-[9px] text-[rgba(237,235,228,.38)]" aria-live="polite">
        {results.length} ON THE RACK — steal % live
      </p>
      <section className="grid grid-cols-2 gap-x-2.5 gap-y-4 py-2.5">
        {results.map((l) => (
          <ListingCard key={l.id} listing={l} />
        ))}
        {results.length === 0 && (
          <p className="mono col-span-2 py-10 text-center text-[9.5px] text-[var(--ink-dim)]">
            nothing for &ldquo;{q}&rdquo; — post a WANTED from spotted irl
          </p>
        )}
      </section>
    </main>
  );
}
