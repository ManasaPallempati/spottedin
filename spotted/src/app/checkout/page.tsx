import { getAdapter } from "@/data/adapter";
import { currentPrice, stealPercent } from "@/lib/pricing";

export const dynamic = "force-dynamic";

export default async function CheckoutPage({
  searchParams,
}: {
  searchParams: Promise<{ item?: string; offer?: string }>;
}) {
  const { item = "1", offer } = await searchParams;
  const now = new Date();
  const listing = await getAdapter().getListing(item);
  const offerPrice = offer ? Number(offer) : null;
  const price = offerPrice ?? (listing ? currentPrice(listing, now) : 0);
  const shipping = 4.99;
  const steal = listing ? stealPercent(price, listing.retailPrice) : null;

  return (
    <main className="screen px-4 pb-10 pt-5">
      <h1 className="display text-[20px]">CHECKOUT</h1>

      {listing && (
        <div className="card-surface mt-4 flex items-center gap-3 px-3 py-3">
          <span
            className="h-14 w-14 rounded-[10px]"
            style={{ background: `linear-gradient(160deg, ${listing.photo.c1}, ${listing.photo.c2})` }}
          />
          <div className="flex-1">
            <p className="text-[12px] font-medium">{listing.title}</p>
            <p className="text-[10px] text-[var(--ink-muted)]">
              {listing.brand} · {listing.size}
            </p>
          </div>
          <div className="text-right">
            <p className="display text-[17px]">${price}</p>
            <p className="meta text-[7.5px] text-[var(--acc)]">
              {offerPrice !== null ? "OFFER LOCKED" : "DROP PRICE"}
            </p>
          </div>
        </div>
      )}

      <section className="mt-5">
        <p className="meta text-[9px] text-[var(--ink-muted)]">SHIP TO</p>
        <input
          placeholder="address"
          className="mt-2 w-full rounded-[12px] border border-[var(--hairline)] bg-[var(--card)] px-4 py-3 text-[13px] outline-none placeholder:text-[var(--ink-dim)]"
        />
      </section>

      <section className="mt-5">
        <p className="meta text-[9px] text-[var(--ink-muted)]">SPEED</p>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <div className="card-surface border-[var(--acc)] px-4 py-3">
            <p className="meta text-[9px]">TRACKED</p>
            <p className="mt-1 text-[11px] text-[var(--ink-muted)]">$4.99 · 3-5 days</p>
          </div>
          <div className="card-surface px-4 py-3">
            <p className="meta text-[9px]">EXPRESS</p>
            <p className="mt-1 text-[11px] text-[var(--ink-muted)]">$9.99 · 1-2 days</p>
          </div>
        </div>
      </section>

      <section className="mt-5">
        <p className="meta text-[9px] text-[var(--ink-muted)]">PAY WITH</p>
        <div className="mt-2 flex gap-2">
          <span className="pill-outline flex-1">APPLE PAY</span>
          <span className="pill-outline flex-1">CARD</span>
        </div>
        <p className="mt-2 text-[10px] text-[var(--ink-dim)]">
          stripe test mode wires up in the Phase 1 build-out
        </p>
      </section>

      <section className="card-surface mt-5 px-4 py-3 text-[12px]">
        <div className="flex justify-between text-[var(--ink-muted)]">
          <span>item</span>
          <span>${price.toFixed(2)}</span>
        </div>
        <div className="mt-1 flex justify-between text-[var(--ink-muted)]">
          <span>shipping</span>
          <span>${shipping.toFixed(2)}</span>
        </div>
        <div className="mt-1 flex justify-between">
          <span className="meta text-[9px] text-[var(--acc)]">BUYER FEES $0 — ON US</span>
          <span className="text-[var(--ink-muted)]">$0.00</span>
        </div>
        <div className="mt-2 flex justify-between border-t border-[var(--hairline)] pt-2 font-medium">
          <span>total{steal !== null ? ` (−${steal}% vs retail)` : ""}</span>
          <span>${(price + shipping).toFixed(2)}</span>
        </div>
      </section>

      <button className="pill-primary mt-5 w-full" type="button">
        PAY ${(price + shipping).toFixed(2)}
      </button>
    </main>
  );
}
