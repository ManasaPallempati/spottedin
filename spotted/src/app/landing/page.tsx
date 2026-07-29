export default function LandingPage() {
  return (
    <main className="screen flex min-h-[calc(100dvh-84px)] flex-col items-center justify-center px-6 text-center">
      <h1 className="display text-[30px]">
        SPOTTED<span className="text-[var(--acc)]">●</span>
      </h1>
      <p className="mt-3 text-[14px] text-[var(--ink-muted)]">
        prices fall every hour. catch them first.
      </p>
      <form className="mt-8 flex w-full max-w-[320px] gap-2">
        <input
          type="email"
          placeholder="email"
          className="min-w-0 flex-1 rounded-full border border-[var(--hairline)] bg-[var(--card)] px-4 py-3 text-[13px] outline-none placeholder:text-[var(--ink-dim)]"
        />
        <button className="pill-primary" type="button">
          JOIN
        </button>
      </form>
      <p className="meta mt-4 text-[8.5px] text-[var(--ink-dim)]">
        0% SELLER FEES FOREVER · BUYER FEES $0 ON US
      </p>
    </main>
  );
}
