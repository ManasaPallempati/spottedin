// Shiprocket client shared by the courier-label and courier-tracking Edge
// Functions. Deno runtime (Supabase Edge Functions) — not part of the Vite/tsc build.
// Endpoints: https://apiv2.shiprocket.in/v1/external/… (see docs/launch/SHIPROCKET.md).

const BASE = 'https://apiv2.shiprocket.in/v1/external'

export type CourierGate = { enabled: boolean; email: string; password: string; courierId: string }

// Fail-closed activation gate, same shape as razorpayGate: real shipments
// require SHIPROCKET_ENABLED to be the literal 'true' plus the API user's
// email and password. SHIPROCKET_COURIER_ID is optional — without it
// Shiprocket picks the courier.
export function courierGate(): CourierGate {
  const email = Deno.env.get('SHIPROCKET_EMAIL') ?? ''
  const password = Deno.env.get('SHIPROCKET_PASSWORD') ?? ''
  const enabled = Deno.env.get('SHIPROCKET_ENABLED') === 'true' && email !== '' && password !== ''
  return { enabled, email, password, courierId: Deno.env.get('SHIPROCKET_COURIER_ID') ?? '' }
}

export class ShiprocketError extends Error {
  readonly step: string
  constructor(step: string, message: string) {
    super(message)
    this.step = step
  }
}

// Tokens last days, but Edge Functions keep no state between invocations, so
// each booking logs in once. Booking is seller-initiated and rare.
export async function login(gate: CourierGate): Promise<string> {
  const res = await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: gate.email, password: gate.password }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok || typeof data.token !== 'string') throw new ShiprocketError('login', `login failed (${res.status})`)
  return data.token
}

export async function call<T = Record<string, unknown>>(token: string, step: string, path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  })
  const text = await res.text()
  let data: unknown = {}
  try {
    data = JSON.parse(text)
  } catch {
    // keep {} — the status check below reports it
  }
  if (!res.ok) {
    console.error(`shiprocket ${step} failed`, res.status, text.slice(0, 500))
    throw new ShiprocketError(step, `${step} failed (${res.status})`)
  }
  return data as T
}

// Tracking updates carry Shiprocket's status text. Map it onto Spotted's
// order status; anything else (pickup scheduled, RTO, lost…) is recorded in
// orders.courier_status but does not move the order.
export function spottedStatusFor(currentStatus: string): 'shipped' | 'delivered' | null {
  const s = currentStatus.trim().toUpperCase()
  if (s === 'DELIVERED') return 'delivered'
  if (['PICKED UP', 'SHIPPED', 'IN TRANSIT', 'OUT FOR DELIVERY', 'REACHED AT DESTINATION HUB'].includes(s)) return 'shipped'
  return null
}
