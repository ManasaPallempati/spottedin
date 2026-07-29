"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { use } from "react";
import { ListingImage } from "@/components/ListingImage";
import { useStore } from "@/state/store";

export default function OrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { orders, listings, openThread } = useStore();
  const order = orders.find((o) => o.id === id);
  const listing = order ? listings.find((l) => l.id === order.listingId) : undefined;

  if (!order) {
    return (
      <main className="screen flex min-h-[60dvh] flex-col items-center justify-center gap-3">
        <p className="mono text-[10px] text-[var(--ink-dim)]">order not found</p>
        <Link href="/closet" className="meta text-[9px] text-[var(--acc)]">
          BACK TO CLOSET
        </Link>
      </main>
    );
  }

  async function messageSeller() {
    if (!listing) return;
    const threadId = await openThread(listing.id, listing.sellerHandle);
    router.push(`/inbox/${threadId}`);
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
        <h1 className="display text-[19px]">ON ITS WAY</h1>
      </header>

      <p className="mono mt-2 text-[9px] uppercase text-[rgba(237,235,228,.42)]">
        ORDER #{order.id.toUpperCase()} · {order.carrier} · ETA {order.eta}
      </p>

      {listing && (
        <div className="card-surface mt-3.5 flex items-center gap-3 rounded-[13px] p-2.5">
          <ListingImage photo={listing.photos[0]} className="h-[54px] w-11 flex-none rounded-[8px]" />
          <span className="min-w-0 flex-1">
            <span className="block text-[12px] font-semibold">{listing.title}</span>
            <span className="mono mt-0.5 block text-[8.5px] uppercase text-[rgba(237,235,228,.42)]">
              PAID ${order.pricePaid} · @{listing.sellerHandle}
            </span>
          </span>
        </div>
      )}

      <div className="relative mt-3.5 h-[110px] overflow-hidden rounded-[14px] bg-[#141417]">
        <p className="mono absolute inset-0 flex items-center justify-center text-[9px] text-[rgba(237,235,228,.45)]">
          live map — memphis → sf
        </p>
        <span
          className="pulse absolute left-[38%] top-[46%] block h-2.5 w-2.5 rounded-full bg-[var(--acc)]"
          aria-hidden
        />
      </div>

      <ol className="mt-5 flex flex-col">
        {order.steps.map((step, i) => {
          const last = i === order.steps.length - 1;
          const labelColor =
            step.state === "next"
              ? "rgba(237,235,228,.35)"
              : step.state === "active"
                ? "var(--acc)"
                : "var(--ink)";
          return (
            <li key={step.label} className="flex gap-3">
              <span className="flex flex-col items-center">
                <span
                  className={`box-border block h-3 w-3 rounded-full border-2 ${step.state === "active" ? "pulse" : ""}`}
                  style={{
                    background: step.state === "done" ? "var(--acc)" : "transparent",
                    borderColor:
                      step.state === "next" ? "rgba(237,235,228,.25)" : "var(--acc)",
                  }}
                  aria-hidden
                />
                {!last && (
                  <span
                    className="my-0.5 w-0.5 flex-1"
                    style={{
                      background:
                        step.state === "done"
                          ? "color-mix(in oklab, var(--acc) 45%, transparent)"
                          : "rgba(237,235,228,.12)",
                    }}
                    aria-hidden
                  />
                )}
              </span>
              <span className="pb-5">
                <span
                  className="block text-[11.5px] font-semibold tracking-[.3px]"
                  style={{ color: labelColor }}
                >
                  {step.label}
                </span>
                <span className="mono mt-0.5 block text-[8.5px] text-[rgba(237,235,228,.38)]">
                  {step.detail}
                </span>
              </span>
            </li>
          );
        })}
      </ol>

      <button type="button" onClick={messageSeller} className="pill-outline mt-1 w-full">
        MESSAGE SELLER
      </button>
    </main>
  );
}
