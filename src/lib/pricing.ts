// Checkout pricing. Sellers pay no fees; the buyer pays the item price, a flat
// shipping charge per seller order (one parcel per seller), and a buyer
// protection fee. Must match supabase/functions/_shared/razorpay.ts, which
// recomputes every amount server-side before charging.

export const SHIPPING_INR = 79
export const BUYER_FEE_RATE = 0.08
export const BUYER_FEE_MIN_INR = 29

export function buyerFeeInr(itemTotalInr: number): number {
  if (itemTotalInr <= 0) return 0
  return Math.max(BUYER_FEE_MIN_INR, Math.round(itemTotalInr * BUYER_FEE_RATE))
}

export type Charges = { itemTotal: number; shipping: number; buyerFee: number; total: number }

export function chargesFor(itemTotalInr: number): Charges {
  const shipping = itemTotalInr > 0 ? SHIPPING_INR : 0
  const buyerFee = buyerFeeInr(itemTotalInr)
  return { itemTotal: itemTotalInr, shipping, buyerFee, total: itemTotalInr + shipping + buyerFee }
}

export function formatInr(value: number) {
  return `₹${value.toLocaleString('en-IN')}`
}
