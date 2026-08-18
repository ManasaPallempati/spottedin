# Spottedin

Depop-style resale marketplace UI for India — mobile-first web app, dark visual system,
₹ pricing, Supabase-backed listings and auth. Built to match the reference screen set in
[CONTRACT.md](CONTRACT.md),
which is the source of truth for every screen, token, and copy string.

## Stack

Vite 5 · React 18 · TypeScript · react-router-dom (HashRouter) · lucide-react ·
hand-rolled CSS with design tokens in `src/styles/global.css`.

## Run

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # production build (base './')
```

## Screens

| Route | Screen |
|---|---|
| `/` | Welcome sign-in gate (full width, no nav; skippable) |
| `/about` | Public marketing page (full width, no nav) |
| `/home` | Home feed (search, promo strip, greeting, 2-col listing grid) |
| `/login` | Sign in — social and email/password (no nav) |
| `/signup` | Email sign-up (no nav) |
| `/discover` | Discover (hero carousel, outfits module, categories) |
| `/search` | Search — items, filters, and people results |
| `/category/:slug` | Category listing grid |
| `/listing/:id/:slug`, `/p/:id` | Product page |
| `/shop/:handle` | Seller shop page |
| `/sell` | Sell splash (no-fees onboarding, no nav) |
| `/sell/new` | List an item (photos, drill-down category picker, no nav) |
| `/likes`, `/bag` | Saved items and bag |
| `/inbox`, `/inbox/t/:handle` | Inbox and message thread |
| `/profile` | Profile (tabs, stats, earnings, promo card) |
| `/account` | Account details (edit profile, picture, deletion) |
| `/onboarding/sizes` | Sizes picker (light theme) |
| `/onboarding/brands` | Brand picker → feed (light theme) |

`/` is the sign-in gate and `/about` the marketing page; the marketplace feed lives
at `/home`, and the floating `BottomNav` is hidden on both full-width pages and on
the auth routes (`/login`, `/signup`).

## Auth

`/login` offers social and email/password sign-in; `/signup` keeps email sign-up. Social
sign-in uses Supabase OAuth (`supabase.auth.signInWithOAuth`) — no provider secrets live
in the app. A social button renders only for providers listed in `VITE_OAUTH_PROVIDERS`
(comma-separated; defaults to `google`), so a provider that is not enabled in the Supabase
dashboard is hidden rather than shown as a button that cannot work. The `next` redirect
target is validated as an internal path (`src/lib/safeNext.ts`) and preserved across the
OAuth round-trip via sessionStorage.

The Supabase client sets `flowType: 'pkce'` because the app uses `HashRouter`: the default
implicit flow returns the session in the URL fragment, which is where the router reads the
route from, so the callback would land on an unmatched path. PKCE returns `?code=…` in the
query string instead.

A provider must be enabled in the Supabase dashboard (Authentication → Providers), with
its client ID/secret and the redirect/callback URL configured there, **before** it is
added to `VITE_OAUTH_PROVIDERS`. That dashboard step is external to this repo and is
**not** performed by the app. Note that `signInWithOAuth` never returns an error in the
browser — a disabled provider fails as a raw 400 JSON response on the Supabase domain
after the redirect, which is why unavailable providers are hidden instead of handled.
OAuth failures that bounce back to the app (for example a denied consent screen) arrive
as `error_description` URL params; the app parses these on boot and shows a translated
message on `/login` (see CONTRACT.md Round 7).

## Environments

Both environments are Netlify sites built from this one repository. GitHub Pages
is no longer used: a Pages site is one-per-repository and cannot serve two
environments, and it cannot return the SPA shell with HTTP 200 for dynamic routes
(see `docs/launch/STAGING_ROUTING.md`).

| | Branch | URL | Supabase project |
|---|---|---|---|
| Production | `main` | `www.spottedin.co` (apex 301s here) | `masdygvcssrtwseopfmj` |
| Staging | `TEST2026.02` | `www.staging.spottedin.co` | `uxqumkfbchyiupwhddqw` |

Feature branches merge into the current `TEST2026.xx` branch, are verified on
staging, then merge into `main` for release. Both branches require a pull
request and a passing `test` check. Every pull request also gets its own
Netlify deploy preview.

When a new test cycle opens a new `TEST2026.xx` branch, four things move with
it: the Netlify staging site's build branch, the branch-protection rule, the
`ci.yml` trigger list, and the references in this file and `netlify.toml`.
Miss any one and staging silently deploys an unprotected, untested branch.

Per-site environment variables are set in the Netlify UI, not in `netlify.toml`
— each site builds its own branch under the `production` deploy context, so a
`[context.<branch>]` block would never fire on staging. `netlify.toml` documents
the full list.

## Backend

The Home feed reads live listings from Supabase via `src/lib/useListings.ts`.
There is no mock fallback any more: if the query errors or returns zero rows, the
grid renders empty (`src/data/listings.ts` now only exports the `Listing` type).

The client (`src/lib/supabase.ts`) reads `VITE_SUPABASE_URL` and
`VITE_SUPABASE_ANON_KEY` from the environment, falling back to the **production**
project when unset. That fallback means an unconfigured deploy writes to
production data, so staging must always set both.

Storage URLs derive from `VITE_SUPABASE_URL` rather than being hardcoded, so each
environment serves listing images from its own bucket.

To build a new environment from scratch, see `supabase/baseline/README.md` — the
`round*.sql` files cannot create the schema on their own.

## History

Spotted was previously spread across four repos. As of 2026-08-13 this repo is the only
active one; `spottedin`, `spottedin-b`, and `maanster-market` are archived on GitHub.
Design plans, the price-drop engine, and auth/commerce notes worth keeping were copied
into [docs/salvage/](docs/salvage/README.md), which records what came from where.
