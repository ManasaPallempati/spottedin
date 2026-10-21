import { supabase } from './supabase'

// Client side of the Razorpay integration. All money-facing decisions happen
// in the razorpay-order Edge Function: it recomputes amounts from DB rows,
// creates the Razorpay order, verifies the checkout signature, and writes the
// paid order with the service role. This module only orchestrates the hosted
// checkout window and NEVER fabricates a paid state — every failure path
// throws a typed PaymentError. When the Edge Function is missing or reports
// payments disabled, fetchPaymentConfig resolves { enabled: false } and the
// checkout UIs stay in demo mode (fail closed).

export type PaymentConfig = { enabled: boolean; keyId: string | null }

// Boost price tiers, display-only. Must match BOOST_TIERS in
// supabase/functions/_shared/razorpay.ts — the server recomputes the amount
// for every order and never trusts these numbers.
export type BoostTier = { id: '3d' | '7d'; days: number; amountInr: number }

export const BOOST_TIERS: BoostTier[] = [
  { id: '3d', days: 3, amountInr: 29 },
  { id: '7d', days: 7, amountInr: 79 },
]

export type BoostResult = {
  listingId: string
  tier: BoostTier['id']
  amountInr: number
  startsAt: number
  expiresAt: number
  paymentStatus: 'demo' | 'paid'
}

export type PaidOrder = {
  uuid: string
  code: string
  totalInr: number
  placedAt: number
  items: { listingId: string; priceInr: number }[]
}

export type PaymentRequest =
  | { context: 'bag'; listingIds: string[] }
  | { context: 'offer'; offerId: string }

export type PaymentErrorKind = 'cancelled' | 'unavailable' | 'failed' | 'unverified'

export class PaymentError extends Error {
  readonly kind: PaymentErrorKind
  constructor(kind: PaymentErrorKind, message: string) {
    super(message)
    this.kind = kind
  }
}

type RazorpaySuccess = {
  razorpay_order_id: string
  razorpay_payment_id: string
  razorpay_signature: string
}

type RazorpayOptions = {
  key: string
  amount: number
  currency: string
  name: string
  order_id: string
  handler: (response: RazorpaySuccess) => void
  modal?: { ondismiss?: () => void }
  prefill?: { name?: string; email?: string }
  theme?: { color?: string }
}

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayOptions) => { open: () => void }
  }
}

function probeConfig(functionName: string): Promise<PaymentConfig> {
  return supabase.functions
    .invoke(functionName, { body: { action: 'config' } })
    .then(({ data, error }): PaymentConfig => {
      if (error || !data || data.enabled !== true || typeof data.keyId !== 'string') {
        return { enabled: false, keyId: null }
      }
      return { enabled: true, keyId: data.keyId }
    })
    .catch((): PaymentConfig => ({ enabled: false, keyId: null }))
}

let configPromise: Promise<PaymentConfig> | null = null

export function fetchPaymentConfig(): Promise<PaymentConfig> {
  configPromise ??= probeConfig('razorpay-order')
  return configPromise
}

let boostConfigPromise: Promise<PaymentConfig> | null = null

// Same fail-closed probe as fetchPaymentConfig, against boost-order: any
// error (function missing, payments disabled) resolves to demo mode.
export function fetchBoostConfig(): Promise<PaymentConfig> {
  boostConfigPromise ??= probeConfig('boost-order')
  return boostConfigPromise
}

let scriptPromise: Promise<void> | null = null

function loadCheckoutScript(): Promise<void> {
  if (window.Razorpay) return Promise.resolve()
  scriptPromise ??= new Promise<void>((resolve, reject) => {
    const script = document.createElement('script')
    script.src = 'https://checkout.razorpay.com/v1/checkout.js'
    script.onload = () => resolve()
    script.onerror = () => {
      scriptPromise = null
      reject(new PaymentError('failed', 'Could not load the payment window. Check your connection and try again.'))
    }
    document.head.appendChild(script)
  })
  return scriptPromise
}

async function invokeEdgeFunction(
  functionName: string,
  body: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const { data, error } = await supabase.functions.invoke(functionName, { body })
  if (error) {
    let message = 'Payment service unavailable. You have not been charged.'
    const ctx = (error as { context?: Response }).context
    if (ctx instanceof Response) {
      try {
        const parsed = await ctx.clone().json()
        if (typeof parsed?.message === 'string') message = parsed.message
      } catch {
        // keep the generic message
      }
    }
    throw new PaymentError('failed', message)
  }
  return (data ?? {}) as Record<string, unknown>
}

type CreatedOrder = { paymentId: string; razorpayOrderId: string; amountPaise: number; keyId: string }

function parseCreatedOrder(created: Record<string, unknown>): CreatedOrder {
  const { paymentId, razorpayOrderId, amountPaise, keyId } = created as Partial<CreatedOrder>
  if (!paymentId || !razorpayOrderId || !amountPaise || !keyId) {
    throw new PaymentError('failed', 'Payment service returned an invalid response. You have not been charged.')
  }
  return { paymentId, razorpayOrderId, amountPaise, keyId }
}

// Opens the hosted Razorpay checkout and resolves with the signed success
// payload, or rejects with a typed PaymentError on dismiss/load failure.
async function runHostedCheckout(
  order: CreatedOrder,
  prefill: { name?: string; email?: string }
): Promise<RazorpaySuccess> {
  await loadCheckoutScript()
  const Razorpay = window.Razorpay
  if (!Razorpay) throw new PaymentError('failed', 'Could not load the payment window.')

  return new Promise<RazorpaySuccess>((resolve, reject) => {
    new Razorpay({
      key: order.keyId,
      amount: order.amountPaise,
      currency: 'INR',
      name: 'Spotted',
      order_id: order.razorpayOrderId,
      handler: resolve,
      modal: {
        ondismiss: () => reject(new PaymentError('cancelled', 'Payment cancelled — you have not been charged.')),
      },
      prefill,
      theme: { color: '#ff2300' },
    }).open()
  })
}

export async function startRazorpayPayment(
  request: PaymentRequest,
  prefill: { name?: string; email?: string } = {}
): Promise<PaidOrder> {
  const config = await fetchPaymentConfig()
  if (!config.enabled) throw new PaymentError('unavailable', 'Online payments are not enabled.')

  const created = parseCreatedOrder(await invokeEdgeFunction('razorpay-order', { action: 'create', ...request }))
  const success = await runHostedCheckout(created, prefill)

  let verified: Record<string, unknown>
  try {
    verified = await invokeEdgeFunction('razorpay-order', {
      action: 'verify',
      paymentId: created.paymentId,
      razorpayOrderId: success.razorpay_order_id,
      razorpayPaymentId: success.razorpay_payment_id,
      razorpaySignature: success.razorpay_signature,
    })
  } catch {
    // The charge may have gone through — the webhook will finalize it server-side.
    throw new PaymentError(
      'unverified',
      'We could not confirm the payment yet. If you were charged, the order will appear in your purchases automatically.'
    )
  }

  const order = verified.order as
    | { uuid: string; code: string; totalInr: number; placedAt: string; items: { listingId: string; priceInr: number }[] }
    | undefined
  if (!order?.uuid || !order.code) {
    throw new PaymentError(
      'unverified',
      'We could not confirm the payment yet. If you were charged, the order will appear in your purchases automatically.'
    )
  }

  const placedAt = Date.parse(order.placedAt)
  return {
    uuid: order.uuid,
    code: order.code,
    totalInr: order.totalInr,
    placedAt: Number.isNaN(placedAt) ? Date.now() : placedAt,
    items: order.items ?? [],
  }
}

function parseBoost(data: Record<string, unknown>, paid: boolean): BoostResult {
  const boost = data.boost as
    | { listingId?: string; tier?: string; amountInr?: number; startsAt?: string; expiresAt?: string }
    | undefined
  const expiresAt = Date.parse(boost?.expiresAt ?? '')
  if (!boost?.listingId || (boost.tier !== '3d' && boost.tier !== '7d') || Number.isNaN(expiresAt)) {
    throw new PaymentError(
      paid ? 'unverified' : 'failed',
      paid
        ? 'We could not confirm the payment yet. If you were charged, your boost will activate automatically.'
        : 'Could not boost the listing. Please try again.'
    )
  }
  const startsAt = Date.parse(boost.startsAt ?? '')
  return {
    listingId: boost.listingId,
    tier: boost.tier,
    amountInr: boost.amountInr ?? 0,
    startsAt: Number.isNaN(startsAt) ? Date.now() : startsAt,
    expiresAt,
    paymentStatus: paid ? 'paid' : 'demo',
  }
}

// Boost a listing the signed-in seller owns. Demo is the default: while the
// boost-order gate reports disabled, the server records a payment_status
// 'demo' boost and nothing is charged. Only when the gate is open does the
// hosted Razorpay checkout run, with the amount recomputed server-side from
// the tier. Every failure path throws a typed PaymentError; a boost is never
// fabricated client-side.
export async function startBoostPayment(
  listingId: string,
  tier: BoostTier['id'],
  prefill: { name?: string; email?: string } = {}
): Promise<BoostResult> {
  const config = await fetchBoostConfig()

  if (!config.enabled) {
    const data = await invokeEdgeFunction('boost-order', { action: 'demo', listingId, tier })
    return parseBoost(data, false)
  }

  const created = parseCreatedOrder(await invokeEdgeFunction('boost-order', { action: 'create', listingId, tier }))
  const success = await runHostedCheckout(created, prefill)

  let verified: Record<string, unknown>
  try {
    verified = await invokeEdgeFunction('boost-order', {
      action: 'verify',
      paymentId: created.paymentId,
      razorpayOrderId: success.razorpay_order_id,
      razorpayPaymentId: success.razorpay_payment_id,
      razorpaySignature: success.razorpay_signature,
    })
  } catch {
    // The charge may have gone through — the webhook will finalize it server-side.
    throw new PaymentError(
      'unverified',
      'We could not confirm the payment yet. If you were charged, your boost will activate automatically.'
    )
  }
  return parseBoost(verified, true)
}
