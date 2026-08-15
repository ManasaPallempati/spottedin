// Shared logic for the razorpay-order and razorpay-webhook Edge Functions.
// Deno runtime (Supabase Edge Functions) — not part of the Vite/tsc build.
import type { SupabaseClient } from 'jsr:@supabase/supabase-js@2'

// Must match SHIPPING_INR in src/pages/Bag.tsx and src/components/OfferCheckout.tsx.
export const SHIPPING_INR = 49

export type Gate = { enabled: boolean; keyId: string; keySecret: string }

// Fail-closed activation gate: live payments require ALL of RAZORPAY_ENABLED
// being the literal string 'true', RAZORPAY_KEY_ID, and RAZORPAY_KEY_SECRET.
// Anything less and every endpoint reports payments disabled, leaving the
// client on its demo checkout.
export function razorpayGate(): Gate {
  const keyId = Deno.env.get('RAZORPAY_KEY_ID') ?? ''
  const keySecret = Deno.env.get('RAZORPAY_KEY_SECRET') ?? ''
  const enabled = Deno.env.get('RAZORPAY_ENABLED') === 'true' && keyId !== '' && keySecret !== ''
  return { enabled, keyId, keySecret }
}

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

export function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

export async function hmacSha256Hex(secret: string, data: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(data))
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

export function timingSafeEqual(a: string, b: string): boolean {
  const enc = new TextEncoder()
  const ab = enc.encode(a)
  const bb = enc.encode(b)
  if (ab.length !== bb.length) return false
  let diff = 0
  for (let i = 0; i < ab.length; i++) diff |= ab[i] ^ bb[i]
  return diff === 0
}

export type PaymentItem = { listing_id: string; price_inr: number; title: string; img: string; size: string }

export type PaymentRow = {
  id: string
  user_id: string
  context: 'bag' | 'offer'
  items: PaymentItem[]
  item_total_inr: number
  charged_inr: number
  amount_paise: number
  status: string
  razorpay_order_id: string | null
  order_uuid: string
  order_code: string
}

export type FinalizedOrder = {
  uuid: string
  code: string
  totalInr: number
  placedAt: string
  items: { listingId: string; priceInr: number }[]
}

// Turn a verified-paid payment into an order. Fully idempotent: safe to run
// from the client verify path, the payment.captured webhook, or both, any
// number of times — order/order_items ids are pre-assigned on the payment row
// and every write is an upsert-ignore or a guarded update.
// Status transition: created|failed -> paid is allowed (one Razorpay order can
// host several payment attempts — a failed attempt followed by a successful
// retry is normal); paid is never demoted here; refunded is terminal.
export async function finalizePaidPayment(
  admin: SupabaseClient,
  payment: PaymentRow,
  razorpayPaymentId: string
): Promise<FinalizedOrder> {
  await admin
    .from('payments')
    .update({ status: 'paid', razorpay_payment_id: razorpayPaymentId, updated_at: new Date().toISOString() })
    .eq('id', payment.id)
    .in('status', ['created', 'failed'])

  const { data: fresh, error: freshError } = await admin
    .from('payments')
    .select('status')
    .eq('id', payment.id)
    .single()
  if (freshError || fresh?.status !== 'paid') {
    throw new Error(`payment ${payment.id} not in paid state (${fresh?.status ?? 'missing'})`)
  }

  const { error: orderError } = await admin.from('orders').upsert(
    {
      id: payment.order_uuid,
      buyer_id: payment.user_id,
      code: payment.order_code,
      total_inr: payment.item_total_inr,
      payment_id: payment.id,
      payment_status: 'paid',
    },
    { onConflict: 'id', ignoreDuplicates: true }
  )
  if (orderError) throw new Error(`order insert failed: ${orderError.message}`)

  const itemRows = payment.items.map((it) => ({
    order_id: payment.order_uuid,
    listing_id: it.listing_id,
    price_inr: it.price_inr,
    title: it.title,
    img: it.img,
    size: it.size,
  }))
  const { error: itemsError } = await admin
    .from('order_items')
    .upsert(itemRows, { onConflict: 'order_id,listing_id', ignoreDuplicates: true })
  if (itemsError) throw new Error(`order_items insert failed: ${itemsError.message}`)

  const listingIds = payment.items.map((it) => it.listing_id)
  await admin.from('bag_items').delete().eq('user_id', payment.user_id).in('listing_id', listingIds)
  await admin.from('listings').update({ status: 'sold' }).in('id', listingIds).eq('status', 'live')

  const { data: orderRow } = await admin
    .from('orders')
    .select('placed_at')
    .eq('id', payment.order_uuid)
    .single()

  return {
    uuid: payment.order_uuid,
    code: payment.order_code,
    totalInr: payment.item_total_inr,
    placedAt: orderRow?.placed_at ?? new Date().toISOString(),
    items: payment.items.map((it) => ({ listingId: it.listing_id, priceInr: it.price_inr })),
  }
}
