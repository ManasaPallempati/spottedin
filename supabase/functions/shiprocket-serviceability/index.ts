import { corsHeaders, errorResponse, handleOptions, json } from '../_shared/http.ts';
import { adminClient, requireUser } from '../_shared/supabase.ts';
import { checkServiceability } from '../_shared/shiprocket.ts';
import { courierOptions } from '../_shared/commerce.ts';

Deno.serve(async (request) => {
  const cors = corsHeaders(request);
  const options = handleOptions(request);
  if (options) return options;
  try {
    if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405, cors);
    await requireUser(request);
    const body = await request.json() as { listingId?: string; deliveryPostcode?: string };
    if (!body.listingId || !/^[1-9][0-9]{5}$/.test(body.deliveryPostcode ?? '')) {
      throw new Error('Invalid listing or delivery postal code');
    }
    const admin = adminClient();
    const { data: listing, error: listingError } = await admin
      .from('listings')
      .select('id,seller_id,status')
      .eq('id', body.listingId)
      .single();
    if (listingError || !listing || listing.status !== 'live') throw new Error('Invalid live listing');
    const { data: fulfillment, error: fulfillmentError } = await admin
      .from('seller_fulfillment')
      .select('*')
      .eq('user_id', listing.seller_id)
      .eq('enabled', true)
      .single();
    if (fulfillmentError || !fulfillment) throw new Error('Seller shipping is not configured');
    const response = await checkServiceability({
      pickupPostcode: fulfillment.pickup_postal_code,
      deliveryPostcode: body.deliveryPostcode!,
      weightKg: Number(fulfillment.default_weight_kg),
    });
    return json({ couriers: courierOptions(response) }, 200, cors);
  } catch (error) {
    return errorResponse(error, cors);
  }
});
