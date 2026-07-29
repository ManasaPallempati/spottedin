import Link from "next/link";
import { notFound } from "next/navigation";
import { getAdapter } from "@/data/adapter";
import { currentPrice } from "@/lib/pricing";

export const dynamic = "force-dynamic";

export default async function ThreadPage({ params }: { params: Promise<{ thread: string }> }) {
  const { thread: threadId } = await params;
  const data = getAdapter();
  const thread = await data.getThread(threadId);
  if (!thread) notFound();

  const now = new Date();
  const listing = await data.getListing(thread.listingId);
  const price = listing ? currentPrice(listing, now) : null;

  return (
    <main className="screen flex min-h-[calc(100dvh-84px)] flex-col px-4 pt-5">
      <header className="flex items-center gap-3">
        <Link href="/inbox" aria-label="Back" className="text-[var(--ink-muted)]">
          ←
        </Link>
        <h1 className="text-[13px] font-medium">@{thread.withHandle}</h1>
      </header>

      {listing && (
        <Link href={`/item/${listing.id}`} className="card-surface mt-3 flex items-center gap-3 px-3 py-2.5">
          <span
            className="h-10 w-10 rounded-[10px]"
            style={{ background: `linear-gradient(160deg, ${listing.photo.c1}, ${listing.photo.c2})` }}
          />
          <div className="flex-1">
            <p className="text-[11px] font-medium">{listing.title}</p>
            <p className="meta text-[8px] text-[var(--acc)]">${price} · STILL DROPPING</p>
          </div>
        </Link>
      )}

      <div className="flex flex-1 flex-col gap-2 py-4">
        {thread.messages.map((m) =>
          m.type === "offer" ? (
            <div key={m.id} className="card-surface self-end px-4 py-3 text-right">
              <p className="meta text-[9px] text-[var(--ink-muted)]">YOUR OFFER</p>
              <p className="display text-[20px]">${m.offerAmount}</p>
              <p className="meta mt-1 text-[8px] text-[var(--ink-dim)]">{m.offerStatus}</p>
              {m.offerStatus === "accepted" && (
                <Link href={`/checkout?item=${thread.listingId}&offer=${m.offerAmount}`} className="pill-primary mt-2">
                  CHECKOUT AT ${m.offerAmount}
                </Link>
              )}
            </div>
          ) : (
            <p
              key={m.id}
              className={`max-w-[75%] rounded-[14px] px-3.5 py-2.5 text-[12.5px] ${
                m.from === "me"
                  ? "self-end bg-[var(--elevated)]"
                  : "self-start border border-[var(--hairline)] bg-[var(--card)]"
              }`}
            >
              {m.body}
            </p>
          ),
        )}
      </div>

      <div className="flex gap-2 pb-4">
        <input
          placeholder="message"
          className="flex-1 rounded-full border border-[var(--hairline)] bg-[var(--card)] px-4 py-2.5 text-[12px] outline-none placeholder:text-[var(--ink-dim)]"
        />
        <button className="pill-primary px-5!" type="button">
          SEND
        </button>
      </div>
    </main>
  );
}
