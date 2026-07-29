# ONE-SHOT PROMPT — Build & deploy "Spotted" to spottedin.co

Paste everything below this line to your OpenClaw instance (tardbot). The two files in this folder (`Spotted App.dc.html`, `ios-frame.jsx`) are the design reference — attach them too.

---

## Mission

You are **tardbot**, running on OpenClaw. Build **Spotted** — a GenZ resale fashion marketplace ("prices fall every hour") — and deploy it live to **spottedin.co** (domain already owned). Work in one shot: scaffold, implement Phase 1 fully, scaffold Phase 2/3, deploy, and output the DNS records I need to set.

## Orchestration (how to run this job)

- **Opus orchestrates.** Run the top-level session on Claude Opus as the orchestrator: it owns the overall plan, sequencing, reviews, and the final acceptance pass. It does not grind through file-by-file edits itself.
- **Delegate the code-execution plan to `fable`.** Fable turns this spec into the concrete execution plan — repo layout, task DAG, migration order, which tasks parallelize — and drives implementation subagents through it. Opus reviews fable's plan against this spec BEFORE any code is written, then again at each phase gate (scaffold → screens → mechanics → deploy).
- Subagents report back to fable; fable reports state to opus; opus is the only one who declares the acceptance checklist (bottom of this doc) passed.
- If any instruction here conflicts with what an agent wants to do, this spec wins. No scope inventions, no stack swaps, no asking me mid-run — make the documented choice and log it.

## About the attached design files

`Spotted App.dc.html` is a **high-fidelity HTML prototype** (with `ios-frame.jsx`, a device-frame helper). It is a design reference, NOT production code — do not copy its markup. Recreate the screens pixel-faithfully in the target stack below. Everything inside the phone frame is the product; the flow map / UX notes around it are annotations for you, not UI to build. Striped blocks labeled `[ like this ]` are image placeholders — use real listing photos (seed with tasteful stock/product photos on solid backgrounds until real inventory exists).

## Stack (no debate, just build)

- **Next.js (App Router) + TypeScript + Tailwind**, deployed on **Vercel**
- **Supabase**: Postgres, Auth (email magic link + Apple/Google), Storage (listing photos), Realtime (chat)
- **Stripe** in test mode (Checkout + Connect scaffold for seller payouts)
- Fonts via `next/font/google`: **Archivo Black** (display), **Space Grotesk** (UI), **Space Mono** (meta/labels)
- Mobile-first: app renders as a full-bleed mobile app ≤480px; on desktop, center the app shell at 430px wide on the page background (#0A0A0C) — this is a phone-native product, don't invent a desktop layout

## Design tokens (exact — hifi, match precisely)

- Background page/app: `#0A0A0C` / screen `#0E0E11`
- Surfaces: card `#17171B`, elevated `#1D1D22`, hairline `rgba(237,235,228,.09)`
- Text: primary `#EDEBE4`, muted `rgba(237,235,228,.5)`, dim `rgba(237,235,228,.35)`
- **Accent: `#D9FF3D` (acid lime) — default.** Alt candidate `#53E9FF` (cyan) — I was previewing this; implement accent as a single CSS variable `--acc` so it's a one-line swap. Text on accent: `#0C0C0E`
- Radii: cards/images 14px, inputs 12px, sheets 22px (top corners), buttons/chips fully rounded (999px)
- Type: display = Archivo Black (30/24/20/17px, +0.5 tracking); UI = Space Grotesk 400–700 (11–13px); meta = Space Mono 700, 8.5–10px, UPPERCASE, 1–2px letter-spacing
- Motion: screens fade+rise 300ms `cubic-bezier(.16,1,.3,1)`; bottom sheets slide up 320ms; live dots pulse 1.4–1.6s; deck cards fly out ±130% with ±10° rotation, 300ms
- Buttons: primary = accent pill, Space Mono 700 11px tracked; secondary = 1.5px outline pill
- No emoji anywhere. Dot `●` is the brand mark: `SPOTTED●`

## The signature mechanics (this IS the product)

1. **Hourly Global Drop** — every listing's price falls on the hour, in sync, until it hits the seller's hidden floor. Server-computed, never client-trusted: `price = max(floor, startPrice - hoursSince(listedAt) * rate)` where rate comes from drop speed: CHILL −$1/day, STANDARD −$1/hr, TURBO −$2/hr. App header shows a live `GLOBAL DROP −$1 · MM:SS` countdown to the top of the hour + progress bar; at :00 flash "EVERYTHING JUST DROPPED" and refresh prices.
2. **Steal Meter** — every card shows `−N%` vs retail (`retailPrice` field, seller-entered v1, labeled "verified" only when set from our retail archive later). Strikethrough retail everywhere the price appears.
3. **Spot Deck** — full-screen card stack, ✕ DROP / ● SPOT buttons + swipe gestures. SPOT = save + price-drop alerts; DROP trains taste (store signal). Deck pre-filtered to user's size + budget.
4. **Fits** — vertical shoppable video feed (TikTok grammar): autoplaying muted loop, progress bar, right-rail actions, `SHOP THE LOOK` chips deep-linking to listings. v1: seed 3–5 videos, upload via Supabase storage.
5. **Spotted IRL** — camera/upload screen: snap a fit you saw → v1 returns visually-similar live listings (stub with tag-based matching; wire pgvector/CLIP later) → no match auto-creates a public WANTED post.
6. **0% fees** — seller fees $0 (say "0% SELLER FEES FOREVER" on the sell flow), buyer fee line `BUYER FEES — $0 ON US` at checkout.
7. **Share loops**: Steal Receipt (post-purchase card: PAID / RETAIL / SAVED $N (−N%)), Fit Card (auto poster on listing success), monthly Wrapped (stats card), Drop Invites (closet-drop early access for inviting 2 friends). All rendered as 1080×1920 og-image/canvas exports with the `SPOTTED●` mark.

## Screens & routes (all 12 are in the prototype — match them)

- `/` **The Rack** (home): logo, IRL + inbox icons, Global Drop ticker bar, search pill, category chips (ALL/OUTERWEAR/TOPS/BOTTOMS/SHOES/BAGS), closet-drop invite banner, 2-col grid: photo, spot toggle (dot), `−N%` chip, `$price` + struck retail + `↓$1/hr`, title, brand · size · spots
- `/deck` **Spot or Drop**: card stack, next card peeking behind, drop/spot buttons, "tuned to" line
- `/fits` **Fits feed**: full-bleed video, progress bar, FOLLOW chip, caption, shop-the-look chips, share/spots rail
- `/irl` **Spotted IRL**: viewfinder w/ corner brackets, shutter; results list `N MATCHES ON THE RACK` with match %, `POST WANTED` / `SNAP ANOTHER`
- `/search`: input, TRENDING tags (Y2K, SAMBA, CARPENTER, LEATHER MOTO, 90s NIKE, GORPCORE), live-filtered grid
- `/item/[id]`: photo carousel, back/spot overlays, `−N% UNDER RETAIL` chip, big price + struck retail, **drop box** (NEXT DROP −$1 IN MM:SS · FLOOR $N hidden→ show only "floor hidden", countdown bar, "N others watching"), title, meta line (brand · size · cond · era), watching/spots pulse line, description, seller card (avatar, ★rating, sales, replies-in, ASK), sticky MAKE OFFER / BUY $N
- Offer bottom sheet: asking price, −10/−15/−20% quick chips, ± stepper, "sellers accept 71% of offers within −15%", SEND OFFER
- `/sell` 3 steps + success: (1) 4 photo slots, "first photo = cover", AI bg-removal note; (2) title, brand, size chips, condition chips; (3) start price + floor inputs, DROP SPEED picker (CHILL/STANDARD/TURBO), `YOU EARN $N — 0% SELLER FEES FOREVER` box, START THE DROP; success = "YOU'RE LIVE." + Fit Card preview + SHARE FIT CARD / VIEW CLOSET
- `/inbox`: thread list w/ unread dots, "offers auto-expire in 24h"
- `/inbox/[thread]`: pinned item context card (price + STILL DROPPING), bubbles, **offer card** (YOUR OFFER $N → status → on accept, `CHECKOUT AT $N` button), composer
- `/checkout`: item row (DROP PRICE or OFFER LOCKED tag), address, speed (Tracked $4.99 / Express $9.99), Apple Pay/card, totals with `BUYER FEES $0 — ON US`, PAY; success = "COPPED." + Steal Receipt card + SHARE RECEIPT / TRACK ORDER
- `/orders/[id]` tracking: order#, carrier, ETA, live map region, 5-step timeline (done/active-pulse/next), MESSAGE SELLER
- `/closet` profile: avatar w/ accent ring, handle, stats (SAVED $ / SPOTS / LISTED), **Wrapped** accent card ("N STEALS · $N SAVED", TOP ERA/TOP COP, SHARE), CLOSET/SPOTTED tabs, closet grid shows `● LIVE · DROPS MM:SS`, + "list something" tile
- Bottom tab bar: RACK (grid icon) · FITS (play) · center accent `+` FAB · SPOT (target) · CLOSET (door), Space Mono 7.5px tracked labels

## Data model (Supabase)

`users` (handle, avatar, rating, sizes, budget_min/max) · `listings` (seller_id, title, brand, size, condition, era, category, retail_price, start_price, floor_price, drop_rate, listed_at, status, photos[]) · `spots` (user↔listing, drop alerts) · `deck_signals` (user, listing, spot|drop) · `offers` (listing, buyer, amount, status: sent/accepted/declined/expired, expires_at 24h) · `threads`/`messages` (type: text|offer, realtime) · `orders` (listing, buyer, price_paid, shipping_option, status, tracking events[]) · `fits` (video_url, caption, look listing_ids[]) · `wanted_posts` (photo, tags) · `waitlist` (email). Compute price/steal% in one shared server util. Cron (Vercel) on the hour: notify spotters of drops, expire offers.

## Seed data

Seed the 10 prototype listings (titles/brands/sizes/prices/floors are in the HTML: Y2K MOTO JACKET $88/fl58/ret260, FADED 501s, 90s WINDBREAKER, NYLON MINI BAG, 1461 LOAFERS, KNIT ZIP POLO, PARACHUTE CARGOS, '96 TOUR TEE, PUFFER VEST, SAMBA OG), 4 sellers (@mara.vintage ★4.9·238, @thriftgod ★4.8·91, @y2kcloset ★5.0·412, @rackrat ★4.7·56), 3 fits, 1 offer thread.

## Phasing (one shot = Phase 1 complete + 2/3 scaffolded)

- **Phase 1 (ship now):** all 12 screens live with seed data, real hourly-drop pricing, spots/deck/search working against the DB, sell flow writes real listings (auth required), chat + offers working via Supabase realtime, checkout in **Stripe test mode**, waitlist capture on a minimal `/landing` for logged-out desktop visitors, og-image share cards, deployed at spottedin.co.
- **Phase 2:** real payouts (Stripe Connect), shipping labels (EasyPost/Shippo), push notifications, retail-archive verification.
- **Phase 3:** CLIP similarity for IRL, video pipeline for Fits, Wrapped generation job, drop-invite gating.

## Deploy (do it, don't ask)

1. Vercel project, production branch, env vars documented in `.env.example`.
2. Add domain `spottedin.co` + `www` in Vercel; **output for me:** the exact DNS records to set at my registrar (A `76.76.21.21` for apex, CNAME `cname.vercel-dns.com` for www — confirm against Vercel's current instructions), and redirect www → apex.
3. HTTPS, sitemap, favicon (● on #0A0A0C), OG tags ("SPOTTED — prices fall every hour. catch them first.")

## Acceptance checklist (verify before you finish)

- [ ] Prices visibly drop at the top of the hour, countdown accurate, floor respected
- [ ] Every price shows steal % + struck retail; $0 fee lines at sell + checkout
- [ ] Deck swipe + buttons both work; SPOT appears in Closet→SPOTTED with alerts on
- [ ] Offer: send → accept → CHECKOUT AT $N → Stripe test payment → Steal Receipt renders + downloads
- [ ] Sell flow creates a live listing that starts dropping; Fit Card exports
- [ ] Lighthouse mobile ≥ 90 perf/a11y; fonts loaded via next/font; zero layout shift on ticker
- [ ] spottedin.co resolves with valid TLS

Match the prototype's copy voice everywhere: lowercase-cool, terse, zero emoji ("buy now or gamble it drops", "nothing spotted yet — hit the deck ●").
