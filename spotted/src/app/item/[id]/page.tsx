import Link from "next/link";
import { notFound } from "next/navigation";
import { getAdapter } from "@/data/adapter";
import { countdownLabel, currentPrice, secondsToNextHour, stealPercent } from "@/lib/pricing";

export const dynamic = "force-dynamic";

export default async function ItemPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = getAdapter();
  const listing = await data.getListing(id);
  if (!listing) notFound();

  const now = new Date();
  const price = currentPrice(listing, now);
  const steal = stealPercent(price, listing.retailPrice);
  const seller = await data.getSeller(listing.sellerHandle);
  const atFloor = price <= listing.floorPrice;

  return (
    <main className="screen pb-24">
      <div
        className="relative aspect-[4/5] w-full"
        style={{ background: `linear-gradient(160deg, ${listing.photo.c1}, ${listing.photo.c2})` }}
        aria-label={listing.photo.alt}
      >
        <Link
          href="/"
          className="absolute left-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-black/40 text-[var(--ink)]"
          aria-label="Back"
        >
          ←
        </Link>
        <span className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-black/40 text-[var(--ink-muted)]">
          ●
        </span>
      </div>

      <div className="px-4 pt-4">
        {steal !== null && (
          <span className="meta rounded-full bg-[var(--acc)] px-2.5 py-1 text-[8.5px] text-[var(--acc-ink)]">
            −{steal}% UNDER RETAIL
          </span>
        )}
        <div className="mt-3 flex items-baseline gap-3">
          <span className="display text-[30px]">${price}</span>
          {listing.retailPrice !== null && (
            <span className="text-[14px] text-[var(--ink-dim)] line-through">${listing.retailPrice}</span>
          )}
        </div>

        <div className="card-surface mt-3 px-4 py-3">
          <div className="flex items-center justify-between">
            <span className="meta text-[9px] text-[var(--ink-muted)]">
              {atFloor ? "AT FLOOR — WON'T DROP FURTHER" : "NEXT DROP −$1 IN"}
            </span>
            {!atFloor && (
              <span className="meta text-[10px] text-[var(--acc)]">
                {countdownLabel(secondsToNextHour(now))}
              </span>
            )}
          </div>
          <div className="mt-2 h-[3px] overflow-hidden rounded-full bg-[var(--elevated)]">
            <div
              className="h-full bg-[var(--acc)]"
              style={{ width: `${Math.round((1 - secondsToNextHour(now) / 3600) * 100)}%` }}
            />
          </div>
          <p className="meta mt-2 text-[8.5px] text-[var(--ink-dim)]">
            FLOOR HIDDEN · {listing.watching} OTHERS WATCHING
          </p>
        </div>

        <h1 className="display mt-4 text-[20px]">{listing.title}</h1>
        <p className="mt-1 text-[11px] text-[var(--ink-muted)]">
          {listing.brand} · {listing.size} · {listing.condition} · {listing.era}
        </p>
        <p className="mt-1 flex items-center gap-2 text-[11px] text-[var(--ink-muted)]">
          <span className="live-dot" />
          {listing.spots} spots · {listing.watching} watching now
        </p>
        <p className="mt-3 text-[13px] leading-relaxed text-[var(--ink)]">{listing.description}</p>

        {seller && (
          <div className="card-surface mt-4 flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--elevated)] text-[10px]">
                {seller.handle.slice(0, 2).toUpperCase()}
              </span>
              <div>
                <p className="text-[12px] font-medium">@{seller.handle}</p>
                <p className="text-[10px] text-[var(--ink-muted)]">
                  ★{seller.rating.toFixed(1)} · {seller.sales} sales · replies {seller.repliesIn}
                </p>
              </div>
            </div>
            <Link href="/inbox/t1" className="meta text-[9px] text-[var(--acc)]">
              ASK
            </Link>
          </div>
        )}
      </div>

      <div className="fixed bottom-[76px] left-1/2 z-30 flex w-full max-w-[430px] -translate-x-1/2 gap-2 border-t border-[var(--hairline)] bg-[var(--bg-page)]/95 px-4 py-3 backdrop-blur">
        <button className="pill-outline flex-1" type="button">
          MAKE OFFER
        </button>
        <Link href={`/checkout?item=${listing.id}`} className="pill-primary flex-1">
          BUY ${price}
        </Link>
      </div>
    </main>
  );
}
