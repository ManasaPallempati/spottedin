const API = 'https://apiv2.shiprocket.in/v1/external';
let cachedToken: { value: string; expiresAt: number } | null = null;

async function token(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now()) return cachedToken.value;
  const email = Deno.env.get('SHIPROCKET_EMAIL')?.trim();
  const password = Deno.env.get('SHIPROCKET_PASSWORD')?.trim();
  if (!email || !password) throw new Error('Missing Shiprocket API credentials');
  const response = await fetch(`${API}/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const payload = await response.json().catch(() => ({})) as { token?: string };
  if (!response.ok || !payload.token) {
    throw new Error(`Shiprocket authentication failed (${response.status})`);
  }
  cachedToken = { value: payload.token, expiresAt: Date.now() + 9 * 24 * 60 * 60 * 1000 };
  return payload.token;
}

async function request(path: string, init: RequestInit = {}): Promise<Record<string, unknown>> {
  const response = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      authorization: `Bearer ${await token()}`,
      'content-type': 'application/json',
      ...init.headers,
    },
  });
  const payload = await response.json().catch(() => ({})) as Record<string, unknown>;
  if (!response.ok) throw new Error(`Shiprocket ${response.status}: ${JSON.stringify(payload)}`);
  return payload;
}

export function checkServiceability(input: {
  pickupPostcode: string;
  deliveryPostcode: string;
  weightKg: number;
  cod?: boolean;
}) {
  const query = new URLSearchParams({
    pickup_postcode: input.pickupPostcode,
    delivery_postcode: input.deliveryPostcode,
    weight: String(input.weightKg),
    cod: input.cod ? '1' : '0',
  });
  return request(`/courier/serviceability/?${query}`);
}

export function createShiprocketOrder(payload: Record<string, unknown>) {
  return request('/orders/create/adhoc', { method: 'POST', body: JSON.stringify(payload) });
}

export function assignAwb(shipmentId: number, courierId: number) {
  return request('/courier/assign/awb', {
    method: 'POST',
    body: JSON.stringify({ shipment_id: shipmentId, courier_id: courierId }),
  });
}

export function schedulePickup(shipmentId: number) {
  return request('/courier/generate/pickup', {
    method: 'POST',
    body: JSON.stringify({ shipment_id: [shipmentId] }),
  });
}
