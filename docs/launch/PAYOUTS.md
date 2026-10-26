# Seller payouts (Razorpay Route): status and next steps

How sellers get paid. This is a plan: no payout code exists in this app yet.
Read it together with `RAZORPAY.md` (buyer checkout) and `SHIPROCKET.md`
(labels and tracking).

## The agreed model

- Buyer pays item price + ₹79 flat shipping + buyer protection fee (8%, min
  ₹29). Sellers pay no commission (`src/lib/pricing.ts`).
- The money lands in Spotted's Razorpay account. The seller's share (the item
  price) is moved to the seller with **Razorpay Route** as a transfer **on
  hold**.
- The hold is released **3 days after delivery** if the buyer has not raised a
  problem. Delivery comes from Shiprocket tracking (`courier-tracking`) or the
  buyer tapping "I've received it" (`mark_order_received`).
- Spotted keeps the shipping (it pays for the Shiprocket label) and the buyer
  fee.
- No cash on delivery.

Open decision for Manasa, built as-is meanwhile: 8% buyer fee and no seller
commission. Get a CA's view on GST/TCS for marketplace payouts before going
live (marketplaces collecting for sellers may need to collect 1% TCS under GST
and file GSTR-8).

## What is built

| Piece | Where | State |
|---|---|---|
| Buyer pays through Razorpay, server-side amounts | `supabase/functions/razorpay-order`, `razorpay-webhook` | Built, switched off (`RAZORPAY_ENABLED`) |
| Order has a seller, status, `delivered_at` | `supabase/round20-shipping-fulfilment.sql` | Built (PR #59), SQL not yet run |
| Delivery detected automatically | `supabase/functions/courier-tracking` | Built (PR #59), switched off (`SHIPROCKET_ENABLED`) |
| Razorpay payment id stored per order | `payments.razorpay_payment_id` (round 6) | Built |
| Seller linked accounts, transfers, hold/release | none | **Not built** |
| Refunds and disputes | Dashboard only; `refund.processed` is recorded | **Not built** in the app |

Earlier work on another code line: the `codex/razorpay-route` branch has a
Route design (`seller_payout_accounts`, `route_transfers` tables and a
`claim_route_transfer` function that creates a held transfer). It targets a
different schema (`commerce_orders`), so it can't be merged here, but its
table design and status values are a good starting point.

## Blocked on Manasa (Razorpay setup)

Only the account owner can do these. Agents never see the keys.

1. **Activate the Razorpay account** (KYC done, live mode on). Needed for
   checkout anyway (`RAZORPAY.md`).
2. **Ask Razorpay to enable Route** on the account (Dashboard → Route, or
   support). Razorpay reviews the business model; say it is a resale
   marketplace that holds funds until delivery.
3. **Confirm the settlement and hold rules** with Razorpay: maximum hold
   length, and whether `on_hold` transfers can be released by API (they can be
   per the docs; confirm it is enabled for the account).
4. **Decide the seller onboarding rule**: a seller must add bank details and
   PAN before their first payout. Suggested default: they can list and sell
   without it, but the payout waits on hold until their linked account is
   active.
5. **CA consult** on GST/TCS (above) before the first real payout.

## Exact next steps (engineering, once Route is enabled)

Each step is a small PR. None can go live before the blockers above.

1. **SQL (round 22)**: `seller_payout_accounts` (seller → `acc_…` id, status:
   `not_started`/`kyc_pending`/`activated`/`suspended`) and
   `seller_transfers` (order → transfer id, amount, status:
   `on_hold`/`released`/`reversed`/`failed`, `release_after`). Service-role
   writes only. Sellers can read their own rows.
2. **Linked account onboarding**: an Edge Function `payout-account` that
   creates the seller's Route linked account (`POST /v2/accounts`, type
   `route`), adds a stakeholder, and requests the Route product with the
   seller's bank account (`POST /v2/accounts/{id}/products`). The app gets an
   "Add payout details" screen in Profile → Sold. Bank details go straight to
   the function, never stored in our tables beyond the last 4 digits.
3. **Create the held transfer when the payment is captured**: in
   `finalizePaidPayment` (`supabase/functions/_shared/razorpay.ts`), call
   `POST /v1/payments/{payment_id}/transfers` with the item total in paise,
   `account: acc_…`, `on_hold: true`. If the seller has no active account
   yet, record the row as `seller_not_ready` and create the transfer when they
   finish onboarding. Must be idempotent: one transfer per order.
4. **Release 3 days after delivery**: when an order becomes `delivered`, set
   `release_after = delivered_at + 3 days`. A scheduled Edge Function
   (Supabase cron, hourly) releases due transfers with
   `PATCH /v1/transfers/{id}` and `{ "on_hold": false }`, skipping orders with
   an open problem report.
5. **Webhooks**: add `transfer.processed`, `transfer.failed` and
   `settlement.processed` to `razorpay-webhook` and update
   `seller_transfers`.
6. **Refunds before release**: refunding an order reverses its transfer first
   (`POST /v1/transfers/{id}/reversals`), then refunds the payment. After
   release, refunds come out of Spotted's balance, so the 3-day window is the
   buyer's time to report a problem.
7. **Seller earnings screen**: on the order page show "Payout on hold until
   <date>" / "Paid out". Profile → Sold shows the total pending and paid.
8. **Test** in Razorpay test mode end to end (test linked account, held
   transfer, release, reversal), then one real low-value order.

## Not covered here

Disputes UI, return-to-seller (RTO) handling, seller commission (none today),
and invoices for the buyer fee.

## References

- Razorpay Route transfers API: https://razorpay.com/docs/api/payments/route/transfers
- Modify settlement hold: https://razorpay.com/docs/api/payments/route/modify-settlement-hold
- Transfer entity: https://razorpay.com/docs/api/payments/route/transfers-entity.md
- Scheduled settlements: https://razorpay.com/docs/payments/route/schedule-settlement.md
