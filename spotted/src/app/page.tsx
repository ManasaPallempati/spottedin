import Link from "next/link";
import { GlobalDropTicker } from "@/components/GlobalDropTicker";
import { ListingCard } from "@/components/ListingCard";
import { getAdapter } from "@/data/adapter";

export const dynamic = "force-dynamic";

const CATEGORIES = ["ALL", "OUTERWEAR", "TOPS", "BOTTOMS", "SHOES", "BAGS"];

export default async function RackPage({
  searchParams,
}: {
  searchParams: Promise<{ cat?: string }>;
}) {
  const { cat = "ALL" } = await searchParams;
  const now = new Date();
  const listings = await getAdapter().listListings({ category: cat });

  return (
    <main className="screen">
      <header className="flex items-center justify-between px-4 pt-5">
        <h1 className="display text-[20px]">
          SPOTTED<span className="text-[var(--acc)]">●</span>
        </h1>
        <div className="flex items-center gap-4 text-[var(--ink-muted)]">
          <Link href="/irl" aria-label="Spotted IRL">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
              <path d="M4 8V6a2 2 0 012-2h2M16 4h2a2 2 0 012 2v2M20 16v2a2 2 0 01-2 2h-2M8 20H6a2 2 0 01-2-2v-2M12 15a3 3 0 100-6 3 3 0 000 6z" />
            </svg>
          </Link>
          <Link href="/inbox" aria-label="Inbox">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
              <path d="M4 6h16v12H4zM4 7l8 6 8-6" />
            </svg>
          </Link>
        </div>
      </header>

      <GlobalDropTicker />

      <Link
        href="/search"
        className="mx-4 mt-3 block rounded-full border border-[var(--hairline)] px-4 py-2.5 text-[10.5px] text-[var(--ink-dim)]"
        style={{ fontFamily: "var(--font-mono), monospace" }}
      >
        search the rack — y2k, samba, gorpcore…
      </Link>

      <div className="mt-3 flex gap-2 overflow-x-auto px-4 pb-1">
        {CATEGORIES.map((c) => (
          <Link key={c} href={c === "ALL" ? "/" : `/?cat=${c}`} className={`chip ${c === cat ? "chip-on" : ""}`}>
            {c}
          </Link>
        ))}
      </div>

      <div className="card-surface mx-4 mt-3 flex items-center justify-between px-4 py-3">
        <p className="text-[11px] text-[var(--ink-muted)]">
          invite 2 friends → early access to closet drops
        </p>
        <span className="meta text-[8.5px] text-[var(--acc)]">INVITE</span>
      </div>

      <section className="grid grid-cols-2 gap-x-3 gap-y-5 px-4 py-4">
        {listings.map((l) => (
          <ListingCard key={l.id} listing={l} now={now} />
        ))}
      </section>
    </main>
  );
}
