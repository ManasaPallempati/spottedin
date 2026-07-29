"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { ListingImage } from "@/components/ListingImage";
import { ME } from "@/data/me";
import type { CheckoutPrice, Order } from "@/data/types";
import { useStore } from "@/state/store";

export default function CheckoutPage() {
  return (
    <Suspense fallback={null}>
      <CheckoutInner />
    </Suspense>
  );
}

function CheckoutInner() {
  const router = useRouter();
  const search = useSearchParams();
  const itemId = search.get("item") ?? "";
  // Only an offer *id* travels in the URL. The amount is resolved server-side
  // against an accepted, non-expired offer for this buyer+listing — an
  // arbitrary ?offer=<price> can never set the charge.
  const offerId = search.get("offer") ?? undefined;

  const { listings, orders, priceOf, stealOf, resolveCheckout, pay, justDropped } = useStore();
  const listing = listings.find((l) => l.id === itemId);

  const [resolved, setResolved] = useState<CheckoutPrice | null>(null);
  const [shipping, setShipping] = useState<"tracked" | "express">("tracked");
  const [address, setAddress] = useState(`${ME.address.name}\n${ME.address.line1} · ${ME.address.line2}`);
  const [editingAddress, setEditingAddress] = useState(false);
  const [order, setOrder] = useState<Order | null>(null);
  const [paying, setPaying] = useState(false);
  const [shared, setShared] = useState(false);

  const placedOrder = order ? orders.find((o) => o.id === order.id) ?? order : null;

  useEffect(() => {
    if (!listing || order) return;
    let alive = true;
    resolveCheckout(listing.id, offerId).then((r) => {
      if (alive) setResolved(r);
    });
    return () => {
      alive = false;
    };
    // Re-resolve when the global drop fires so the charge follows the price.
  }, [listing, offerId, resolveCheckout, order, justDropped]);

  if (!listing) {
    return (
      <main className="screen flex min-h-[60dvh] flex-col items-center justify-center gap-3">
        <p className="mono text-[10px] text-[var(--ink-dim)]">nothing to check out</p>
        <Link href="/" className="meta text-[9px] text-[var(--acc)]">
          BACK TO THE RACK
        </Link>
      </main>
    );
  }

  const price = resolved?.price ?? priceOf(listing);
  const locked = resolved?.source === "offer";
  const shipCost = shipping === "express" ? 9.99 : 4.99;
  const total = price + shipCost;
  const retail = listing.retailPrice;
  const saved = placedOrder && retail ? retail - placedOrder.pricePaid : null;
  const savedPct = saved !== null && retail ? Math.round((saved / retail) * 100) : null;

  async function handlePay() {
    if (paying) return;
    setPaying(true);
    const placed = await pay({
      listingId: listing!.id,
      offerId: resolved?.offerId,
      shippingOption: shipping,
    });
    setOrder(placed);
    setPaying(false);
  }

  async function shareReceipt() {
    if (!placedOrder) return;
    const text = `STEAL RECEIPT — ${listing!.title}: paid $${placedOrder.pricePaid}${
      retail ? `, retail $${retail}, saved $${saved} (−${savedPct}%)` : ""
    } on SPOTTED`;
    try {
      if (navigator.share) await navigator.share({ text });
      else await navigator.clipboard.writeText(text);
      setShared(true);
    } catch {
      setShared(false);
    }
  }

  if (placedOrder) {
    return (
      <main className="screen px-5 pb-10 pt-14 text-center">
        <span className="pop-in mx-auto flex h-[58px] w-[58px] items-center justify-center rounded-full bg-[var(--acc)] text-[24px] font-bold text-[var(--acc-ink)]">
          ✓
        </span>
        <h1 className="display mt-3.5 text-[28px]">COPPED.</h1>
        <p className="mono mt-1.5 text-[9.5px] text-[rgba(237,235,228,.45)]">
          @{listing.sellerHandle} has 48h to ship · you&apos;re covered end-to-end
        </p>

        <div
          className="mx-auto mt-5 max-w-[250px] rounded-[16px] p-4 text-left"
          style={{
            border: "1px solid color-mix(in oklab, var(--acc) 45%, transparent)",
            background: "#131309",
          }}
        >
          <div className="flex items-center justify-between">
            <span className="meta text-[8.5px] tracking-[1.5px] text-[var(--acc)]">
              STEAL RECEIPT
            </span>
            <span className="text-[8.5px] text-[var(--acc)]">●</span>
          </div>
          <p className="display mt-2 text-[15px]">{listing.title}</p>
          <div className="mono mt-2.5 flex gap-3.5 text-[9px] leading-[1.7] text-[rgba(237,235,228,.6)]">
            <span>
              PAID
              <br />
              <span className="text-[13px] font-bold text-[var(--ink)]">
                ${placedOrder.pricePaid}
              </span>
            </span>
            {retail && (
              <span>
                RETAIL
                <br />
                <span className="line-through">${retail}</span>
              </span>
            )}
            {saved !== null && (
              <span>
                SAVED
                <br />
                <span className="text-[13px] font-bold text-[var(--acc)]">
                  ${saved} (−{savedPct}%)
                </span>
              </span>
            )}
          </div>
          <p className="mono mt-2.5 text-[7.5px] text-[rgba(237,235,228,.35)]">
            SPOTTED● — auto-sized for IG story
          </p>
        </div>

        <div className="mt-5 flex gap-2">
          <button type="button" onClick={shareReceipt} className="pill-primary flex-1 text-[10px]">
            {shared ? "COPIED ✓" : "SHARE RECEIPT"}
          </button>
          <Link href={`/orders/${placedOrder.id}`} className="pill-outline flex-1 text-[10px]">
            TRACK ORDER
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="screen px-4 pb-10 pt-5">
      <header className="flex items-center gap-2.5">
        <button
          type="button"
          onClick={() => router.back()}
          aria-label="Back"
          className="text-[13px] text-[rgba(237,235,228,.6)]"
        >
          ←
        </button>
        <h1 className="display text-[19px]">CHECKOUT</h1>
      </header>

      <div className="card-surface mt-3 flex items-center gap-3 rounded-[13px] p-2.5">
        <ListingImage photo={listing.photos[0]} className="h-[54px] w-11 flex-none rounded-[8px]" />
        <span className="min-w-0 flex-1">
          <span className="block text-[12px] font-semibold">{listing.title}</span>
          <span className="mono mt-0.5 block text-[8.5px] uppercase text-[rgba(237,235,228,.42)]">
            {listing.brand} · {listing.size} · @{listing.sellerHandle}
          </span>
        </span>
        <span className="flex-none text-right">
          <span className="display tnum block text-[16px]">${price}</span>
          <span className="mono block text-[8px] font-bold text-[var(--acc)]">
            {locked ? "OFFER LOCKED" : "DROP PRICE"}
          </span>
        </span>
      </div>

      <p className="meta mb-1.5 mt-4 text-[8.5px] text-[rgba(237,235,228,.35)]">SHIP TO</p>
      <div className="card-surface flex items-center justify-between rounded-[13px] px-3.5 py-3">
        {editingAddress ? (
          <textarea
            aria-label="Shipping address"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            rows={2}
            className="min-w-0 flex-1 resize-none bg-transparent text-[11px] leading-[1.6] text-[rgba(237,235,228,.8)] outline-none"
          />
        ) : (
          <p className="whitespace-pre-line text-[11px] leading-[1.6] text-[rgba(237,235,228,.8)]">
            {address}
          </p>
        )}
        <button
          type="button"
          onClick={() => setEditingAddress((v) => !v)}
          className="mono ml-3 flex-none text-[8.5px] font-bold text-[var(--acc)]"
        >
          {editingAddress ? "DONE" : "EDIT"}
        </button>
      </div>

      <p className="meta mb-1.5 mt-4 text-[8.5px] text-[rgba(237,235,228,.35)]">SPEED</p>
      <div className="flex flex-col gap-2" role="radiogroup" aria-label="Shipping speed">
        {(
          [
            ["tracked", "Tracked · 3–6 days", "$4.99"],
            ["express", "Express · 1–2 days", "$9.99"],
          ] as const
        ).map(([key, label, cost]) => {
          const on = shipping === key;
          return (
            <button
              key={key}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => setShipping(key)}
              className="flex items-center gap-2.5 rounded-[12px] border px-3 py-2.5 text-left"
              style={{ borderColor: on ? "var(--acc)" : "rgba(237,235,228,.12)" }}
            >
              <span
                aria-hidden
                className="box-border block h-3.5 w-3.5 rounded-full border-2"
                style={{
                  borderColor: on ? "var(--acc)" : "rgba(237,235,228,.3)",
                  background: on ? "var(--acc)" : "transparent",
                }}
              />
              <span className="flex-1 text-[11.5px] font-medium">{label}</span>
              <span className="mono text-[10px] font-bold">{cost}</span>
            </button>
          );
        })}
      </div>

      <p className="meta mb-1.5 mt-4 text-[8.5px] text-[rgba(237,235,228,.35)]">PAY WITH</p>
      <div className="card-surface flex items-center justify-between rounded-[13px] px-3.5 py-3">
        <span className="text-[11.5px] font-medium">Pay · ····4242</span>
        <button type="button" className="mono text-[8.5px] font-bold text-[var(--acc)]">
          CHANGE
        </button>
      </div>
      <p className="mono mt-1.5 text-[8px] text-[rgba(237,235,228,.32)]">
        stripe test mode — no real charge in the demo
      </p>

      <dl className="mono mt-4 border-t border-[rgba(237,235,228,.09)] pt-3 text-[10px] text-[rgba(237,235,228,.55)]">
        <div className="mb-1.5 flex justify-between">
          <dt>ITEM</dt>
          <dd className="tnum">${price.toFixed(2)}</dd>
        </div>
        <div className="mb-1.5 flex justify-between">
          <dt>SHIPPING</dt>
          <dd className="tnum">${shipCost.toFixed(2)}</dd>
        </div>
        <div className="mb-1.5 flex justify-between">
          <dt>BUYER FEES</dt>
          <dd className="text-[var(--acc)]">$0 — ON US</dd>
        </div>
        <div className="mt-2.5 flex items-baseline justify-between text-[var(--ink)]">
          <dt className="font-bold">TOTAL{stealOf(listing) !== null ? ` · −${stealOf(listing)}% VS RETAIL` : ""}</dt>
          <dd className="display tnum text-[20px]">${total.toFixed(2)}</dd>
        </div>
      </dl>

      <button
        type="button"
        onClick={handlePay}
        disabled={paying || !resolved}
        className="pill-primary mt-3.5 w-full disabled:opacity-60"
      >
        {paying ? "PAYING…" : `PAY $${total.toFixed(2)}`}
      </button>
    </main>
  );
}
