import Link from "next/link";
import type { Listing } from "@/data/types";
import { currentPrice, dropRateLabel, stealPercent } from "@/lib/pricing";

export function ListingCard({ listing, now }: { listing: Listing; now: Date }) {
  const price = currentPrice(listing, now);
  const steal = stealPercent(price, listing.retailPrice);

  return (
    <Link href={`/item/${listing.id}`} className="block">
      <div
        className="relative aspect-[3/4] overflow-hidden rounded-[14px] border border-[var(--hairline)]"
        style={{ background: `linear-gradient(160deg, ${listing.photo.c1}, ${listing.photo.c2})` }}
        aria-label={listing.photo.alt}
      >
        <span className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-black/40 text-[10px] text-[var(--ink-muted)]">
          ●
        </span>
        {steal !== null && (
          <span className="meta absolute bottom-2 left-2 rounded-full bg-[var(--acc)] px-2 py-1 text-[8.5px] text-[var(--acc-ink)]">
            −{steal}%
          </span>
        )}
      </div>
      <div className="mt-2 flex items-baseline gap-2">
        <span className="display text-[17px]">${price}</span>
        {listing.retailPrice !== null && (
          <span className="text-[11px] text-[var(--ink-dim)] line-through">${listing.retailPrice}</span>
        )}
        <span className="meta text-[8.5px] text-[var(--ink-dim)]">{dropRateLabel(listing.dropRate)}</span>
      </div>
      <p className="mt-1 truncate text-[12px] font-medium">{listing.title}</p>
      <p className="text-[11px] text-[var(--ink-muted)]">
        {listing.brand} · {listing.size} · {listing.spots} spots
      </p>
    </Link>
  );
}
