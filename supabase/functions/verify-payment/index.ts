import { corsHeaders, errorResponse, handleOptions, json } from '../_shared/http.ts';
import { adminClient, requireUser } from '../_shared/supabase.ts';
import { fetchRazorpayPayment, verifyCheckoutSignature } from '../_shared/razorpay.ts';

Deno.serve(async (request) => {
  const cors = corsHeaders(request);
  const options = handleOptions(request);
  if (options) return options;
  try {
    if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405, cors);
    const user = await requireUser(request);
    const body = await request.json() as {
      commerceOrderId?: string;
      razorpayOrderId?: string;
      razorpayPaymentId?: string;
      razorpaySignature?: string;
    };
    if (!body.commerceOrderId || !body.razorpayOrderId || !body.razorpayPaymentId || !body.razorpaySignature) {
      throw new Error('Invalid payment verification request');
    }
    const admin = adminClient();
    const { data: order, error } = await admin
      .from('commerce_orders')
      .select('*')
      .eq('id', body.commerceOrderId)
      .eq('buyer_id', user.id)
      .eq('razorpay_order_id', body.razorpayOrderId)
      .single();
    if (error || !order) throw new Error('Forbidden: payment order does not belong to this user');
    if (!await verifyCheckoutSignature(
      body.razorpayOrderId,
      body.razorpayPaymentId,
      body.razorpaySignature,
    )) throw new Error('Forbidden: invalid Razorpay signature');

    const payment = await fetchRazorpayPayment(body.razorpayPaymentId);
    if (
      payment.order_id !== body.razorpayOrderId
      || Number(payment.amount) !== order.total_inr * 100
      || payment.currency !== 'INR'
    ) throw new Error('Forbidden: Razorpay payment details do not match the order');

    if (payment.status === 'captured') {
      const { data: finalStatus, error: finalizeError } = await admin.rpc(
        'finalize_paid_commerce_order',
        { target_order_id: order.id, target_payment_id: body.razorpayPaymentId },
      );
      if (finalizeError) throw finalizeError;
      return json({ status: finalStatus }, 200, cors);
    }
    if (payment.status === 'authorized') {
      await admin.from('commerce_orders')
        .update({
          status: 'payment_authorized',
          razorpay_payment_id: body.razorpayPaymentId,
        })
        .eq('id', order.id);
      return json({ status: 'payment_authorized' }, 202, cors);
    }
    await admin.from('commerce_orders').update({ status: 'payment_failed' }).eq('id', order.id);
    return json({ status: 'payment_failed' }, 402, cors);
  } catch (error) {
    return errorResponse(error, cors);
  }
});
