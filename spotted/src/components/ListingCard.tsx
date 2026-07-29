"use client";

import Link from "next/link";
import type { Listing } from "@/data/types";
import { dropRateLabel } from "@/lib/pricing";
import { useStore } from "@/state/store";
import { ListingImage } from "./ListingImage";
import { SpotButton } from "./SpotButton";

export function ListingCard({ listing, showSpot = true }: { listing: Listing; showSpot?: boolean }) {
  const { priceOf, stealOf } = useStore();
  const price = priceOf(listing);
  const steal = stealOf(listing);

  return (
    <div className="relative">
      <Link href={`/item/${listing.id}`} className="block">
        <div className="relative">
          <ListingImage
            photo={listing.photos[0]}
            className="aspect-[3/4] rounded-[14px] border border-[var(--hairline)]"
          />
          {steal !== null && (
            <span className="meta absolute bottom-2 left-2 rounded-full bg-[var(--acc)] px-2 py-1 text-[8.5px] tracking-[.5px] text-[var(--acc-ink)]">
              −{steal}%
            </span>
          )}
        </div>
        <div className="mt-2 flex items-baseline gap-1.5">
          <span className="display text-[15px]">${price}</span>
          {listing.retailPrice !== null && (
            <span className="mono text-[9px] text-[var(--ink-dim)] line-through">
              ${listing.retailPrice}
            </span>
          )}
          <span className="mono ml-auto text-[8.5px] text-[var(--ink-dim)]">
            {dropRateLabel(listing.dropRate)}
          </span>
        </div>
        <p className="mt-0.5 truncate text-[11.5px] font-medium text-[rgba(237,235,228,.8)]">
          {listing.title}
        </p>
        <p className="mono mt-0.5 text-[8.5px] uppercase text-[rgba(237,235,228,.38)]">
          {listing.brand} · {listing.size} · {listing.spots} spots
        </p>
      </Link>
      {showSpot && <SpotButton listingId={listing.id} className="absolute right-2 top-2" />}
    </div>
  );
}
