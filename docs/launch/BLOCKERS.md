# SPOTTED Launch Rollout - Core Tracker

Updated: 2026-08-01 (Iteration 6)

Goal status: Active. The user resumed work and authorized a stable branch checkpoint before hosting/router migration.

## Iteration 7 checkpoint evidence

- Scope: public discovery, canonical listing routes, metadata/indexability controls, taxonomy support, and launch trackers.
- Validation: `npm run build` - PASS (`tsc -b` and `vite build`).
- Publish boundary: launch-related files only; session-history organizer utilities remain unstaged.
- Hosting/router migration remains the next change after the remote checkpoint.

## Safe working baseline

- [x] Working branch: `codex/launch-spotted-seven-day-2026-08-01`
- [x] Baseline tag: `spotted-launch-baseline-2026-08-01`
- [x] Baseline commit: `f2b734e66b7f95d346beec9998ab90703de4f49c`
- [x] Existing Supabase migrations inventoried in `safe-working-environment.md`
- [ ] Staging target and environment-variable inventory documented.

## Core launch scope

- [~] Public discovery surface
- [x] Homepage is public and includes static/runtime metadata, a clear hero, and taxonomy-driven category links with live inventory counts.
- [x] Dedicated category routes, canonical metadata, breadcrumbs, filtered collections, and invalid/zero-result states.
- [x] Canonical `/listing/:id/:slug` paths, legacy `/p/:id` correction, listing breadcrumbs, metadata, and sold/missing states.
- [x] Conservative route-level `noindex, nofollow` policy for search, discovery, seller, auth, onboarding, account, and transactional routes.
- [ ] Listing creation and PDP core.
- [ ] Canonical `ListingPresentation` truth model.
- [ ] Checkout core.
- [ ] Trust and policy baseline.
- [ ] Analytics core contract.

## Iteration 4 evidence

- Changed: `src/lib/seo.ts`, `src/App.tsx`, `index.html`, `docs/launch/STAGING_ROUTING.md`.
- Validation: `npm run build` - PASS (`tsc -b` and `vite build`).
- Deployment evidence: GitHub Pages uses `.github/workflows/deploy.yml`, reports `build_type: workflow`, has no custom 404, and has HTTPS enforcement disabled.
- Decision pending: select a rewrite-capable staging host or explicitly accept GitHub Pages 404 recovery limitations.

## Iterations 5-6 blocker evidence

- No rewrite-capable staging host or GitHub Pages fallback strategy was selected after the Iteration 4 clarification request.
- No Vercel, Netlify, Cloudflare, SPA redirect, or custom 404 configuration appeared in the repository.
- No router, hosting, DNS, GitHub Pages, or production configuration was changed while the architecture decision remained open.
- Required unblock: choose a rewrite-capable staging target or explicitly accept the GitHub Pages HTTP 404 fallback limitation.

## Iteration 3 evidence

- Changed: `src/lib/listingUrls.ts`, `src/App.tsx`, `src/components/ProductCard.tsx`, `src/components/OfferCard.tsx`, `src/pages/Thread.tsx`, `src/pages/SellNew.tsx`, `src/pages/Product.tsx`, `src/pages/product.css`.
- Validation: `npm run build` - PASS (`tsc -b` and `vite build`).
- Route behavior: immutable listing IDs drive lookup; readable slugs are canonicalized and stale or legacy paths replace-navigate to the current URL.

## Iteration 2 evidence

- Changed: `src/App.tsx`, `src/pages/Home.tsx`, `src/pages/Category.tsx`, `src/pages/category.css`.
- Validation: `npm run build` - PASS (`tsc -b` and `vite build`; 1,675 modules transformed).
- Tracker: `docs/launch/ROUTE_INDEXABILITY.md` now records `/category/:slug` behavior and remaining clean-URL risk.

## Iteration 1 evidence

- Changed: `index.html`, `src/App.tsx`, `src/pages/Home.tsx`, `src/pages/home.css`, `src/pages/Search.tsx`, `src/pages/search.css`, `src/lib/filters.ts`, `src/lib/useListings.ts`.
- Validation: `npm run build` - PASS (`tsc -b` and `vite build`).
- Tracker: `docs/launch/ROUTE_INDEXABILITY.md` records current public-route and crawler readiness.

## Remaining risks

- `HashRouter` keeps category and listing paths behind a URL fragment; dedicated canonical paths require a staging-compatible rewrite or prerender strategy.
- Metadata beyond the homepage is currently client-rendered and incomplete for crawlers without JavaScript.
- Category pages now use stable in-app `/category/<slug>` paths, but the current fragment router prevents those canonical paths from being directly verified on staging.
- Listing paths have the same `HashRouter` limitation until clean direct URL handling is established.
- GitHub Pages cannot provide HTTP 200 SPA rewrites for arbitrary dynamic listing paths; changing routers before a staging decision would break deep links.
- GitHub Pages currently reports HTTPS enforcement disabled; enablement is an external production setting and was not changed in this iteration.
- Production inventory depends on Supabase configuration and has not been validated against a staging dataset.

## Supabase schema snapshot at rollout start

- `round2.sql`
- `round2b-category-fix.sql`
- `round2c-handle-format-fix.sql`
- `round2d-message-sender-fk-fix.sql`
- `round3-offers.sql`
- `round3b-offers-grants-fix.sql`
- `round4-offer-checkout.sql`
