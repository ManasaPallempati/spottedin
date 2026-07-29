import { errorResponse, json } from '../_shared/http.ts';
import { adminClient } from '../_shared/supabase.ts';
import { verifyRazorpayWebhook } from '../_shared/razorpay.ts';

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
        await admin.rpc('finalize_paid_commerce_order', {
          target_order_id: order.id,
          target_payment_id: paymentId,
        });
      } else if (order && eventType === 'payment.failed') {
        await admin.from('commerce_orders')
          .update({ status: 'payment_failed', razorpay_payment_id: paymentId || null })
          .eq('id', order.id)
          .in('status', ['payment_pending', 'payment_authorized']);
      }
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
