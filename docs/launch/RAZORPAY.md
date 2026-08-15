# Razorpay checkout — setup & activation (Round 6)

Real-money checkout for spottedin-c. **Fail-closed by design**: until every
activation step below is completed by a human with the credentials, the app
keeps its existing demo checkout ("Spotted Pay · demo mode" + DEMO badge) and
no payment code path can run. No Razorpay secret ever appears in this repo or
in client code.

## Architecture

The site is a static Vite SPA (GitHub Pages) — it cannot hold secrets or
verify signatures. All money-facing logic lives in two Supabase Edge
Functions:

- `supabase/functions/razorpay-order` (authenticated, called via
  `supabase.functions.invoke`):
  - `config` — reports whether the server-side gate is open (+ public key id).
    The client calls this when a checkout sheet opens; anything but an
    explicit `enabled: true` leaves the UI in demo mode.
  - `create` — recomputes the amount **server-side from DB rows** (listing
    `price_inr`, or the accepted offer's `amount_inr`, + flat ₹49 shipping),
    inserts a `payments` row, and creates the Razorpay order
    (amount in **paise** = INR × 100). Client-supplied prices are never
    trusted. Mock/demo listings have no DB row and are rejected.
  - `verify` — checks the Razorpay checkout HMAC-SHA256 signature
    (`order_id|payment_id`, constant-time compare), then finalizes: inserts
    `orders`/`order_items` (with `payment_status='paid'`), clears the bought
    `bag_items`, marks listings sold. Finalization is idempotent — order
    uuid/code are pre-assigned on the `payments` row.
- `supabase/functions/razorpay-webhook` (public endpoint, **deployed with
  `--no-verify-jwt`**): authenticates every delivery via the webhook-secret
  HMAC over the raw body. Handles `payment.captured` (same idempotent
  finalize — covers a client that died before/during verify), `payment.failed`
  (created→failed only; a failed attempt never demotes a captured one),
  `refund.processed` (payment + order → refunded). Duplicate/late deliveries
  are deduped via the `razorpay_webhook_events` ledger and idempotent handlers.

Client-forged paid orders are impossible at the database layer:
`orders.payment_status`/`payment_id` have **no insert/update grant** for
`authenticated` (see `supabase/round6-razorpay-checkout.sql`) — only the
service role (Edge Functions) can write them. The demo path keeps inserting
`(id, buyer_id, code, total_inr)` and lands on the `'demo'` default.

Amount conventions: `orders.total_inr` stays **item-price-only** (existing app
convention); the actual charge (`payments.charged_inr`) is items + ₹49
shipping, matching the total shown in both checkout sheets. `SHIPPING_INR = 49`
is defined in `Bag.tsx`, `OfferCheckout.tsx`, and
`supabase/functions/_shared/razorpay.ts` — change all three together.

## Activation prerequisites (human, in order — none performed by agents)

1. Run `supabase/round6-razorpay-checkout.sql` in the Supabase SQL editor.
2. Deploy the functions (Supabase CLI, logged into project `masdygvcssrtwseopfmj`):
   ```
   supabase functions deploy razorpay-order
   supabase functions deploy razorpay-webhook --no-verify-jwt
   ```
3. Set function secrets (Dashboard → Edge Functions → Secrets, or
   `supabase secrets set`). Use **test-mode keys first** (`rzp_test_…`):
   - `RAZORPAY_KEY_ID`
   - `RAZORPAY_KEY_SECRET`
   - `RAZORPAY_WEBHOOK_SECRET` (chosen when creating the webhook below)
   - `RAZORPAY_ENABLED=true` — the master switch; set it **last**, unset it to
     kill live payments instantly.
4. In the Razorpay dashboard, create a webhook pointing at
   `https://masdygvcssrtwseopfmj.supabase.co/functions/v1/razorpay-webhook`
   with events `payment.captured`, `payment.failed`, `refund.processed`, and
   the same secret as `RAZORPAY_WEBHOOK_SECRET`.
5. Test end-to-end in Razorpay **test mode** (UPI/card test credentials)
   before swapping in live keys. KYC/account activation on the Razorpay side
   is a business prerequisite outside this repo.

Until steps 1–3 are done, `fetchPaymentConfig()` resolves
`{ enabled: false }` (the function is missing or the gate reports disabled)
and checkout stays visibly demo.

## Failure behavior (by design)

- Razorpay order-create error → payment row marked `failed`, user told
  "Could not start the payment. You have not been charged." Never a fake
  order.
- Checkout window dismissed → "Payment cancelled — you have not been charged."
- Verify call fails after a capture → user sees "We could not confirm the
  payment yet…"; the `payment.captured` webhook finalizes the order
  server-side and it appears in Purchases on next hydrate.
- Webhook amount mismatch → not finalized, logged for manual review.

## Known limitations

- No automatic refund flow: `refund.processed` is recorded when a refund is
  issued from the Razorpay dashboard, but there is no in-app refund UI.
- Two buyers can race on the same listing (both create orders before either
  captures); the second capture still records a paid order for a sold listing
  and needs a manual refund. Acceptable at launch scale — revisit with
  inventory locking if it happens.
- Payment config is cached per page load; toggling `RAZORPAY_ENABLED`
  mid-session takes effect on reload. The server gate still rejects
  create/verify immediately either way.
- The repo has no test framework (CONTRACT.md pins the dependency list), so
  payment logic is exercised via type-checking and the manual test-mode pass
  above, not unit tests.
