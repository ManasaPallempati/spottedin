# Spotted (spottedin-c)

Depop-style resale marketplace UI for India — mobile-first web app, dark visual system,
₹ pricing, mock data. Built to match the reference screen set in [CONTRACT.md](CONTRACT.md),
which is the source of truth for every screen, token, and copy string.

## Stack

Vite 5 · React 18 · TypeScript · react-router-dom (HashRouter) · lucide-react ·
hand-rolled CSS with design tokens in `src/styles/global.css`.

## Run

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # production build (base './', GitHub Pages ready)
```

## Screens

| Route | Screen |
|---|---|
| `/` | Public landing page (full-width marketing page, no nav) |
| `/home` | Home feed (search, promo strip, greeting, 2-col listing grid) |
| `/login` | Sign in — Google, Facebook, and email/password (no nav) |
| `/signup` | Email sign-up (no nav) |
| `/discover` | Discover (hero carousel, outfits module, categories) |
| `/sell` | Sell splash (no-fees onboarding, no nav) |
| `/inbox` | Inbox (filter chips, empty state) |
| `/profile` | Profile (tabs, stats, earnings, promo card, empty listings) |
| `/onboarding/sizes` | Sizes picker (light theme) |
| `/onboarding/brands` | Brand picker → feed (light theme) |

`/` is the public landing; the marketplace feed lives at `/home`, and the floating
`BottomNav` is hidden on the landing and on the auth routes (`/login`, `/signup`).

## Auth

`/login` offers Google, Facebook, and email/password sign-in; `/signup` keeps email
sign-up. Social sign-in uses Supabase OAuth (`supabase.auth.signInWithOAuth`) — no
provider secrets live in the app. The `next` redirect target is validated as an internal
path (`src/lib/safeNext.ts`) and preserved across the OAuth round-trip via sessionStorage.

The Supabase client sets `flowType: 'pkce'` because the app uses `HashRouter`: the default
implicit flow returns the session in the URL fragment, which is where the router reads the
route from, so the callback would land on an unmatched path. PKCE returns `?code=…` in the
query string instead.

Google and Facebook must be enabled in the Supabase dashboard (Authentication →
Providers), with each provider's client ID/secret and the redirect/callback URL
configured there. That dashboard step is external to this repo and is **not** performed by
the app — until it is done, the social buttons surface the provider's "not enabled" error.

## Backend

The Home feed reads live listings from Supabase (staging project ref
`masdygvcssrtwseopfmj`) via `src/lib/useListings.ts`. If the query errors or returns
zero rows, it falls back to the mock listings in `src/data/mock.ts` so the grid is
never blank.

The client (`src/lib/supabase.ts`) reads `VITE_SUPABASE_URL` and
`VITE_SUPABASE_ANON_KEY` from the environment, falling back to the staging project's
public URL and anon key if unset. To point at a different project, set both in a
local `.env` file — Vite picks up `VITE_`-prefixed vars automatically.

## History

Spotted was previously spread across four repos. As of 2026-08-13 this repo is the only
active one; `spottedin`, `spottedin-b`, and `maanster-market` are archived on GitHub.
Design plans, the price-drop engine, and auth/commerce notes worth keeping were copied
into [docs/salvage/](docs/salvage/README.md), which records what came from where.
