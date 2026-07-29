# SPOTTED● — Phase 2 high-fidelity UI

GenZ resale marketplace where prices fall every hour. Next.js App Router + TypeScript +
Tailwind, standalone app (not part of the root Vite workspace). All 12 spec screens plus
`/landing` are implemented at full fidelity and fully navigable in zero-credential mock
mode: category filters, spot toggles, live search, deck buttons + swipe, fits paging,
IRL snap/matches/wanted, offer sheet → thread acceptance demo → offer-locked checkout,
3-step sell + fit card, order timeline, closet tabs + wrapped.

## Run

```
npm install
npm test        # pricing (floor, CHILL/STANDARD/TURBO) + adapter/offer/search tests
npm run typecheck
npm run build
npm run dev
```

Mock data mode is the default and needs zero credentials. Set `SPOTTED_DATA_MODE=supabase`
plus the Supabase vars in `.env.example` to point at a real backend — reads work; writes
are explicit stubs until the credentialed build-out.

Apply `supabase/migrations/202607290001_spotted_phase1.sql` to a new, Spotted-only
Supabase project. Anonymous reads use `public_listings`, which computes current prices
in Postgres and never projects seller `start_price` or `floor_price`. The hourly Vercel
cron at `/api/cron/hourly` expires stale offers; prices themselves are computed on read.

## Layout

- `src/lib/pricing.ts` — shared server-computed hourly-drop + steal utilities; every
  function takes `now` so time is injected (tests use fixed dates).
- `src/lib/story-card.ts` — 1080×1920 downloadable Fit Card, Steal Receipt, and Wrapped
  exports.
- `src/data/` — the adapter boundary: `adapter.ts` (interface + mode resolution),
  `mock.ts` (in-memory session writes, seeded from the 10 prototype listings),
  `supabase.ts` (reads + explicit write stubs), `me.ts` (demo session user).
- `src/state/store.tsx` — client store over the adapter: spots, deck signals, offers,
  threads, orders, waitlist, plus the shared global-drop clock.
- `src/app/` — all 12 screens plus `/landing`; phone-native shell centered at 430px.
- Accent is a single CSS variable `--acc` in `src/app/globals.css` (one-line swap to
  the cyan alt).

## Security notes

- Checkout never trusts URL prices: only an offer *id* travels in the URL, and
  `resolveCheckoutPrice` honors it solely when the offer is accepted, unexpired, and
  tied to that buyer + listing; otherwise the server drop price is charged.
- Seller floors are private: buyer surfaces render "FLOOR HIDDEN" only. Credentialed
  anonymous reads use `public_listings`, which excludes both start and floor values.
- Supabase search escapes LIKE wildcards and quotes user input before it reaches the
  PostgREST `or=` grammar (`buildSearchOrFilter`), and matches the mock's
  title/brand/era/category parity.

Design source: `../Spotted_ Fashion marketplace UI/` handoff (reference only — markup
recreated, not copied).
