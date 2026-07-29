import { errorResponse, json } from '../_shared/http.ts';
import { sha256Hex, timingSafeEqualHex } from '../_shared/crypto.ts';
import { adminClient } from '../_shared/supabase.ts';

function asHex(value: string): string {
  return Array.from(
    new TextEncoder().encode(value),
    (byte) => byte.toString(16).padStart(2, '0'),
  ).join('');
}

function shipmentStatus(value: string): string {
  const normalized = value.toLowerCase();
  if (normalized.includes('deliver')) return 'delivered';
  if (normalized.includes('cancel')) return 'cancelled';
  if (normalized.includes('transit') || normalized.includes('pickup')) return 'in_transit';
  return 'awb_assigned';
}

Deno.serve(async (request) => {
  try {
    if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
    const expectedKey = Deno.env.get('SHIPROCKET_WEBHOOK_KEY')?.trim() ?? '';
    const suppliedKey = request.headers.get('x-api-key') ?? '';
    if (!expectedKey || !timingSafeEqualHex(asHex(expectedKey), asHex(suppliedKey))) {
      return json({ error: 'Invalid webhook key' }, 401);
    }

    const rawBody = await request.text();
    const payload = JSON.parse(rawBody) as Record<string, unknown>;
    const awb = String(payload.awb ?? '');
    if (!awb) throw new Error('Invalid Shiprocket webhook payload');
    const eventId = await sha256Hex(rawBody);
    const currentStatus = String(payload.current_status ?? payload.shipment_status ?? '');
    const admin = adminClient();
    const { error: eventError } = await admin.from('provider_events').insert({
      provider: 'shiprocket',
      event_id: eventId,
      event_type: currentStatus || 'tracking_update',
      payload,
    });
    if (eventError?.code === '23505') {
      const { data: existing } = await admin.from('provider_events')
        .select('processed_at')
        .eq('provider', 'shiprocket')
        .eq('event_id', eventId)
        .single();
      if (existing?.processed_at) return json({ duplicate: true });
    } else if (eventError) {
      throw eventError;
    }
    const nextStatus = shipmentStatus(currentStatus);
    const { data: shipment, error: shipmentError } = await admin.from('shipments').update({
      status: nextStatus,
      tracking_payload: payload,
    }).eq('awb_code', awb).select('order_id').maybeSingle();
    if (shipmentError) throw shipmentError;
    if (shipment && nextStatus === 'delivered') {
      await admin.from('route_transfers').update({
        status: 'ready_to_release',
      }).eq('order_id', shipment.order_id).eq('status', 'on_hold');
    }
    await admin.from('provider_events')
      .update({ processed_at: new Date().toISOString() })
      .eq('provider', 'shiprocket')
      .eq('event_id', eventId);
    return json({ received: true });
  } catch (error) {
    return errorResponse(error);
  }
});
