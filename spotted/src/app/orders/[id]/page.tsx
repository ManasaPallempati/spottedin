import Link from "next/link";
import { notFound } from "next/navigation";
import { getAdapter } from "@/data/adapter";

export const dynamic = "force-dynamic";

export default async function OrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = getAdapter();
  const order = await data.getOrder(id);
  if (!order) notFound();
  const listing = await data.getListing(order.listingId);

  return (
    <main className="screen px-4 pt-5">
      <h1 className="display text-[20px]">ORDER #{order.id.toUpperCase()}</h1>
      <p className="meta mt-1 text-[8.5px] text-[var(--ink-muted)]">
        {order.carrier} · ETA {order.eta}
      </p>

      {listing && (
        <div className="card-surface mt-4 flex items-center gap-3 px-3 py-3">
          <span
            className="h-12 w-12 rounded-[10px]"
            style={{ background: `linear-gradient(160deg, ${listing.photo.c1}, ${listing.photo.c2})` }}
          />
          <div className="flex-1">
            <p className="text-[12px] font-medium">{listing.title}</p>
            <p className="text-[10px] text-[var(--ink-muted)]">paid ${order.pricePaid}</p>
          </div>
        </div>
      )}

      {/* Live map region placeholder */}
      <div className="mt-4 flex h-32 items-center justify-center rounded-[14px] border border-[var(--hairline)] bg-[#101014]">
        <span className="meta text-[8.5px] text-[var(--ink-dim)]">EN ROUTE — {order.status.toUpperCase()}</span>
      </div>

      <ol className="mt-5 flex flex-col gap-4">
        {order.steps.map((step) => (
          <li key={step.label} className="flex items-center gap-3">
            <span
              className={
                step.state === "active"
                  ? "live-dot"
                  : `h-[6px] w-[6px] rounded-full ${step.state === "done" ? "bg-[var(--acc)]" : "bg-[var(--elevated)]"}`
              }
            />
            <span
              className="meta text-[9px]"
              style={{ color: step.state === "next" ? "var(--ink-dim)" : "var(--ink)" }}
            >
              {step.label}
            </span>
          </li>
        ))}
      </ol>

      <Link href="/inbox/t1" className="pill-outline mt-6 block w-full">
        MESSAGE SELLER
      </Link>
    </main>
  );
}
