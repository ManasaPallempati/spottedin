export interface ShippingAddress {
  name: string;
  phone: string;
  email: string;
  line1: string;
  line2: string;
  city: string;
  state: string;
  postalCode: string;
  country: 'India';
}

function text(value: unknown, field: string, max: number): string {
  if (typeof value !== 'string' || !value.trim() || value.trim().length > max) {
    throw new Error(`Invalid ${field}`);
  }
  return value.trim();
}

export function parseShippingAddress(value: unknown, fallbackEmail = ''): ShippingAddress {
  if (!value || typeof value !== 'object') throw new Error('Invalid shipping address');
  const input = value as Record<string, unknown>;
  const phone = text(input.phone, 'phone', 20);
  const postalCode = text(input.postalCode, 'postal code', 6);
  if (!/^[6-9][0-9]{9}$/.test(phone.replace(/^\+91/, ''))) throw new Error('Invalid Indian phone number');
  if (!/^[1-9][0-9]{5}$/.test(postalCode)) throw new Error('Invalid Indian postal code');
  const email = typeof input.email === 'string' && input.email.trim()
    ? text(input.email, 'email', 254)
    : fallbackEmail;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Invalid email');
  return {
    name: text(input.name, 'name', 80),
    phone,
    email,
    line1: text(input.line1, 'address line 1', 180),
    line2: typeof input.line2 === 'string' ? input.line2.trim().slice(0, 180) : '',
    city: text(input.city, 'city', 80),
    state: text(input.state, 'state', 80),
    postalCode,
    country: 'India',
  };
}

export interface CourierOption {
  courierId: number;
  name: string;
  rateINR: number;
  estimatedDays?: number;
  etd?: string;
}

export function courierOptions(payload: Record<string, unknown>): CourierOption[] {
  const data = payload.data as Record<string, unknown> | undefined;
  const rows = data?.available_courier_companies;
  if (!Array.isArray(rows)) return [];
  return rows.flatMap((row) => {
    if (!row || typeof row !== 'object') return [];
    const value = row as Record<string, unknown>;
    const courierId = Number(value.courier_company_id);
    const rateINR = Math.round(Number(value.rate));
    if (!Number.isInteger(courierId) || courierId <= 0 || !Number.isFinite(rateINR) || rateINR < 0) return [];
    return [{
      courierId,
      name: String(value.courier_name ?? 'Courier').slice(0, 120),
      rateINR,
      estimatedDays: Number.isFinite(Number(value.estimated_delivery_days))
        ? Number(value.estimated_delivery_days)
        : undefined,
      etd: typeof value.etd === 'string' ? value.etd : undefined,
    }];
  });
}
