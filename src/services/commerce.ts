import { requireSupabase } from '../data/supabase';

export interface ShippingAddress {
  name: string;
  phone: string;
  email: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  postalCode: string;
}

export interface CourierOption {
  courierId: number;
  name: string;
  rateINR: number;
  estimatedDays?: number;
  etd?: string;
}

export interface PaymentOrder {
  commerceOrderId: string;
  razorpayOrderId: string;
  razorpayKeyId: string;
  amountPaise: number;
  currency: 'INR';
  name: 'Spotted In';
  description: string;
}

export interface RazorpaySuccess {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => {
      open(): void;
      on(event: string, callback: (value: unknown) => void): void;
    };
  }
}

async function invoke<T>(name: string, body: Record<string, unknown>): Promise<T> {
  const { data, error } = await requireSupabase().functions.invoke(name, { body });
  if (error) {
    const response = (error as { context?: Response }).context;
    if (response) {
      const payload = await response.clone().json().catch(() => null) as { error?: unknown } | null;
      if (typeof payload?.error === 'string') throw new Error(payload.error);
    }
    throw error;
  }
  return data as T;
}

export function validateShippingAddress(address: ShippingAddress): string | null {
  if (!address.name.trim()) return 'Enter the recipient name.';
  const phone = address.phone.replace(/^\+91/, '');
  if (!/^[6-9][0-9]{9}$/.test(phone)) return 'Enter a valid 10-digit Indian mobile number.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address.email.trim())) return 'Enter a valid email address.';
  if (!address.line1.trim()) return 'Enter the delivery address.';
  if (!address.city.trim()) return 'Enter the city.';
  if (!address.state.trim()) return 'Enter the state.';
  if (!/^[1-9][0-9]{5}$/.test(address.postalCode)) return 'Enter a valid 6-digit Indian PIN code.';
  return null;
}

export async function getCourierOptions(
  listingId: string,
  deliveryPostcode: string,
): Promise<CourierOption[]> {
  const result = await invoke<{ couriers: CourierOption[] }>('shiprocket-serviceability', {
    listingId,
    deliveryPostcode,
  });
  return result.couriers;
}

export function createPaymentOrder(
  listingId: string,
  courierId: number,
  shippingAddress: ShippingAddress,
): Promise<PaymentOrder> {
  return invoke('create-payment-order', { listingId, courierId, shippingAddress });
}

function loadRazorpayCheckout(): Promise<void> {
  if (window.Razorpay) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>('script[data-spotted-razorpay]');
    if (existing) {
      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener('error', () => reject(new Error('Could not load Razorpay Checkout')), { once: true });
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.dataset.spottedRazorpay = 'true';
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Could not load Razorpay Checkout'));
    document.head.appendChild(script);
  });
}

export async function openRazorpayCheckout(
  order: PaymentOrder,
  prefill: Pick<ShippingAddress, 'name' | 'email' | 'phone'>,
): Promise<RazorpaySuccess> {
  await loadRazorpayCheckout();
  if (!window.Razorpay) throw new Error('Razorpay Checkout is unavailable');
  return new Promise((resolve, reject) => {
    const checkout = new window.Razorpay!({
      key: order.razorpayKeyId,
      amount: order.amountPaise,
      currency: order.currency,
      name: order.name,
      description: order.description,
      order_id: order.razorpayOrderId,
      prefill: { name: prefill.name, email: prefill.email, contact: prefill.phone },
      modal: {
        confirm_close: true,
        ondismiss: () => reject(new Error('Payment cancelled')),
      },
      handler: (response: RazorpaySuccess) => resolve(response),
    });
    checkout.on('payment.failed', () => reject(new Error('Payment failed')));
    checkout.open();
  });
}

export function verifyPayment(
  commerceOrderId: string,
  result: RazorpaySuccess,
): Promise<{ status: string }> {
  return invoke('verify-payment', {
    commerceOrderId,
    razorpayOrderId: result.razorpay_order_id,
    razorpayPaymentId: result.razorpay_payment_id,
    razorpaySignature: result.razorpay_signature,
  });
}
