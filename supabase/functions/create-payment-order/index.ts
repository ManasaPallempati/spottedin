import { corsHeaders, errorResponse, handleOptions, json } from '../_shared/http.ts';
import { adminClient, requireUser } from '../_shared/supabase.ts';
import { checkServiceability } from '../_shared/shiprocket.ts';
import { courierOptions, parseShippingAddress } from '../_shared/commerce.ts';
import { createRazorpayOrder, razorpayKeyId } from '../_shared/razorpay.ts';

const PLATFORM_FEE_INR = 15;

Deno.serve(async (request) => {
  const cors = corsHeaders(request);
  const options = handleOptions(request);
  if (options) return options;
  try {
    if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405, cors);
    const user = await requireUser(request);
    const body = await request.json() as {
      listingId?: string;
      courierId?: number;
      shippingAddress?: unknown;
    };
    if (!body.listingId || !Number.isInteger(body.courierId)) throw new Error('Invalid checkout request');
    const address = parseShippingAddress(body.shippingAddress, user.email ?? '');
    const admin = adminClient();
    await admin.from('commerce_orders')
      .update({ status: 'expired' })
      .eq('listing_id', body.listingId)
      .eq('status', 'payment_pending')
      .lt('expires_at', new Date().toISOString());

    const { data: listing, error: listingError } = await admin
      .from('listings')
      .select('id,seller_id,title,price_inr,status')
      .eq('id', body.listingId)
      .single();
    if (listingError || !listing || listing.status !== 'live') throw new Error('Invalid live listing');
    if (listing.seller_id === user.id) throw new Error('Invalid checkout: sellers cannot buy their listing');

    const { data: fulfillment, error: fulfillmentError } = await admin
      .from('seller_fulfillment')
      .select('*')
      .eq('user_id', listing.seller_id)
      .eq('enabled', true)
      .single();
    if (fulfillmentError || !fulfillment) throw new Error('Seller shipping is not configured');
    const serviceability = await checkServiceability({
      pickupPostcode: fulfillment.pickup_postal_code,
      deliveryPostcode: address.postalCode,
      weightKg: Number(fulfillment.default_weight_kg),
    });
    const courier = courierOptions(serviceability)
      .find((candidate) => candidate.courierId === body.courierId);
    if (!courier) throw new Error('Invalid or unavailable courier');

    const totalINR = listing.price_inr + PLATFORM_FEE_INR + courier.rateINR;
    const { data: order, error: orderError } = await admin
      .from('commerce_orders')
      .insert({
        listing_id: listing.id,
        buyer_id: user.id,
        seller_id: listing.seller_id,
        item_price_inr: listing.price_inr,
        platform_fee_inr: PLATFORM_FEE_INR,
        shipping_fee_inr: courier.rateINR,
        total_inr: totalINR,
        shipping_address: address,
        courier_id: courier.courierId,
        courier_name: courier.name,
      })
      .select('*')
      .single();
    if (orderError || !order) {
      if (orderError?.code === '23505') return json({ error: 'Another checkout is active for this listing' }, 409, cors);
      throw orderError ?? new Error('Could not create checkout order');
    }

    try {
      const providerOrder = await createRazorpayOrder({
        amountPaise: totalINR * 100,
        receipt: `spotted_${order.id.replaceAll('-', '').slice(0, 32)}`,
        notes: { commerce_order_id: order.id, listing_id: listing.id },
      });
      const providerOrderId = String(providerOrder.id ?? '');
      if (!providerOrderId) throw new Error('Razorpay returned no order ID');
      await admin.from('commerce_orders')
        .update({ razorpay_order_id: providerOrderId })
        .eq('id', order.id);
      return json({
        commerceOrderId: order.id,
        razorpayOrderId: providerOrderId,
        razorpayKeyId: razorpayKeyId(),
        amountPaise: totalINR * 100,
        currency: 'INR',
        name: 'Spotted In',
        description: listing.title,
      }, 200, cors);
    } catch (error) {
      await admin.from('commerce_orders').update({ status: 'payment_failed' }).eq('id', order.id);
      throw error;
    }
  } catch (error) {
    return errorResponse(error, cors);
  }
});
