# Spotted In commerce integrations

Status: implemented locally as Supabase schema, Edge Functions, and a typed web
client. No provider account, credential, webhook, payment, or shipment has been
activated or tested.

## Razorpay flow

1. `create-payment-order` authenticates the buyer, reloads the listing price,
   re-quotes the selected courier, creates a locked commerce order, and calls
   Razorpay `POST /v1/orders` with the amount in paise.
2. The browser receives only the public Razorpay key ID and provider order ID,
   then opens Standard Checkout through `src/services/commerce.ts`.
3. `verify-payment` verifies the checkout HMAC, fetches the payment from
   Razorpay, and checks provider order ID, amount, currency, and state.
4. `razorpay-webhook` validates the raw-body HMAC and deduplicates
   `x-razorpay-event-id`. Captured payments atomically mark the commerce order
   paid and the listing sold.
5. A concurrent-payment conflict is recorded as `payment_conflict`; it must
   enter a reviewed refund workflow before production.

Spotted In will use Razorpay Route. After a captured payment, the backend
creates one idempotently claimed transfer for the item price to the seller's
activated Linked Account, with settlement held indefinitely. Delivery moves
that transfer to `ready_to_release`; it does **not** release money
automatically. Release timing remains gated on the returns/disputes policy.
Sellers cannot create, activate, retry, or release transfers from the browser.

Official references:

- https://razorpay.com/docs/api/orders/create/
- https://razorpay.com/docs/payments/payment-gateway/web-integration/standard/integration-steps/
- https://razorpay.com/docs/webhooks/validate-test/
- https://razorpay.com/docs/webhooks/payments/
- https://razorpay.com/docs/payments/route/
- https://razorpay.com/docs/payments/route/linked-account/
- https://razorpay.com/docs/api/payments/route/create-transfers-payments/
- https://razorpay.com/docs/api/payments/route/modify-settlement-hold/

## Shiprocket flow

1. Spotted In uses one Shiprocket account. Sellers need an enabled
   `seller_fulfillment` row whose approved pickup location already exists in
   that central account.
2. `shiprocket-serviceability` calls the provider with pickup/delivery postal
   codes, package weight, and prepaid/COD mode, then returns sanitized courier
   choices.
3. `create-payment-order` repeats that quote server-side so a browser cannot
   forge the courier or shipping price.
4. After payment, the seller invokes `create-shipment`. It creates the custom
   order, assigns the selected courier/AWB, schedules pickup, and persists only
   the provider identifiers/status needed by the app.
5. `delivery-webhook` authenticates Shiprocket's `x-api-key`, deduplicates the
   raw event hash, and updates shipment tracking. The neutral function name is
   deliberate: Shiprocket documentation forbids `shiprocket`, `kartrocket`,
   `sr`, or `kr` in webhook URLs.

Official reference:

- https://apidocs.shiprocket.in/

## Edge Function secrets

Set these separately in **staging** and **production**. Never place them in
`VITE_*` variables or the browser bundle.

```text
SUPABASE_URL
SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
APP_ORIGINS
RAZORPAY_KEY_ID
RAZORPAY_KEY_SECRET
RAZORPAY_WEBHOOK_SECRET
SHIPROCKET_EMAIL
SHIPROCKET_PASSWORD
SHIPROCKET_WEBHOOK_KEY
```

`APP_ORIGINS` is a comma-separated exact allow-list, for example the staging
web URL plus localhost during development.

## Activation gates

- Hosted Supabase staging project and successful database/RLS tests.
- Razorpay merchant onboarding/KYC and test keys.
- Razorpay Route activation, seller Linked Account/KYC onboarding, and test
  transfers with settlement holds.
- Razorpay Test-mode webhook pointed at `razorpay-webhook`.
- Shiprocket account/API user, wallet funding, pickup-location setup, and API
  credentials.
- Approved seller-specific pickup locations in the central Spotted In
  Shiprocket account.
- Shiprocket webhook pointed at `delivery-webhook` with the configured
  `x-api-key`.
- Seller fulfillment onboarding, refunds, cancellations, returns/RTO,
  payout-release timing, and customer-support policy.
- End-to-end test: quote -> test payment -> verified webhook -> create
  shipment -> AWB -> pickup -> tracking event.

Production money movement and pickup creation remain disabled until every gate
above is explicitly approved and verified.
