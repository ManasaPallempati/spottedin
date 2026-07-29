import { adminClient } from './supabase.ts';
import { createHeldRouteTransfer } from './razorpay.ts';

interface RouteTransferClaim {
  payout_id: string;
  payment_id: string;
  linked_account_id: string;
  amount_inr: number;
  acquired: boolean;
}

function transferEntity(payload: Record<string, unknown>): Record<string, unknown> {
  const items = payload.items;
  if (!Array.isArray(items) || !items[0] || typeof items[0] !== 'object') {
    throw new Error('Razorpay Route returned no transfer entity');
  }
  return items[0] as Record<string, unknown>;
}

export async function ensureHeldSellerTransfer(orderId: string): Promise<string> {
  const admin = adminClient();
  const { data, error } = await admin.rpc('claim_route_transfer', {
    target_order_id: orderId,
  });
  if (error) throw error;
  const claim = (Array.isArray(data) ? data[0] : data) as RouteTransferClaim | null;
  if (!claim) return 'not_eligible';
  if (!claim.acquired) return 'already_recorded';

  try {
    const payload = await createHeldRouteTransfer({
      paymentId: claim.payment_id,
      accountId: claim.linked_account_id,
      amountPaise: claim.amount_inr * 100,
      notes: { spotted_order_id: orderId },
    });
    const transfer = transferEntity(payload);
    const transferId = String(transfer.id ?? '');
    if (!transferId) throw new Error('Razorpay Route returned no transfer ID');
    const settlementStatus = String(transfer.settlement_status ?? 'on_hold');
    const { error: updateError } = await admin.from('route_transfers').update({
      razorpay_transfer_id: transferId,
      status: 'on_hold',
      settlement_status: settlementStatus,
      on_hold: true,
      last_error: null,
    }).eq('id', claim.payout_id);
    if (updateError) throw updateError;
    return 'on_hold';
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Route transfer failed';
    await admin.from('route_transfers').update({
      status: 'failed',
      last_error: message.slice(0, 1000),
    }).eq('id', claim.payout_id);
    throw error;
  }
}

