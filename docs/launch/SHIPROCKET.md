# Shiprocket labels and tracking — setup & activation (SQL round 21)

Spotted books the courier for every **Razorpay-paid** order. The seller picks a
pickup address, taps "Get shipping label", prints the label and hands the
parcel over at pickup. Tracking updates from Shiprocket then move the order
to Shipped and Delivered on their own. Demo orders (and everything while this
integration is switched off) keep the manual "mark as shipped" form.

Nothing here is live until a human completes the steps below. Without every
secret, both functions fail closed and the app shows the manual form.

## Architecture

- `supabase/functions/courier-label` (authenticated, called via
  `supabase.functions.invoke`):
  - `config` — `{ enabled }`; the seller's order page asks this before
    offering "Get shipping label".
  - `book` — `{ orderId }`. The caller must have sold a listing in the order,
    the order must have `payment_status = 'paid'` and still be `paid`
    (waiting to ship). Steps, each skipped once its result is stored on the
    order so a retry resumes where it stopped:
    1. Log in (`POST /auth/login`, API user).
    2. Register the seller's pickup address (`POST /settings/company/addpickup`)
       the first time, or after they change it. The nickname is stored in
       `spotted_seller_pickup.courier_location`.
    3. Create the shipment (`POST /orders/create/adhoc`, prepaid, order id =
       Spotted order code, default parcel 30×25×5 cm, 0.5 kg).
    4. Assign an AWB (`POST /courier/assign/awb`, courier chosen by Shiprocket
       unless `SHIPROCKET_COURIER_ID` is set). From here the order is marked
       `courier_provider = 'shiprocket'` and the manual path is closed.
    5. Request pickup (`POST /courier/generate/pickup`; failure is logged, not
       fatal — pickup can be requested from the Shiprocket panel).
    6. Generate the label (`POST /courier/generate/label`) and store
       `label_url`.
- `supabase/functions/courier-tracking` (public endpoint, **deployed with
  `--no-verify-jwt`**): Shiprocket's tracking webhook. Authenticated by the
  `x-api-key` header, which must equal `SHIPROCKET_WEBHOOK_TOKEN`. Looks the
  order up by AWB, stores the status text in `orders.courier_status`, and
  moves the order forward only (Picked up / Shipped / In transit / Out for
  delivery → `shipped`; Delivered → `delivered`). Unknown AWBs and other
  statuses get a 200 so Shiprocket does not retry. The function name avoids
  "shiprocket" because Shiprocket rejects webhook URLs containing
  "shiprocket", "kartrocket", "sr" or "kr".
- `supabase/round21-courier-labels.sql`: `spotted_seller_pickup` (one row per
  seller; the client can set `address_id` and only ever clear
  `courier_location`), courier columns on `orders` (service-role writes
  only), and a `mark_order_shipped` that refuses Shiprocket-booked orders.

Money: the buyer's ₹79 shipping pays for the label when Spotted books it, so
the seller's earnings on those orders are the item price only. Labels are
charged to the Shiprocket wallet; keep it topped up.

## Activation prerequisites (human, in order — none performed by agents)

1. Shiprocket account: sign up, finish KYC, add wallet balance.
2. Create an API user (Settings → API → Configure / Create API user) with an
   email different from the account login. Never paste its password into
   chat or commit it.
3. Run `supabase/round21-courier-labels.sql` in the Supabase SQL editor
   (after round 20).
4. Deploy the functions:
   ```
   supabase functions deploy courier-label
   supabase functions deploy courier-tracking --no-verify-jwt
   ```
5. Set Edge Function secrets (Dashboard → Edge Functions → Secrets):
   - `SHIPROCKET_EMAIL`, `SHIPROCKET_PASSWORD` — the API user
   - `SHIPROCKET_WEBHOOK_TOKEN` — any long random string
   - optional `SHIPROCKET_COURIER_ID` — force one courier
   - `SHIPROCKET_ENABLED=true` — the master switch; set it **last**, unset
     it to fall back to manual shipping instantly.
6. In Shiprocket, add the webhook (Settings → API → Webhooks):
   URL `https://masdygvcssrtwseopfmj.supabase.co/functions/v1/courier-tracking`,
   security token = `SHIPROCKET_WEBHOOK_TOKEN`, and switch it on.
7. Razorpay must be live (see `RAZORPAY.md`): only paid orders are booked.
8. Test with one real low-value order end to end before announcing it.

## Known limitations

- One default parcel size for every order; a heavy item may be billed more
  than the ₹79 collected (volumetric re-weighing by the courier).
- No cancel/return (RTO) handling in the app yet: those statuses are stored in
  `courier_status` but don't change the order.
- The buyer gets no inbox message when a Shiprocket parcel ships; the order
  page and Purchases list update instead.
- API endpoints and field names follow Shiprocket's public API as documented
  by third parties; verify against Shiprocket's own API docs during the
  step 8 test.
