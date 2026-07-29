import { getAdapter } from "@/data/adapter";
import { currentPrice, stealPercent } from "@/lib/pricing";

export const dynamic = "force-dynamic";

export default async function DeckPage() {
  const now = new Date();
  const [top, next] = await getAdapter().listListings();
  const price = currentPrice(top, now);
  const steal = stealPercent(price, top.retailPrice);

  return (
    <main className="screen flex min-h-[calc(100dvh-84px)] flex-col px-4 pt-5">
      <header className="flex items-baseline justify-between">
        <h1 className="display text-[20px]">SPOT OR DROP</h1>
        <span className="meta text-[8.5px] text-[var(--ink-dim)]">DECK · {2}+</span>
      </header>
      <p className="meta mt-1 text-[8.5px] text-[var(--ink-dim)]">TUNED TO — M / 30-31 / UNDER $120</p>

      <div className="relative mt-5 flex-1">
        {/* Next card peeking behind */}
        <div
          className="absolute inset-x-3 top-3 h-full rounded-[14px] border border-[var(--hairline)] opacity-50"
          style={{ background: `linear-gradient(160deg, ${next.photo.c1}, ${next.photo.c2})` }}
        />
        <div
          className="relative flex h-full flex-col justify-end rounded-[14px] border border-[var(--hairline)] p-4"
          style={{ background: `linear-gradient(160deg, ${top.photo.c1}, ${top.photo.c2})` }}
        >
          {steal !== null && (
            <span className="meta absolute left-3 top-3 rounded-full bg-[var(--acc)] px-2 py-1 text-[8.5px] text-[var(--acc-ink)]">
              −{steal}%
            </span>
          )}
          <p className="display text-[24px]">${price}</p>
          <p className="text-[13px] font-medium">{top.title}</p>
          <p className="text-[11px] text-[var(--ink-muted)]">
            {top.brand} · {top.size} · {top.spots} spots
          </p>
        </div>
      </div>

      <div className="flex items-center justify-center gap-8 py-6">
        <button className="pill-outline w-[130px]" type="button">
          ✕ DROP
        </button>
        <button className="pill-primary w-[130px]" type="button">
          ● SPOT
        </button>
      </div>
    </main>
  );
}
