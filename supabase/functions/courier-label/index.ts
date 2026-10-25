// courier-label — authenticated Edge Function behind supabase.functions.invoke.
// Books a Shiprocket shipment for a paid order and returns its label.
// Actions (POST body.action):
//   config — { enabled } so the seller's order page can offer "Get shipping label".
//   book   — { orderId }: caller must have sold a listing in the order; the order
//            must be Razorpay-paid (demo orders never create real shipments) and
//            still waiting to ship. Registers the seller's pickup address with
//            Shiprocket on first use, creates the shipment, assigns an AWB,
//            requests pickup and generates the label. Safe to retry: every step
//            is skipped once its result is stored on the order.
// Deploy: supabase functions deploy courier-label
// Secrets: SHIPROCKET_ENABLED, SHIPROCKET_EMAIL, SHIPROCKET_PASSWORD,
// optional SHIPROCKET_COURIER_ID (see docs/launch/SHIPROCKET.md).
import { createClient, type SupabaseClient } from 'jsr:@supabase/supabase-js@2'
import { corsHeaders, json, type ShipTo } from '../_shared/razorpay.ts'
import { ShiprocketError, call, courierGate, login } from '../_shared/shiprocket.ts'

// Default parcel for folded clothing; Shiprocket bills on the greater of
// actual and volumetric weight.
const PARCEL = { length: 30, breadth: 25, height: 5, weight: 0.5 }

type OrderRow = {
  id: string
  code: string
  buyer_id: string
  status: string
  payment_status: string
  placed_at: string
  total_inr: number
  ship_to: ShipTo | null
  courier: string | null
  tracking_number: string | null
  courier_provider: string | null
  courier_order_id: string | null
  courier_shipment_id: string | null
  label_url: string | null
}

type AddressRow = { name: string; phone: string; line1: string; line2: string; city: string; state: string; pincode: string }

function srDate(iso: string): string {
  // Shiprocket wants "YYYY-MM-DD HH:MM" in IST.
  const ist = new Date(Date.parse(iso) + 330 * 60_000).toISOString()
  return `${ist.slice(0, 10)} ${ist.slice(11, 16)}`
}

function splitName(full: string): { first: string; last: string } {
  const parts = full.trim().split(/\s+/)
  return { first: parts[0] ?? full, last: parts.slice(1).join(' ') }
}

async function isSeller(admin: SupabaseClient, orderId: string, uid: string): Promise<boolean> {
  const { data: items } = await admin.from('order_items').select('listing_id').eq('order_id', orderId)
  const ids = (items ?? []).map((i: { listing_id: string }) => i.listing_id)
  if (ids.length === 0) return false
  const { count } = await admin
    .from('listings')
    .select('id', { count: 'exact', head: true })
    .in('id', ids)
    .eq('seller_id', uid)
  return (count ?? 0) > 0
}

async function ensurePickupLocation(
  admin: SupabaseClient,
  token: string,
  uid: string,
  sellerEmail: string
): Promise<string | Response> {
  const { data: pickup } = await admin
    .from('spotted_seller_pickup')
    .select('address_id, courier_location')
    .eq('seller_id', uid)
    .maybeSingle()
  if (!pickup) {
    return json(409, { error: 'pickup_required', message: 'Add the address the courier should collect from.' })
  }
  if (pickup.courier_location) return pickup.courier_location

  const { data: address } = await admin
    .from('spotted_addresses')
    .select('name, phone, line1, line2, city, state, pincode')
    .eq('id', pickup.address_id)
    .maybeSingle()
  if (!address) return json(409, { error: 'pickup_required', message: 'Add the address the courier should collect from.' })
  const a = address as AddressRow

  // Nickname must be unique per Shiprocket account and ≤ 36 characters; a
  // fresh one per registration means an address change never collides.
  const nickname = `SPT-${uid.slice(0, 8)}-${Date.now().toString(36)}`
  await call(token, 'pickup address', '/settings/company/addpickup', {
    pickup_location: nickname,
    name: a.name,
    email: sellerEmail,
    phone: a.phone,
    address: a.line1.slice(0, 80),
    address_2: a.line2.slice(0, 80),
    city: a.city,
    state: a.state,
    country: 'India',
    pin_code: a.pincode,
  })
  await admin
    .from('spotted_seller_pickup')
    .update({ courier_location: nickname, updated_at: new Date().toISOString() })
    .eq('seller_id', uid)
  return nickname
}

async function book(admin: SupabaseClient, uid: string, sellerEmail: string, body: Record<string, unknown>): Promise<Response> {
  if (typeof body.orderId !== 'string') return json(400, { error: 'bad_request' })
  const { data } = await admin
    .from('orders')
    .select(
      'id, code, buyer_id, status, payment_status, placed_at, total_inr, ship_to, courier, tracking_number, courier_provider, courier_order_id, courier_shipment_id, label_url'
    )
    .eq('id', body.orderId)
    .maybeSingle()
  const order = data as OrderRow | null
  if (!order || !(await isSeller(admin, order.id, uid))) return json(404, { error: 'order_not_found' })

  if (order.courier_provider === 'shiprocket' && order.label_url) {
    return json(200, { courier: order.courier, trackingNumber: order.tracking_number, labelUrl: order.label_url })
  }
  if (order.payment_status !== 'paid') {
    return json(409, { error: 'not_paid', message: 'Courier labels are only for paid orders. Ship this one yourself.' })
  }
  if (order.status !== 'paid') return json(409, { error: 'not_waiting', message: 'This order has already shipped.' })
  if (!order.ship_to) return json(409, { error: 'no_address', message: "This order has no delivery address." })

  const gate = courierGate()
  const token = await login(gate)
  const location = await ensurePickupLocation(admin, token, uid, sellerEmail)
  if (location instanceof Response) return location

  let shipmentId = order.courier_shipment_id
  if (!shipmentId) {
    const { data: items } = await admin.from('order_items').select('listing_id, title, price_inr').eq('order_id', order.id)
    const { data: buyer } = await admin.auth.admin.getUserById(order.buyer_id)
    const to = order.ship_to
    const { first, last } = splitName(to.name)
    const created = await call<{ order_id?: number; shipment_id?: number }>(token, 'create shipment', '/orders/create/adhoc', {
      order_id: order.code,
      order_date: srDate(order.placed_at),
      pickup_location: location,
      billing_customer_name: first,
      billing_last_name: last,
      billing_address: to.line1.slice(0, 80),
      billing_address_2: to.line2.slice(0, 80),
      billing_city: to.city,
      billing_pincode: to.pincode,
      billing_state: to.state,
      billing_country: 'India',
      billing_email: buyer?.user?.email ?? 'orders@spotted.in',
      billing_phone: to.phone,
      shipping_is_billing: true,
      order_items: (items ?? []).map((it: { listing_id: string; title: string; price_inr: number }) => ({
        name: it.title || 'Clothing',
        sku: it.listing_id,
        units: 1,
        selling_price: it.price_inr,
      })),
      payment_method: 'Prepaid',
      sub_total: order.total_inr,
      ...PARCEL,
    })
    if (!created.shipment_id) throw new ShiprocketError('create shipment', 'no shipment id returned')
    shipmentId = String(created.shipment_id)
    await admin
      .from('orders')
      .update({ courier_order_id: String(created.order_id ?? ''), courier_shipment_id: shipmentId })
      .eq('id', order.id)
  }

  let awb = order.courier_provider === 'shiprocket' ? order.tracking_number : null
  let courierName = order.courier
  if (!awb) {
    const gateCourier = courierGate().courierId
    const assigned = await call<{ response?: { data?: { awb_code?: string; courier_name?: string } } }>(
      token,
      'assign courier',
      '/courier/assign/awb',
      gateCourier ? { shipment_id: shipmentId, courier_id: gateCourier } : { shipment_id: shipmentId }
    )
    awb = assigned.response?.data?.awb_code ?? null
    courierName = assigned.response?.data?.courier_name ?? 'Courier'
    if (!awb) throw new ShiprocketError('assign courier', 'no AWB returned')
    // From here the order belongs to Shiprocket: tracking updates move it, and
    // the manual "mark as shipped" path is closed (round8 mark_order_shipped).
    await admin
      .from('orders')
      .update({ courier_provider: 'shiprocket', courier: courierName, tracking_number: awb, courier_status: 'AWB ASSIGNED' })
      .eq('id', order.id)

    try {
      await call(token, 'request pickup', '/courier/generate/pickup', { shipment_id: [shipmentId] })
    } catch (err) {
      // Pickup can also be requested from the Shiprocket panel; the label is
      // still valid, so don't fail the booking over it.
      console.error('pickup request failed', err)
    }
  }

  const label = await call<{ label_url?: string }>(token, 'generate label', '/courier/generate/label', {
    shipment_id: [shipmentId],
  })
  if (!label.label_url) throw new ShiprocketError('generate label', 'no label URL returned')
  await admin.from('orders').update({ label_url: label.label_url }).eq('id', order.id)

  return json(200, { courier: courierName, trackingNumber: awb, labelUrl: label.label_url })
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

  const gate = courierGate()
  if (body.action === 'config') return json(200, { enabled: gate.enabled })
  if (!gate.enabled) return json(503, { error: 'courier_disabled', message: 'Courier booking is not enabled.' })

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
  const authed = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY') ?? '', {
    global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
  })
  const { data: userData } = await authed.auth.getUser()
  const user = userData?.user
  if (!user) return json(401, { error: 'unauthorized' })

  const admin = createClient(supabaseUrl, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '')

  try {
    if (body.action === 'book') return await book(admin, user.id, user.email ?? '', body)
  } catch (err) {
    console.error('courier-label error', err)
    const step = err instanceof ShiprocketError ? err.step : 'booking'
    return json(502, {
      error: 'courier_error',
      message: `Couldn't book the courier (${step}). Try again in a minute.`,
    })
  }
  return json(400, { error: 'unknown_action' })
})
