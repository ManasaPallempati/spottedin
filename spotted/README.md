# SPOTTED● — Phase 1 scaffold

GenZ resale marketplace where prices fall every hour. Next.js App Router + TypeScript +
Tailwind, standalone app (not part of the root Vite workspace).

## Run

```
npm install
npm test        # pricing (floor, CHILL/STANDARD/TURBO) + adapter tests
npm run build
npm run dev
```

Mock data mode is the default and needs zero credentials. Set `SPOTTED_DATA_MODE=supabase`
plus the Supabase vars in `.env.example` to point at a real backend.

## Layout

- `src/lib/pricing.ts` — shared server-computed hourly-drop + steal utilities; every
  function takes `now` so time is injected (tests use fixed dates).
- `src/data/` — the adapter boundary: `adapter.ts` (interface + mode resolution),
  `mock.ts` (seeded from the 10 prototype listings), `supabase.ts` (Phase 1 stub).
- `src/app/` — all 12 screens plus `/landing`; phone-native shell centered at 430px.
- Accent is a single CSS variable `--acc` in `src/app/globals.css` (one-line swap to
  the cyan alt).

Design source: `../Spotted_ Fashion marketplace UI/` handoff (reference only — markup
recreated, not copied).
