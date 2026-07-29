"use client";

import Link from "next/link";
import { useStore } from "@/state/store";

export default function InboxPage() {
  const { threads, unreadCount } = useStore();

  return (
    <main className="screen px-4 pt-5">
      <h1 className="display text-[20px]">INBOX</h1>
      <p className="mono mt-1 text-[9px] text-[rgba(237,235,228,.42)]">
        offers auto-expire in 24h · fast replies boost your closet
      </p>

      <div className="mt-2.5">
        {threads.map((t) => (
          <Link
            key={t.id}
            href={`/inbox/${t.id}`}
            className="flex items-center gap-3 border-b border-[rgba(237,235,228,.07)] px-1 py-3"
          >
            <span className="mono flex h-10 w-10 flex-none items-center justify-center rounded-full border-[1.5px] border-[rgba(237,235,228,.18)] bg-[#26262C] text-[10px] font-bold">
              {t.withHandle.slice(0, 2).toUpperCase()}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[12.5px] font-semibold">@{t.withHandle}</span>
              <span className="mt-0.5 block truncate text-[10.5px] text-[rgba(237,235,228,.5)]">
                {t.lastMessage || "say hi — the piece is still dropping"}
              </span>
            </span>
            <span className="flex-none text-right">
              <span className="mono block text-[8px] text-[rgba(237,235,228,.35)]">{t.lastAt}</span>
              <span
                className="ml-auto mt-1.5 block h-2 w-2 rounded-full"
                style={{ background: t.unread ? "var(--acc)" : "transparent" }}
                aria-label={t.unread ? "unread" : undefined}
              />
            </span>
          </Link>
        ))}
        {threads.length === 0 && (
          <p className="mono py-10 text-center text-[9.5px] text-[var(--ink-dim)]">
            no threads yet — ask a seller anything from any listing
          </p>
        )}
      </div>
      <p className="sr-only">{unreadCount} unread threads</p>
    </main>
  );
}
