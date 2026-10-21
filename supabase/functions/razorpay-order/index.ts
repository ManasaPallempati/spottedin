// razorpay-order — authenticated Edge Function behind supabase.functions.invoke.
// Actions (POST body.action):
//   config — { enabled, keyId } so the client can decide demo vs live UI.
//   create — server-recomputed amount from DB rows, creates a payments row and
//            a Razorpay order. Never trusts client prices.
//   verify — checks the Razorpay checkout signature, then finalizes the order.
// Deploy: supabase functions deploy razorpay-order
// Secrets: RAZORPAY_ENABLED, RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET (see
// docs/launch/RAZORPAY.md). Without all three every action fails closed.
import { createClient, type SupabaseClient } from 'jsr:@supabase/supabase-js@2'
import {
  SHIPPING_INR,
  corsHeaders,
  finalizePaidPayment,
  hmacSha256Hex,
  json,
  razorpayGate,
  timingSafeEqual,
  type Gate,
  type PaymentItem,
  type PaymentRow,
} from '../_shared/razorpay.ts'

const MAX_ITEMS = 20
const MAX_CHARGE_INR = 500_000

type ListingRow = {
  id: string
  title: string
  size: string | null
  price_inr: number
  image_path: string | null
  status: string
}

function randomOrderCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let out = ''
  for (let i = 0; i < 6; i++) out += chars[Math.floor(Math.random() * chars.length)]
  return 'SP-' + out
}

// Mirrors resolveImage in src/lib/useListings.ts so order_items.img matches
// what the demo path snapshots.
function resolveImage(row: ListingRow, supabaseUrl: string): string {
  if (row.image_path) {
    if (/^https?:\/\//i.test(row.image_path)) return row.image_path
    return `${supabaseUrl}/storage/v1/object/public/listing-images/${row.image_path}`
  }
  return `https://picsum.photos/seed/${row.id}/600/600`
}

function toItem(row: ListingRow, priceInr: number, supabaseUrl: string): PaymentItem {
  return {
    listing_id: row.id,
    price_inr: priceInr,
    title: row.title,
    img: resolveImage(row, supabaseUrl),
    size: row.size ?? '',
  }
}

async function resolveItems(
  admin: SupabaseClient,
  uid: string,
  body: Record<string, unknown>,
  supabaseUrl: string
): Promise<{ items: PaymentItem[]; offerId: string | null } | Response> {
  const unavailable = json(409, {
    error: 'listing_unavailable',
    message: "This item isn't available for online payment.",
  })

  if (body.context === 'offer') {
    if (typeof body.offerId !== 'string') return json(400, { error: 'bad_request' })
    const { data: offer } = await admin
      .from('offers')
      .select('id, user_id, listing_id, amount_inr, status')
      .eq('id', body.offerId)
      .maybeSingle()
    if (!offer || offer.user_id !== uid) return json(404, { error: 'offer_not_found' })
    if (offer.status !== 'accepted') return json(409, { error: 'offer_not_accepted' })
    if (!Number.isInteger(offer.amount_inr) || offer.amount_inr <= 0) return json(409, { error: 'bad_amount' })
    const { data: listing } = await admin
      .from('listings')
      .select('id, title, size, price_inr, image_path, status')
      .eq('id', offer.listing_id)
      .maybeSingle()
    if (!listing) return unavailable
    if (listing.status !== 'live') return json(409, { error: 'listing_sold', message: 'This item has already sold.' })
    return { items: [toItem(listing as ListingRow, offer.amount_inr, supabaseUrl)], offerId: offer.id }
  }

  if (body.context === 'bag') {
    const raw = body.listingIds
    if (!Array.isArray(raw) || raw.length === 0 || raw.length > MAX_ITEMS) return json(400, { error: 'bad_request' })
    if (!raw.every((id): id is string => typeof id === 'string' && id.length > 0)) return json(400, { error: 'bad_request' })
    const ids = [...new Set(raw)]
    const { data: listings } = await admin
      .from('listings')
      .select('id, title, size, price_inr, image_path, status')
      .in('id', ids)
    const rows = (listings ?? []) as ListingRow[]
    // Mock/demo listing ids ('1', 'my-3', …) have no DB row and land here.
    if (rows.length !== ids.length) return unavailable
    if (rows.some((r) => r.status !== 'live')) {
      return json(409, { error: 'listing_sold', message: 'An item in your bag has already sold.' })
    }
    return { items: rows.map((r) => toItem(r, r.price_inr, supabaseUrl)), offerId: null }
  }

  return json(400, { error: 'bad_request' })
}

async function createOrder(
  admin: SupabaseClient,
  gate: Gate,
  uid: string,
  body: Record<string, unknown>,
  supabaseUrl: string
): Promise<Response> {
  const resolved = await resolveItems(admin, uid, body, supabaseUrl)
  if (resolved instanceof Response) return resolved

  const itemTotal = resolved.items.reduce((sum, it) => sum + it.price_inr, 0)
  const charged = itemTotal + SHIPPING_INR
  if (charged > MAX_CHARGE_INR) return json(400, { error: 'amount_too_large' })
  const amountPaise = charged * 100

  const { data: payment, error: insertError } = await admin
    .from('payments')
    .insert({
      user_id: uid,
      context: body.context,
      offer_id: resolved.offerId,
      items: resolved.items,
      item_total_inr: itemTotal,
      charged_inr: charged,
      amount_paise: amountPaise,
      order_code: randomOrderCode(),
    })
    .select('id, order_uuid')
    .single()
  if (insertError || !payment) return json(500, { error: 'payment_insert_failed' })

  const rzpRes = await fetch('https://api.razorpay.com/v1/orders', {
    method: 'POST',
    headers: {
      Authorization: 'Basic ' + btoa(`${gate.keyId}:${gate.keySecret}`),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      amount: amountPaise,
      currency: 'INR',
      receipt: payment.id,
      notes: { payment_id: payment.id, user_id: uid },
    }),
  })
  if (!rzpRes.ok) {
    await admin
      .from('payments')
      .update({ status: 'failed', updated_at: new Date().toISOString() })
      .eq('id', payment.id)
      .eq('status', 'created')
    console.error('razorpay order create failed', rzpRes.status, await rzpRes.text())
    return json(502, {
      error: 'razorpay_error',
      message: 'Could not start the payment. You have not been charged.',
    })
  }
  const rzpOrder = await rzpRes.json()

  await admin
    .from('payments')
    .update({ razorpay_order_id: rzpOrder.id, updated_at: new Date().toISOString() })
    .eq('id', payment.id)

  return json(200, {
    paymentId: payment.id,
    razorpayOrderId: rzpOrder.id,
    amountPaise,
    currency: 'INR',
    keyId: gate.keyId,
  })
}

async function verifyPayment(
  admin: SupabaseClient,
  gate: Gate,
  uid: string,
  body: Record<string, unknown>
): Promise<Response> {
  const { paymentId, razorpayOrderId, razorpayPaymentId, razorpaySignature } = body
  if (
    typeof paymentId !== 'string' ||
    typeof razorpayOrderId !== 'string' ||
    typeof razorpayPaymentId !== 'string' ||
    typeof razorpaySignature !== 'string'
  ) {
    return json(400, { error: 'bad_request' })
  }

  const { data: payment } = await admin.from('payments').select('*').eq('id', paymentId).maybeSingle()
  if (!payment || payment.user_id !== uid) return json(404, { error: 'payment_not_found' })
  // Boost payments (Round 16) finalize through boost-order — running one
  // through here would fabricate an order and mark the listing sold.
  if (payment.context !== 'bag' && payment.context !== 'offer') return json(400, { error: 'wrong_context' })
  if (payment.razorpay_order_id !== razorpayOrderId) return json(400, { error: 'order_mismatch' })
  if (payment.status === 'refunded') return json(409, { error: 'payment_refunded' })

  if (payment.status !== 'paid') {
    const expected = await hmacSha256Hex(gate.keySecret, `${razorpayOrderId}|${razorpayPaymentId}`)
    if (!timingSafeEqual(expected, razorpaySignature)) {
      return json(400, { error: 'bad_signature', message: 'Payment verification failed.' })
    }
  }

  const order = await finalizePaidPayment(admin, payment as PaymentRow, razorpayPaymentId)
  return json(200, { order })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json(405, { error: 'method_not_allowed' })

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return json(400, { error: 'bad_json' })
  }

  const gate = razorpayGate()
  if (body.action === 'config') {
    return json(200, { enabled: gate.enabled, keyId: gate.enabled ? gate.keyId : null })
  }
  if (!gate.enabled) {
    return json(503, { error: 'payments_disabled', message: 'Online payments are not enabled.' })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
  const authed = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY') ?? '', {
    global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
  })
  const { data: userData } = await authed.auth.getUser()
  const uid = userData?.user?.id
  if (!uid) return json(401, { error: 'unauthorized' })

  const admin = createClient(supabaseUrl, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '')

  try {
    if (body.action === 'create') return await createOrder(admin, gate, uid, body, supabaseUrl)
    if (body.action === 'verify') return await verifyPayment(admin, gate, uid, body)
  } catch (err) {
    console.error('razorpay-order error', err)
    return json(500, { error: 'internal', message: 'Something went wrong processing the payment.' })
  }
  return json(400, { error: 'unknown_action' })
})
