"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { use, useEffect, useRef, useState } from "react";
import { ListingImage } from "@/components/ListingImage";
import { useStore } from "@/state/store";

export default function ThreadPage({ params }: { params: Promise<{ thread: string }> }) {
  const { thread: threadId } = use(params);
  const router = useRouter();
  const { threads, listings, offers, priceOf, sendChat, markThreadRead } = useStore();
  const thread = threads.find((t) => t.id === threadId);
  const listing = thread ? listings.find((l) => l.id === thread.listingId) : undefined;

  const [draft, setDraft] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    markThreadRead(threadId);
  }, [threadId, markThreadRead]);

  const messageCount = thread?.messages.length ?? 0;
  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [messageCount]);

  if (!thread) {
    return (
      <main className="screen flex min-h-[60dvh] flex-col items-center justify-center gap-3">
        <p className="mono text-[10px] text-[var(--ink-dim)]">thread not found</p>
        <Link href="/inbox" className="meta text-[9px] text-[var(--acc)]">
          BACK TO INBOX
        </Link>
      </main>
    );
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const text = draft.trim();
    if (!text) return;
    setDraft("");
    await sendChat(threadId, text);
  }

  return (
    <main className="screen flex h-[calc(100dvh-92px)] flex-col">
      <header className="border-b border-[rgba(237,235,228,.08)] px-3.5 pb-2.5 pt-4">
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => router.back()}
            aria-label="Back"
            className="text-[13px] text-[rgba(237,235,228,.6)]"
          >
            ←
          </button>
          <span className="mono flex h-8 w-8 items-center justify-center rounded-full border-[1.5px] border-[var(--acc)] bg-[#26262C] text-[9px] font-bold">
            {thread.withHandle.slice(0, 2).toUpperCase()}
          </span>
          <span className="flex-1">
            <span className="block text-[12px] font-semibold">@{thread.withHandle}</span>
            <span className="mono block text-[8px] text-[var(--acc)]">
              ● ONLINE · REPLIES IN MIN
            </span>
          </span>
        </div>
        {listing && (
          <Link
            href={`/item/${listing.id}`}
            className="card-surface mt-2.5 flex items-center gap-2.5 rounded-[11px] px-2.5 py-2"
          >
            <ListingImage photo={listing.photos[0]} className="h-[38px] w-[30px] flex-none rounded-[6px]" />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[10.5px] font-semibold">{listing.title}</span>
              <span className="mono mt-px block text-[8px] text-[rgba(237,235,228,.42)]">
                ${priceOf(listing)} ·{" "}
                {listing.status === "live" ? "STILL DROPPING" : listing.status.toUpperCase()}
              </span>
            </span>
            <span className="mono flex-none text-[8px] font-bold text-[var(--acc)]">VIEW</span>
          </Link>
        )}
      </header>

      <div className="flex flex-1 flex-col gap-2 overflow-y-auto px-3.5 py-3">
        {thread.messages.map((m) => {
          if (m.type === "offer") {
            const offer = m.offerId ? offers[m.offerId] : undefined;
            const status = offer?.status ?? "sent";
            return (
              <div
                key={m.id}
                className="w-[200px] self-end rounded-[14px] px-3 py-2.5"
                style={{
                  border: "1px solid color-mix(in oklab, var(--acc) 45%, transparent)",
                  background: "#15150F",
                }}
              >
                <p className="meta text-[8px] tracking-[1.5px] text-[var(--acc)]">YOUR OFFER</p>
                <p className="display tnum mt-0.5 text-[22px]">${m.offerAmount}</p>
                <p className="mono mt-1 text-[8.5px] text-[rgba(237,235,228,.5)]">
                  {status === "accepted"
                    ? "● ACCEPTED"
                    : status === "sent"
                      ? "○ SENT — WAITING…"
                      : status === "expired"
                        ? "○ EXPIRED AFTER 24H"
                        : "○ DECLINED"}
                </p>
                {status === "accepted" && (
                  <Link
                    href={`/checkout?item=${offer?.listingId ?? thread.listingId}&offer=${m.offerId}`}
                    className="mono mt-2 block rounded-full bg-[var(--acc)] py-2 text-center text-[9px] font-bold tracking-[.8px] text-[var(--acc-ink)]"
                  >
                    CHECKOUT AT ${m.offerAmount}
                  </Link>
                )}
              </div>
            );
          }
          const mine = m.from === "me";
          return (
            <p
              key={m.id}
              className="max-w-[78%] px-3 py-2 text-[12px] leading-[1.5]"
              style={
                mine
                  ? {
                      alignSelf: "flex-end",
                      background: "color-mix(in oklab, var(--acc) 16%, #1D1D22)",
                      border: "1px solid color-mix(in oklab, var(--acc) 25%, transparent)",
                      borderRadius: "14px 14px 4px 14px",
                    }
                  : {
                      alignSelf: "flex-start",
                      background: "#1D1D22",
                      borderRadius: "14px 14px 14px 4px",
                      color: "rgba(237,235,228,.88)",
                    }
              }
            >
              {m.body}
            </p>
          );
        })}
        <div ref={endRef} />
      </div>

      <form
        onSubmit={submit}
        className="flex gap-2 border-t border-[rgba(237,235,228,.08)] px-3.5 pb-3.5 pt-2.5"
      >
        <label htmlFor="composer" className="sr-only">
          Message @{thread.withHandle}
        </label>
        <input
          id="composer"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="message…"
          className="min-w-0 flex-1 rounded-full border border-[rgba(237,235,228,.14)] bg-[var(--card)] px-4 py-2.5 text-[12px] text-[var(--ink)] outline-none"
        />
        <button
          type="submit"
          aria-label="Send message"
          className="flex h-10 w-10 flex-none items-center justify-center rounded-full bg-[var(--acc)] text-[15px] text-[var(--acc-ink)]"
        >
          ↑
        </button>
      </form>
    </main>
  );
}
