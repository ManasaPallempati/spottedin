# HANDOFF: Spotted (spottedin-c) buildout — continuation

Read this whole file before acting. Treat STATE and CONSTRAINTS as immutable;
treat BATCH as the work order. If the machine contradicts this file, the
machine wins — report the conflict, propose the smallest amendment, continue
with unaffected items.

Written 2026-07-31 from the orchestrating session (Windows machine, this repo).

---

## STATE — what is true right now

**Repo:** `C:\Users\augel\Claude\Projects\spottedin-c`, GitHub `Palle017/spottedin-c`
(public — GitHub Pages free tier requires it; secret scanning + push protection
on). **Live:** https://www.spottedin.co/ (custom domain over GitHub Pages).
HEAD = `4a72405` ("Round 4: discounted checkout for accepted offers"),
2026-07-31 17:20 -0400, deployed and verified live. Working tree clean.

**Product:** an intentionally exact Depop-UI clone, rebranded Spotted, for
Manasa (owner). Vite5 + React18 + TS, `react-router-dom` HashRouter,
`lucide-react`, hand-rolled CSS (`src/styles/global.css` tokens), Supabase
backend. Deps are locked to exactly: react, react-dom, react-router-dom,
lucide-react, @supabase/supabase-js — **never add another without the user
asking.**

**⚠️ Single most load-bearing fact:** across 4 build rounds, Manasa has opened
the app and received two "here's what's new" emails, but **no explicit
product-direction approval was ever obtained or re-confirmed after the first
rejection of a prior design.** Every round so far was initiated by the
session owner (not Manasa), based on his own read of "logical next step."
Before starting a 5th round of unrequested scope, weigh surfacing this rather
than silently building further — this was flagged once by a planning review
early on and never circled back to.

**Supabase:** project ref `masdygvcssrtwseopfmj`, staging tier, **shared with
an unrelated, dead, never-merged Next.js prototype** (branch
`codex/supabase-auth-rollout` in the separate `Palle017/maanster-market`
repo — confirmed abandoned, do not resurrect, but its leftover schema
objects (e.g. a `favorites` table, an original `messages` table) still
physically exist in this same database and have already caused two
name-collision bugs). Anon key is public and committed in
`src/lib/supabase.ts` (intentional, RLS-protected). **Service-role key is
NOT in this repo and must never be committed** — retrieve it fresh each
session from the Supabase dashboard → Settings → API, use it only from an
uncommitted shell command, never paste it into a file that gets committed.

**Schema (all applied live already, all in `supabase/*.sql` in this repo for
reference — files are historical record, not to be re-run blindly):**
- `profiles` (id→auth.users, handle [bare, `@` optional], name, avatar_emoji, bio, city, rating, sales)
- `listings` (id, seller_id→profiles, title, description, price_inr, category, size, condition, gradient_start/end, emoji, image_path, likes, **status** `'live'|'sold'` — DB default `'live'`, client has SELECT/UPDATE grant but only a *column-scoped* INSERT grant that excludes status/likes, both timestamps)
- `likes`, `bag_items`, `follows` — simple composite-PK ownership tables
- `orders` (id, buyer_id, code, total_inr, placed_at), `order_items` (order_id, listing_id, price_inr, title, img, size — a price **snapshot**, not derived from the live listing, so negotiated pricing was always representable)
- `threads` (id, owner_id, peer_id nullable, peer_handle), `spotted_messages` (id, thread_id, sender_id nullable=canned/system, body — **note the name**: not `messages`, see collision above)
- `offers` (id, user_id=buyer, listing_id, amount_inr, seller_id nullable, seller_handle, status `'pending'|'accepted'|'declined'`)
- `mark_listings_sold(p_listing_ids text[])` — **security-definer** RPC (buyers can't UPDATE listings directly under RLS; this function internally verifies the caller has a paid order for each listing before flipping it to sold — granted EXECUTE to `authenticated`)
- Storage bucket `listing-images` (public read, authenticated path-scoped insert)
- `app_opens` — insert-only telemetry, unrelated to commerce

**`src/lib/appState.tsx`** (`useAppState()`, Supabase-backed, session-gated,
every mutation = `requireAuth()` guard → optimistic local `setState` →
background write, `console.warn` on error, never throw/toast):
`likedIds, bag[{listingId,addedAt}], follows, orders[{id[display code],uuid,items[{listingId,priceInr}],totalInr,placedAt}], offers[{id,listingId,amountInr,at,status,direction:'made'|'received',peerHandle}], threads, isAuthed, ready, bagCount, toggleLike, isLiked, likeCountFor, addToBag, removeFromBag, follow, unfollow, isFollowing, placeOrder(items,snapshots)→Order|null [also deletes matching bag_items rows + calls mark_listings_sold], sendMessage, makeOffer(listing,amountInr), respondToOffer(offer,'accept'|'decline'), threadFor(handle), offersWith(handle), hasPurchased(listingId)→boolean`.

**`Listing` type gained `status?: 'live'|'sold'`.** Mock-data listings leave
it `undefined` — **every consumer must test `=== 'sold'` only, never
`=== 'live'` or `!== 'sold'`**, or mock listings will misbehave.

**Round history (session numbering ≠ git/CONTRACT.md numbering — theirs is
one behind for the middle two; already reconciled going forward, don't
re-litigate it):**
1. Initial 7-screen Depop-clone UI shell + Supabase-backed Home feed.
2. Real functionality: product/shop/search/bag/likes/inbox (was all decorative).
3. Real auth (email/password) + full localStorage→Supabase state migration + 3 UX polish items (polaroid promo cards, functional "Picks for you," motion pass). 7 live-only bugs found/fixed here — see CONTRACT.md's Round 2 section for the full list, they're a good preview of the bug *class* this project keeps surfacing (constraint mismatches, ambiguous FK embeds, missing column grants, React state-timing).
4. Seller-side offer accept/decline (OfferCard in Thread, Inbox filter chips wired).
5. Discounted checkout for accepted offers (this session, `4a72405`) — buyer gets a "Buy now for ₹X" button on an accepted OfferCard, checkout mirrors Bag's exactly, completing it marks the listing sold (new RPC) and actually clears `bag_items` (fixed a real pre-existing bug where only local state was cleared).

**Known open gaps (verified against code as of `4a72405`, not guessed):**
1. Realtime doesn't exist anywhere (only an auth-session listener) — everything is refresh-on-hydrate.
2. No real reviews for real sellers (only the 4 fictional seed sellers have review content).
3. Cross-user like counts aren't server-reconciled (`likeCountFor` is client-additive only).
4. No seller profile editing (fields set once at signup via `ensureProfile`).
5. The shared bag has no "is this listing still live" guard before checkout — buying from the bag doesn't re-check status first (low risk, no observed exploit path, just unhardened).
6. Concurrent double-purchase race (two people completing checkout on the same accepted offer simultaneously) isn't hardened — the RPC's `status='live'` predicate makes the loser's mark-sold a silent no-op, so you'd get two orders for one item. Explicitly accepted as demo-tolerable, not fixed.
7. `offers` rows created before the Round 3 migration have `seller_handle=''` and are permanently invisible to sellers — dead rows only, test data is always deleted after verification so this has never mattered in practice.

---

## CONSTRAINTS

- **Never build real payment processing.** Checkout is permanently demo-only:
  visible "DEMO" badge, "no payment was taken" disclaimer, every round
  restates this. Do not let any future request ("make it real," "add
  Stripe") slide through without stopping and confirming explicitly with the
  user first — this is a hard boundary, not a default to infer past.
- Never the word "Depop," its logo, or its imagery, anywhere. Spotted
  branding, ₹ via `toLocaleString('en-IN')`.
- **No agent (Sonnet builder, Fable planner, anyone but the orchestrating
  human/session) ever gets database credentials.** SQL is always written to
  `supabase/roundN-*.sql` by a builder agent and applied by hand afterward.
- **Before writing any migration that touches grants:** check current
  column-level grants first (`information_schema.column_privileges`) — this
  exact bug class (RLS policy exists, underlying GRANT doesn't, silent
  failure) has hit `listings` twice and `offers` once. Assume it will happen
  again on any new column.
- **Before writing a migration that adds/renames a table:** check
  `information_schema.tables` first for an existing collision — this
  database has a second, unrelated schema layered into it from the dead
  prototype branch mentioned above.
- **Always live-verify before shipping**, never trust `npm run build` passing
  as sufficient alone — every round so far has surfaced at least one bug
  that ONLY appeared against the real database (constraint mismatches,
  ambiguous FK embeds, missing grants, React state-timing bugs across
  StrictMode double-invocation). Pattern that's worked every time: create
  two throwaway accounts via the Supabase Admin API
  (`POST /auth/v1/admin/users` with `email_confirm:true`), exercise the full
  flow live via a local dev server + browser automation, verify DB state
  directly via REST with the service-role key, then delete both accounts
  (cascades) and confirm the live table counts return to baseline (12 seed
  listings, zero everything else) before pushing.
- File-ownership-per-agent convention: one file per agent, a scaffold-first
  agent for any shared schema/API contract, an integrate-last agent that
  runs `npm run build`. CONTRACT.md gets a new section per round documenting
  the spec + ownership table — keep this current, it went stale for one
  round (backfilled in `4a72405`, don't let it happen again.
- Operating procedure that's worked for 4 rounds running: (1) scope the ask
  precisely yourself first — don't hand Fable a vague brief; (2) send a full,
  verified status memo + the specific new-feature brief to a Fable-tier
  planning pass, ask for a mechanical step-by-step plan with explicit design
  decisions + rationale, a file-ownership table, and exact
  schema/API contracts; (3) execute with Sonnet-tier builder agents,
  right-sized to the actual work (don't manufacture parallelism the plan
  doesn't call for); (4) apply SQL by hand, live-verify per the constraint
  above, clean up, ship.

---

## BATCH

**No specific task is currently queued** — this handoff exists for lossless
context transfer, not because a batch is mid-flight. If the user gives a new
feature request, run it through the CONSTRAINTS operating procedure above
end to end.

If asked "what's next" with no further specifics, the verified gaps list
above is the candidate set — **do not silently pick one and start building.**
Surface the load-bearing fact at the top of STATE first (no confirmed
product-direction approval yet), then let the user pick, same as every prior
round's actual next-step conversation went.

---

## STOP AND ASK only if

- A credential, key, or password would need to be entered anywhere.
- The request is to make checkout real (any payment integration) — hard
  constraint above, confirm explicitly even if asked directly.
- An action is irreversible against real (non-test) data — deleting a real
  user's account/listings, force-pushing, dropping a table.
- A migration would need to modify or drop the OTHER schema's objects
  (the dead-prototype leftovers) rather than just avoid colliding with them.

Otherwise keep going. Pre-authorized: writing/applying new SQL migrations
that only add tables/columns/policies (following the constraints above),
creating and deleting throwaway Supabase test accounts for verification,
committing and pushing to `main`, triggering deploys.

---

## REPORT SHAPE (if this packet is executed as a batch — otherwise n/a)

1. Item-by-item: done / blocked / skipped, with evidence
2. Any design decisions made and what they were based on
3. Live-verification results (the specific flows exercised, against real DB state)
4. Anything that contradicted this packet
5. What is left, and what the rollback is (this repo's rollback is always
   simple: nothing is destructive, `main` at any prior commit is a safe
   revert point, and the live site redeploys automatically on push)
