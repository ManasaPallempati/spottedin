import { errorResponse, json } from '../_shared/http.ts';
import { adminClient } from '../_shared/supabase.ts';
import { verifyRazorpayWebhook } from '../_shared/razorpay.ts';
import { ensureHeldSellerTransfer } from '../_shared/route.ts';

Deno.serve(async (request) => {
  try {
    if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
    const rawBody = await request.text();
    const signature = request.headers.get('x-razorpay-signature') ?? '';
    const eventId = request.headers.get('x-razorpay-event-id') ?? '';
    if (!signature || !eventId || !await verifyRazorpayWebhook(rawBody, signature)) {
      return json({ error: 'Invalid webhook signature' }, 401);
    }
    const payload = JSON.parse(rawBody) as Record<string, any>;
    const eventType = String(payload.event ?? '');
    const admin = adminClient();
    const { error: eventError } = await admin.from('provider_events').insert({
      provider: 'razorpay',
      event_id: eventId,
      event_type: eventType,
      payload,
    });
    if (eventError?.code === '23505') {
      const { data: existing } = await admin.from('provider_events')
        .select('processed_at')
        .eq('provider', 'razorpay')
        .eq('event_id', eventId)
        .single();
      if (existing?.processed_at) return json({ duplicate: true });
    } else if (eventError) {
      throw eventError;
    }

    const payment = payload.payload?.payment?.entity ?? {};
    const providerOrderId = String(payment.order_id ?? payload.payload?.order?.entity?.id ?? '');
    const paymentId = String(payment.id ?? '');
    if (providerOrderId) {
      const { data: order } = await admin
        .from('commerce_orders')
        .select('id')
        .eq('razorpay_order_id', providerOrderId)
        .maybeSingle();
      if (order && (eventType === 'payment.captured' || eventType === 'order.paid')) {
        const { data: finalStatus, error: finalizeError } = await admin.rpc('finalize_paid_commerce_order', {
          target_order_id: order.id,
          target_payment_id: paymentId,
        });
        if (finalizeError) throw finalizeError;
        if (finalStatus === 'paid') {
          await ensureHeldSellerTransfer(order.id).catch((transferError: unknown) => {
            console.error('Could not create held seller transfer', transferError);
          });
        }
      } else if (order && eventType === 'payment.failed') {
        await admin.from('commerce_orders')
          .update({ status: 'payment_failed', razorpay_payment_id: paymentId || null })
          .eq('id', order.id)
          .in('status', ['payment_pending', 'payment_authorized']);
      }
    }

    const transfer = payload.payload?.transfer?.entity ?? {};
    const transferId = String(transfer.id ?? '');
    if (transferId) {
      const providerStatus = String(transfer.status ?? '');
      const mappedStatus = providerStatus === 'processed' ? (transfer.on_hold ? 'on_hold' : 'processed')
        : providerStatus === 'reversed' ? 'reversed'
        : providerStatus === 'partially_reversed' ? 'partially_reversed'
        : providerStatus === 'failed' ? 'failed'
        : 'creating';
      await admin.from('route_transfers').update({
        status: mappedStatus,
        settlement_status: transfer.settlement_status ?? null,
        on_hold: Boolean(transfer.on_hold),
        last_error: transfer.error?.description ?? null,
      }).eq('razorpay_transfer_id', transferId);
    }
    await admin.from('provider_events')
      .update({ processed_at: new Date().toISOString() })
      .eq('provider', 'razorpay')
      .eq('event_id', eventId);
    return json({ received: true });
  } catch (error) {
    return errorResponse(error);
  }
});
