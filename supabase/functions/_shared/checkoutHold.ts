// Soft hold on a listing while another buyer is mid-payment.
//
// razorpay-order `create` used to accept any number of simultaneous payments
// for the same live listing. Two buyers could both pay for the one item; the
// second order was then written for a listing that had already sold, with the
// money taken. There is no reservation column (and no migration is allowed
// here), so a listing is treated as held while ANOTHER user has a `created`
// (unpaid, not failed/refunded) payment for it that is younger than HOLD_MINUTES.
//
// Pure TypeScript with no Deno or jsr imports, so vitest can import it.

export const HOLD_MINUTES = 15

export type HoldPaymentRow = {
  user_id: string
  items: { listing_id?: string }[] | null
}

// created_at lower bound for payments that still hold a listing.
export function holdCutoffIso(now: Date = new Date()): string {
  return new Date(now.getTime() - HOLD_MINUTES * 60_000).toISOString()
}

// Listing ids (from `wantedIds`) that another user's open payment holds.
// `openPayments` must already be filtered to status 'created' and
// created_at >= holdCutoffIso(); this only applies the per-user/per-item rule.
export function heldListingIds(openPayments: HoldPaymentRow[], wantedIds: string[], uid: string): string[] {
  const wanted = new Set(wantedIds)
  const held = new Set<string>()
  for (const payment of openPayments) {
    if (payment.user_id === uid) continue
    for (const item of payment.items ?? []) {
      if (item.listing_id && wanted.has(item.listing_id)) held.add(item.listing_id)
    }
  }
  return [...held]
}
