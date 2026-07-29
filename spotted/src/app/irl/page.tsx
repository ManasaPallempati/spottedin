"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ListingImage } from "@/components/ListingImage";
import { useStore } from "@/state/store";

// v1 visual match is a tag-based stub (pgvector/CLIP lands in Phase 3):
// listing ids + match confidence from the handoff prototype.
const STUB_MATCHES: [string, number][] = [
  ["8", 92],
  ["3", 87],
  ["10", 81],
];

type Stage = "idle" | "snapped" | "wanted";

export default function IrlPage() {
  const router = useRouter();
  const { listings, priceOf, stealOf, postWanted } = useStore();
  const [stage, setStage] = useState<Stage>("idle");
  const [snapUrl, setSnapUrl] = useState<string | null>(null);

  const matches = STUB_MATCHES.map(([id, match]) => ({
    listing: listings.find((l) => l.id === id),
    match,
  })).filter((m) => m.listing);

  async function handleWanted() {
    await postWanted(["y2k", "outerwear"], "fit snapped irl");
    setStage("wanted");
  }

  return (
    <main className="screen flex min-h-[calc(100dvh-92px)] flex-col">
      <header className="flex items-center justify-between px-5 pb-2 pt-5">
        <button
          type="button"
          onClick={() => router.back()}
          className="mono text-[10px] text-[rgba(237,235,228,.55)]"
        >
          ← BACK
        </button>
        <h1 className="display text-[17px]">
          SPOTTED IRL<span className="text-[var(--acc)]">●</span>
        </h1>
        <span className="w-[44px]" aria-hidden />
      </header>

      {stage === "idle" && (
        <div className="flex flex-1 flex-col px-4 pb-4 pt-2">
          <div className="relative flex-1 overflow-hidden rounded-[18px] bg-[#141417]">
            {[
              "left-3.5 top-3.5 rounded-tl-[3px] border-l-2 border-t-2",
              "right-3.5 top-3.5 rounded-tr-[3px] border-r-2 border-t-2",
              "bottom-3.5 left-3.5 rounded-bl-[3px] border-b-2 border-l-2",
              "bottom-3.5 right-3.5 rounded-br-[3px] border-b-2 border-r-2",
            ].map((pos) => (
              <span key={pos} className={`absolute h-5 w-5 border-[var(--acc)] ${pos}`} aria-hidden />
            ))}
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-8 text-center">
              <p className="mono text-[10px] tracking-[.5px] text-[rgba(237,235,228,.55)]">
                camera viewfinder
              </p>
              <p className="mono text-[9px] leading-[1.7] text-[rgba(237,235,228,.35)]">
                saw a fit you rate? point + snap.
                <br />
                we find it secondhand.
              </p>
              <label className="mono mt-2 cursor-pointer rounded-full border border-[rgba(237,235,228,.18)] px-4 py-2 text-[9px] font-bold tracking-[1px]">
                UPLOAD A PHOTO
                <input
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) setSnapUrl(URL.createObjectURL(file));
                    setStage("snapped");
                  }}
                />
              </label>
            </div>
          </div>
          <div className="flex justify-center pb-1.5 pt-4">
            <button
              type="button"
              aria-label="Snap"
              onClick={() => setStage("snapped")}
              className="flex h-16 w-16 items-center justify-center rounded-full border-[3px] border-[var(--ink)]"
            >
              <span className="block h-[46px] w-[46px] rounded-full bg-[var(--acc)]" aria-hidden />
            </button>
          </div>
          <p className="mono pb-1 text-center text-[8.5px] tracking-[.4px] text-[rgba(237,235,228,.3)]">
            no exact match? auto-posts a WANTED — sellers get pinged
          </p>
        </div>
      )}

      {stage === "snapped" && (
        <div className="screen flex-1 overflow-y-auto px-4 pb-5 pt-2">
          <div className="relative flex h-[110px] items-center justify-center overflow-hidden rounded-[14px] bg-[#141417]">
            {snapUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={snapUrl} alt="your snap" className="h-full w-full object-cover" />
            ) : (
              <span className="mono text-[9px] text-[rgba(237,235,228,.45)]">your snap</span>
            )}
          </div>
          <p className="meta mb-2.5 mt-3.5 flex items-center gap-2 text-[10px] tracking-[1.2px] text-[var(--acc)]">
            <span className="block h-1.5 w-1.5 rounded-full bg-[var(--acc)]" aria-hidden />
            {matches.length} MATCHES ON THE RACK
          </p>
          <div className="flex flex-col gap-2">
            {matches.map(({ listing, match }) => (
              <Link
                key={listing!.id}
                href={`/item/${listing!.id}`}
                className="card-surface flex items-center gap-3 rounded-[13px] p-2.5"
              >
                <ListingImage photo={listing!.photos[0]} className="h-[54px] w-11 flex-none rounded-[8px]" />
                <span className="min-w-0 flex-1">
                  <span className="block text-[11.5px] font-semibold">{listing!.title}</span>
                  <span className="mono mt-0.5 block text-[8.5px] uppercase text-[rgba(237,235,228,.4)]">
                    {listing!.brand} · {listing!.size} · MATCH {match}%
                  </span>
                </span>
                <span className="flex-none text-right">
                  <span className="display block text-[14px]">${priceOf(listing!)}</span>
                  <span className="mono block text-[8px] font-bold text-[var(--acc)]">
                    −{stealOf(listing!) ?? 0}%
                  </span>
                </span>
              </Link>
            ))}
          </div>
          <div className="mt-3.5 flex gap-2">
            <button type="button" onClick={handleWanted} className="pill-outline flex-1 text-[10px]">
              POST WANTED
            </button>
            <button
              type="button"
              onClick={() => {
                setSnapUrl(null);
                setStage("idle");
              }}
              className="pill-outline flex-1 text-[10px] text-[rgba(237,235,228,.6)]"
            >
              SNAP ANOTHER
            </button>
          </div>
        </div>
      )}

      {stage === "wanted" && (
        <div className="screen flex flex-1 flex-col items-center justify-center px-8 text-center">
          <span className="pop-in flex h-[58px] w-[58px] items-center justify-center rounded-full bg-[var(--acc)] text-[24px] font-bold text-[var(--acc-ink)]">
            ✓
          </span>
          <h2 className="display mt-4 text-[24px]">WANTED, POSTED.</h2>
          <p className="mono mt-2 text-[9.5px] leading-[1.7] text-[rgba(237,235,228,.45)]">
            sellers with a match get pinged.
            <br />
            first to list it, wins you.
          </p>
          <div className="mt-6 flex w-full gap-2">
            <button
              type="button"
              onClick={() => {
                setSnapUrl(null);
                setStage("idle");
              }}
              className="pill-outline flex-1 text-[10px]"
            >
              SNAP ANOTHER
            </button>
            <Link href="/" className="pill-primary flex-1 text-[10px]">
              BACK TO RACK
            </Link>
          </div>
        </div>
      )}
    </main>
  );
}
