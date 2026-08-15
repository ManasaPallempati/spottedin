# SPOTTED_B_PLAN — canonical execution plan for b.spottedin.co

Executor: Opus orchestrates, Sonnet subagents build (bypassed permissions except human-credential
steps). Spine = Vertical-Slice Launch (fastest public URL, proven risk chain first) hardened with the
Mechanics-first engineering discipline (type-level floor protection, force-dynamic rendering,
machine-verified pricing) and the Shell-First DNS gating discipline. All judge-identified gaps are
closed inline and marked `[GAP]`.

---

## 1. TL;DR

Build the "SPOTTED — prices fall every hour" GenZ resale app (12 screens + /landing) as a **new
Next.js App Router + TS + Tailwind repo `Palle017/spottedin-b`** at `C:/Users/augel/spottedin-b`,
deployed on **Vercel via git-push** (no Vercel CLI). Backend is **deliberately stubbed** behind one
server data seam (`lib/data.ts`) and one client store (`lib/store.ts`, localStorage): Supabase,
Stripe, and OAuth are post-launch swaps, never launch gates. The hourly-drop mechanic is a pure
function of wall-clock UTC + seed data — real and correct with zero database.

- Vertical slice ("/" The Rack, tokens, pricing engine, deploy pipeline) live on `*.vercel.app`
  in ~4-6 working hours. Full 12 screens on `*.vercel.app` at ~hour 8-12.
- `b.spottedin.co` = one grey-cloud CNAME after the Cloudflare zone goes Active. If the owner does
  the auth batch in hour 1: realistically live same day; honest worst case +24-48h (.co registry
  NS propagation) — during which the vercel.app URL is fully reviewable, so DNS never blocks review.
- The existing `www.spottedin.co` (Vite fallback site) is never touched: its DNS records are
  recreated byte-identical at Cloudflare before the NS flip, and no step in this plan modifies them.

---

## 2. MANUAL AUTH REGISTER — owner starts these NOW, in this order

Everything an agent cannot do. A1 unblocks deploys; A2-A4 unblock only the custom domain.
Batch A1-A5 into one ~35-minute sitting at the very start.

| ID | Human action (exact) | Yields | BLOCKS what | Stub / can work continue? |
|----|----------------------|--------|-------------|---------------------------|
| A1 | vercel.com → "Continue with GitHub" as **Palle017** → install Vercel GitHub App, "Only select repositories" → `spottedin-b` (agent creates the repo in P0.1 within minutes — if it doesn't exist yet, grant "All repositories" and narrow later). | Vercel account + git integration; every future `git push` auto-deploys | Phase 1 first deploy and everything after it | No stub. Do FIRST. ~5 min |
| A2 | Log into GoDaddy → Domains → spottedin.co → DNS → **export/screenshot EVERY record** in the zone. Also confirm on the domain overview: domain status Active, not expired/expiring within 30 days, auto-renew on. Paste export + status into chat. | The reconciliation baseline; agents cannot enumerate hidden records (`_github-pages-challenge-*`, `_acme-challenge`, verification TXTs) from outside | Phase 4 (cutover reconcile). Highest-probability migration failure lives here | Build proceeds fully without it. ~5 min. `[GAP: registrar/expiry check]` NS change is NOT a transfer — registrar transfer-lock does not block it; only expiry does |
| A3 | Cloudflare: create account / log in → "Add a site" → spottedin.co → Free plan. **Do not change nameservers yet.** Reconcile the auto-scanned records line-by-line against A2's export; minimum required, all grey-cloud (DNS only): apex A 185.199.108.153 / .109.153 / .110.153 / .111.153; CNAME www → palle017.github.io; plus everything else in the export. Note the two assigned `*.ns.cloudflare.com` servers; paste into chat. | Cloudflare zone (Pending) + the two nameservers | Phase 4 | Build proceeds fully. ~15 min |
| A4 | Only after A3 reconcile confirmed: GoDaddy → spottedin.co → Nameservers → "I'll use my own nameservers" → replace ns43/ns44.domaincontrol.com with the two from A3 → save (expect 2FA). **Do NOT delete any GoDaddy zone records** — rollback path, keep 1 week. | Delegation moves; Cloudflare zone flips to Active (typ. 5 min-3 h, budget 24 h) | Phase 4 (b.spottedin.co only) | Build + vercel.app launch proceed fully. ~5 min |
| A5 | Cloudflare → My Profile → API Tokens → Create Token → template "Edit zone DNS" → scope: zone spottedin.co only → paste token into chat. | `CLOUDFLARE_API_TOKEN` (zone-DNS-scoped, low blast radius) | Nothing (optional) | If skipped, owner clicks one DNS record manually in P4.4-alt. ~2 min |
| A6 | After Phase 1 pushes: Vercel → Add New → Project → Import `Palle017/spottedin-b` → framework Next.js, defaults, env var `CRON_SECRET` = any random string (Production + Preview) → Deploy. THEN: Settings → Deployment Protection → ensure **Vercel Authentication is OFF for Production** (if the agent's unauthenticated curl returns 401, this is why). Paste the assigned `*.vercel.app` URL if asked (agent also self-discovers it, see P1.7). | Production URL + working pipeline | Phase 1 gate | No stub. ~3 min. `[GAP: deployment protection]` |
| A7 | Only after Cloudflare zone = Active AND Phase 3 gate passed: Vercel → project → Settings → Domains → Add → `b.spottedin.co`. Read the exact CNAME target it prints (expected `cname.vercel-dns.com`; ignore any A 76.76.21.21 option — apex-only). Paste target into chat. | The authoritative CNAME target | Phase 4 | No stub, but 1 minute |

**Deferred register (post-launch, NOT this plan — recorded so nothing is silently dropped):**
Supabase project + keys (existing "Spotted In staging" `masdygvcssrtwseopfmj` is alive but shared
with the fallback Vite site — create a FRESH project for production); Supabase service-role key
(server-only env var, never `NEXT_PUBLIC_*`, never committed); Stripe test keys + webhook (webhook
URL cannot exist before the domain does); Google OAuth (depends on Supabase callback URL); Apple
OAuth (paid dev program, days of lead time — explicitly out of scope); www.spottedin.co HTTPS
repair (after zone Active: re-save custom domain in `Palle017/spottedin` Settings → Pages to
retrigger Let's Encrypt, keep www grey-clouded during validation, then Enforce HTTPS).

---

## 3. PHASES

Owner column: `[H]` human, `[S]` Sonnet subagent, `[O]` Opus orchestrator.
All paths absolute. Repo root: `C:/Users/augel/spottedin-b`. Prototype (READ-ONLY design reference,
markup-copying FORBIDDEN):
`C:/Users/augel/AppData/Local/Temp/claude/C--Users-augel-Maanster-Market/3940ab9c-3fe9-4c4e-9c1e-48bc23ed1ac1/scratchpad/spotted_design/Spotted App.dc.html`

### PHASE 0 — Repo + human auth batch (parallel: yes; starts immediately)

Goal: repo exists; every human-only credential step is initiated in one sitting so no agent ever stalls.

| ID | Owner | Instruction | Files | Verify |
|----|-------|-------------|-------|--------|
| P0.1 | [S] | `gh repo create Palle017/spottedin-b --public --description "SPOTTED - prices fall every hour"` (gh already authed as Palle017, scopes repo+workflow). Public avoids any Hobby-plan private-repo import friction. Do not initialize with README. | — | `gh repo view Palle017/spottedin-b --json name,visibility` exits 0 |
| P0.2 | [H] | Execute A1 (Vercel + GitHub App). | — | Owner confirms in chat |
| P0.3 | [H] | Execute A2 + A3 (GoDaddy export, Cloudflare add-site, reconcile). | — | Zone export pasted; two CF nameservers pasted; Opus diffs export vs required-minimum record list |
| P0.4 | [H] | Execute A4 (NS flip) immediately after P0.3 confirmed. | — | `nslookup -type=NS spottedin.co 8.8.8.8` and `... 1.1.1.1` both eventually list the two `*.ns.cloudflare.com`; `nslookup www.spottedin.co 1.1.1.1` still returns palle017.github.io |
| P0.5 | [H] | Execute A5 (Cloudflare token, optional). | — | `curl -s -H "Authorization: Bearer <TOKEN>" "https://api.cloudflare.com/client/v4/zones?name=spottedin.co"` returns `"success":true` with 1 zone |

**GATE 0 → 1:** P0.1 passes. (P0.2 must be done before P1.7; P0.3-P0.5 gate only Phase 4 — Opus
tracks them but NEVER holds Phases 1-3 on them.)

### PHASE 1 — Vertical slice: scaffold, tokens, pricing engine, seed, The Rack, first deploy (parallel: P1.2-P1.5 after P1.1)

Goal: ONE route ("/", The Rack) fully real end-to-end — server-computed prices, exact tokens, phone
shell, ticker, grid, tab bar — publicly live on `*.vercel.app`. Proves scaffold, fonts, tokens,
pricing, images, and the deploy loop that all remaining screens reuse.

| ID | Owner | Instruction | Files | Verify |
|----|-------|-------------|-------|--------|
| P1.1 | [S] | Scaffold at `C:/Users/augel/spottedin-b` (NOT inside Maanster_Market): `npx create-next-app@latest spottedin-b --typescript --tailwind --app --eslint --no-src-dir --import-alias "@/*" --use-npm` in `C:/Users/augel`, then `git remote add origin https://github.com/Palle017/spottedin-b.git`. `npm i -D vitest`; package.json script `"test": "vitest run"`. Delete boilerplate page content. `.env.example` documenting (all commented "not required at launch — stubbed"): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `STRIPE_SECRET_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET`, `CRON_SECRET`, `NEXT_PUBLIC_ACCENT`. Commit, push `main`. | `package.json`, `.env.example` | `npm run build` exits 0; push succeeds |
| P1.2 | [S] | Design tokens + phone shell per **Section 4** (paste it into the agent brief verbatim). `app/globals.css`: all CSS vars, radii ladder, keyframes (fadeUp, sheetUp, pulse, outL, outR, pop, vprog), precomputed rgba accent-tint utility classes `.acc-5 ... .acc-50` alongside the color-mix originals (`[GAP: old-Safari color-mix]` — rgba values are the fallback, color-mix inside `@supports`), a global `@media (prefers-reduced-motion: reduce)` block that kills pulse/vprog/Ken-Burns/deck-fly animations (`[GAP: reduced motion]`), and `:focus-visible { outline: 2px solid var(--acc); outline-offset: 2px }` (`[GAP: keyboard a11y]`). `app/layout.tsx`: fonts via next/font/google — Archivo_Black (400, `--font-display`), Space_Grotesk (300-700, `--font-ui`), Space_Mono (400+700, `--font-mono`); body bg `#0A0A0C`; centered shell max-width 430px min-height 100dvh bg var(--screen); full-bleed ≤480px; NO desktop layout invented. Accent swap (`[GAP: accent switch]`): layout reads `process.env.NEXT_PUBLIC_ACCENT === 'cyan'` and if set injects `style={{'--acc':'#53E9FF'}}` on the shell — the documented one-line preview switch. NO emoji anywhere; brand mark is the char `●` as in `SPOTTED●`. Extend tailwind.config with token colors + 3 font families. | `app/globals.css`, `app/layout.tsx`, `tailwind.config.ts` | `npm run build` exits 0; `grep -c "D9FF3D" app lib -r` == 1 (only the `--acc` declaration) |
| P1.3 | [S] | `lib/pricing.ts` + `lib/pricing.test.ts` — the ONE shared price util, pure, UTC-epoch-based, zero browser APIs. Exports exactly the formulas in **Section 4 § Pricing**. Vitest with fixed Date objects (no wall clock): (1) Y2K MOTO 88/58/260 STANDARD: +0h=88, +5h=83, +30h=58 (clamped), +31h=58; stealPct(83,260)=68. (2) CHILL 100/90: +23h=100, +24h=99, +240h=90. (3) TURBO 50/20: +10h=30, +20h=20, +25h=20. (4) `secondsToNextDrop` at XX:59:30 = 30; at exactly XX:00:00 = 3600. (5) stealPct never negative for price ≤ retail. (6) `nextDropEpoch(now) === Math.ceil(now/3600000)*3600000`. | `lib/pricing.ts`, `lib/pricing.test.ts` | `npx vitest run lib/pricing.test.ts` exits 0 |
| P1.4 | [S] | Seed extraction. Read ONLY lines 638-832 (the `<script type="text/x-dc">` block) of the prototype file. Extract: 10 ITEMS with exact title/brand/size/condition/era/category/p0/floor/retail (anchor: Y2K MOTO JACKET 88/58/260; others: FADED 501s, 90s WINDBREAKER, NYLON MINI BAG, 1461 LOAFERS, KNIT ZIP POLO, PARACHUTE CARGOS, '96 TOUR TEE, PUFFER VEST, SAMBA OG); 4 SELLERS (@mara.vintage ★4.9·238, @thriftgod ★4.8·91, @y2kcloset ★5.0·412, @rackrat ★4.7·56) with replies-in/avatar fields if present; 3 FITS; 1 offer thread. NO markup copying. Write `lib/seed.ts` typed consts — Listing `{id, sellerId, title, brand, size, condition, era, category, retailPrice, startPrice, floorPrice, dropSpeed, listedAt, photos: string[]}`. **listedAt values MUST be hour-aligned UTC ISO strings** (e.g. `2026-07-27T14:00:00.000Z`) staggered 3-70 h before launch so every listing is visibly mid-drop and ≥1 is floor-clamped (give Y2K MOTO ~40 h at STANDARD) — hour alignment guarantees per-listing drops coincide with the global :00 tick so the ticker flash always matches real price changes (`[GAP: ticker/price divergence]`). One offer in the thread seeded with `expiresAt` = launch+24 h. | `lib/seed.ts`, `lib/types.ts` | Vitest sanity test: 10 listings, 4 sellers, 3 fits; every listing `retailPrice > startPrice > floorPrice > 0`; every `listedAt` satisfies `Date.parse(l.listedAt) % 3600000 === 0`; `currentPrice` at a fixed mid-2026 instant differs from startPrice for all 10 |
| P1.5 | [S] | Photos + licensing. Read `C:/Users/augel/Maanster_Market/public/photos/CREDITS.md` FIRST; copy into `C:/Users/augel/spottedin-b/public/photos/` only images whose stated license permits commercial reuse (Unsplash/Pexels-class); log per-photo source in the copied CREDITS.md (`[GAP: photo licensing]`). Map 1 primary + 1-3 carousel photos per listing in seed.ts; NO striped placeholders may ship. Generate `app/icon.svg`: `●` in `#D9FF3D` on `#0A0A0C`. | `public/photos/`, `public/photos/CREDITS.md`, `app/icon.svg` | `ls public/photos` ≥ 10 files; CREDITS.md lists a license line per shipped photo; build exits 0 |
| P1.6 | [S] | Server data seam + truth endpoint + The Rack. (a) `lib/data.ts` — server-only module (`import 'server-only'`). **`type PricedListing` = seed Listing MINUS `floorPrice` PLUS `{price, stealPct, atFloor: boolean}`** — the floor number structurally cannot reach any page prop, RSC payload, or API response (`[GAP-class: floor leak]` — type-level, not grep-level). Exports `getListings()`, `getListing(id)`, `getSellers()`, `getFits()`, `getThreads()` computing via lib/pricing at call time. Top comment: `SUPABASE SWAP SEAM — replace seed reads with server supabase-js queries; signatures are the contract.` (b) `app/api/listings/route.ts` — `export const dynamic = 'force-dynamic'`; returns `{serverNow, nextDropEpoch, listings: PricedListing[]}`. (c) `app/page.tsx` (The Rack, `force-dynamic`): per **Section 5** row 1 with the exact measurements in **Section 4 § Card grid / Ticker / Tab bar**. `components/DropTicker.tsx` (client): ticks 1 s off `nextDropEpoch` + a clock-skew offset computed as `serverNow - Date.now()` at hydration (`[GAP: clock skew]`); the client COUNTS DOWN, never COMPUTES PRICES; at :00 show `EVERYTHING JUST DROPPED` (data-testid=`just-dropped`) for 5 s and `router.refresh()`; countdown digits use `font-variant-numeric: tabular-nums` inside a fixed-width `ch`-reserved span (zero CLS). `components/TabBar.tsx` and `components/ListingTile.tsx` per Section 4, with `aria-label` on every icon-only control and floor-clamped tiles showing `AT FLOOR` instead of `↓$1/hr` (`[GAP: floor-state UI]`). | `lib/data.ts`, `app/api/listings/route.ts`, `app/page.tsx`, `components/DropTicker.tsx`, `components/TabBar.tsx`, `components/ListingTile.tsx` | `npm run build` exits 0; `npm run start` then `curl -s localhost:3000/api/listings` piped to a node one-liner asserting: 10 listings, JSON contains no key matching `/floor/i`, `nextDropEpoch % 3600000 === 0`; `curl -s localhost:3000/ \| grep -c "GLOBAL DROP"` ≥ 1 and contains `Y2K MOTO JACKET` |
| P1.7 | [O] | First deploy + hostname discovery. `git add -A && git commit -m "vertical slice: tokens, pricing, rack" && git push -u origin main`. Requires P0.2/A6. Discover the production URL mechanically — do NOT wait on a chat paste (`[GAP: hostname discovery]`): `gh api repos/Palle017/spottedin-b/deployments --jq '.[0].id'` then `gh api repos/Palle017/spottedin-b/deployments/<id>/statuses --jq '.[0].environment_url'` (Vercel posts GitHub deployment statuses). Fallback: try `https://spottedin-b.vercel.app`, then ask owner. Unauthenticated curl MUST return 200; a 401 means Deployment Protection — send owner back to A6 (`[GAP: deployment protection]`). Abort criterion: if the Vercel build fails, read the failure from the deployment status, file a fix task to the owning agent, re-push; after 3 failed pushes STOP and escalate to owner with the exact build log (`[GAP: no rollback criteria]`). | — | `curl -s -o /dev/null -w "%{http_code}" <prod-url>/` == 200 with NO auth; body contains `GLOBAL DROP` |
| P1.8 | [O] | Write `scripts/verify-prices.mjs` (committed; reused at every later gate via `BASE_URL` env): fetch `$BASE_URL/api/listings`; independently recompute `max(floor, start - drop(hours))` for all 10 from lib/seed + current time; assert equality; assert no JSON key matches `/floor/i`; assert the response `cache-control` is not a long-lived public cache. Also `scripts/verify-routes.mjs`: GET every route in **Section 5** asserting 200 + its sentinel string. | `scripts/verify-prices.mjs`, `scripts/verify-routes.mjs` | `BASE_URL=<prod-url> node scripts/verify-prices.mjs` exits 0 |

**GATE 1 → 2:** P1.7 curl == 200 on the public URL; `verify-prices.mjs` exits 0 against production;
vitest green; Opus eyeballs ONE screenshot of `/` at 402 px against the prototype Home screen.

### PHASE 2 — Shared components, then all remaining screens in 4 parallel groups (parallel: P2.1-P2.4 after P2.0)

Goal: every route in Section 5 renders at full fidelity through `lib/data.ts` (server reads) +
`lib/store.ts` (client mutations). P2.0 MUST complete before the groups dispatch — it is the single
biggest defense against cross-screen token drift.

| ID | Owner | Instruction | Files | Verify |
|----|-------|-------------|-------|--------|
| P2.0 | [S] | **BLOCKING PRE-STEP.** (a) `components/Chip.tsx` — the three prototype chip variants (Section 4 § Chips). (b) `components/BottomSheet.tsx` (radius 22px top corners, sheetUp 320ms, scrim). (c) `lib/store.ts` — THE client seam, localStorage key `spotted:v1`, every access guarded `typeof window !== 'undefined'`, re-render via `CustomEvent('spotted:update')` + `useStore()` hook. Functions: `getSpots/toggleSpot(id)`, `recordDeckSignal(id,'spot'|'drop')`, `createListing(input)` (local overlay merged with seed; `listedAt = nextDropEpoch(now)-3600000`... no: `listedAt = new Date(Math.floor(Date.now()/3600000)*3600000)` hour-aligned so it drops on the next global tick), `sendOffer(listingId, amount)` / `acceptOffer(id)` (state machine sent→accepted|declined|expired; `expiresAt = +24h`; **expired state computed at render time from expiresAt** so offers visibly expire with no cron (`[GAP: offer expiry UI]`)), `placeOrder(...)`, `getOrders`, `addToWaitlist(email)`. Do NOT port the old repo's PBKDF2 auth — no auth at launch, documented choice. Top comment: `SUPABASE SWAP SEAM`. (d) Convert every prototype `style-hover` pattern relevant to shared components into real `:hover` rules. (e) Smoke page `app/dev/cards/page.tsx` rendering 10 ListingTiles (deleted in P5.2). | `components/Chip.tsx`, `components/BottomSheet.tsx`, `lib/store.ts`, `lib/useStore.ts`, `app/dev/cards/page.tsx` | `npm run build` exits 0 (proves SSR-safety); /dev/cards renders 10 tiles with photos + computed steal chips |
| P2.A | [S] | GROUP A — `/search`, `/closet`, `/landing`. Per Section 5 rows + Section 4 measurements. `/search`: input radius 12px on --card; `TRENDING` mono label; tag chips EXACTLY `Y2K, SAMBA, CARPENTER, LEATHER MOTO, 90s NIKE, GORPCORE`; live client filter over server-passed PricedListings; 2-col ListingTile grid. `/closet`: avatar with 2px var(--acc) ring; handle; stats SAVED $ / SPOTS / LISTED; Wrapped accent card (`N STEALS · $N SAVED`, TOP ERA / TOP COP, SHARE pill); CLOSET\|SPOTTED tabs — SPOTTED reads lib/store spots, empty state `nothing spotted yet — hit the deck ●`; closet tiles overlay `● LIVE · DROPS MM:SS`; `+ list something` dashed tile → /sell. `/landing` (`[GAP: landing/desktop conflict]` — DECIDED: /landing is the ONE route that escapes the 430px shell; it renders full-width on `#0A0A0C` with a single centered content column max-width 560px: `SPOTTED●` wordmark in Archivo Black, tagline `prices fall every hour. catch them first.`, waitlist email input → `addToWaitlist` via server action stub that logs + returns ok; no other desktop layout exists anywhere). | `app/search/page.tsx`, `app/closet/page.tsx`, `app/landing/page.tsx` | build 0; curls 200 with sentinels `GORPCORE`, `SPOTTED` tab, `catch them first` |
| P2.B | [S] | GROUP B — `/item/[id]` + OfferSheet + `/checkout` + share cards. `/item/[id]` (force-dynamic, server props are PricedListing — floor number cannot appear): carousel with back/spot 27px blur-circle overlays; `-N% UNDER RETAIL` accent chip; Archivo ~34px price + struck retail; DROP BOX reusing ticker styling: `NEXT DROP −$N IN MM:SS` (listing's own rate) + FLOOR row showing ONLY the literal text `floor hidden` — and when `atFloor`, the box swaps to `FLOOR HIT — this is the lowest` with the countdown hidden (`[GAP: floor-state UI]`); `N others watching` pulse line; meta `brand · size · cond · era` 8.5px mono; description; seller card (avatar chip #26262C, handle, ★rating — ★ char allowed, sales, replies-in, ASK → thread); sticky bottom `MAKE OFFER` outline / `BUY $N` accent pills. OfferSheet in BottomSheet: asking price, quick chips -10%/-15%/-20% (option cards), ± stepper, line `sellers accept 71% of offers within -15%`, SEND OFFER → `store.sendOffer` → route to thread. `/checkout`: item row tagged `DROP PRICE` or `OFFER LOCKED`; address block; shipping option cards Tracked $4.99 / Express $9.99; Apple Pay/card visual selector (non-functional, comment `STRIPE SWAP SEAM`); totals with `BUYER FEES — $0 ON US`; PAY → `lib/payments.ts mockPay()` (~800ms, always succeeds) → `COPPED.` + Steal Receipt. **Share cards via ImageResponse, not canvas** (`[GAP: unfurlable share cards]`): `app/api/share/receipt/[orderId]/route.tsx` and `app/api/share/fit/[listingId]/route.tsx` render 1080x1920 PNGs server-side with next/og `ImageResponse` (PAID / RETAIL / SAVED $N (-N%) rows, `SPOTTED●` mark); SHARE buttons link/download these stable URLs; `components/StealReceipt.tsx` renders the on-screen card with the same layout. | `app/item/[id]/page.tsx`, `app/checkout/page.tsx`, `components/OfferSheet.tsx`, `components/StealReceipt.tsx`, `lib/payments.ts`, `app/api/share/receipt/[orderId]/route.tsx`, `app/api/share/fit/[listingId]/route.tsx` | build 0; `/item/<seed-id>` 200, contains `floor hidden`, and `grep -rn "floorPrice" app/item components/OfferSheet.tsx` → 0 hits; `/checkout` contains `ON US`; `curl -s -o /dev/null -w "%{http_code}" localhost:3000/api/share/receipt/o1` == 200 with `content-type: image/png` |
| P2.C | [S] | GROUP C — `/deck`, `/fits`, `/irl`. `/deck`: stack margin 4px 22px 12px; NEXT card absolute inset `14px 10px -6px`, opacity .45, `scale(.95) translateY(10px)` peeking behind; top card inset 0, radius 20px, shadow `0 18px 44px rgba(0,0,0,.45)`, photo full-bleed, scrim `linear-gradient(transparent, rgba(10,10,12,.88))` padded 40px 16px 16px; `✕ DROP` outline + `● SPOT` accent pills (BOTH keyboard-focusable with aria-labels) AND pointer-drag swipe (threshold ~80px) → outL/outR (±130% ±10deg 300ms) → advance index on 300ms timeout; signals via `store.recordDeckSignal`; SPOT also `store.toggleSpot`; footer `tuned to {size} · ${budget}` mono line; deck pre-filtered by mock user size+budget from seed. `/fits`: full-bleed vertical feed of 3 seed fits; muted looping `<video>` if clips exist else Ken-Burns photo stand-in (documented choice); **progress bar bound to video `timeupdate`** when video exists, vprog keyframe only for photo stand-ins (`[GAP: progress desync]`); FOLLOW chip; caption 13px Grotesk; SHOP THE LOOK chip row (radius 10px, 26x32 thumb + price) deep-linking /item; share/spots right rail; invisible ~45% prev/next tap zones. `/irl`: idle = viewfinder radius 18px with 4 accent corner brackets + shutter circle (file-input capture; getUserMedia optional); snapped = `N MATCHES ON THE RACK` mono header + rows (thumb, title, `{n}% MATCH` accent) via tag-overlap matching over seed; no match → `POST WANTED` (client-local) ; `SNAP ANOTHER`. | `app/deck/page.tsx`, `app/fits/page.tsx`, `app/irl/page.tsx`, `components/DeckCard.tsx` | build 0; three routes 200; Playwright: SPOT click animates card out and the listing appears under /closet SPOTTED tab after navigation |
| P2.D | [S] | GROUP D — `/sell`, `/inbox`, `/inbox/[thread]`, `/orders/[id]`. `/sell` (3 steps + success, client wizard): S1 four dashed photo slots (`first photo = cover`, AI bg-removal note line, object-URL previews); S2 title/brand inputs + size/condition chips; S3 START PRICE + FLOOR inputs (radius 12px), DROP SPEED option cards CHILL(-$1/day)/STANDARD(-$1/hr)/TURBO(-$2/hr), box `YOU EARN $N — 0% SELLER FEES FOREVER`, `START THE DROP` → `store.createListing` (hour-aligned listedAt; appears on / and /closet); success `YOU'RE LIVE.` + Fit Card preview sourced from `/api/share/fit/<id>` + SHARE FIT CARD / VIEW CLOSET. `/inbox`: thread rows radius 14px (avatar, handle, preview, unread accent dot); header line `offers auto-expire in 24h` 8.5px mono rgba(.4). `/inbox/[thread]`: pinned item card (thumb, title, live server price + `STILL DROPPING` accent tag — or `AT FLOOR`); bubbles mine #1D1D22-right / theirs #17171B-left radius ~13px; offer card `YOUR OFFER $N` → status (renders `EXPIRED` if past expiresAt) → accepted shows `CHECKOUT AT $N` accent pill → `/checkout?offer=N`; composer above TabBar (`store.sendMessage` client-local). Seed thread `t1` ships with the offer ACCEPTED so the full offer→checkout path is demoable. `/orders/[id]`: order number/carrier/ETA mono; dark stylized map-region block radius 14px; 5-step timeline placed→packed→shipped→out for delivery→delivered with done (accent dot) / active (pulse) / next (dim hairline dot); MESSAGE SELLER outline pill. Seed one order `o1`. | `app/sell/page.tsx`, `app/inbox/page.tsx`, `app/inbox/[thread]/page.tsx`, `app/orders/[id]/page.tsx`, `components/FitCard.tsx` | build 0; routes 200; `/sell` contains `0% SELLER FEES FOREVER`; `/inbox` contains `offers auto-expire in 24h` |
| P2.E | [S] | Cron scaffold + force-dynamic audit. `app/api/cron/hourly/route.ts`: 401 unless `Authorization: Bearer ${CRON_SECRET}`; body logs the tick and calls named no-ops `expireOffers()` / `notifySpotters()` with comments pointing at the Supabase seam. `vercel.json`: `{"crons":[{"path":"/api/cron/hourly","schedule":"0 0 * * *"}]}` — **daily, because Vercel Hobby rejects sub-daily cron** (`[GAP: Hobby cron limit]`); the drop mechanic does NOT depend on cron (pure wall-clock function); switch to `0 * * * *` when upgrading to Pro alongside Supabase — documented in DEPLOY.md. Audit: every route rendering a price declares `export const dynamic = 'force-dynamic'`; `grep -rn "startPrice\|floorPrice" app components --include=*.tsx` must show zero client-side price computation. | `app/api/cron/hourly/route.ts`, `vercel.json` | curl /api/cron/hourly → 401; with header + `CRON_SECRET=test` → 200; grep audit clean; **after deploy** Vercel accepts the vercel.json (deployment does not error on the cron block) |

**GATE 2 → 3:** `npm run build` exits 0; `node scripts/verify-routes.mjs` (localhost) exits 0 for all
Section-5 routes; `rg -P "[\x{1F300}-\x{1FAFF}]" app components lib` returns zero matches (no-emoji
rule); `grep -rn "floorPrice" app components` shows zero rendered occurrences (belt to the
type-system braces). Opus merges (only plausible collisions: lib/seed.ts, lib/store.ts — Opus
arbitrates, never rubber-stamps), pushes, re-runs `verify-prices.mjs` + `verify-routes.mjs` against
the production URL.

### PHASE 3 — Journeys, mobile reality check, hour-boundary proof (parallel: partial)

Goal: the app behaves like a product; the headline mechanic is proven in production across a real
hour boundary; a real mobile-class browser has rendered it.

| ID | Owner | Instruction | Files | Verify |
|----|-------|-------------|-------|--------|
| P3.1 | [S] | Playwright acceptance script `scripts/acceptance.spec.ts`, viewport 402x874, `BASE_URL` env: J1 spot-dot on a Rack tile → listing under /closet SPOTTED; J2 /deck button-SPOT → card flies out, next presents, item in closet; J3 /inbox/t1 accepted offer → `CHECKOUT AT $N` → mock pay → `COPPED.` + Steal Receipt PNG URL returns 200; J4 /sell 3 steps → START THE DROP → new listing on / with live countdown (rack tile count 10 → 11). Plus keyboard journey: Tab through the tab bar and deck buttons, activate SPOT via Enter (`[GAP: keyboard a11y]`). | `scripts/acceptance.spec.ts` | `BASE_URL=<prod-url> npx playwright test scripts/acceptance.spec.ts` exits 0 |
| P3.2 | [O] | Hour-boundary proof in production: sample `<prod-url>/api/listings` at XX:59 and XX:01 (schedule around a real top of hour); assert every non-floor-clamped STANDARD listing dropped exactly $1, TURBO $2, CHILL unchanged unless a 24h boundary passed, floor-clamped unchanged; assert the `just-dropped` element appears in a browser open across the boundary. | — | Diff table logged; every delta matches its rate |
| P3.3 | [O] | Real-browser mobile pass (`[GAP: no real mobile check]`): open the production URL in the Browser pane at mobile viewport (375x812 and 402x874), dark scheme; walk /, /deck (swipe via drag), /item, /sell; confirm color-mix tints and aspect-ratio tiles render (rgba fallbacks exist from P1.2 for older Safari — note honestly that true iOS Safari cannot be run from this Windows machine; owner does a 2-minute check on their phone and reports; log result either way). | — | Zero console errors; screenshots stored; owner phone-check reported |

**GATE 3 → 4:** acceptance.spec.ts exit 0 against production; hour-boundary diff logged; mobile pass
logged. From here the product is publicly demoable regardless of DNS.

### PHASE 4 — b.spottedin.co cutover (parallel: no; prerequisites: Cloudflare zone Active + Gate 3)

Goal: the already-verified deployment answers on b.spottedin.co with valid TLS; www untouched.
Strict order: pre-checks → Vercel domain add → CNAME → verify. **Timeout rule (`[GAP: no abort
criterion]`): if the Cloudflare zone is not Active 24 h after the NS flip, continue operating on the
vercel.app URL, re-check every 12 h, and after 72 h offer the owner the rollback (point NS back at
ns43/ns44 — the GoDaddy zone is intact). DNS never blocks anything except the vanity hostname.**

| ID | Owner | Instruction | Files | Verify |
|----|-------|-------------|-------|--------|
| P4.1 | [S] | Preconditions: `nslookup -type=NS spottedin.co 8.8.8.8` AND `... 1.1.1.1` both list the two Cloudflare NS; `nslookup www.spottedin.co 1.1.1.1` still → palle017.github.io. Do NOT proceed otherwise — a CNAME added while GoDaddy still answers is invisible to un-migrated resolvers and masquerades as a Vercel failure. | — | Both checks pass |
| P4.2 | [S] | Conflict check (`[GAP: pre-existing b record]`): with the A5 token, `GET https://api.cloudflare.com/client/v4/zones/<zone_id>/dns_records?name=b.spottedin.co`. If any record exists (e.g. imported by the CF scan), report it to the owner and get an explicit go-ahead to delete before creating ours. No token → owner checks the DNS panel for a `b` record. | — | Zero pre-existing `b` records, or explicit owner-approved deletion logged |
| P4.3 | [H] | Execute A7: add `b.spottedin.co` in Vercel → Settings → Domains; paste the printed CNAME target. | — | Vercel Domains lists b.spottedin.co (Invalid Configuration expected until P4.4) |
| P4.4 | [O] | Create the record. With token: `curl -X POST https://api.cloudflare.com/client/v4/zones/<zone_id>/dns_records -H "Authorization: Bearer <TOKEN>" -H "Content-Type: application/json" -d '{"type":"CNAME","name":"b","content":"<target from P4.3, expected cname.vercel-dns.com>","proxied":false,"ttl":1}'`. **proxied MUST be false** — grey cloud, no exceptions: orange breaks Vercel TLS issuance AND silent renewal 60-90 days later, and with SSL "Flexible" causes an infinite redirect loop (the most common Cloudflare+Vercel outage). ALT without token: owner adds Type CNAME / Name `b` / Target `<from P4.3>` / Proxy **DNS only** / TTL Auto in the dashboard. Touch NOTHING else — apex A records and www CNAME are off-limits. | — | `nslookup b.spottedin.co 1.1.1.1` returns the Vercel CNAME chain; API GET shows `"proxied":false`; Vercel flips to Valid + cert issued within ~2 min |
| P4.5 | [O] | End-to-end on the real name: `BASE_URL=https://b.spottedin.co node scripts/verify-prices.mjs && node scripts/verify-routes.mjs` and `npx playwright test scripts/acceptance.spec.ts`. Fallback intact: `curl -s -o /dev/null -w "%{http_code}" http://www.spottedin.co` serves the old Vite site; `nslookup www.spottedin.co 8.8.8.8` still → palle017.github.io; www body hash equals the pre-migration sample taken in P4.1. Remind owner: GoDaddy zone untouched for 1 week (rollback); www HTTPS repair is a separate post-launch task (Deferred register). | — | `curl -sSI https://b.spottedin.co` → HTTP/2 200, valid cert, no `-k`; all scripts exit 0; www hash unchanged |

**GATE 4 → 5:** `curl -sS -o /dev/null -w "%{http_code} %{ssl_verify_result}" https://b.spottedin.co/`
prints `200 0`; body contains `GLOBAL DROP`; www checks pass. This restates spec acceptance item 7
for the b subdomain per the owner's decision.

### PHASE 5 — Fidelity convergence + acceptance sign-off (parallel: yes; site already live)

Goal: close the visual gap with evidence and a stopping rule; land metadata/OG/Lighthouse; Opus signs
the checklist. **Stopping rule (`[GAP: unbounded fidelity]`): max 2 fix rounds per screen; anything
still drifting after round 2 is either accepted by Opus with a one-line reason or logged in the
launch note — the phase cannot run unbounded.**

| ID | Owner | Instruction | Files | Verify |
|----|-------|-------------|-------|--------|
| P5.1 | [O] | Screenshot audit: render the prototype file in the Browser pane, screenshot each of the 12 phone-frame screens (left/right rails are annotation — never compare against them); screenshot the same screens at 402x874 on https://b.spottedin.co. Per-screen numbered defect list: sub-pixel type (8.5/9.5/11.5px), letter-spacing (.3-2px), radius ladder (99/22/20/18/16/14/13/12/11/10/8/6), 1.5px borders, accent tint strengths, missing :hover states, scrim opacity over real photos (never remove scrims/blur backdrops — they protect chip legibility on photography), ticker geometry. Dispatch fixes to owning Phase-2 agents (A/B/C/D); re-screenshot after each auto-deploy. Photo curation criterion (`[GAP: photo curation]`): the 10 mapped photos must read as one brand on #0E0E11 — no harsh white studio backgrounds, no two photos of jarringly different color temperature side-by-side in the default grid order; Opus may remap listing→photo assignments from the 24 available to satisfy it. | prototype file, all `app/` + `components/` | 12 before/after screenshot pairs stored; every defect fixed, accepted-with-reason, or logged; max 2 rounds enforced |
| P5.2 | [S] | Metadata + cleanup: `app/layout.tsx` metadata — title `SPOTTED●`, description exactly `SPOTTED — prices fall every hour. catch them first.`, themeColor #0A0A0C; `app/opengraph-image.tsx` via ImageResponse 1200x630 (SPOTTED● mark, accent dot, dark); `app/sitemap.ts` listing the public Section-5 routes on https://b.spottedin.co; confirm next/font is the only font path (`curl -s https://b.spottedin.co \| grep -c fonts.googleapis` == 0); delete `app/dev/cards`; repo-wide emoji grep clean. | `app/layout.tsx`, `app/opengraph-image.tsx`, `app/sitemap.ts` | `curl -s https://b.spottedin.co \| grep -c 'catch them first'` ≥ 1; sitemap.xml 200; emoji grep 0; build 0 |
| P5.3 | [S] | Lighthouse mobile on `https://b.spottedin.co/` and `/item/<seed-id>`: `npx lighthouse <url> --form-factor=mobile --screenEmulation.mobile --output=json --output-path=...` (or the chrome-devtools lighthouse tool). Targets: performance ≥ 90, accessibility ≥ 90, CLS < 0.02 with zero shift attributed to the ticker (tabular-nums + reserved `ch` width from P1.6). Easy wins if under: next/image with `sizes` everywhere, `priority` on the first two rack tiles, aria-labels (already required), reduced-motion (already global). Max 3 iterations then report the honest residual gap. | Lighthouse JSON in scratchpad | JSON: `categories.performance.score ≥ 0.90` AND `categories.accessibility.score ≥ 0.90` on both URLs; CLS attribution shows 0 from DropTicker |
| P5.4 | [S] | `DEPLOY.md` in the repo: every seam + exact activation steps — Supabase (fresh project recommended over shared `masdygvcssrtwseopfmj` staging; fill `NEXT_PUBLIC_SUPABASE_URL`/`ANON_KEY` in Vercel env; reimplement lib/data.ts + lib/store.ts internals, signatures frozen; old repo `supabase/schema.sql` is the baseline but needs offers/addresses/notifications tables, the `image_kind='gradient'` constraint fix, and one identity table); Stripe test mode (keys + webhook `https://b.spottedin.co/api/stripe/webhook`, replace `lib/payments.ts mockPay`); cron upgrade to `0 * * * *` on Vercel Pro; Google OAuth (after Supabase); Apple OAuth (out of scope — paid program); www HTTPS repair steps; the accent preview switch (`NEXT_PUBLIC_ACCENT=cyan`); and the documented-choices log (localStorage data layer, mock payments, no auth at launch, photo stand-ins on /fits, daily cron on Hobby, acceptance item 7 restated to b subdomain, git-push deploys). | `DEPLOY.md` | File committed + pushed; Opus confirms every Deferred-register item appears with activation steps |
| P5.5 | [O] | Final acceptance declaration per **Section 7**, each line citing machine evidence (script exit code, screenshot filename, JSON score, curl output) — no line may read "looks right". Post the LAUNCH-STATUS note to the owner: what is live, every PASS-WITH-STUB, the deferred register, and the one-week GoDaddy-zone reminder. | — | The signed 7-line table itself |

---

## 4. DESIGN TOKEN + SPEC SHEET (paste into every screen agent's brief — agents never need the README)

### Color
```css
:root {
  --acc: #D9FF3D;            /* THE accent. Alt preview #53E9FF via NEXT_PUBLIC_ACCENT=cyan. */
  --on-acc: #0C0C0E;         /* ink on accent */
  --page: #0A0A0C;           /* desktop page bg */
  --screen: #0E0E11;         /* app canvas */
  --card: #17171B;           /* card surface */
  --raised: #1D1D22;         /* elevated surface / chat bubble */
  --chip: #26262C;           /* avatar chip */
  --hairline: rgba(237,235,228,.09);
  --txt: #EDEBE4;
  --muted: rgba(237,235,228,.5);
  --dim: rgba(237,235,228,.35);
}
```
Accent tints: prototype uses `color-mix(in oklab, var(--acc) N%, transparent)` at
N = 5, 6, 7, 10, 16, 25, 32, 35, 45, 50. Ship precomputed rgba equivalents of #D9FF3D as the base
utilities (`rgba(217,255,61,.05) ... .50`) with the color-mix versions inside
`@supports (color: color-mix(in oklab, red, blue))` so old Safari degrades to identical-looking
tints, not to nothing. Text opacity ladder on #EDEBE4: .88/.8/.75/.6/.5/.45/.4/.38/.35/.32/.3/.25/.18/.16/.14/.12/.09/.08/.07.

### Radii (exact ladder — do NOT round to a 4pt scale)
999px all pills/dots/buttons/chips · 22px bottom-sheet top corners only · 20px deck card ·
18px IRL viewfinder · 16px wrapped card · 14px grid tile / list row / cards / images ·
13px chat bubble · 12px inputs / ticker bar · then 11/10/8/6px nested chips.

### Type (sub-pixel values are load-bearing)
- Display: **Archivo Black** 400 — every price and screen title; 34/30/24/20/17/15/11px, +0.5 tracking on titles.
- UI: **Space Grotesk** 300-700 — body/labels/buttons, 11-13px (11.5px tile titles, 13px captions).
- Meta: **Space Mono** 400/700 — ALL micro-copy/chips/timers/stats, UPPERCASE, letter-spacing 0.3-2px, 7.5-12px. The single most repeated element: Mono 8.5px in rgba(237,235,228,.4).
- All via next/font/google; zero external font links.

### Motion
fadeUp screen enter 300ms `cubic-bezier(.16,1,.3,1)` · sheetUp 320ms · pulse 1.4-1.6s (live dots) ·
outL/outR deck fly-out translate ±130% rotate ±10deg 300ms · pop · vprog 8s width fill (photo
stand-ins only; real video binds to `timeupdate`). Global
`@media (prefers-reduced-motion: reduce)` disables pulse/vprog/KenBurns/fly-outs.

### Pricing (the ONE shared util — lib/pricing.ts, server-side truth, UTC epoch)
```
RATE: CHILL = $1/day, STANDARD = $1/hr, TURBO = $2/hr
elapsedHours = floor((now - listedAt) / 3600000)
drop = STANDARD: elapsedHours * 1 | TURBO: elapsedHours * 2 | CHILL: floor(elapsedHours / 24) * 1
currentPrice = max(floorPrice, startPrice - drop)     // integer dollars
stealPct     = round((1 - currentPrice / retailPrice) * 100)
nextDropEpoch(now) = ceil(now / 3600000) * 3600000    // top of UTC hour, epoch-based
secondsToNextDrop  = (nextDropEpoch - now) / 1000
```
Rules: price is NEVER client-trusted — client counts down, never computes. `floorPrice` never
leaves the server: the public `PricedListing` type omits it and carries `atFloor: boolean` instead;
UI shows only the literal text `floor hidden` (or `FLOOR HIT — this is the lowest` when atFloor).
All seed `listedAt` values hour-aligned UTC so every listing's drop lands exactly on the global :00
tick. Header ticker always reads `GLOBAL DROP −$1` (STANDARD-rate display convention); per-listing
DROP BOX uses the listing's own rate.

### Key component measurements (from the prototype, verbatim)
- **Screen padding**: top `60px 16px` or `60px 18px` (notch reserve); scroll bodies `12-14px 16px 20px`; grid gap 10px; chip gap 6-7px.
- **Ticker bar**: radius 12px; border 1px `color-mix(in oklab, var(--acc) 35%, transparent)`; bg color-mix 7%; padding `9px 12px 10px`; left = 6px pulsing accent dot + `GLOBAL DROP −$1` Mono 700 9.5px ls 1.2px in var(--acc); right = MM:SS Mono 700 12px ls 1px, tabular-nums, reserved width; below = 3px track rgba(237,235,228,.1) with accent fill width = elapsed fraction of hour.
- **Card grid tile** (Rack/Search/Closet, identical): width `calc(50% - 5px)`; image aspect-ratio 3/4 radius 14px object-cover; spot-dot top-right 27px circle `rgba(12,12,14,.55)` + `backdrop-blur(6px)` around a 9px dot (accent when spotted); steal chip bottom-left inset 8px, accent bg, var(--on-acc) ink, Mono 700 9.5px, padding 3px 8px, radius 999px, `-{N}%`; below: Archivo 15px `${price}` + Mono 9px struck `${retail}` + `↓$1/hr` (or `↓$2/hr` TURBO, or `AT FLOOR`) pushed right via margin-left:auto; Grotesk 11.5px title; Mono 8.5px rgba(.4) `brand · size · N SPOTS`.
- **Deck**: container margin `4px 22px 12px`; next card absolute inset `14px 10px -6px` opacity .45 `scale(.95) translateY(10px)`; top card inset 0 radius 20px shadow `0 18px 44px rgba(0,0,0,.45)`; scrim `linear-gradient(transparent, rgba(10,10,12,.88))` padding `40px 16px 16px`.
- **Tab bar**: 5 slots; padding `9px 10px 24px` (24px = home indicator); top border rgba(237,235,228,.08); bg `rgba(10,10,12,.94)`; pure-CSS icons — RACK 2x2 grid of 7px squares, FITS border-triangle play, SPOT 16px ring + 4px core, CLOSET 13x16 rounded rect + dot; center 47px accent FAB `margin-top:-16px` + accent glow, links /sell; labels Mono 700 7.5px ls 1.5px; active map: `/`, `/search`, `/item/*`, `/checkout`, `/orders/*`, `/irl` → RACK; `/inbox/*` → inbox.
- **Chips, 3 variants only**: (1) filter/trending pill — radius 999, Mono 700 9px ls 1px, padding 6px 12px; selected = accent bg + #0C0C0E ink; unselected = 1px rgba(237,235,228,.14) border + rgba(.6) text. (2) option card — radius 10-12px, value line + caption at opacity .7 (sizes, offer amounts, drop speed, shipping). (3) shop-the-look — radius 10px, 26x32 thumb + price stack, horizontal overflow-x row.
- **Buttons**: primary = accent pill, Mono 700 11px tracked, var(--on-acc) ink; secondary = 1.5px outline pill.
- **Brand**: no emoji anywhere; the only mark is the char `●` as in `SPOTTED●`. ★ is allowed for ratings, ✕ for the deck DROP glyph. Copy voice lowercase-cool, terse (e.g. `buy now or gamble it drops`, `nothing spotted yet — hit the deck ●`).
- Every prototype `style-hover` becomes a real `:hover` rule; every interactive control gets `aria-label` + visible `:focus-visible`.

---

## 5. ROUTE MANIFEST — this table IS the definition of "all screens shipped"

| # | Route | Sentinel string | Required UI elements |
|---|-------|-----------------|----------------------|
| 1 | `/` The Rack | `GLOBAL DROP` | SPOTTED● wordmark; IRL + inbox icon buttons; DropTicker (+ `EVERYTHING JUST DROPPED` flash at :00); search pill → /search; category chips ALL/OUTERWEAR/TOPS/BOTTOMS/SHOES/BAGS; closet-drop invite banner; 2-col ListingTile grid (10 seed + local creations) |
| 2 | `/deck` Spot or Drop | `tuned to` | Card stack with peeking next card; ✕ DROP / ● SPOT buttons + drag-swipe; outL/outR exit; deck signals recorded; size+budget pre-filter |
| 3 | `/fits` | `SHOP THE LOOK` | Full-bleed vertical feed; video (or Ken-Burns stand-in); progress bar bound to playback; FOLLOW chip; caption; shop-the-look chips → /item; share/spots rail; prev/next tap zones |
| 4 | `/irl` Spotted IRL | `MATCHES ON THE RACK` | Viewfinder (18px radius, corner brackets) + shutter; snapped state with match-% rows; POST WANTED; SNAP ANOTHER |
| 5 | `/search` | `GORPCORE` | Input; TRENDING tags exactly Y2K, SAMBA, CARPENTER, LEATHER MOTO, 90s NIKE, GORPCORE; live-filtered tile grid |
| 6 | `/item/[id]` | `floor hidden` | Carousel + back/spot overlays; `-N% UNDER RETAIL` chip; big price + struck retail; DROP BOX (`NEXT DROP −$N IN MM:SS`, `floor hidden` / `FLOOR HIT`, countdown bar, watchers); meta line; seller card; sticky MAKE OFFER / BUY $N; OfferSheet (chips -10/-15/-20, stepper, `sellers accept 71% of offers within -15%`) |
| 7 | `/sell` | `0% SELLER FEES FOREVER` | 3 steps (photos / details / price+DROP SPEED) + earnings box + START THE DROP; success `YOU'RE LIVE.` + Fit Card + SHARE / VIEW CLOSET |
| 8 | `/inbox` | `offers auto-expire in 24h` | Thread rows with unread dots; expiry note line |
| 9 | `/inbox/[thread]` | `STILL DROPPING` | Pinned item card with live price; bubbles; offer card with sent/accepted/declined/EXPIRED states → `CHECKOUT AT $N`; composer |
| 10 | `/checkout` | `ON US` | Item row DROP PRICE / OFFER LOCKED; address; Tracked $4.99 / Express $9.99; pay selector; `BUYER FEES — $0 ON US`; PAY → `COPPED.` + Steal Receipt (+ /api/share/receipt PNG) + SHARE RECEIPT / TRACK ORDER |
| 11 | `/orders/[id]` | `MESSAGE SELLER` | Order no / carrier / ETA; map region block; 5-step timeline done/active-pulse/next; MESSAGE SELLER |
| 12 | `/closet` | `nothing spotted yet` (empty) / `WRAPPED` | Accent-ring avatar; handle; SAVED $ / SPOTS / LISTED; Wrapped card; CLOSET\|SPOTTED tabs; `● LIVE · DROPS MM:SS` tiles; `+ list something` |
| 13 | `/landing` | `catch them first` | THE one full-width route (max-width 560px column on #0A0A0C): wordmark, tagline, waitlist email capture. Everything else lives in the 430px shell |

Plus non-screen routes: `/api/listings` (truth endpoint), `/api/cron/hourly` (secret-gated no-op),
`/api/share/receipt/[orderId]`, `/api/share/fit/[listingId]` (ImageResponse PNGs), `sitemap.xml`,
`opengraph-image`.

---

## 6. ROLLBACK & SAFETY

**www.spottedin.co / apex must never break. What guarantees it:**
1. The apex→www 301 is produced by GitHub Pages itself (repo CNAME file), NOT a GoDaddy forwarding
   rule — verified. There is no registrar-side behavior to reproduce.
2. Before the NS flip, Cloudflare's zone is reconciled line-by-line against the human-exported
   GoDaddy zone (A2/A3); apex A x4 (185.199.108-111.153) and `www CNAME palle017.github.io` are
   recreated byte-identical, **grey-cloud**. During and after delegation, both nameserver sets serve
   identical answers → zero downtime by construction.
3. No step in this plan writes to, deletes, or proxies the apex A records or the www CNAME. The only
   record ever created is `CNAME b`, and only after zone Active + conflict check.
4. www/apex stay grey-cloud permanently in this plan (orange blocks GitHub's HTTP-01 cert
   validation). The pre-existing broken www HTTPS is a GitHub cert-issuance problem, explicitly NOT
   touched during migration (would confound diagnosis) — logged as a separate post-launch task.
5. The GoDaddy zone contents are left intact for ≥1 week.

**Rollback procedures:**
- **Roll back the entire DNS move:** GoDaddy → Nameservers → restore `ns43/ns44.domaincontrol.com`.
  The old zone is untouched and correct; the site returns to exactly today's state. Trigger: zone not
  Active after 72 h, or any unexplained www breakage attributed to the move.
- **Roll back b.spottedin.co only:** delete the `b` CNAME (one API call / one dashboard click) and
  remove the domain from the Vercel project. Nothing else references it. The app remains live on the
  vercel.app URL.
- **Roll back a bad deploy:** Vercel dashboard → Deployments → "Promote to Production" on the last
  good deployment (instant), or `git revert` + push. After 3 consecutive failed production builds,
  Opus stops pushing and escalates with the build log.
- **Never do:** orange-cloud any record in this zone during this plan; SSL mode "Flexible" ever;
  delete GoDaddy records inside the first week; touch the `Palle017/spottedin` repo at all.
- **Registrar reality:** GoDaddy remains registrar and billing owner — only DNS hosting moves. A
  lapsed renewal kills everything regardless of this plan; auto-renew confirmed in A2.

---

## 7. ACCEPTANCE CHECKLIST — "live and done" (each line requires machine evidence)

Restated from the spec's 7 items for the owner-decided target (b.spottedin.co; apex/www remain the
untouched fallback). Items 4 and 5 are PASS-WITH-STUB by owner decision (localStorage persistence,
mock payments) — recorded, never silently dropped.

| # | Check | Mechanical evidence required |
|---|-------|------------------------------|
| 1 | Prices visibly drop at the top of the (UTC) hour; countdown accurate; floors respected | `verify-prices.mjs` exit 0 vs production + the P3.2 XX:59/XX:01 diff table showing exact per-rate deltas and unchanged floor-clamped listings; `just-dropped` element observed |
| 2 | Every price shows steal % + struck retail; `0% SELLER FEES FOREVER` on /sell step 3; `BUYER FEES — $0 ON US` on /checkout | Rendered-HTML greps on production for both strings; screenshot of a rack tile showing `-N%` chip + struck retail |
| 3 | Deck swipe AND buttons both work; SPOT appears under /closet SPOTTED with the alert dot | Playwright J2 exit 0 |
| 4 | Offer → accept → `CHECKOUT AT $N` → payment → Steal Receipt renders + downloads | Playwright J3 exit 0 incl. 200 on `/api/share/receipt/<id>` PNG. **PASS-WITH-STUB: mockPay stands in for Stripe test mode; Stripe is a DEPLOY.md activation** |
| 5 | Sell flow creates a live listing that starts dropping; Fit Card exports | Playwright J4 exit 0 (rack 10→11, hour-aligned listedAt, live countdown) + 200 on `/api/share/fit/<id>`. **PASS-WITH-STUB: listing is client-local until Supabase** |
| 6 | Lighthouse mobile ≥ 90 performance AND ≥ 90 accessibility; fonts via next/font; zero layout shift from the ticker | Lighthouse JSON scores for `/` and `/item/<id>`; CLS < 0.02 with 0 attributed to DropTicker; `grep -c fonts.googleapis` == 0 |
| 7 | (Restated) `https://b.spottedin.co` resolves with valid TLS; www.spottedin.co unchanged | `curl -sS -o /dev/null -w "%{http_code} %{ssl_verify_result}"` → `200 0`; www DNS answer + body hash identical to pre-migration baseline |

Sign-off: Opus alone declares this table passed, publishes it with the LAUNCH-STATUS note (stubs,
deferred register, GoDaddy one-week reminder), and only then is the plan complete.
