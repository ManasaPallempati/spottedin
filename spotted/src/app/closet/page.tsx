import Link from "next/link";
import { getAdapter } from "@/data/adapter";
import { countdownLabel, secondsToNextHour } from "@/lib/pricing";

export const dynamic = "force-dynamic";

export default async function ClosetPage() {
  const now = new Date();
  const mine = (await getAdapter().listListings()).slice(0, 3);

  return (
    <main className="screen px-4 pt-6">
      <div className="flex flex-col items-center">
        <span className="flex h-20 w-20 items-center justify-center rounded-full border-2 border-[var(--acc)] bg-[var(--elevated)] text-[16px]">
          YO
        </span>
        <h1 className="display mt-3 text-[17px]">@you.spotted</h1>
        <div className="mt-4 flex w-full justify-around">
          {[
            ["SAVED $", "312"],
            ["SPOTS", "18"],
            ["LISTED", "3"],
          ].map(([label, value]) => (
            <div key={label} className="text-center">
              <p className="display text-[17px]">{value}</p>
              <p className="meta mt-1 text-[7.5px] text-[var(--ink-dim)]">{label}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-5 rounded-[14px] bg-[var(--acc)] px-4 py-4 text-[var(--acc-ink)]">
        <p className="meta text-[8.5px]">JULY WRAPPED</p>
        <p className="display mt-1 text-[20px]">4 STEALS · $312 SAVED</p>
        <p className="mt-1 text-[11px] font-medium">TOP ERA — Y2K · TOP COP — SAMBA OG</p>
        <span className="meta mt-2 inline-block rounded-full bg-[var(--acc-ink)] px-3 py-1.5 text-[8.5px] text-[var(--acc)]">
          SHARE
        </span>
      </div>

      <div className="mt-5 flex gap-6">
        <span className="meta border-b-2 border-[var(--acc)] pb-1 text-[9px]">CLOSET</span>
        <span className="meta pb-1 text-[9px] text-[var(--ink-dim)]">SPOTTED</span>
      </div>

      <section className="grid grid-cols-2 gap-3 py-4">
        {mine.map((l) => (
          <Link key={l.id} href={`/item/${l.id}`}>
            <div
              className="aspect-[3/4] rounded-[14px] border border-[var(--hairline)]"
              style={{ background: `linear-gradient(160deg, ${l.photo.c1}, ${l.photo.c2})` }}
            />
            <p className="meta mt-1.5 flex items-center gap-1.5 text-[7.5px] text-[var(--acc)]">
              <span className="live-dot" /> LIVE · DROPS {countdownLabel(secondsToNextHour(now))}
            </p>
          </Link>
        ))}
        <Link
          href="/sell"
          className="flex aspect-[3/4] items-center justify-center rounded-[14px] border border-dashed border-[var(--hairline)] text-[11px] text-[var(--ink-dim)]"
        >
          + list something
        </Link>
      </section>
    </main>
  );
}
