# Maanster Market

Depop/Poshmark-style pre-loved resale marketplace for India. V1 is a
web MVP with seeded local demo data and an attachable Supabase backend. Prices
in ₹.

This branch contains Supabase email/password authentication, durable public
profiles, cloud-backed listings, listing-photo storage, favorites, and basic
messaging. Feed, Listing Detail, Sell, Saved, Inbox, Chat, and Seller Profile
use Supabase when public configuration is present. Until that configuration is supplied, local development uses clearly
labeled browser-local demo auth and marketplace data. Demo passwords are
salted PBKDF2 hashes, never plaintext, but demo mode is not production
security and sends no email.

See `AUTH_ROLLOUT.md` for the staging, CAPTCHA, SMTP, database-test, and
deployment gates. Phone OTP remains disabled pending provider budget and TRAI
DLT compliance.

The product name and future visual direction are recorded in
`BRAND_DIRECTION.md`. The current Maanster Market styling is prototype UI, not
the approved Spotted In brand.

The credential-safe Razorpay and Shiprocket implementation and its activation
gates are documented in `COMMERCE_INTEGRATION.md`.

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
npm test          # authentication unit tests
```

## Structure

```
src/
  data/          types, local demo store, Supabase client/profile/listing adapters
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
