const SIZES = ["XS", "S", "M", "L", "XL"];
const CONDITIONS = ["10/10", "9/10", "8/10", "7/10", "6/10"];
const SPEEDS: { key: string; label: string; note: string }[] = [
  { key: "CHILL", label: "CHILL", note: "−$1/day" },
  { key: "STANDARD", label: "STANDARD", note: "−$1/hr" },
  { key: "TURBO", label: "TURBO", note: "−$2/hr" },
];

export default function SellPage() {
  return (
    <main className="screen px-4 pb-10 pt-5">
      <h1 className="display text-[20px]">START THE DROP</h1>
      <p className="meta mt-1 text-[8.5px] text-[var(--acc)]">0% SELLER FEES FOREVER</p>

      <section className="mt-5">
        <p className="meta text-[9px] text-[var(--ink-muted)]">1 — PHOTOS</p>
        <div className="mt-2 grid grid-cols-4 gap-2">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className="flex aspect-square items-center justify-center rounded-[12px] border border-dashed border-[var(--hairline)] text-[var(--ink-dim)]"
            >
              +
            </div>
          ))}
        </div>
        <p className="mt-2 text-[10px] text-[var(--ink-dim)]">
          first photo = cover. backgrounds auto-removed.
        </p>
      </section>

      <section className="mt-6">
        <p className="meta text-[9px] text-[var(--ink-muted)]">2 — DETAILS</p>
        <input
          placeholder="e.g. KNIT ZIP CARDIGAN"
          className="mt-2 w-full rounded-[12px] border border-[var(--hairline)] bg-[var(--card)] px-4 py-3 text-[13px] outline-none placeholder:text-[var(--ink-dim)]"
        />
        <input
          placeholder="brand"
          className="mt-2 w-full rounded-[12px] border border-[var(--hairline)] bg-[var(--card)] px-4 py-3 text-[13px] outline-none placeholder:text-[var(--ink-dim)]"
        />
        <div className="mt-3 flex flex-wrap gap-2">
          {SIZES.map((s) => (
            <span key={s} className="chip">
              {s}
            </span>
          ))}
        </div>
        <div className="mt-2 flex flex-wrap gap-2">
          {CONDITIONS.map((c) => (
            <span key={c} className="chip">
              {c}
            </span>
          ))}
        </div>
      </section>

      <section className="mt-6">
        <p className="meta text-[9px] text-[var(--ink-muted)]">3 — THE DROP</p>
        <div className="mt-2 flex gap-2">
          <input
            placeholder="start price $"
            inputMode="numeric"
            className="w-1/2 rounded-[12px] border border-[var(--hairline)] bg-[var(--card)] px-4 py-3 text-[13px] outline-none placeholder:text-[var(--ink-dim)]"
          />
          <input
            placeholder="floor $ (hidden)"
            inputMode="numeric"
            className="w-1/2 rounded-[12px] border border-[var(--hairline)] bg-[var(--card)] px-4 py-3 text-[13px] outline-none placeholder:text-[var(--ink-dim)]"
          />
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2">
          {SPEEDS.map((s) => (
            <div
              key={s.key}
              className={`card-surface px-3 py-3 text-center ${s.key === "STANDARD" ? "border-[var(--acc)]" : ""}`}
            >
              <p className="meta text-[9px]">{s.label}</p>
              <p className="mt-1 text-[10px] text-[var(--ink-muted)]">{s.note}</p>
            </div>
          ))}
        </div>
        <div className="card-surface mt-4 px-4 py-3">
          <p className="meta text-[9px] text-[var(--acc)]">YOU EARN $88 — 0% SELLER FEES FOREVER</p>
        </div>
      </section>

      <button className="pill-primary mt-6 w-full" type="button">
        START THE DROP
      </button>
    </main>
  );
}
