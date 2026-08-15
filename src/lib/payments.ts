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

let configPromise: Promise<PaymentConfig> | null = null

export function fetchPaymentConfig(): Promise<PaymentConfig> {
  configPromise ??= supabase.functions
    .invoke('razorpay-order', { body: { action: 'config' } })
    .then(({ data, error }): PaymentConfig => {
      if (error || !data || data.enabled !== true || typeof data.keyId !== 'string') {
        return { enabled: false, keyId: null }
      }
      return { enabled: true, keyId: data.keyId }
    })
    .catch((): PaymentConfig => ({ enabled: false, keyId: null }))
  return configPromise
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

async function invokeOrderFunction(body: Record<string, unknown>): Promise<Record<string, unknown>> {
  const { data, error } = await supabase.functions.invoke('razorpay-order', { body })
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

export async function startRazorpayPayment(
  request: PaymentRequest,
  prefill: { name?: string; email?: string } = {}
): Promise<PaidOrder> {
  const config = await fetchPaymentConfig()
  if (!config.enabled) throw new PaymentError('unavailable', 'Online payments are not enabled.')

  const created = await invokeOrderFunction({ action: 'create', ...request })
  const { paymentId, razorpayOrderId, amountPaise, keyId } = created as {
    paymentId?: string
    razorpayOrderId?: string
    amountPaise?: number
    keyId?: string
  }
  if (!paymentId || !razorpayOrderId || !amountPaise || !keyId) {
    throw new PaymentError('failed', 'Payment service returned an invalid response. You have not been charged.')
  }

  await loadCheckoutScript()
  const Razorpay = window.Razorpay
  if (!Razorpay) throw new PaymentError('failed', 'Could not load the payment window.')

  const success = await new Promise<RazorpaySuccess>((resolve, reject) => {
    new Razorpay({
      key: keyId,
      amount: amountPaise,
      currency: 'INR',
      name: 'Spotted',
      order_id: razorpayOrderId,
      handler: resolve,
      modal: {
        ondismiss: () => reject(new PaymentError('cancelled', 'Payment cancelled — you have not been charged.')),
      },
      prefill,
      theme: { color: '#ff2300' },
    }).open()
  })

  let verified: Record<string, unknown>
  try {
    verified = await invokeOrderFunction({
      action: 'verify',
      paymentId,
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
