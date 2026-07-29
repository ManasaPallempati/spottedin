# Maanster Market — V1 build contract

Single source of truth for all build agents. Do not deviate from file ownership or interfaces.

## Product
**Maanster Market** — Depop/Poshmark-style resale marketplace for India. V1 is a
production-quality web MVP with seeded demo data. Prices in ₹.
Authentication rollout is email/password via Supabase with mandatory email
confirmation, recovery, RLS-protected public profiles, cloud-backed listings,
and public listing-photo storage with owner-only writes. When Supabase is not
configured for local development, the app uses clearly labeled browser-local
email/password and marketplace demo data. Demo passwords are salted PBKDF2
hashes in localStorage — demo only, not production security. Phone OTP is
deferred.
Tagline: "Pre-loved. Re-loved."

## Stack & conventions
- Vite + React 18 + TypeScript, `HashRouter` from react-router-dom v6.
- No UI library — hand-rolled components with CSS custom properties (tokens below).
- All state through the data layer (`src/data/store.ts`). Components never touch
  localStorage directly.
- Mobile-first (this previews an iOS app); must also look good at desktop width
  (max content width 480px, centered, app-frame feel with subtle shadow).

## Design tokens (src/styles/tokens.css — scaffold owns)
--bg:#FAFAF7  --surface:#FFFFFF  --ink:#131313  --ink-soft:#6B6B6B
--accent:#7C3AED (violet, primary actions)  --accent-2:#E11D48 (rose, prices/badges)
--lime:#A3E635 (success/"sold" pops)  --radius:14px  --radius-sm:8px
Font: system stack, headings 700 tight tracking. Bottom tab bar: Home, Sell (center,
accent circle), Inbox, Profile.

## Data model (src/data/types.ts — scaffold owns)
Seller { id, handle, name, avatarEmoji, bio, city, rating (0–5), sales:number }
Listing { id, sellerId, title, description, priceINR:number, category:
  'women'|'men'|'sneakers'|'electronics'|'home'|'vintage', size?:string,
  condition:'new'|'like-new'|'good'|'fair', imageKind:'gradient', gradient:[string,string],
  emoji:string, photoDataUrl?:string, likes:number, status:'live'|'sold', createdAgo:string }
Thread { id, listingId, peerId, messages: Msg[] }   Msg { from:'me'|'peer', text, timeAgo }
Order { id, listingId, status:'placed', payMethod:'upi'|'card'|'cod' }

## Data layer API (src/data/store.ts — scaffold owns)
getFeed(filter?:category), getListing(id), getSeller(id), getSellerListings(id),
toggleLike(id), createListing(input):Listing (persists to localStorage, prepends to feed),
getThreads(), getThread(id), sendMessage(threadId,text) (peer auto-replies after 1.2s
from a small canned pool), placeOrder(listingId,payMethod):Order,
auth: getUser(), registerUser(input) (local demo; validates + dedupes email/handle,
creates a Seller profile, persists session), loginWithPassword(email, password),
updateMyProfile(input) (owned profile only), logout(). Supabase mode uses
AuthProvider plus `src/data/profiles.ts`; see `AUTH_ROLLOUT.md`. Seeded content in src/data/seed.ts (scaffold owns): 12 sellers, 24 listings —
India-flavored resale items (banarasi saree, cricket jersey, Air Jordans, lehenga, vintage
film camera, kurta set, PS5 controller, brass diya set, denim jacket, mechanical keyboard,
silk dupatta, sneakers…), realistic ₹ prices (299–24999), each with a distinct two-stop
gradient + emoji as its product visual. 4 seeded DM threads with 3–6 messages each.

## Product visuals
No external image hotlinks. Listing cards render a gradient tile (listing.gradient) with a
large centered emoji — deliberate, cohesive "drop card" aesthetic. User-created listings
use uploaded photo (FileReader → dataURL, stored via createListing).

## File ownership (parallel agents MUST stay in their lane)
- Scaffold agent: vite config, index.html, main.tsx, App.tsx (router + all routes +
  bottom nav shell), tokens.css/global css, types.ts, store.ts, seed.ts, shared
  components (ListingCard, Avatar, PriceTag, TopBar, EmptyState), stub files for every
  screen below (export default placeholder), .github/workflows/deploy.yml, .gitignore, README.md.
- Agent FEED: src/screens/Feed.tsx (category chips, 2-col masonry-ish grid, like hearts),
  src/screens/ListingDetail.tsx (visual, price, condition/size, seller strip → profile,
  Like / Message seller (creates/opens thread) / Buy now → checkout).
- Agent SELLER: src/screens/SellerProfile.tsx (header, rating, grid of their listings),
  src/screens/CreateListing.tsx (photo upload w/ preview, title, desc, category, size,
  condition, ₹ price → createListing → navigate to new listing, confetti-free success toast),
  src/screens/Login.tsx (email login / create-profile / confirmation / recovery).
- Agent CHECKOUT: src/screens/Checkout.tsx (order summary, payment method picker styled
  like Razorpay sheet: UPI apps row / card / COD, place order → OrderSuccess state with
  order id; "Payments by Razorpay — sandbox" note).
- Agent INBOX: src/screens/Inbox.tsx (thread list w/ listing thumb + last msg),
  src/screens/Chat.tsx (bubble thread, composer, auto-reply, "Make offer" quick chip
  that sends an offer message).
- Agent CLAW: src/claw/ClawPanel.tssx→ClawPanel.tsx + src/claw/claw.css. Spec: floating
  right-edge tab "🔧 TardBot" + slide-in panel (min(420px,100vw)) iframing
  `http://127.0.0.1:18789` (const OPENCLAW_URL at top of file). Hidden unless
  localStorage["maanster.claw"] === CLAW_KEY or URL contains ?claw=<CLAW_KEY> (then persist
  to localStorage and clean the param). CLAW_KEY = "maanster-claw-9481". Panel header:
  "OpenClaw — full instance · delegates to Claude & Codex", buttons: open-in-new-tab,
  close. If iframe fails to load in 4s show fallback card with the open-in-new-tab button
  and note "Gateway is local-only: reachable on Tony's machine". Mounted once in App.tsx
  (scaffold leaves a `{/* CLAW_MOUNT */}` marker + import already stubbed).

## Acceptance criteria (integration agent verifies ALL)
1. `npm run build` exits 0, no TS errors.
2. `vite preview` serves; every route renders non-empty: #/ , #/listing/:id, #/seller/:id,
   #/sell, #/checkout/:id, #/inbox, #/chat/:id, #/login.
3. Create-listing round-trip: created item appears at top of feed after reload.
4. ClawPanel invisible by default; visible with ?claw=maanster-claw-9481.
5. Lighthouse-obvious basics: page title "Maanster Market", meta description, favicon
   (inline SVG emoji 🛍️), theme-color.

## Deploy (deploy agent)
Repo Palle017/maanster-market (public), push main, GitHub Pages via Actions
(deploy.yml = official vite build→pages flow, base '/maanster-market/'), verify live URL
returns the app. Custom domain maanster.fixingfortmyers.com is a later DNS flip — do NOT
set it yet.

## Hub entry (hub agent)
In Palle017/rajindustries-site: inside the existing Maanster section add an entry/card
"Maanster Market — resale marketplace for India (V1 live)" linking to
https://palle017.github.io/maanster-market/ , matching the section's existing markup
style exactly. Commit + push (site is GitHub Pages).
