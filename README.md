# Maanster Market

Depop/Poshmark-style pre-loved resale marketplace for India. V1 is a
production-quality web MVP with seeded demo data (no live backend). Prices in ₹.
Phone-OTP login is mocked.

**Pre-loved. Re-loved.**

See `CONTRACT.md` for the full build spec (this is the source of truth for all
agents working on this repo).

## Stack

- Vite + React 18 + TypeScript
- `react-router-dom` v6 (`HashRouter`, for static-host-friendly routing)
- Hand-rolled CSS with custom properties (`src/styles/tokens.css`) — no UI library

## Scripts

```bash
npm install
npm run dev       # local dev server
npm run build     # type-check + production build to dist/
npm run preview   # preview the production build
```

## Structure

```
src/
  data/          types.ts, store.ts (localStorage-backed data layer), seed.ts
  components/    shared UI: ListingCard, Avatar, PriceTag, TopBar, EmptyState
  screens/       one file per route (Feed, ListingDetail, SellerProfile,
                 CreateListing, Login, Checkout, Inbox, Chat)
  claw/          ClawPanel dev-tools panel (hidden by default, see CONTRACT.md)
  styles/        tokens.css (design tokens), global.css (resets + shared classes)
  App.tsx        HashRouter + all routes + bottom tab nav shell
  main.tsx       entry point
```

All app state goes through `src/data/store.ts` — components never touch
`localStorage` directly.

## Deploy

Pushes to `main` build and publish to GitHub Pages via
`.github/workflows/deploy.yml` (base path `/maanster-market/`).
