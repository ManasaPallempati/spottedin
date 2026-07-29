"use client";

import Link from "next/link";
import { useState } from "react";
import { useStore } from "@/state/store";

export default function LandingPage() {
  const { joinWaitlist, waitlistJoined } = useStore();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const value = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      setError("that email doesn't look right");
      return;
    }
    setError(null);
    await joinWaitlist(value);
  }

  return (
    <main className="screen flex min-h-dvh flex-col px-6 pb-10 pt-16">
      <div className="flex flex-1 flex-col items-center justify-center text-center">
        <h1 className="display text-[30px]">
          SPOTTED<span className="text-[var(--acc)]">●</span>
        </h1>
        <p className="mono mt-3 text-[10px] leading-[1.8] text-[rgba(237,235,228,.45)]">
          prices fall every hour.
          <br />
          catch them first.
        </p>

        <div className="mt-8 w-full max-w-[320px] text-left">
          {[
            ["HOURLY GLOBAL DROP", "every listing falls −$1 on the hour, in sync, to a hidden floor"],
            ["STEAL METER", "every card shows −% under retail. flex the receipt"],
            ["0% SELLER FEES", "forever. buyer fees $0 — on us"],
          ].map(([title, body]) => (
            <div key={title} className="mb-3 flex gap-2.5">
              <span className="mt-[5px] block h-[5px] w-[5px] flex-none rounded-full bg-[var(--acc)]" aria-hidden />
              <p>
                <span className="meta block text-[9px] text-[var(--ink)]">{title}</span>
                <span className="mt-0.5 block text-[11px] leading-[1.55] text-[rgba(237,235,228,.6)]">
                  {body}
                </span>
              </p>
            </div>
          ))}
        </div>

        {waitlistJoined ? (
          <div className="mt-6 w-full max-w-[320px] text-center">
            <p className="meta text-[10px] text-[var(--acc)]">YOU&apos;RE ON THE LIST ●</p>
            <p className="mono mt-2 text-[9px] text-[rgba(237,235,228,.45)]">
              we&apos;ll ping you before the next global drop
            </p>
            <Link href="/" className="pill-outline mt-5 block w-full">
              BROWSE THE RACK
            </Link>
          </div>
        ) : (
          <form onSubmit={submit} className="mt-6 w-full max-w-[320px]">
            <div className="flex gap-2">
              <label className="sr-only" htmlFor="waitlist-email">
                Email address
              </label>
              <input
                id="waitlist-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email"
                className="min-w-0 flex-1 rounded-full border border-[rgba(237,235,228,.14)] bg-[var(--card)] px-4 py-3 text-[13px] text-[var(--ink)] outline-none"
              />
              <button className="pill-primary flex-none" type="submit">
                JOIN
              </button>
            </div>
            <p className="mono mt-2 h-[14px] text-[8.5px] text-[rgba(237,235,228,.45)]" aria-live="polite">
              {error ?? ""}
            </p>
            <Link
              href="/"
              className="mono mt-3 block text-center text-[9px] text-[rgba(237,235,228,.45)] underline"
            >
              or skip the line — browse the rack
            </Link>
          </form>
        )}
      </div>
      <p className="meta mt-8 text-center text-[8.5px] text-[var(--ink-dim)]">
        0% SELLER FEES FOREVER · BUYER FEES $0 ON US
      </p>
    </main>
  );
}
