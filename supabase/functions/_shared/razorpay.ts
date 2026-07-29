import { hmacSha256Hex, timingSafeEqualHex } from './crypto.ts';

const API = 'https://api.razorpay.com/v1';

function credentials(): { keyId: string; keySecret: string } {
  const keyId = Deno.env.get('RAZORPAY_KEY_ID')?.trim();
  const keySecret = Deno.env.get('RAZORPAY_KEY_SECRET')?.trim();
  if (!keyId || !keySecret) throw new Error('Missing Razorpay test credentials');
  return { keyId, keySecret };
}

async function request(path: string, init: RequestInit = {}): Promise<Record<string, unknown>> {
  const { keyId, keySecret } = credentials();
  const response = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      authorization: `Basic ${btoa(`${keyId}:${keySecret}`)}`,
      'content-type': 'application/json',
      ...init.headers,
    },
  });
  const payload = await response.json().catch(() => ({})) as Record<string, unknown>;
  if (!response.ok) throw new Error(`Razorpay ${response.status}: ${JSON.stringify(payload)}`);
  return payload;
}

export function razorpayKeyId(): string {
  return credentials().keyId;
}

export function createRazorpayOrder(input: {
  amountPaise: number;
  receipt: string;
  notes: Record<string, string>;
}) {
  return request('/orders', {
    method: 'POST',
    body: JSON.stringify({
      amount: input.amountPaise,
      currency: 'INR',
      receipt: input.receipt,
      notes: input.notes,
    }),
  });
}

export function fetchRazorpayPayment(paymentId: string) {
  return request(`/payments/${encodeURIComponent(paymentId)}`);
}

export async function verifyCheckoutSignature(
  orderId: string,
  paymentId: string,
  signature: string,
): Promise<boolean> {
  const expected = await hmacSha256Hex(credentials().keySecret, `${orderId}|${paymentId}`);
  return timingSafeEqualHex(expected, signature);
}

export async function verifyRazorpayWebhook(rawBody: string, signature: string): Promise<boolean> {
  const secret = Deno.env.get('RAZORPAY_WEBHOOK_SECRET')?.trim();
  if (!secret) throw new Error('Missing Razorpay webhook secret');
  const expected = await hmacSha256Hex(secret, rawBody);
  return timingSafeEqualHex(expected, signature);
}
