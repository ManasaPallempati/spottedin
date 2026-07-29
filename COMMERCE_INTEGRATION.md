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

This foundation collects a buyer payment into the Spotted In Razorpay merchant
account. It does **not** pay sellers. A real marketplace requires Razorpay
Route (or an approved alternative), seller Linked Accounts/KYC, transfers,
settlement timing, reversals, refunds, and reconciliation.

Official references:

- https://razorpay.com/docs/api/orders/create/
- https://razorpay.com/docs/payments/payment-gateway/web-integration/standard/integration-steps/
- https://razorpay.com/docs/webhooks/validate-test/
- https://razorpay.com/docs/webhooks/payments/
- https://razorpay.com/docs/payments/route/
- https://razorpay.com/docs/payments/route/linked-account/

## Shiprocket flow

1. Sellers need an enabled `seller_fulfillment` row whose pickup location
   already exists in the connected Shiprocket account.
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
- Marketplace-of-record decision and Razorpay Route/Linked Account approval
  before seller payouts are implemented.
- Razorpay Test-mode webhook pointed at `razorpay-webhook`.
- Shiprocket account/API user, wallet funding, pickup-location setup, and API
  credentials.
- Shipping ownership decision: one Spotted In account with approved
  seller-specific pickup locations, or separate seller-owned carrier accounts.
- Shiprocket webhook pointed at `delivery-webhook` with the configured
  `x-api-key`.
- Address form, seller fulfillment onboarding, refunds, cancellations,
  returns/RTO, and customer-support policy.
- End-to-end test: quote -> test payment -> verified webhook -> create
  shipment -> AWB -> pickup -> tracking event.

Production money movement and pickup creation remain disabled until every gate
above is explicitly approved and verified.
