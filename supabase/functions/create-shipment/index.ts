import { corsHeaders, errorResponse, handleOptions, json } from '../_shared/http.ts';
import { adminClient, requireUser } from '../_shared/supabase.ts';
import { assignAwb, createShiprocketOrder, schedulePickup } from '../_shared/shiprocket.ts';

Deno.serve(async (request) => {
  const cors = corsHeaders(request);
  const options = handleOptions(request);
  if (options) return options;
  try {
    if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405, cors);
    const user = await requireUser(request);
    const { commerceOrderId } = await request.json() as { commerceOrderId?: string };
    if (!commerceOrderId) throw new Error('Invalid commerce order');
    const admin = adminClient();
    const { data: order, error: orderError } = await admin
      .from('commerce_orders')
      .select('*,listings(title)')
      .eq('id', commerceOrderId)
      .eq('seller_id', user.id)
      .eq('status', 'paid')
      .single();
    if (orderError || !order) throw new Error('Forbidden: only the paid order seller can create shipment');
    const { data: existingShipment } = await admin.from('shipments')
      .select('*')
      .eq('order_id', order.id)
      .maybeSingle();
    if (existingShipment?.provider_order_id) {
      return json({ shipment: existingShipment, idempotent: true }, 200, cors);
    }

    const { data: fulfillment } = await admin.from('seller_fulfillment')
      .select('*').eq('user_id', user.id).eq('enabled', true).single();
    if (!fulfillment) throw new Error('Seller shipping is not configured');
    const address = order.shipping_address as Record<string, string>;
    const listing = Array.isArray(order.listings) ? order.listings[0] : order.listings;
    const created = await createShiprocketOrder({
      order_id: order.id,
      order_date: new Date().toISOString().slice(0, 19).replace('T', ' '),
      pickup_location: fulfillment.pickup_location,
      billing_customer_name: address.name,
      billing_last_name: '',
      billing_address: address.line1,
      billing_address_2: address.line2,
      billing_city: address.city,
      billing_pincode: address.postalCode,
      billing_state: address.state,
      billing_country: 'India',
      billing_email: address.email,
      billing_phone: address.phone,
      shipping_is_billing: true,
      order_items: [{
        name: listing?.title ?? 'Spotted In item',
        sku: order.listing_id,
        units: 1,
        selling_price: order.item_price_inr,
        discount: 0,
        tax: 0,
      }],
      payment_method: 'Prepaid',
      shipping_charges: order.shipping_fee_inr,
      sub_total: order.item_price_inr,
      length: Number(fulfillment.default_length_cm),
      breadth: Number(fulfillment.default_breadth_cm),
      height: Number(fulfillment.default_height_cm),
      weight: Number(fulfillment.default_weight_kg),
    });
    const providerOrderId = String(created.order_id ?? '');
    const shipmentId = Number(created.shipment_id);
    if (!providerOrderId || !Number.isFinite(shipmentId)) throw new Error('Shiprocket returned incomplete order data');
    const awb = await assignAwb(shipmentId, Number(order.courier_id));
    const awbData = awb.response as Record<string, any> | undefined;
    const awbCode = String(
      awb.awb_code ?? awbData?.data?.awb_code ?? created.awb_code ?? '',
    );
    await schedulePickup(shipmentId);
    const { data: shipment, error: shipmentError } = await admin.from('shipments').upsert({
      order_id: order.id,
      provider_order_id: providerOrderId,
      provider_shipment_id: String(shipmentId),
      awb_code: awbCode || null,
      courier_id: order.courier_id,
      courier_name: order.courier_name,
      status: 'pickup_scheduled',
      tracking_payload: { created, awb },
    }, { onConflict: 'order_id' }).select('*').single();
    if (shipmentError) throw shipmentError;
    return json({ shipment }, 200, cors);
  } catch (error) {
    return errorResponse(error, cors);
  }
});
