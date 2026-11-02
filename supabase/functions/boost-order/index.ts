// boost-order — authenticated Edge Function behind supabase.functions.invoke.
// Sellers pay the platform to promote one of their own listings.
// Actions (POST body.action):
//   config — { enabled, keyId, tiers } so the client can decide demo vs live UI.
//   demo   — only while live payments are DISABLED: records the boost with
//            payment_status 'demo' (mirrors Round 6's shipped-default demo
//            checkout, where nothing real is charged).
//   create — live only. Amount recomputed server-side from BOOST_TIERS,
//            creates a payments row (context 'boost') and a Razorpay order.
//            Never trusts client prices.
//   verify — live only. Checks the Razorpay checkout signature, then
//            finalizes the boost (idempotent with the webhook).
// Deploy: supabase functions deploy boost-order
// Secrets: same RAZORPAY_* trio as razorpay-order. Without all three the gate
// is closed and only config/demo answer (fail closed, Round 6 style).
import { createClient, type SupabaseClient } from 'jsr:@supabase/supabase-js@2'
import {
  BOOST_TIERS,
  corsHeaders,
  finalizeBoostPayment,
  hmacSha256Hex,
  json,
  razorpayGate,
  timingSafeEqual,
  type BoostTierId,
  type Gate,
  type PaymentRow,
} from '../_shared/razorpay.ts'

function randomBoostCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let out = ''
  for (let i = 0; i < 6; i++) out += chars[Math.floor(Math.random() * chars.length)]
  return 'BP-' + out
}

function tierList() {
  return Object.entries(BOOST_TIERS).map(([id, t]) => ({ id, days: t.days, amountInr: t.amountInr }))
}

// Shared validation for demo + create: the caller must own a live listing
// with no boost currently active. Returns the tier id or an error Response.
async function resolveBoostSubject(
  admin: SupabaseClient,
  uid: string,
  body: Record<string, unknown>
): Promise<{ listingId: string; tier: BoostTierId } | Response> {
  const tier = body.tier
  if (typeof tier !== 'string' || !(tier in BOOST_TIERS)) return json(400, { error: 'bad_tier' })
  if (typeof body.listingId !== 'string' || body.listingId.length === 0) {
    return json(400, { error: 'bad_request' })
  }

  const { data: listing } = await admin
    .from('listings')
    .select('id, seller_id, status')
    .eq('id', body.listingId)
    .maybeSingle()
  // Mock/demo listing ids ('1', 'my-3', …) have no DB row and land here too.
  if (!listing) return json(404, { error: 'listing_not_found', message: "This listing can't be boosted." })
  if (listing.seller_id !== uid) {
    return json(403, { error: 'not_owner', message: 'Only your own listings can be boosted.' })
  }
  if (listing.status !== 'live') {
    return json(409, { error: 'listing_not_live', message: 'Only live listings can be boosted.' })
  }

  const { data: active } = await admin
    .from('boosts')
    .select('id')
    .eq('listing_id', listing.id)
    .gt('expires_at', new Date().toISOString())
    .limit(1)
  if (active && active.length > 0) {
    return json(409, { error: 'already_boosted', message: 'This listing is already boosted.' })
  }

  return { listingId: listing.id, tier: tier as BoostTierId }
}

// Demo boosts exist only while the Razorpay gate is closed — once live
// payments are enabled, every boost must be paid for (fail closed both ways).
async function demoBoost(
  admin: SupabaseClient,
  gate: Gate,
  uid: string,
  body: Record<string, unknown>
): Promise<Response> {
  if (gate.enabled) {
    return json(409, { error: 'live_mode', message: 'Online payments are enabled — boosts require payment.' })
  }
  const subject = await resolveBoostSubject(admin, uid, body)
  if (subject instanceof Response) return subject

  const { days, amountInr } = BOOST_TIERS[subject.tier]
  const startsAt = new Date()
  const expiresAt = new Date(startsAt.getTime() + days * 24 * 60 * 60 * 1000)
  const { data: boost, error } = await admin
    .from('boosts')
    .insert({
      listing_id: subject.listingId,
      seller_id: uid,
      tier: subject.tier,
      amount_inr: amountInr,
      starts_at: startsAt.toISOString(),
      expires_at: expiresAt.toISOString(),
      payment_status: 'demo',
    })
    .select('starts_at, expires_at')
    .single()
  if (error || !boost) return json(500, { error: 'boost_insert_failed' })

  return json(200, {
    boost: {
      listingId: subject.listingId,
      tier: subject.tier,
      amountInr,
      startsAt: boost.starts_at,
      expiresAt: boost.expires_at,
      paymentStatus: 'demo',
    },
  })
}

async function createBoostOrder(
  admin: SupabaseClient,
  gate: Gate,
  uid: string,
  body: Record<string, unknown>
): Promise<Response> {
  const subject = await resolveBoostSubject(admin, uid, body)
  if (subject instanceof Response) return subject

  const { amountInr } = BOOST_TIERS[subject.tier]
  const amountPaise = amountInr * 100

  const { data: payment, error: insertError } = await admin
    .from('payments')
    .insert({
      user_id: uid,
      context: 'boost',
      items: [
        {
          listing_id: subject.listingId,
          tier: subject.tier,
          price_inr: amountInr,
          title: `Listing boost (${BOOST_TIERS[subject.tier].days} days)`,
          img: '',
          size: '',
        },
      ],
      item_total_inr: amountInr,
      charged_inr: amountInr,
      amount_paise: amountPaise,
      order_code: randomBoostCode(),
    })
    .select('id')
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
      notes: { payment_id: payment.id, user_id: uid, boost_listing_id: subject.listingId },
    }),
  })
  if (!rzpRes.ok) {
    await admin
      .from('payments')
      .update({ status: 'failed', updated_at: new Date().toISOString() })
      .eq('id', payment.id)
      .eq('status', 'created')
    console.error('razorpay boost order create failed', rzpRes.status, await rzpRes.text())
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

async function verifyBoostPayment(
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
  // Never finalize a purchase payment through the boost path (or vice versa).
  if (payment.context !== 'boost') return json(400, { error: 'wrong_context' })
  if (payment.razorpay_order_id !== razorpayOrderId) return json(400, { error: 'order_mismatch' })
  if (payment.status === 'refunded') return json(409, { error: 'payment_refunded' })

  if (payment.status !== 'paid') {
    const expected = await hmacSha256Hex(gate.keySecret, `${razorpayOrderId}|${razorpayPaymentId}`)
    if (!timingSafeEqual(expected, razorpaySignature)) {
      return json(400, { error: 'bad_signature', message: 'Payment verification failed.' })
    }
  }

  const boost = await finalizeBoostPayment(admin, payment as PaymentRow, razorpayPaymentId)
  return json(200, { boost })
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
    return json(200, { enabled: gate.enabled, keyId: gate.enabled ? gate.keyId : null, tiers: tierList() })
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
    // demo is the only money-adjacent action allowed while the gate is closed.
    if (body.action === 'demo') return await demoBoost(admin, gate, uid, body)
    if (!gate.enabled) {
      return json(503, { error: 'payments_disabled', message: 'Online payments are not enabled.' })
    }
    if (body.action === 'create') return await createBoostOrder(admin, gate, uid, body)
    if (body.action === 'verify') return await verifyBoostPayment(admin, gate, uid, body)
  } catch (err) {
    console.error('boost-order error', err)
    return json(500, { error: 'internal', message: 'Something went wrong processing the payment.' })
  }
  return json(400, { error: 'unknown_action' })
})
