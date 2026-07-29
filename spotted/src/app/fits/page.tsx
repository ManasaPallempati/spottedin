"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ListingImage } from "@/components/ListingImage";
import { useStore } from "@/state/store";

const FIT_SECONDS = 8;

export default function FitsPage() {
  const { fits, listings, priceOf, stealOf } = useStore();
  const [idx, setIdx] = useState(0);
  const [followed, setFollowed] = useState<ReadonlySet<string>>(new Set());
  const fit = fits[idx % Math.max(fits.length, 1)];

  // Autoplay paging with a reduced-motion opt-out; tap zones always work.
  useEffect(() => {
    if (!fits.length) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = window.setTimeout(() => setIdx((i) => (i + 1) % fits.length), FIT_SECONDS * 1000);
    return () => window.clearTimeout(id);
  }, [idx, fits.length]);

  if (!fit) return null;
  const look = fit.lookListingIds
    .map((lid) => listings.find((l) => l.id === lid))
    .filter((l): l is NonNullable<typeof l> => !!l);
  const isFollowing = followed.has(fit.sellerHandle);

  return (
    <main className="screen relative min-h-[calc(100dvh-92px)] overflow-hidden">
      {fit.videoUrl ? (
        <video
          key={fit.id}
          className="absolute inset-0 h-full w-full object-cover"
          src={fit.videoUrl}
          poster={fit.poster.src ?? undefined}
          autoPlay
          muted
          loop
          playsInline
        />
      ) : (
        <ListingImage photo={fit.poster} className="absolute inset-0" />
      )}

      <button
        type="button"
        aria-label="Previous fit"
        onClick={() => setIdx((i) => (i - 1 + fits.length) % fits.length)}
        className="absolute bottom-[190px] left-0 top-0 z-10 w-[45%] cursor-pointer"
      />
      <button
        type="button"
        aria-label="Next fit"
        onClick={() => setIdx((i) => (i + 1) % fits.length)}
        className="absolute bottom-[190px] right-0 top-0 z-10 w-[45%] cursor-pointer"
      />

      <div className="absolute inset-x-3.5 top-4 z-20">
        <div className="h-[2.5px] overflow-hidden rounded-full bg-[rgba(237,235,228,.18)]">
          <div key={fit.id} className="fit-progress h-full bg-[var(--acc)]" />
        </div>
        <div className="mt-3 flex items-baseline justify-between">
          <h1 className="display text-[18px]">FITS</h1>
          <span className="mono text-[9px] text-[rgba(237,235,228,.6)]">
            {(idx % fits.length) + 1}/{fits.length} · tap sides to flip
          </span>
        </div>
      </div>

      <div className="absolute bottom-[206px] right-3 z-20 flex flex-col items-center gap-3.5">
        <div className="flex flex-col items-center gap-1">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[rgba(12,12,14,.5)] backdrop-blur-sm">
            <span className="block h-2.5 w-2.5 rounded-full bg-[var(--acc)]" aria-hidden />
          </span>
          <span className="mono text-[8.5px] font-bold">{fit.plays}</span>
        </div>
        <button type="button" className="flex flex-col items-center gap-1" aria-label="Share fit">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[rgba(12,12,14,.5)] text-[15px] backdrop-blur-sm">
            ↗
          </span>
          <span className="mono text-[8.5px] font-bold">SHARE</span>
        </button>
      </div>

      <div className="absolute inset-x-0 bottom-0 z-20 bg-gradient-to-t from-[rgba(10,10,12,.94)] via-[rgba(10,10,12,.7)] to-transparent px-3.5 pb-4 pt-8">
        <div className="flex items-center gap-2">
          <span className="mono flex h-7 w-7 items-center justify-center rounded-full border-[1.5px] border-[var(--acc)] bg-[#26262C] text-[9px] font-bold">
            {fit.sellerHandle.slice(0, 2).toUpperCase()}
          </span>
          <span className="text-[12px] font-semibold">@{fit.sellerHandle}</span>
          <button
            type="button"
            aria-pressed={isFollowing}
            onClick={() =>
              setFollowed((prev) => {
                const nextSet = new Set(prev);
                if (isFollowing) nextSet.delete(fit.sellerHandle);
                else nextSet.add(fit.sellerHandle);
                return nextSet;
              })
            }
            className="mono rounded-full px-2 py-0.5 text-[8.5px] font-bold"
            style={{
              color: isFollowing ? "var(--acc-ink)" : "var(--acc)",
              background: isFollowing ? "var(--acc)" : "transparent",
              border: "1px solid color-mix(in oklab, var(--acc) 45%, transparent)",
            }}
          >
            {isFollowing ? "FOLLOWING" : "FOLLOW"}
          </button>
        </div>
        <p className="mt-1.5 text-[12px] text-[rgba(237,235,228,.85)]">{fit.caption}</p>
        <p className="meta mb-1.5 mt-2.5 text-[8.5px] tracking-[1.2px] text-[var(--acc)]">
          SHOP THE LOOK
        </p>
        <div className="flex gap-1.5 overflow-x-auto">
          {look.map((l) => (
            <Link
              key={l.id}
              href={`/item/${l.id}`}
              className="flex flex-none items-center gap-1.5 rounded-[10px] border border-[rgba(237,235,228,.12)] bg-[rgba(23,23,27,.85)] p-1 pr-2.5"
            >
              <ListingImage photo={l.photos[0]} className="h-8 w-[26px] rounded-[6px]" />
              <span>
                <span className="block text-[10.5px] font-bold">${priceOf(l)}</span>
                <span className="mono block text-[8px] text-[var(--acc)]">
                  −{stealOf(l) ?? 0}%
                </span>
              </span>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
