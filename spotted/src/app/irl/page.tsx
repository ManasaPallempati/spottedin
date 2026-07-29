export default function IrlPage() {
  return (
    <main className="screen flex min-h-[calc(100dvh-84px)] flex-col px-4 pt-5">
      <h1 className="display text-[20px]">SPOTTED IRL</h1>
      <p className="mt-1 text-[12px] text-[var(--ink-muted)]">
        snap a fit you saw. we find it on the rack.
      </p>

      <div className="relative mt-4 flex-1 rounded-[14px] border border-[var(--hairline)] bg-[#101014]">
        {/* Viewfinder corner brackets */}
        {[
          "left-3 top-3 border-l-2 border-t-2",
          "right-3 top-3 border-r-2 border-t-2",
          "bottom-3 left-3 border-b-2 border-l-2",
          "bottom-3 right-3 border-b-2 border-r-2",
        ].map((pos) => (
          <span key={pos} className={`absolute h-6 w-6 border-[var(--acc)] ${pos}`} />
        ))}
        <p className="meta absolute inset-x-0 top-1/2 -translate-y-1/2 text-center text-[9px] text-[var(--ink-dim)]">
          CAMERA WIRES UP IN PHASE 1 BUILD-OUT
        </p>
      </div>

      <div className="flex flex-col items-center gap-4 py-6">
        <button
          type="button"
          aria-label="Shutter"
          className="h-16 w-16 rounded-full border-4 border-[var(--ink)] bg-[var(--acc)]"
        />
        <p className="meta text-[8.5px] text-[var(--ink-dim)]">
          NO MATCH? WE AUTO-POST A WANTED FOR YOU
        </p>
      </div>
    </main>
  );
}
