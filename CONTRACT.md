# Spotted — build contract (spottedin-c)

Spotted is a Depop-style resale marketplace for India. This repo is the mobile-first web
UI. Every screen below was specced from reference screenshots of the layout we are
matching. Match the layout and visual system exactly; all branding, copy, and imagery are
Spotted's own ("Spotted" wordmark, ₹ prices, original placeholder photos). Never use the
word "Depop", its logo, or its imagery anywhere in this repo.

## Stack & commands

- Vite 5 + React 18 + TypeScript, `react-router-dom` (HashRouter), `lucide-react` icons.
- Hand-rolled CSS (plain .css files, CSS variables). No Tailwind, no UI kits.
- Only deps allowed: `react`, `react-dom`, `react-router-dom`, `lucide-react`,
  `@supabase/supabase-js` (+ dev: vite, @vitejs/plugin-react, typescript, @types/react,
  @types/react-dom). NO OTHERS.
- Verify with `npx tsc --noEmit` (screen agents) and `npm run build` (integrate agent).
- Vite `base: './'` so GitHub Pages works.

## App shell

- Mobile-first: content column `max-width: 430px; margin: 0 auto; min-height: 100dvh`.
  On desktop the column sits centered on a `#111` page background.
- Dark theme is the default (Home, Discover, Sell, Inbox, Profile). Onboarding screens
  are light — they set `class="light"` on their page root and use light tokens.
- Font: `Archivo` from Google Fonts (weights 400–900) loaded in `index.html`, fallback
  `system-ui, -apple-system, sans-serif`. Headlines are 700–800 weight, slightly tight
  letter-spacing (-0.02em).

## Design tokens (src/styles/global.css)

```css
:root {
  --bg: #000;              /* app background */
  --surface: #1c1c1e;      /* pills, cards, nav */
  --surface-2: #2c2c2e;    /* pressed / secondary surface */
  --text: #fff;
  --text-dim: #9c9c9c;
  --hairline: #2a2a2a;
  --accent: #ff2300;       /* Spotted red — promos, badges */
  --promo-olive: #57492f;  /* home promo strip */
  --success: #1f7a3d;      /* "New" pill */
  --radius-pill: 999px;
  --radius-card: 12px;
}
.light {
  --bg: #fff; --surface: #f2f2f2; --surface-2: #e5e5e5;
  --text: #1a1a1a; --text-dim: #6b6b6b; --hairline: #d9d9d9;
}
```

## Shared components (built by scaffold, owned by scaffold)

- `src/components/BottomNav.tsx` — floating pill nav, `position: fixed; bottom: 12px`,
  centered, width `calc(100% - 24px)` capped at 406px, bg `--surface`, radius 999px,
  subtle shadow. Five items: Home (House icon), Discover (Search), Sell (Plus),
  Inbox (Mail), My Spotted (User). Icon 24px above 11px label. Active item: white icon +
  label inside a slightly lighter rounded highlight; inactive: `--text-dim`.
  Hidden on `/sell` and `/onboarding/*` routes.
- `src/components/SearchBar.tsx` — pill input, bg `--surface`, Search icon left,
  Camera icon right, placeholder "Search for anything". Right of it a separate capsule
  (bg `--surface`, radius 999) holding Heart and ShoppingBag icon buttons. Props:
  `{ rightIcons?: React.ReactNode }` to swap the capsule contents.
- `src/components/Chip.tsx` — pill chip. Props `{ label, selected?, onClick? }`.
  Outline 1px `--hairline` default; selected = solid fill (white-on-black in dark,
  black-fill white-text in light).
- `src/components/ProductCard.tsx` — square image (rounded 8px, `object-fit: cover`,
  bg `--surface` while loading), Heart button top-right overlaid with like count in
  white 13px below the icon. Under the image, left-aligned 14px lines: brand, size,
  then bold price `₹1,499` with optional struck-through original price in `--text-dim`.
- `src/data/mock.ts` — types + data:
  ```ts
  export type Listing = { id: string; brand: string; size: string; price: number;
    originalPrice?: number; likes: number; img: string }
  export const user = { name: 'Manasa', handle: 'manasa', initials: 'MP' }
  ```
  16 listings, brands like Levi's, Nike, Zara, H&M, Carhartt, Polo Ralph Lauren, FabIndia,
  Adidas; sizes S–XL; prices ₹399–₹4,999 (a few with originalPrice + likes 5–80).
  Images: `https://picsum.photos/seed/spotted-<n>/600/600`.

## Routes (HashRouter, wired by scaffold with stub pages)

| Route | File | Theme |
|---|---|---|
| `/` | src/pages/Home.tsx | dark |
| `/discover` | src/pages/Discover.tsx | dark |
| `/sell` | src/pages/Sell.tsx | dark, no BottomNav |
| `/inbox` | src/pages/Inbox.tsx | dark |
| `/profile` | src/pages/Profile.tsx | dark |
| `/onboarding/sizes` | src/pages/onboarding/Sizes.tsx | light, no BottomNav |
| `/onboarding/brands` | src/pages/onboarding/Brands.tsx | light, no BottomNav |

First visit (no `localStorage.spotted_onboarded`): `/` redirects to `/onboarding/sizes`.
"See my feed" / both Skip buttons set the flag and go to `/`.

## Screen specs — match these exactly

### Home (`/`)
Top: SearchBar row (heart + bag capsule right). Below, a full-width promo strip, bg
`--promo-olive`, centered two lines: bold 16px "Free shipping on your first order",
13px "No minimum spend. Ends Aug 5. T&Cs apply". Then 24px bold greeting
"Hey {user.name}!", then 16px regular "Tap into a few items to unlock better picks".
Then a 2-column grid (8px gap) of ProductCards using all mock listings. Grid scrolls
under the floating nav; add bottom padding ~96px.

### Discover (`/discover`)
SearchBar row. Hero carousel: horizontally scroll-snapped full-width cards
(aspect ~3:4 capped at 55vh, image cover, bottom gradient overlay) with centered
overlay near the bottom: 28px bold title ("The Summer Edit", "Campus Fits",
"Y2K Revival"), 15px "Shop the edit" below, and 3 dots (active white, rest 40% white)
under the text. Use picsum seeds `spotted-hero-1..3`.
Below: a rounded-16px card (1px `--hairline` border, 16px padding) — header row: 22px
bold "Discover your next look" + small green pill "New"; body 15px `--text-dim`:
"Get inspired by outfits styled by the Spotted community and shop the pieces you love.";
then 3 outfit collages in a row (each: light-pink `#f6e7ef` rounded card, a 2×2 grid of
small product images from mock data, ~4px inner gaps); then full-width outline pill
button "Browse outfits".
Then 22px bold "Shop by category" and list rows Men / Women / Kids /
Everything else — 17px text, ChevronRight, 1px `--hairline` separators, ~56px tall.

### Sell (`/sell`)
Full-screen splash, no nav. Background: picsum seed `spotted-rack` covering the top
~60%, fading into black via gradient; bottom 40% solid black. Top overlay: four thin
(3px) progress bars in a row — first solid white, rest 35% white; X (close) top-right
returns to `/`. Bottom-anchored text block, left-aligned, 20px side padding:
13px bold "Selling on Spotted"; 40px/1.05 800-weight headline "Keep your cash — no
selling fees"; 14px "Standard payment processing fees still apply."; spacer; 13px
"By continuing you agree to our Terms of Service." (bold "Terms of Service");
centered 16px bold "Set up as a business"; full-width white pill button (52px tall,
black 17px bold text) "Start selling".

### Inbox (`/inbox`)
Header row: centered 22px bold "Inbox"; right capsule with SlidersHorizontal + Bell
icons. Chip row (10px gap): All / Messages / Selling / Buying — "All" selected
(white fill, black text), rest outlined. Empty state vertically centered: a 96px
rounded-22px blue (#2f7cf6) square with a white chat-bubble shape (CSS/SVG) and a red
`--accent` circular badge "0" on its top-right corner, soft ellipse shadow below;
then 17px `--text-dim` "No messages yet."

### Profile (`/profile`)
Header: centered 22px bold `{user.handle}`; right capsule with Plus + Menu icons.
Tab bar: Shop / Sold / Purchases / Likes — 17px bold, active has 3px white underline,
full-width 1px `--hairline` under the row. Body (16px padding):
Row: 88px white circle with black 24px bold `{user.initials}`, then three stat blocks —
bold 20px "0" over 15px `--text-dim` "followers", same for "following", and a Star icon
over "no reviews". Below: dark pill chip with BarChart2 icon + "Earnings".
Promo banner card (radius 12, overflow hidden, dismissible via X top-right): left 27%
is an image (picsum seed `spotted-flatlay`), right bg `--accent` with white text:
15px bold "Represent Spotted on Campus", 15px "Become a Spotted Campus Manager",
15px bold "Apply today".
Row: 22px bold "Active" + regular "(0 listings)" left; right a 40px rounded-8 outlined
button with SlidersHorizontal icon. Empty state centered: a clothes-rack line
illustration (inline SVG, ~180px: silver rack frame with legs, one wooden hanger
hanging from a small red clip at the center of the rail — draw with strokes, no image
files); 24px bold "No active listings"; 16px "List an item so buyers can discover your
shop."; white pill button "Start selling" → `/sell`.

### Onboarding — Sizes (`/onboarding/sizes`, light)
Top-right "Skip" in a soft `--surface` circle-pill. 34px 800 "Tell us your sizes";
16px "This will help you see items that are more relevant". Tabs "Women's" / "Men's"
(17px bold; active black with 3px black underline; hairline under the row; Men's
default). Scrollable sections with 20px bold headers: **Tops** — chips US 3XS, US XXS,
US XS, US S, US M, US L, US XL, US XXL, US 3XL, US 4XL, US 5XL, US 6XL in a 3-column
grid; **Bottoms** — same letter sizes, then waist chips US 26"–US 61" (every inch);
**Shoes** — US 3, 4, 5, 6, 6.5, 7, 7.5, 8, 8.5, 9, 9.5, 10, 10.5, 11, 11.5, 12, 12.5,
13, 13.5, 14, 14.5, 15, 15.5, 16. Chips are ~52px tall outlined pills, multi-select,
selected = black fill/white text. Women's tab: same letter sections (skip waist
inches). Sticky bottom "Next" pill: `--surface-2` gray + dim text when nothing
selected, black/white when ≥1 chip selected → `/onboarding/brands`.

### Onboarding — Brands (`/onboarding/brands`, light)
Skip top-right. 34px 800 "What brands are you into?"; 16px "Choose brands you actually
love — we'll use them to shape your feed." Search pill (Search icon, placeholder
"Search any brand") filtering the chip cloud. Wrapped flex chip cloud (10px gaps),
~52px pills, multi-select: Adidas, Jordan, Supreme, Polo Ralph Lauren, Ralph Lauren,
Carhartt, The North Face, Nike, Levi's, Wrangler, Louis Vuitton, Burberry,
Harley Davidson, Vans, Chrome Hearts, Palm Angels, Rick Owens, Maison Margiela,
Arc'teryx, Salomon, Moncler, Canada Goose, New Era, Mitchell & Ness, Stone Island,
FabIndia, Sabyasachi, Zara, H&M, Uniqlo. Sticky bottom pill "See my feed" (gray until
≥1 selected, then black) → sets onboarded flag, navigates `/`.

## File ownership (hard rule — never edit outside your set)

| Agent | Owns |
|---|---|
| scaffold | all config, index.html, src/main.tsx, src/App.tsx, src/styles/global.css, src/components/*, src/data/mock.ts, stub pages |
| home | src/pages/Home.tsx, src/pages/home.css, src/components/ProductCard.tsx |
| discover | src/pages/Discover.tsx, src/pages/discover.css |
| sell | src/pages/Sell.tsx, src/pages/sell.css |
| inbox | src/pages/Inbox.tsx, src/pages/inbox.css |
| profile | src/pages/Profile.tsx, src/pages/profile.css |
| onboarding | src/pages/onboarding/* |
| integrate | anything, but only to fix build/type/route errors and visual-consistency bugs |

Screen agents: do not run `npm install` or `npm run build`; verify with
`npx tsc --noEmit` only. Do not modify package.json, App.tsx, global.css, or another
agent's files — if you need a shared change, note it in your report instead.

## Round 1 functionality (added 2026-07-31)

Persistence this round is localStorage only via the shared context below — no Supabase
schema changes. `useListings` (live listings) and the `app_opens` ping are unchanged.

### `src/lib/appState.tsx`

A React context + `<AppStateProvider>` component, wired into `App.tsx` wrapping
`<AppShell>`. State auto-persists to `localStorage` key `spotted_state_v1` on every
change and hydrates on mount.

State shape:

```ts
type AppState = {
  likedIds: string[]
  bag: { listingId: string; addedAt: number }[]
  follows: string[]                      // seller handles
  orders: { id: string; items: { listingId: string; priceInr: number }[]; totalInr: number; placedAt: number }[]
  threads: Record<string, { from: 'me' | 'them'; text: string; at: number }[]>   // keyed by seller handle
  offers: { listingId: string; amountInr: number; at: number }[]
}
```

`useAppState()` returns the state fields above plus:

- `toggleLike(id: string): void`
- `isLiked(id: string): boolean`
- `likeCountFor(listing: Listing): number` — `listing.likes + (isLiked(listing.id) ? 1 : 0)`
- `addToBag(id: string): void`
- `removeFromBag(id: string): void`
- `bagCount: number`
- `follow(handle: string): void`
- `unfollow(handle: string): void`
- `isFollowing(handle: string): boolean`
- `placeOrder(items: {listingId: string; priceInr: number}[]): Order` — clears bag,
  generates id `'SP-' + 6 random alphanumeric chars`, appends to `orders`
- `sendMessage(handle: string, text: string): void` — appends a `'me'` message; after
  ~1.2s auto-appends ONE canned `'them'` reply, cycling per-thread reply count: 1st
  reply "Hi! Yes, it's still available 😊", 2nd "Ships in 2–3 days anywhere in India.",
  3rd+ "Sounds good — feel free to make an offer!"
- `makeOffer(listingId: string, amountInr: number): void` — records the offer AND
  calls `sendMessage(sellerForListing(listingId).handle, 'Offered ₹' + amountInr.toLocaleString('en-IN') + ' for ' + title)`
  (title = the local listing's `brand`, or `'this item'` if the listing isn't in the
  local mock/myListings/mySold set — live Supabase-only listings fall back to that
  generic title). `sendMessage` already fires the auto-reply, so this does not
  double-fire it.

Also exported: `BagItem`, `OrderItem`, `Order`, `ThreadMessage`, `Offer`, `AppState`,
`AppStateContextValue` types.

### `src/data/sellers.ts`

```ts
type Seller = { handle: string; name: string; bio: string; avatar: string; rating: number;
  reviewCount: number; sold: number; followers: number; following: number;
  reviews: { reviewer: string; stars: number; ago: string; text: string }[] }
```

`sellers`: exactly 5 — `'manasa'` (reuses `user.name`/`user.handle` from `mock.ts`) plus
4 fictional handles: `ritu.thrifts`, `bombayvintage`, `thriftedbyarjun`, `closetofpriya`
(picsum avatar seeds `spotted-seller-1`..`spotted-seller-4`; manasa's seed is
`spotted-seller-manasa`).

`CONDITIONS = ['Brand new', 'Like new', 'Used – excellent', 'Used – good'] as const`
(also exported as type `Condition`).

Pure, deterministic helpers (char-code-sum hash mod N — works for any listing id,
including Supabase uuids):

- `sellerForListing(listingId: string): Seller` — hash mod 4 over the 4 non-manasa
  sellers only.
- `conditionForListing(id: string): Condition` — hash mod 4 over `CONDITIONS`.
- `describeListing(listing: Listing): { text: string; hashtags: string[] }` — template
  sentence from brand/size/condition; `hashtags = [slugify(brand), 'thrift',
  'size' + slugify(size), 'spottedfinds']` (slugify = lowercase, non-alphanumerics
  stripped, no separators — e.g. `#poloralphlauren`).

### `src/lib/filters.ts`

```ts
type Filters = { brands: string[]; sizes: string[];
  price: 'any' | 'u500' | '500to1500' | '1500to3000' | 'over3000';
  conditions: string[]; onSale: boolean }
type Sort = 'newest' | 'priceAsc' | 'priceDesc' | 'mostLiked'
```

`emptyFilters: Filters` — all empty/`'any'`/`false`.
`applyFilters(listings: Listing[], filters: Filters, sort: Sort): Listing[]` — pure;
condition filter uses `conditionForListing`; `onSale` = listing has `originalPrice`;
`'newest'` = input order unchanged; price bands are inclusive ranges in rupees
(e.g. `500to1500` = 500–1500 inclusive, boundaries overlap adjacent bands by design).

### `src/components/BottomSheet.tsx` + `.css`

Props `{ open: boolean; onClose: () => void; title?: string; children: React.ReactNode }`.
Fixed full-screen overlay `rgba(0,0,0,.5)`, sheet slides up from the bottom, bg
`--surface`, top corners radius 16px, drag-handle bar centered at top, content
max-width 430px centered on desktop. Tapping the overlay (not the sheet) calls
`onClose`.

### `src/components/FilterBar.tsx` + `.css`

Props `{ listings: Listing[]; filters: Filters; onChange: (f: Filters) => void; sort: Sort; onSort: (s: Sort) => void }`.
Horizontally scrollable chip row: Brand, Size, Price, Condition, "On sale" toggle,
plus a right-aligned Sort chip (`ArrowUpDown` icon). Brand/Size options are the unique
values present in the `listings` prop; Condition options are `CONDITIONS`; Price
options are the 4 non-`'any'` bands. Active filters render selected with a count
suffix, e.g. "Brand · 2" (Price shows "Price · 1" when not `'any'`). Each chip
(except "On sale", which toggles inline, and Sort) opens a `BottomSheet` with
multi-select `Chip` options reflecting live filter state, a white pill
"Show N results" (`N = applyFilters(listings, filters, sort).length`, live as chips
are tapped) that closes the sheet, and a text "Clear" button that resets just that
filter field. The Sort sheet is single-select; tapping an option applies it via
`onSort` and closes the sheet immediately (no separate confirm step, since sort
doesn't change the result count). No Category or Color chips (no data to filter on).

### `ProductCard.tsx` / `SearchBar.tsx` rewire notes

- `ProductCard`: whole card is now `<Link to={'/p/' + listing.id}>`. The heart button's
  `onClick` calls `e.preventDefault()` + `e.stopPropagation()` before `toggleLike(id)`
  from `useAppState()`, so it doesn't navigate. Heart fills `--accent` when liked; the
  count shown is `likeCountFor(listing)` when liked, otherwise `listing.likes`.
- `SearchBar`: text input is now controlled, with new optional props
  `{ initialQuery?: string; onSubmit?: (q: string) => void }`. On submit (Enter or
  tapping the search icon), if `onSubmit` is not passed, it navigates to
  `'/search?q=' + encodeURIComponent(query)`. `rightIcons` override behavior is
  unchanged; when not passed, the default capsule is now a `Heart` → `Link to="/likes"`
  and a `ShoppingBag` → `Link to="/bag"` with an `--accent` circular badge showing
  `bagCount` (from `useAppState`) when `bagCount > 0`, hidden otherwise.

### `mock.ts` / `useListings.ts` extensions

- `mock.ts` adds `myListings: Listing[]` (4 items, ids `my-1`..`my-4`, picsum seeds
  `spotted-my-1`..`spotted-my-4`) and `mySold: Listing[]` (2 items, ids `sold-1`,
  `sold-2`, picsum seeds `spotted-sold-1`, `spotted-sold-2`).
- `useListings.ts` adds `useListing(id: string): { listing: Listing | null; loading: boolean }`
  — checks mock `listings` + `myListings` + `mySold` first by id; on miss, queries
  Supabase `listings` for that single id and maps it with the same mapping
  `useListings` already uses; `null` on error or true miss. Also adds pure
  `searchListings(listings: Listing[], q: string): Listing[]` — case-insensitive
  substring match against brand, size, and `describeListing(listing).hashtags`
  (leading `'#'` stripped from `q` before hashtag matching).

### New stub routes (scaffold2, real content owned by Round 1 agents below)

| Route | File |
|---|---|
| `/p/:id` | src/pages/Product.tsx |
| `/shop/:handle` | src/pages/Shop.tsx |
| `/search` | src/pages/Search.tsx |
| `/likes` | src/pages/Likes.tsx |
| `/bag` | src/pages/Bag.tsx |
| `/inbox/t/:handle` | src/pages/Thread.tsx |

`BottomNav` stays visible on all of these (not added to the `hideNav` list).

### File ownership — Round 1 parallel agents

| Agent | Owns |
|---|---|
| product | src/pages/Product.tsx, src/pages/product.css |
| shop | src/pages/Shop.tsx, src/pages/shop.css |
| search | src/pages/Search.tsx, src/pages/search.css |
| bag | src/pages/Bag.tsx, src/pages/bag.css |
| likes-profile | src/pages/Likes.tsx, src/pages/likes.css, src/pages/Profile.tsx, src/pages/profile.css |
| inbox | src/pages/Inbox.tsx, src/pages/inbox.css, src/pages/Thread.tsx, src/pages/thread.css |

## Round 2

Real accounts via Supabase Auth replace the localStorage-only Round 1 state. `spotted_state_v1`
is orphaned — never read or written again. SQL is written but NOT applied by any agent (no
agent has DB credentials); `supabase/round2.sql` is self-contained for a human to run in the
Supabase SQL editor. Email confirmation may be on or off — never assume a session exists
immediately after `signUp`. Profile creation happens lazily via `ensureProfile()` on the
`SIGNED_IN` event. Client-generated UUIDs (`crypto.randomUUID()`) for orders/threads/messages/
offers. Optimistic local state update first, background Supabase write second — write errors
just `console.warn`, never block the UI. `listing_id` columns are `text` with no FK — mock ids
(`'1'`, `'my-3'`) and Supabase uuids both work. Like counts stay client-additive:
`listing.likes + (isLiked ? 1 : 0)` — no DB trigger. Never use "Depop" name/logo/imagery.
Spotted branding, ₹ prices (`toLocaleString('en-IN')`) throughout. No new npm deps beyond
react/react-dom/react-router-dom/lucide-react/@supabase/supabase-js. Real payment processing
is OUT of scope — checkout stays demo-mode exactly as Round 1 built it, do not touch its
"DEMO" badge or disclaimer copy.

### `src/lib/auth.tsx`

```ts
export type Profile = { id: string; handle: string; name: string; avatarEmoji: string | null; bio: string | null; city: string | null; rating: number | null; sales: number | null }
export type AuthContextValue = {
  session: Session | null   // from @supabase/supabase-js
  profile: Profile | null   // own profiles row; null when logged out or pre-ensure
  isAuthed: boolean          // session !== null
  loading: boolean           // true until initial getSession + profile fetch settle
  signUp(email: string, password: string, handle: string, name: string): Promise<{ error: string | null }>
  signIn(email: string, password: string): Promise<{ error: string | null }>
  signOut(): Promise<void>
}
export function AuthProvider({ children }): JSX.Element
export function useAuth(): AuthContextValue
```

`signUp` passes `{ data: { handle, name } }` as Supabase user metadata. `onAuthStateChange(SIGNED_IN)`
runs `ensureProfile()`: select own `profiles` row; if absent, insert
`{ id: uid, handle: meta.handle ?? sanitized-email-local-part, name: meta.name ?? local-part }`;
on unique-violation retry once with 2 random digits appended to handle. `signIn`/`signUp` return
human-readable error strings (pass through Supabase `error.message`), never throw. Handle field
at signup: explicit input, regex `^[a-z0-9._]{3,20}$`, prefilled from the email local-part
(lowercased, invalid chars stripped) on blur.

### `src/lib/appState.tsx` v2

`useAppState()` returns:

Unchanged from Round 1: `likedIds: string[]`; `bag: BagItem[]`; `follows: string[]` (followee
handles); `orders: Order[]`; `offers: Offer[]`; `bagCount`; `toggleLike(id)`; `isLiked(id)`;
`likeCountFor(listing)`; `addToBag(id)`; `removeFromBag(id)`; `follow(handle)`; `unfollow(handle)`;
`isFollowing(handle)`; `sendMessage(handle, text)`.

`Order` type: keeps `Order.id` as the display `'SP-xxxxxx'` code; adds `Order.uuid: string` for
the internal primary key.

NEW/CHANGED:

- `isAuthed: boolean`, `ready: boolean` (false only while the initial hydrate fetch is in flight)
- `makeOffer(listing: Listing, amountInr: number): void` — CHANGED signature (was `listingId`).
  Inserts an offer row + calls
  `sendMessage(sellerFor(listing).handle, 'Offered ₹' + amountInr.toLocaleString('en-IN') + ' for ' + listing.brand)`
- `placeOrder(items: OrderItem[], snapshots: Record<string, { title: string; img: string; size: string }>): Order | null`
  — CHANGED signature (snapshots added), returns `null` when logged out. Writes an `orders` row
  + `order_items` snapshot rows.
- `threads: ThreadView[]` — CHANGED shape (was `Record<handle, message[]>`).
  `ThreadView = { id: string; handle: string; peerIsReal: boolean; messages: { id: string; from: 'me' | 'them'; text: string; at: number }[] }`
- `threadFor(handle: string): ThreadView | null` — matches counterparty handle in either
  direction (threads I own with `peer_handle=handle`, OR threads owned by `handle` where I'm
  `peer_id`) to avoid mirror duplicates.

Behavior: hydrate on `SIGNED_IN` via parallel selects across
likes/bag_items/follows/orders+order_items/threads+messages/offers; reset to empty arrays on
`SIGNED_OUT`. Every mutation checks session first (see gating rule below). `sendMessage`: find
thread via `threadFor`; else create one (client uuid; resolve `peer_id` by `profiles` handle
lookup, fictional handle -> `peer_id` null); canned auto-reply (same 3-message cycle as Round 1:
"Hi! Yes, it's still available 😊" / "Ships in 2–3 days anywhere in India." /
"Sounds good — feel free to make an offer!") fires via `setTimeout` ONLY when `peer_id` is null,
inserted with `sender_id: null`.

**Identity gating** lives in appState mutations: if logged out, a mutation makes NO state change
and navigates to `/login?next=<current hash path>`. Pages don't re-implement gating except
Bag/Profile/Sell which render logged-out variants.

### `src/lib/useListings.ts` + `src/data/*.ts`

`Listing` type (in `mock.ts`) gains optional: `sellerId?: string; sellerHandle?: string;
sellerName?: string; sellerBio?: string; sellerRating?: number | null; sellerSales?: number | null`.

`useListings`/`useListing` selects add `seller_id`, `seller:profiles(handle,name,bio,rating,sales)`
embed, mapped into those fields (absent embed -> fields undefined). Existing brand<-title mapping
and picsum fallback unchanged.

NEW hooks (same file):

- `useMyListings(status: 'live' | 'sold'): { listings: Listing[]; loading: boolean }` — by
  `seller_id = auth.uid()`
- `useProfileByHandle(handle: string): { profile: Profile | null; loading: boolean }`
- `useListingsBySeller(sellerId: string): { listings: Listing[]; loading: boolean }` — status live

`sellers.ts` adds: `sellerFor(listing: Listing): Seller` — if `listing.sellerHandle` present,
build `{ handle, name: sellerName ?? handle, bio: sellerBio ?? '', avatar: picsum seed
'spotted-seller-'+handle, rating: sellerRating ?? 0, reviewCount: 0, sold: sellerSales ?? 0,
followers: 0, following: 0, reviews: [] }`; else fall through to existing `sellerForListing(listing.id)`.
`sellerForListing` stays exported for id-only contexts (e.g. offer-title lookups where only an id
is known).

### `localStorage` keys (final registry)

`spotted_onboarded` (unchanged), `spotted_prefs_v1 = { sizes: string[]; brands: string[] }` (raw
chip labels, written by onboarding), `spotted_state_v1` orphaned (Round 1's key — never read or
written again), `supabase-js` session key (library-managed, don't touch).

### New Round 2 routes

| Route | File | Notes |
|---|---|---|
| `/login` | src/pages/Login.tsx | no BottomNav is NOT required — nav stays visible |
| `/signup` | src/pages/Signup.tsx | |
| `/sell/new` | src/pages/SellNew.tsx | in `hideNav` list alongside `/sell` and `/onboarding` |

`src/styles/motion.css` is imported from `src/main.tsx` (empty stub from scaffold3, owned by the
motion agent).

### File ownership — Round 2 parallel agents

| Agent | Owns |
|---|---|
| auth-ui | src/pages/Login.tsx, src/pages/Signup.tsx, src/pages/auth.css |
| home | src/pages/Home.tsx, src/pages/home.css |
| onboarding | src/pages/onboarding/Sizes.tsx, src/pages/onboarding/Brands.tsx, src/pages/onboarding/*.css |
| sell | src/pages/Sell.tsx, src/pages/sell.css, src/pages/SellNew.tsx, src/pages/sellnew.css |
| profile | src/pages/Profile.tsx, src/pages/profile.css |
| shopper | src/pages/Product.tsx, src/pages/product.css, src/pages/Bag.tsx, src/pages/bag.css |
| social | src/pages/Shop.tsx, src/pages/shop.css, src/pages/Inbox.tsx, src/pages/inbox.css, src/pages/Thread.tsx, src/pages/thread.css |
| motion | src/styles/motion.css, src/components/ProductCard.tsx, src/components/ProductCard.css |

**Unowned this round** (do not touch): `src/pages/Likes.tsx`, `src/pages/Search.tsx`,
`src/pages/Discover.tsx`, `src/components/SearchBar.tsx`, `src/components/FilterBar.*`,
`src/components/Chip.*`, `src/components/BottomNav.*`, `src/components/BottomSheet.*`,
`src/lib/filters.ts`, `src/lib/supabase.ts`.

### `supabase/round2.sql` — table list

All tables in `public` schema, RLS enabled on every one, every `create policy` preceded by
`drop policy if exists` (idempotent):

- `likes` — `user_id uuid` (FK profiles, cascade), `listing_id text`, `created_at`; PK
  `(user_id, listing_id)`. Own-row select/insert/delete.
- `bag_items` — same shape as `likes` with `added_at`. Own-row select/insert/delete.
- `follows` — `user_id uuid` (FK profiles, cascade), `followee_handle text`, `created_at`; PK
  `(user_id, followee_handle)`. Public select (follower counts); own insert/delete.
- `orders` — `id uuid` PK, `buyer_id uuid` (FK profiles, cascade), `code text`,
  `total_inr integer`, `placed_at`. Own select/insert.
- `order_items` — `order_id uuid` (FK orders, cascade), `listing_id text`, `price_inr integer`,
  `title text`, `img text`, `size text default ''`; PK `(order_id, listing_id)`. Select/insert
  where the parent order belongs to the caller.
- `threads` — `id uuid` PK, `owner_id uuid` (FK profiles, cascade), `peer_id uuid null` (FK
  profiles), `peer_handle text`, `created_at`; unique `(owner_id, peer_handle)`. Select/update
  where `auth.uid() in (owner_id, peer_id)`; insert where `owner_id = auth.uid()`.
- `messages` — `id uuid` PK, `thread_id uuid` (FK threads, cascade), `sender_id uuid null` (FK
  profiles, null = demo counterparty), `body text`, `created_at`. Select where participant of
  thread; insert where participant AND (`sender_id = auth.uid()` OR (`sender_id is null` AND
  thread's `owner_id = auth.uid()`)).
- `offers` — `id uuid` PK, `user_id uuid` (FK profiles, cascade), `listing_id text`,
  `amount_inr integer`, `created_at`. Own select/insert.
- `profiles` (existing table, policies re-asserted) — public select; insert where
  `id = auth.uid()`; update where `id = auth.uid()`.
- `listings` (existing table, policies added) — public select where `status = 'live'`; select
  own regardless of status (`seller_id = auth.uid()`); insert/update/delete own.
- storage: `listing-images` public bucket; authenticated insert where the object name starts
  with `auth.uid()::text || '/'`; public select on that bucket.

## Round 3 — offers (backfill)

Offers accept/decline shipped without ever getting a CONTRACT.md entry — this is a brief
backfill, not a full spec. `supabase/round3-offers.sql` extends `offers` with `seller_id uuid
null` (FK profiles), `seller_handle text not null default ''`, and `status text not null
default 'pending'` (check constraint `pending | accepted | declined`), plus additive
`offers_select_seller` / `offers_update_seller` RLS policies so a seller can see and update
offers made on their own listings (buyer-side `offers_select_own` / `offers_insert_own` from
Round 2 are untouched). `round3b-offers-grants-fix.sql` adds the per-column `grant`s the new
columns needed (this schema grants per-column, not table-wide, and `alter table` doesn't
auto-extend existing grants).

`src/components/OfferCard.tsx` renders a single offer (amount, listing snapshot, Accept/Decline
buttons when `direction === 'received' && status === 'pending'`, a status pill otherwise).
`appState.tsx`'s `respondToOffer(offer, action)` updates local + DB status and sends a canned
confirmation/decline message via `sendMessage`. `Inbox.tsx` adds filter chips (All / Messages /
Selling / Buying) that include offer threads alongside message threads.

## Round 4 — discounted checkout for accepted offers

Lets a buyer check out an accepted offer at the negotiated price and marks the listing sold
everywhere, still entirely demo-mode (no real payment).

`supabase/round4-offer-checkout.sql`: an additive `listings_select_sold` policy (alongside the
existing `listings_select_live` / `listings_select_own`) so a buyer can still see a listing they
bought after it flips to `sold`; and `mark_listings_sold(p_listing_ids text[])`, a
`security definer` RPC. It has to be security-definer because buyers cannot `UPDATE` listings
directly — the existing `listings_update_own` RLS policy only lets the seller update their own
rows — so marking a just-purchased listing sold needs a narrowly-scoped function that runs with
elevated privilege but first verifies (inside the function body) that the caller actually has a
paid order containing that exact listing id before touching anything; this is not a
general-purpose privilege escalation.

`Listing.status?: 'live' | 'sold'` (in `src/data/mock.ts`) is optional and mock listings never
set it — **undefined means live**. Every consumer must test `=== 'sold'` to detect sold; never
`!== 'sold'` to mean live, and never `=== 'live'` as the live check, since that would
misclassify every mock listing as sold. `useListings.ts` maps `status: row.status === 'sold' ?
'sold' : 'live'` for Supabase-backed listings.

`appState.tsx`'s `placeOrder` now also (fire-and-forget, after the order/order_items insert
succeeds): deletes the purchased rows from `bag_items` (fixing a real bug — the bag's DB rows
were never cleared, only local state, so bought items silently reappeared in the bag after
re-login) and calls the `mark_listings_sold` RPC. Local optimistic state removes only the
purchased `listingId`s from `bag`, not the whole array, so unrelated bag contents survive a
future single-item purchase path. New derived helper `hasPurchased(listingId): boolean`.

### File ownership — Round 4

| Agent | Owns |
|---|---|
| scaffold (this round) | supabase/round4-offer-checkout.sql, src/lib/appState.tsx, src/lib/useListings.ts, src/data/mock.ts (Listing type only), CONTRACT.md |
| Agent B | src/components/OfferCard.tsx, src/components/OfferCard.css, src/components/OfferCheckout.tsx (new), src/components/OfferCheckout.css (new), src/pages/Product.tsx, src/pages/product.css |

## Round 5 — public landing + unified sign-in

Adds a public marketing page and consolidates sign-in, without changing any marketplace
screen's behavior.

- **Routes:** `/` now renders `src/pages/Landing.tsx` (new, full-width public landing); the
  marketplace feed (`src/pages/Home.tsx`) moves to `/home`. `AppShell` gives `/` the
  `app-shell--full` modifier (uncaps the 430px column, `src/styles/global.css`) and hides
  `BottomNav` on `/`, `/login`, and `/signup` (in addition to the existing `/sell`,
  `/sell/new`, `/onboarding/*`). Home's SEO `canonicalPath` is `/home`; RouteIndexingPolicy
  lets `/` and `/home` own their indexing.
- **Internal "go to feed" links repointed `/` → `/home`:** BottomNav Home tab; the
  breadcrumbs/empty-state/CTAs in Bag, Category, Product, Shop, Likes, Profile (Purchases
  empty state); Sell's close button; OfferCheckout "keep browsing"; and onboarding
  Sizes/Brands. Profile's post-logout `navigate('/')` stays on the public landing by design.
- **Auth:** `src/lib/auth.tsx` gains `signInWithOAuth(provider, { redirectTo })` wrapping
  `supabase.auth.signInWithOAuth` (`provider` = `'google' | 'facebook'`, exported type
  `OAuthProvider`). `Login.tsx` renders Google + Facebook buttons (inline SVG marks, no
  remote assets) above the email/password form, with per-action loading, disabled-while-busy,
  and a `role="alert"` error region. `src/lib/safeNext.ts` validates the `next` redirect as
  an internal path; Login stashes it in `sessionStorage` before the OAuth round-trip and
  `OAuthReturn` (in `App.tsx`) consumes it once the session settles. No provider secrets in
  the client.
- **`flowType: 'pkce'`** is set explicitly in `src/lib/supabase.ts`. The auth-js default is
  `implicit`, which returns the session in the URL fragment (`#access_token=…`) — the same
  place `HashRouter` reads the route from, so the OAuth callback lands on an unmatched path.
  PKCE returns `?code=…` in the query string, which the router ignores. auth-js also throws
  a mismatch error if the client's `flowType` disagrees with the callback URL shape, so this
  must stay in sync with however Supabase is configured. Side effect: a signup-confirmation
  link opened in a *different* browser than the one that signed up still confirms the account
  server-side but cannot establish a session there — the user logs in afterwards, which is
  what `Signup.tsx`'s confirm state already instructs.
- **Catch-all route:** `<Route path="*">` redirects to `/`. Without it an unmatched hash
  renders an empty shell instead of a page.
- **Unexecuted external gate:** Google and Facebook must be enabled in the Supabase
  dashboard (Authentication → Providers) with each provider's client credentials and the
  redirect/callback URL (`window.location.origin + pathname`). This is out of repo scope and
  is NOT performed here; until done, the social buttons return the provider's "not enabled"
  error.

### File ownership — Round 5

| Agent | Owns |
|---|---|
| landing-auth | src/pages/Landing.tsx (new), src/pages/landing.css (new), src/lib/safeNext.ts (new), src/App.tsx, src/components/BottomNav.tsx, src/pages/Home.tsx, src/pages/Login.tsx, src/pages/Signup.tsx, src/pages/auth.css, src/lib/auth.tsx, src/lib/supabase.ts (`flowType` only), src/styles/global.css, README.md, CONTRACT.md, and the `/` → `/home` link repoints listed above |

## Round 6 — Razorpay checkout (server-gated; demo remains the default)

Supersedes Round 2's "checkout stays demo-mode" for the *live-gated* path only: demo
checkout is still the shipped default and its UI/copy are unchanged until a human
completes every activation step in `docs/launch/RAZORPAY.md`. Fail-closed: real-money
mode requires server-side env gates (`RAZORPAY_ENABLED=true` + key id/secret as Edge
Function secrets); the client only leaves demo mode when the `razorpay-order` function's
`config` action explicitly reports `enabled: true`, and any error resolves to demo. No
Razorpay secret exists in client code — only the public `keyId` reaches the browser, and
the hosted checkout script (`checkout.razorpay.com/v1/checkout.js`) is loaded at runtime,
not via npm (dependency list unchanged).

Server side (Supabase Edge Functions, Deno — outside the Vite/tsc build):
`supabase/functions/razorpay-order` (config / create / verify; amounts recomputed from DB
rows in paise, HMAC signature verification, idempotent finalization) and
`supabase/functions/razorpay-webhook` (deployed `--no-verify-jwt`; HMAC-authenticated;
`payment.captured` / `payment.failed` / `refund.processed`; dedup ledger). Shared logic in
`supabase/functions/_shared/razorpay.ts`. `supabase/round6-razorpay-checkout.sql` adds
`payments` + `razorpay_webhook_events` (service-role-write-only) and
`orders.payment_id` / `orders.payment_status` (`'demo'` default; **no client write grant**
— a client cannot forge a paid order at the grant layer). Payment provider errors are
surfaced to the user and never converted into orders.

Client: `src/lib/payments.ts` (config probe, checkout script loader,
`startRazorpayPayment` orchestration, typed `PaymentError`); `appState.tsx` adds
`applyPaidOrder(order)` (local-state-only registration of a server-written order);
`Bag.tsx` / `OfferCheckout.tsx` swap the demo button for "Pay ₹N" only when live, with a
`role="alert"` error region. Paid confirmation copy says "₹N paid via Razorpay."; demo
copy is untouched. `orders.total_inr` stays item-price-only; the charge is items + ₹49
shipping (`payments.charged_inr`), matching the displayed Total.

### File ownership — Round 6

| Agent | Owns |
|---|---|
| payments | supabase/round6-razorpay-checkout.sql, supabase/functions/*, src/lib/payments.ts, src/lib/appState.tsx (`applyPaidOrder` only), src/pages/Bag.tsx, src/pages/bag.css, src/components/OfferCheckout.tsx, src/components/OfferCheckout.css, docs/launch/RAZORPAY.md, CONTRACT.md |

## Round 7 — legible auth failures (partial backfill)

Commit 6b47b83 shipped `friendlyAuthError` without a CONTRACT.md entry — this round
backfills it and completes the fix its message promised. Supabase surfaces auth failures
as raw API strings; the ones we expect are translated into copy a visitor can act on, and
anything unrecognised passes through unchanged (with a `console.warn`) so a new error is
never swallowed.

`friendlyAuthError(error, provider?)` in `src/lib/auth.tsx` takes the `AuthError`-shaped
object and matches on the stable `error.code` first (`invalid_credentials`,
`email_not_confirmed`, `user_already_exists`, `over_email_send_rate_limit`,
`validation_failed`, `email_address_invalid`), falling back to lowercased
message substrings for older shapes. A network branch catches `Failed to fetch`
(`AuthRetryableFetchError`) — the most common real-world failure on mobile data.

The OAuth path needed more than translation, because `signInWithOAuth` never returns an
error in a browser (auth-js builds the authorize URL client-side and navigates away
before any server response):

- **Provider gating.** `ENABLED_OAUTH_PROVIDERS` (`src/lib/auth.tsx`) reads
  `VITE_OAUTH_PROVIDERS` (comma-separated), defaulting to `google`. Login/Welcome render
  a social button only for enabled providers, so a disabled provider (Facebook today) can
  no longer strand the visitor on Supabase's raw 400 JSON page.
- **Callback error parsing.** GoTrue bounce-backs put `error` / `error_code` /
  `error_description` in the query string or the URL fragment; HashRouter previously
  swallowed the fragment as an unmatched route (silent bounce to `/`). App bootstrap now
  parses both locations, cleans the URL, stashes the translated message in
  `sessionStorage` (`spotted_oauth_error`), and routes to `/login`, which shows it once
  in the existing `role="alert"` region.

User-facing copy strings added this round (source of truth):

- "That email and password do not match. Please check and try again."
- "Please confirm your email address first — check your inbox for the link."
- "An account with that email already exists. Try logging in instead."
- "Too many emails have been sent to this address. Please wait a while before trying again."
- "That email address doesn't look valid — please check it and try again."
- "<Provider> sign-in isn't available yet. Please continue with email." (generic form:
  "This sign-in method isn't available yet. Please continue with email.")
- "There was a problem with the information you entered. Please check the fields and try again."
  (generic `validation_failed` fallback; the provider-not-enabled substring check runs first,
  since GoTrue files that rejection under the same code)
- "Couldn't connect. Please check your internet connection and try again."

`src/pages/Welcome.tsx` also derives its structured-data `url` from `SITE_ORIGIN` instead
of the hardcoded production apex, matching Landing.tsx (Round 5's staging fix).

### File ownership — Round 7

| Agent | Owns |
|---|---|
| auth-errors | src/lib/auth.tsx, src/pages/Login.tsx, src/pages/Signup.tsx, src/pages/Welcome.tsx, src/App.tsx, README.md (Auth section), CONTRACT.md |

## Round 16 — paid listing boosts (server-gated; demo remains the default)

Numbered to match `supabase/round16-listing-boosts.sql` (the sql round numbering is the
live one). Sellers pay the platform to promote one of their own live listings; boosted
listings rank first in the Home feed with an always-visible "Boosted" label (honest ads
labeling — a paid placement is never presented as organic).

Tiers (server-side source of truth: `BOOST_TIERS` in
`supabase/functions/_shared/razorpay.ts`; mirrored display-only in `src/lib/payments.ts`):

| Tier | Duration | Price |
|---|---|---|
| `3d` | 3 days | ₹29 |
| `7d` | 7 days | ₹79 |

Fail-closed gates, exactly Round 6's chain: live mode requires the same `RAZORPAY_*`
Edge Function secrets; the client only leaves demo mode when `boost-order`'s `config`
action reports `enabled: true`, and any error resolves to demo. Amounts are recomputed
server-side in paise from the tier — client prices are never trusted. Demo boosts are
recorded server-side with `payment_status 'demo'` and are only accepted while the gate
is CLOSED; once live payments are on, every boost must be paid for. The `boosts` table
is service-role-write-only at the grant layer (no client write grants, no write
policies), so a client cannot forge a boost; sellers can SELECT their own rows, and
feeds read the owner-rights `active_boosts` view, which exposes only
`listing_id` + `boosted_until` for unexpired boosts.

Server (`supabase/functions/boost-order`: config / demo / create / verify): mirrors
`razorpay-order` — HMAC signature verification, idempotent finalization
(`finalizeBoostPayment` in `_shared/razorpay.ts`, upsert-ignore on the unique
`boosts.payment_id`, `expires_at` recomputed from the server tier table). Boost payments
reuse the Round 6 `payments` table with `context 'boost'`
(`round16-listing-boosts.sql`, UNAPPLIED at merge time), so both finalization paths
dispatch on context: `razorpay-order` verify refuses boost rows (finalizing one there
would fabricate an order and mark the seller's listing sold), `boost-order` verify
refuses bag/offer rows, and `razorpay-webhook` routes `payment.captured` /
`refund.processed` to the right finalizer. A refunded boost stops promoting immediately
(`expires_at` set to now).

Client: `src/lib/payments.ts` adds `fetchBoostConfig` / `startBoostPayment` /
`BOOST_TIERS` / `BoostResult` on the shared checkout plumbing. The product page
recognises its owner (`profile.id === listing.sellerId`; mock listings have no
`sellerId` and can never look owned) and swaps the buyer CTAs for "Boost listing",
opening `BoostSheet` (tier radios, demo/live payment row, `role="alert"` error region,
"Pay ₹N" only when live). `useListings` ranks boosted-and-unexpired listings first
(stable sort — the fallback path is byte-identical when the `active_boosts` view is
missing or empty, so mock/demo data keeps working); `useListing` resolves
`boostedUntil` for the product page.

User-facing copy strings added this round (source of truth; `<date>` is
`toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })`):

- "Boost listing" (owner CTA) and "Boost this listing" (sheet title)
- "Boosted listings appear at the top of the Home feed with a "Boosted" label until the
  boost expires."
- "Choose a duration"; tier options "3 days ₹29" / "7 days ₹79"
- "Boost listing (demo)" / "Boosting…" (demo button); "Pay ₹N" / "Processing…" (live
  button); "Checking payment options…" while the config probe is in flight
- "Listing boosted!" with "This is a demo — no payment was taken. Boosted until
  <date>." (demo) or "₹N paid via Razorpay. Boosted until <date>." (live); "Done"
- "Boosted" (card + product page label); "Boosted until <date> — this listing appears
  at the top of the Home feed." (owner status)
- "Could not boost the listing. Please try again."
- "We could not confirm the payment yet. If you were charged, your boost will activate
  automatically."
- Server messages: "Only your own listings can be boosted."; "Only live listings can be
  boosted."; "This listing is already boosted."; "This listing can't be boosted.";
  "Online payments are enabled — boosts require payment."

Activation steps (human, in order): run `supabase/round16-listing-boosts.sql` in the
SQL editor; `supabase functions deploy boost-order`; redeploy `razorpay-order` and
`razorpay-webhook` (they gained the context dispatch). Demo boosts work from that point
with no Razorpay secrets; live boosts additionally need the Round 6 `RAZORPAY_*`
secrets already in place.

### File ownership — Round 16

| Agent | Owns |
|---|---|
| boosts | supabase/round16-listing-boosts.sql, supabase/functions/boost-order/*, supabase/functions/_shared/razorpay.ts (boost additions), supabase/functions/razorpay-order/index.ts (context guard), supabase/functions/razorpay-webhook/index.ts (context dispatch), src/lib/payments.ts (boost additions), src/lib/useListings.ts (boost ranking), src/data/listings.ts (`boostedUntil`), src/components/BoostSheet.tsx, src/components/BoostSheet.css, src/components/ProductCard.tsx, src/components/ProductCard.css, src/pages/Product.tsx, src/pages/product.css, CONTRACT.md |
