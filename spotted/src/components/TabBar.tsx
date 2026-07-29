"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/", label: "RACK", icon: "M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z" },
  { href: "/fits", label: "FITS", icon: "M8 5v14l11-7z" },
  { href: "/sell", label: "", icon: "" },
  { href: "/deck", label: "SPOT", icon: "M12 3a9 9 0 100 18 9 9 0 000-18zm0 5a4 4 0 100 8 4 4 0 000-8z" },
  { href: "/closet", label: "CLOSET", icon: "M6 3h12v18H6zM12 3v18M10 12h1M13 12h1" },
];

export function TabBar() {
  const pathname = usePathname();
  return (
    <nav className="fixed bottom-0 left-1/2 z-40 w-full max-w-[430px] -translate-x-1/2 border-t border-[var(--hairline)] bg-[var(--bg-page)]/95 backdrop-blur">
      <div className="flex items-center justify-around px-2 pb-4 pt-2">
        {TABS.map((tab) =>
          tab.href === "/sell" ? (
            <Link
              key={tab.href}
              href={tab.href}
              aria-label="Sell"
              className="-mt-5 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--acc)] text-xl font-bold text-[var(--acc-ink)]"
            >
              +
            </Link>
          ) : (
            <Link
              key={tab.href}
              href={tab.href}
              className="flex flex-col items-center gap-1 px-3 py-1"
              style={{ color: pathname === tab.href ? "var(--acc)" : "var(--ink-dim)" }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                <path d={tab.icon} />
              </svg>
              <span className="meta" style={{ fontSize: "7.5px" }}>
                {tab.label}
              </span>
            </Link>
          ),
        )}
      </div>
    </nav>
  );
}
