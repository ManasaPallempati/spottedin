import Link from "next/link";
import { getAdapter } from "@/data/adapter";

export const dynamic = "force-dynamic";

export default async function InboxPage() {
  const threads = await getAdapter().listThreads();

  return (
    <main className="screen px-4 pt-5">
      <h1 className="display text-[20px]">INBOX</h1>
      <p className="meta mt-1 text-[8.5px] text-[var(--ink-dim)]">OFFERS AUTO-EXPIRE IN 24H</p>

      <div className="mt-4 flex flex-col gap-2">
        {threads.map((t) => (
          <Link key={t.id} href={`/inbox/${t.id}`} className="card-surface flex items-center gap-3 px-4 py-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--elevated)] text-[10px]">
              {t.withHandle.slice(0, 2).toUpperCase()}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[12px] font-medium">@{t.withHandle}</p>
              <p className="truncate text-[11px] text-[var(--ink-muted)]">{t.lastMessage}</p>
            </div>
            {t.unread && <span className="live-dot" />}
          </Link>
        ))}
        {threads.length === 0 && (
          <p className="mt-8 text-center text-[12px] text-[var(--ink-dim)]">
            nothing spotted yet — hit the deck ●
          </p>
        )}
      </div>
    </main>
  );
}
