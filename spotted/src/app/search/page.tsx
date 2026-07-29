import { ListingCard } from "@/components/ListingCard";
import { getAdapter } from "@/data/adapter";

export const dynamic = "force-dynamic";

const TRENDING = ["Y2K", "SAMBA", "CARPENTER", "LEATHER MOTO", "90s NIKE", "GORPCORE"];

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q = "" } = await searchParams;
  const now = new Date();
  const results = await getAdapter().listListings({ query: q || undefined });

  return (
    <main className="screen px-4 pt-5">
      <form action="/search" method="get">
        <input
          type="search"
          name="q"
          defaultValue={q}
          placeholder="search the rack"
          className="w-full rounded-[12px] border border-[var(--hairline)] bg-[var(--card)] px-4 py-3 text-[13px] text-[var(--ink)] outline-none placeholder:text-[var(--ink-dim)]"
        />
      </form>

      <p className="meta mt-4 text-[9px] text-[var(--ink-dim)]">TRENDING</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {TRENDING.map((t) => (
          <a key={t} href={`/search?q=${encodeURIComponent(t.toLowerCase())}`} className="chip">
            {t}
          </a>
        ))}
      </div>

      <p className="meta mt-5 text-[9px] text-[var(--ink-muted)]">
        {results.length} ON THE RACK{q ? ` — “${q}”` : ""}
      </p>
      <section className="grid grid-cols-2 gap-x-3 gap-y-5 py-3">
        {results.map((l) => (
          <ListingCard key={l.id} listing={l} now={now} />
        ))}
      </section>
    </main>
  );
}
