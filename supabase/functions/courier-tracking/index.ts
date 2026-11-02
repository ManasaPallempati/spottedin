// courier-tracking — receives Shiprocket tracking webhooks (server-to-server).
// Deploy with JWT verification OFF (Shiprocket cannot send Supabase JWTs):
//   supabase functions deploy courier-tracking --no-verify-jwt
// Named without "shiprocket": Shiprocket rejects webhook URLs containing
// "shiprocket", "kartrocket", "sr" or "kr".
// Authentication: the x-api-key header must equal SHIPROCKET_WEBHOOK_TOKEN
// (the security token set next to the webhook URL in Shiprocket). Without
// that secret the function fails closed.
// Each update stores Shiprocket's status text on the order and moves it
// forward only: paid -> shipped -> delivered. Late or repeated deliveries
// never move an order backwards.
import { createClient } from 'jsr:@supabase/supabase-js@2'
import { timingSafeEqual } from '../_shared/razorpay.ts'
import { courierGate, spottedStatusFor } from '../_shared/shiprocket.ts'

type TrackingEvent = { awb?: string | number; current_status?: string; courier_name?: string }

const RANK: Record<string, number> = { paid: 0, shipped: 1, delivered: 2 }

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('method not allowed', { status: 405 })

  const secret = Deno.env.get('SHIPROCKET_WEBHOOK_TOKEN') ?? ''
  if (!courierGate().enabled || secret === '') return new Response('courier disabled', { status: 503 })
  if (!timingSafeEqual(req.headers.get('x-api-key') ?? '', secret)) {
    return new Response('unauthorized', { status: 401 })
  }

  let event: TrackingEvent
  try {
    event = await req.json()
  } catch {
    return new Response('bad json', { status: 400 })
  }
  const awb = event.awb != null ? String(event.awb) : ''
  const currentStatus = typeof event.current_status === 'string' ? event.current_status : ''
  // Shiprocket expects 200 for anything it should not retry.
  if (awb === '' || currentStatus === '') return new Response('ignored', { status: 200 })

  const admin = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '')
  const { data: order, error } = await admin
    .from('orders')
    .select('id, status')
    .eq('tracking_number', awb)
    .eq('courier_provider', 'shiprocket')
    .maybeSingle()
  if (error) return new Response('lookup failed', { status: 500 })
  if (!order) return new Response('unknown awb', { status: 200 })

  const update: Record<string, unknown> = { courier_status: currentStatus.slice(0, 60) }
  const next = spottedStatusFor(currentStatus)
  if (next && (RANK[next] ?? -1) > (RANK[order.status] ?? 99)) {
    const now = new Date().toISOString()
    update.status = next
    if (next === 'shipped') update.shipped_at = now
    if (next === 'delivered') {
      update.delivered_at = now
      // Skipped straight to delivered (missed or out-of-order events).
      if (order.status === 'paid') update.shipped_at = now
    }
  }

  const { error: updateError } = await admin.from('orders').update(update).eq('id', order.id)
  if (updateError) return new Response('update failed', { status: 500 })
  return new Response('ok', { status: 200 })
})
