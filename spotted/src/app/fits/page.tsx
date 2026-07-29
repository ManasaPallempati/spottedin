import Link from "next/link";
import { getAdapter } from "@/data/adapter";

export const dynamic = "force-dynamic";

export default async function FitsPage() {
  const data = getAdapter();
  const [fit] = await data.listFits();
  const look = (await Promise.all(fit.lookListingIds.map((id) => data.getListing(id)))).filter(
    (l) => l !== null,
  );

  return (
    <main className="screen relative min-h-[calc(100dvh-84px)] bg-[#101014]">
      <div className="absolute inset-x-0 top-0 h-[3px] bg-[var(--elevated)]">
        <div className="h-full w-1/3 bg-[var(--acc)]" />
      </div>

      {/* Video placeholder until the Phase 3 pipeline lands */}
      <div className="flex min-h-[calc(100dvh-84px)] flex-col justify-end p-4">
        <div className="absolute right-3 top-1/2 flex -translate-y-1/2 flex-col items-center gap-5 text-[var(--ink-muted)]">
          <span className="meta text-[8.5px]">SHARE</span>
          <span className="meta text-[8.5px]">
            ● <span className="text-[var(--ink-dim)]">{fit.plays}</span>
          </span>
        </div>

        <div className="mb-3 flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--elevated)] text-[10px]">
            {fit.sellerHandle.slice(0, 2).toUpperCase()}
          </span>
          <span className="text-[12px] font-medium">@{fit.sellerHandle}</span>
          <span className="chip chip-on py-1! text-[8px]">FOLLOW</span>
        </div>
        <p className="text-[13px] text-[var(--ink)]">{fit.caption}</p>

        <p className="meta mt-4 text-[8.5px] text-[var(--ink-dim)]">SHOP THE LOOK</p>
        <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
          {look.map((l) => (
            <Link key={l.id} href={`/item/${l.id}`} className="chip">
              {l.title}
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
