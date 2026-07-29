"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

function activeTab(pathname: string): string {
  if (pathname === "/fits") return "/fits";
  if (pathname === "/deck") return "/deck";
  if (pathname === "/closet") return "/closet";
  if (pathname === "/sell") return "/sell";
  if (pathname.startsWith("/inbox")) return "";
  return "/";
}

// Prototype icons drawn as primitives: grid dots (RACK), play (FITS), target
// (SPOT), door (CLOSET), accent + FAB (SELL).
export function TabBar() {
  const pathname = usePathname();
  if (pathname === "/landing") return null;
  const active = activeTab(pathname);
  const color = (href: string) => (active === href ? "var(--acc)" : "rgba(237,235,228,.4)");

  return (
    <nav
      aria-label="Main"
      className="fixed bottom-0 left-1/2 z-40 w-full max-w-[430px] -translate-x-1/2 border-t border-[var(--hairline)] bg-[rgba(10,10,12,.94)] backdrop-blur"
    >
      <div className="flex items-end justify-around px-2 pb-5 pt-2.5">
        <Link
          href="/"
          className="flex w-[54px] flex-col items-center gap-[5px]"
          style={{ color: color("/") }}
        >
          <span className="grid grid-cols-2 gap-[2.5px]" aria-hidden>
            {[0, 1, 2, 3].map((i) => (
              <span key={i} className="h-[7px] w-[7px] rounded-[2px] bg-current" />
            ))}
          </span>
          <span className="meta text-[7.5px]">RACK</span>
        </Link>
        <Link
          href="/fits"
          className="flex w-[54px] flex-col items-center gap-[5px]"
          style={{ color: color("/fits") }}
        >
          <span
            aria-hidden
            className="ml-[3px] block h-0 w-0 border-y-[8px] border-l-[13px] border-y-transparent"
            style={{ borderLeftColor: "currentColor" }}
          />
          <span className="meta text-[7.5px]">FITS</span>
        </Link>
        <Link
          href="/sell"
          aria-label="Sell — list something"
          className="-mt-4 flex h-[47px] w-[47px] items-center justify-center rounded-full bg-[var(--acc)] text-[22px] font-light leading-none text-[var(--acc-ink)]"
          style={{ boxShadow: "0 8px 22px color-mix(in oklab, var(--acc) 35%, transparent)" }}
        >
          +
        </Link>
        <Link
          href="/deck"
          className="flex w-[54px] flex-col items-center gap-[5px]"
          style={{ color: color("/deck") }}
        >
          <span
            aria-hidden
            className="box-border flex h-4 w-4 items-center justify-center rounded-full border-2 border-current"
          >
            <span className="block h-1 w-1 rounded-full bg-current" />
          </span>
          <span className="meta text-[7.5px]">SPOT</span>
        </Link>
        <Link
          href="/closet"
          className="flex w-[54px] flex-col items-center gap-[5px]"
          style={{ color: color("/closet") }}
        >
          <span
            aria-hidden
            className="relative box-border block h-4 w-[13px] rounded-[3px] border-2 border-current"
          >
            <span className="absolute right-[1.5px] top-[5px] h-[2.5px] w-[2.5px] rounded-full bg-current" />
          </span>
          <span className="meta text-[7.5px]">CLOSET</span>
        </Link>
      </div>
    </nav>
  );
}
