# Route and Indexability Checklist

Updated: 2026-08-01 (Iteration 4)

Current router: `HashRouter`. Public UI routes render client-side, but fragment paths are not staging-ready canonical URLs.

| Route | Surface | Public | Metadata | Canonical/indexability status | Next action |
| --- | --- | --- | --- | --- | --- |
| `/` | Signed-out sign-in gate | Yes | Static fallback and runtime title, description, canonical, Open Graph, Twitter | Partial: canonical root exists, but the page is now a sign-in gate with no crawlable merchandising content | Decide whether the gate or `/about` should be the indexed root before launch |
| `/about` | Marketing homepage (previously `/`) | Yes | Own title, description, canonical (`/about`), Open Graph, Twitter | Partial: retains category links and metadata; content requires JavaScript | Link to it from the gate, or move it back to `/` if organic search matters more than the gate |
| `/search` | Search and category-filtered collection | Yes | Central `noindex, nofollow` | Excluded from indexing | Keep discovery through canonical category pages |
| `/category/:slug` | Category landing and listing collection | Yes | Category-specific title, description, canonical, Open Graph, Twitter; invalid slugs noindex | Partial: stable in-app path exists behind `HashRouter` | Verify clean direct URL after staging rewrite/prerender decision |
| `/discover` | Discovery feed | Yes | Central `noindex, nofollow` | Excluded until a canonical purpose is defined | Keep noindex |
| `/listing/:id/:slug` | Canonical listing detail | Yes | Listing-specific title, description, canonical, Open Graph, Twitter image | Partial: canonical in-app path and visual breadcrumb exist; Product/Breadcrumb JSON-LD remains | Add `ListingPresentation` and structured data in PDP core |
| `/p/:id` | Legacy listing detail | Yes | Corrected after listing lookup | Replace-navigates to canonical `/listing/:id/:slug` | Retain while legacy links may exist |
| `/shop/:handle` | Seller storefront | Yes | Central `noindex, nofollow` | Excluded until seller canonical policy exists | Define storefront indexability later |
| `/sell`, `/sell/new` | Seller workflow | Yes | Central `noindex, nofollow` | Excluded from indexing | Keep noindex and add workflow guards in listing core |
| `/login`, `/signup` | Authentication | Yes | Central `noindex, nofollow` | Excluded from indexing | Keep noindex |
| `/onboarding/*` | Preference onboarding | Yes | Central `noindex, nofollow` | Excluded from indexing | Keep noindex |
| `/likes`, `/bag`, `/inbox`, `/profile` | Account state | App routes | Central `noindex, nofollow` | Excluded from indexing | Add remaining route guards |

## Iteration 4 completed

- [x] Added a static homepage `index, follow` fallback.
- [x] Added a centralized conservative `noindex, nofollow` policy to every route that does not own canonical page metadata.
- [x] Verified the actual GitHub Pages workflow, custom-domain configuration, custom-404 state, and deployment history.
- [x] Documented why a direct `BrowserRouter` switch is unsafe and the staging choices in `STAGING_ROUTING.md`.

## Iteration 3 completed

- [x] Defined `/listing/:id/:slug` as the canonical listing shape with immutable ID lookup and readable slug correction.
- [x] Preserved `/p/:id` as a resolving legacy route and moved all current internal listing links to one URL helper.
- [x] Added listing-specific metadata and taxonomy-aware visual breadcrumbs.
- [x] Added explicit noindex missing-listing recovery and truthful sold-state purchase suppression.

## Iteration 2 completed

- [x] Added one taxonomy-backed `/category/:slug` route for all supported categories.
- [x] Added category-specific metadata and canonical URL output.
- [x] Added visual breadcrumbs, filtered listing collections, loading state, empty-inventory recovery, and invalid-slug recovery.
- [x] Updated homepage category links to use the dedicated route.

## Iteration 1 completed

- [x] Anonymous visitors can reach the homepage instead of being redirected to onboarding.
- [x] Homepage includes crawlable fallback metadata in `index.html` and matching runtime metadata.
- [x] Homepage category links are generated from the canonical taxonomy and expose current listing counts.
- [x] Category links open filtered listing collections with a category-aware heading and zero-result message.

## Open issues for the next iteration

- [x] Add dedicated `/category/:slug` route with canonical metadata and breadcrumbs.
- [ ] Select and establish staging-compatible clean URL routing before replacing `HashRouter` (see `STAGING_ROUTING.md`).
- [x] Define stable listing URL format and redirect behavior for legacy `/p/:id` links.
- [ ] Add route-specific noindex controls to private and transactional surfaces.

## Verification evidence

- `npm run build` - PASS (`tsc -b` and `vite build`).
- `gh api repos/Palle017/spottedin-c/pages` - PASS; verified workflow Pages, custom domain, no custom 404, HTTPS enforcement off.
- `gh api repos/Palle017/spottedin-c/actions/workflows` - PASS; verified active `Deploy to GitHub Pages` workflow.
- `npm run build` - PASS (`tsc -b` and `vite build`).
- `npm run build` - PASS (`tsc -b` and `vite build`; 1,675 modules transformed).
- `npm run build` - PASS (`tsc -b` and `vite build`).
