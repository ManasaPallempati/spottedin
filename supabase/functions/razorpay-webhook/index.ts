// razorpay-webhook — receives Razorpay webhook events (server-to-server).
// Deploy with JWT verification OFF (Razorpay cannot send Supabase JWTs):
//   supabase functions deploy razorpay-webhook --no-verify-jwt
// Authentication is the HMAC signature over the raw body using
// RAZORPAY_WEBHOOK_SECRET; without that secret the function fails closed.
// Handled events: payment.captured (finalize, idempotent with client verify),
// payment.failed (mark failed unless already paid), refund.processed (mark
// payment + order refunded). Everything else is acknowledged and ignored.
// Duplicate/late deliveries are safe: every handler is idempotent, and the
// razorpay_webhook_events ledger short-circuits exact redeliveries.
import { createClient } from 'jsr:@supabase/supabase-js@2'
import { finalizePaidPayment, hmacSha256Hex, razorpayGate, timingSafeEqual, type PaymentRow } from '../_shared/razorpay.ts'

type PaymentEntity = { id: string; order_id: string; amount: number }
type RefundEntity = { id: string; payment_id: string }

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('method not allowed', { status: 405 })

  const gate = razorpayGate()
  const webhookSecret = Deno.env.get('RAZORPAY_WEBHOOK_SECRET') ?? ''
  if (!gate.enabled || webhookSecret === '') return new Response('payments disabled', { status: 503 })

  const raw = await req.text()
  const signature = req.headers.get('x-razorpay-signature') ?? ''
  const expected = await hmacSha256Hex(webhookSecret, raw)
  if (signature === '' || !timingSafeEqual(expected, signature)) {
    return new Response('bad signature', { status: 400 })
  }

  let event: { event?: string; payload?: Record<string, { entity?: unknown }> }
  try {
    event = JSON.parse(raw)
  } catch {
    return new Response('bad json', { status: 400 })
  }

  const admin = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )

  // Dedup ledger. Handlers below are idempotent anyway, so a failure after
  // this insert deletes the ledger row before returning 500 — Razorpay's
  // retry then reprocesses instead of being swallowed as a duplicate.
  const eventId = req.headers.get('x-razorpay-event-id') ?? ''
  if (eventId !== '') {
    const { error } = await admin
      .from('razorpay_webhook_events')
      .insert({ event_id: eventId, event_type: event.event ?? '' })
    if (error) {
      if (error.code === '23505') return new Response('duplicate', { status: 200 })
      return new Response('ledger error', { status: 500 })
    }
  }

  try {
    switch (event.event) {
      case 'payment.captured': {
        const entity = event.payload?.payment?.entity as PaymentEntity | undefined
        if (!entity?.order_id || !entity.id) return new Response('malformed', { status: 200 })
        const { data: payment } = await admin
          .from('payments')
          .select('*')
          .eq('razorpay_order_id', entity.order_id)
          .maybeSingle()
        if (!payment) return new Response('unknown order', { status: 200 })
        if (entity.amount !== payment.amount_paise) {
          // Never finalize on a mismatched amount — leave the row for manual review.
          console.error('amount mismatch', payment.id, entity.amount, payment.amount_paise)
          return new Response('amount mismatch', { status: 200 })
        }
        if (payment.status === 'refunded') return new Response('already refunded', { status: 200 })
        await finalizePaidPayment(admin, payment as PaymentRow, entity.id)
        return new Response('ok', { status: 200 })
      }
      case 'payment.failed': {
        const entity = event.payload?.payment?.entity as PaymentEntity | undefined
        if (!entity?.order_id) return new Response('malformed', { status: 200 })
        // Only created -> failed: a failed attempt never demotes a captured one.
        await admin
          .from('payments')
          .update({ status: 'failed', updated_at: new Date().toISOString() })
          .eq('razorpay_order_id', entity.order_id)
          .eq('status', 'created')
        return new Response('ok', { status: 200 })
      }
      case 'refund.processed': {
        const entity = event.payload?.refund?.entity as RefundEntity | undefined
        if (!entity?.payment_id) return new Response('malformed', { status: 200 })
        const { data: payment } = await admin
          .from('payments')
          .select('id, status')
          .eq('razorpay_payment_id', entity.payment_id)
          .maybeSingle()
        if (!payment) return new Response('unknown payment', { status: 200 })
        await admin
          .from('payments')
          .update({ status: 'refunded', updated_at: new Date().toISOString() })
          .eq('id', payment.id)
          .eq('status', 'paid')
        await admin.from('orders').update({ payment_status: 'refunded' }).eq('payment_id', payment.id)
        return new Response('ok', { status: 200 })
      }
      default:
        return new Response('ignored', { status: 200 })
    }
  } catch (err) {
    console.error('razorpay-webhook error', err)
    if (eventId !== '') {
      await admin.from('razorpay_webhook_events').delete().eq('event_id', eventId)
    }
    return new Response('processing error', { status: 500 })
  }
})
