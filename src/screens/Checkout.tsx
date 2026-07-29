import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import TopBar from '../components/TopBar';
import PriceTag from '../components/PriceTag';
import EmptyState from '../components/EmptyState';
import { useAuth } from '../auth/AuthProvider';
import { getListing, getSeller, placeOrder } from '../data/store';
import { loadListing } from '../data/listings';
import { isSupabaseConfigured } from '../data/supabase';
import {
  createPaymentOrder,
  getCourierOptions,
  openRazorpayCheckout,
  validateShippingAddress,
  verifyPayment,
  type CourierOption,
  type ShippingAddress,
} from '../services/commerce';

const PLATFORM_FEE = 15;
const EMPTY_ADDRESS: ShippingAddress = {
  name: '',
  phone: '',
  email: '',
  line1: '',
  line2: '',
  city: '',
  state: '',
  postalCode: '',
};

interface ConfirmedOrder {
  id: string;
  totalINR: number;
  status: string;
}

export default function Checkout() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const [loading, setLoading] = useState(isSupabaseConfigured);
  const [loadError, setLoadError] = useState('');
  const [address, setAddress] = useState<ShippingAddress>(() => ({
    ...EMPTY_ADDRESS,
    email: user?.email ?? '',
    name: profile?.name ?? '',
  }));
  const [couriers, setCouriers] = useState<CourierOption[]>([]);
  const [selectedCourierId, setSelectedCourierId] = useState<number | null>(null);
  const [quoting, setQuoting] = useState(false);
  const [placing, setPlacing] = useState(false);
  const [order, setOrder] = useState<ConfirmedOrder | null>(null);
  const [placeError, setPlaceError] = useState('');

  useEffect(() => {
    setAddress((current) => ({
      ...current,
      email: current.email || user?.email || '',
      name: current.name || profile?.name || '',
    }));
  }, [profile?.name, user?.email]);

  useEffect(() => {
    if (!id) return;
    let active = true;
    setLoading(true);
    setLoadError('');
    void loadListing(id)
      .catch((error: unknown) => {
        if (active) setLoadError(error instanceof Error ? error.message : 'Could not load listing');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [id]);

  const listing = id ? getListing(id) : undefined;
  const seller = listing ? getSeller(listing.sellerId) : undefined;
  const selectedCourier = couriers.find((courier) => courier.courierId === selectedCourierId);
  const total = useMemo(
    () => (listing ? listing.priceINR + PLATFORM_FEE + (selectedCourier?.rateINR ?? 0) : 0),
    [listing, selectedCourier],
  );

  if (loading && !listing) {
    return (
      <>
        <TopBar title="Checkout" />
        <EmptyState emoji="⏳" title="Loading checkout…" />
      </>
    );
  }

  if (!listing) {
    return (
      <>
        <TopBar title="Checkout" />
        <EmptyState
          emoji={loadError ? '⚠️' : '🔍'}
          title={loadError ? 'Could not load listing' : 'Listing not found'}
          subtitle={loadError || 'This item may have been removed.'}
        />
      </>
    );
  }

  const sold = listing.status === 'sold';

  if (sold && !order) {
    return (
      <>
        <TopBar title="Checkout" />
        <EmptyState emoji="✅" title="Already sold" subtitle="This item has already been bought by someone else." />
      </>
    );
  }

  function updateAddress(field: keyof ShippingAddress, value: string) {
    setAddress((current) => ({ ...current, [field]: value }));
    setPlaceError('');
    if (field === 'postalCode') {
      setCouriers([]);
      setSelectedCourierId(null);
    }
  }

  async function handleGetCouriers() {
    if (!listing || quoting) return;
    if (!/^[1-9][0-9]{5}$/.test(address.postalCode)) {
      setPlaceError('Enter a valid 6-digit Indian PIN code.');
      return;
    }
    setQuoting(true);
    setPlaceError('');
    try {
      const options = isSupabaseConfigured
        ? await getCourierOptions(listing.id, address.postalCode)
        : [{ courierId: 1, name: 'Demo standard delivery', rateINR: 60, estimatedDays: 4 }];
      if (!options.length) throw new Error('No delivery service is available for this PIN code.');
      setCouriers(options);
      setSelectedCourierId(options[0].courierId);
    } catch (error) {
      setCouriers([]);
      setSelectedCourierId(null);
      setPlaceError(error instanceof Error ? error.message : 'Could not load delivery options.');
    } finally {
      setQuoting(false);
    }
  }

  async function handlePlaceOrder() {
    if (!listing || placing || sold) return;
    const addressError = validateShippingAddress(address);
    if (addressError) {
      setPlaceError(addressError);
      return;
    }
    if (!selectedCourier) {
      setPlaceError('Check delivery and choose a courier before paying.');
      return;
    }

    setPlacing(true);
    setPlaceError('');
    try {
      if (!isSupabaseConfigured) {
        const demoOrder = placeOrder(listing.id, 'upi');
        setOrder({ id: demoOrder.id, totalINR: total, status: 'paid' });
        return;
      }

      const paymentOrder = await createPaymentOrder(listing.id, selectedCourier.courierId, address);
      const paymentResult = await openRazorpayCheckout(paymentOrder, address);
      const verified = await verifyPayment(paymentOrder.commerceOrderId, paymentResult);
      if (!['paid', 'payment_authorized'].includes(verified.status)) {
        throw new Error('Payment was not confirmed. No order has been completed.');
      }
      setOrder({
        id: paymentOrder.commerceOrderId,
        totalINR: paymentOrder.amountPaise / 100,
        status: verified.status,
      });
    } catch (error) {
      setPlaceError(error instanceof Error ? error.message : 'Could not complete payment.');
    } finally {
      setPlacing(false);
    }
  }

  if (order) {
    const captured = order.status === 'paid';
    return (
      <div className="checkout-page">
        <TopBar title={captured ? 'Order placed' : 'Payment processing'} onBack={() => navigate('/')} />
        <div className="checkout-success">
          <div className="checkout-success__badge" aria-hidden="true">{captured ? '✅' : '⏳'}</div>
          <h2 className="checkout-success__title">{captured ? 'Order confirmed!' : 'Payment is processing'}</h2>
          <p className="checkout-success__sub">
            {captured
              ? <>Your order for <strong>{listing.title}</strong> has been placed.</>
              : 'Razorpay authorized the payment. We will confirm the order after capture.'}
          </p>

          <div className="checkout-card checkout-success__card">
            <div className="checkout-row">
              <span className="checkout-row__label">Order ID</span>
              <span className="checkout-row__value checkout-row__value--mono">{order.id}</span>
            </div>
            <div className="checkout-row">
              <span className="checkout-row__label">Payment</span>
              <span className="checkout-row__value">Razorpay</span>
            </div>
            <div className="checkout-row">
              <span className="checkout-row__label">Amount</span>
              <PriceTag priceINR={order.totalINR} size="md" />
            </div>
          </div>

          <p className="checkout-razorpay-note">Secure payments by Razorpay</p>

          <div className="checkout-success__actions">
            <button type="button" className="btn btn-primary btn-block" onClick={() => navigate('/')}>
              Back to feed
            </button>
            <button
              type="button"
              className="btn btn-outline btn-block"
              onClick={() => navigate(`/seller/${listing.sellerId}`)}
            >
              View seller
            </button>
          </div>
        </div>
        <CheckoutStyles />
      </div>
    );
  }

  return (
    <div className="checkout-page">
      <TopBar title="Checkout" />

      <div className="checkout-summary">
        <div
          className="checkout-summary__tile"
          style={{
            background: listing.photoDataUrl
              ? undefined
              : `linear-gradient(135deg, ${listing.gradient[0]}, ${listing.gradient[1]})`,
          }}
        >
          {listing.photoDataUrl ? (
            <img src={listing.photoDataUrl} alt="" className="checkout-summary__img" />
          ) : (
            <span aria-hidden="true">{listing.emoji}</span>
          )}
        </div>
        <div className="checkout-summary__info">
          <p className="checkout-summary__title">{listing.title}</p>
          <p className="checkout-summary__meta">
            {seller ? `${seller.avatarEmoji} ${seller.name}` : 'Unknown seller'}
            {listing.size ? ` · Size ${listing.size}` : ''}
          </p>
          <PriceTag priceINR={listing.priceINR} size="lg" />
        </div>
      </div>

      <section className="checkout-section" aria-labelledby="delivery-address-heading">
        <h2 id="delivery-address-heading" className="checkout-section__heading">Delivery address</h2>
        <div className="checkout-form-grid">
          <label className="checkout-field checkout-field--wide">
            <span>Full name</span>
            <input
              className="input"
              autoComplete="name"
              value={address.name}
              onChange={(event) => updateAddress('name', event.target.value)}
            />
          </label>
          <label className="checkout-field">
            <span>Mobile number</span>
            <input
              className="input"
              inputMode="tel"
              autoComplete="tel"
              placeholder="10-digit mobile"
              value={address.phone}
              onChange={(event) => updateAddress('phone', event.target.value)}
            />
          </label>
          <label className="checkout-field">
            <span>Email</span>
            <input
              className="input"
              inputMode="email"
              autoComplete="email"
              value={address.email}
              onChange={(event) => updateAddress('email', event.target.value)}
            />
          </label>
          <label className="checkout-field checkout-field--wide">
            <span>Address</span>
            <input
              className="input"
              autoComplete="address-line1"
              placeholder="House, street, area"
              value={address.line1}
              onChange={(event) => updateAddress('line1', event.target.value)}
            />
          </label>
          <label className="checkout-field checkout-field--wide">
            <span>Apartment, landmark (optional)</span>
            <input
              className="input"
              autoComplete="address-line2"
              value={address.line2}
              onChange={(event) => updateAddress('line2', event.target.value)}
            />
          </label>
          <label className="checkout-field">
            <span>City</span>
            <input
              className="input"
              autoComplete="address-level2"
              value={address.city}
              onChange={(event) => updateAddress('city', event.target.value)}
            />
          </label>
          <label className="checkout-field">
            <span>State</span>
            <input
              className="input"
              autoComplete="address-level1"
              value={address.state}
              onChange={(event) => updateAddress('state', event.target.value)}
            />
          </label>
          <label className="checkout-field checkout-field--wide">
            <span>PIN code</span>
            <div className="checkout-pin-row">
              <input
                className="input"
                inputMode="numeric"
                autoComplete="postal-code"
                maxLength={6}
                value={address.postalCode}
                onChange={(event) => updateAddress('postalCode', event.target.value.replace(/\D/g, '').slice(0, 6))}
              />
              <button
                type="button"
                className="btn btn-outline"
                disabled={quoting || address.postalCode.length !== 6}
                onClick={() => void handleGetCouriers()}
              >
                {quoting ? 'Checking…' : 'Check delivery'}
              </button>
            </div>
          </label>
        </div>
      </section>

      {couriers.length > 0 && (
        <section className="checkout-section" aria-labelledby="delivery-option-heading">
          <h2 id="delivery-option-heading" className="checkout-section__heading">Delivery option</h2>
          <div className="checkout-couriers">
            {couriers.map((courier) => (
              <button
                key={courier.courierId}
                type="button"
                className={`checkout-courier${selectedCourierId === courier.courierId ? ' is-selected' : ''}`}
                onClick={() => setSelectedCourierId(courier.courierId)}
              >
                <span>
                  <strong>{courier.name}</strong>
                  <small>
                    {courier.etd
                      ? `Expected ${courier.etd}`
                      : courier.estimatedDays
                        ? `${courier.estimatedDays} day delivery`
                        : 'Tracked delivery'}
                  </small>
                </span>
                <PriceTag priceINR={courier.rateINR} size="sm" />
              </button>
            ))}
          </div>
        </section>
      )}

      <div className="checkout-card">
        <div className="checkout-row">
          <span className="checkout-row__label">Item price</span>
          <PriceTag priceINR={listing.priceINR} size="sm" />
        </div>
        <div className="checkout-row">
          <span className="checkout-row__label">Platform fee</span>
          <PriceTag priceINR={PLATFORM_FEE} size="sm" />
        </div>
        <div className="checkout-row">
          <span className="checkout-row__label">Delivery</span>
          {selectedCourier ? <PriceTag priceINR={selectedCourier.rateINR} size="sm" /> : <span>—</span>}
        </div>
        <div className="checkout-row checkout-row--total">
          <span className="checkout-row__label">Total</span>
          <PriceTag priceINR={total} size="md" />
        </div>
      </div>

      <div className="checkout-sheet">
        <p className="checkout-sheet__heading">Secure online payment</p>
        <p className="checkout-payment-copy">
          UPI, cards, wallets and netbanking open securely in Razorpay Checkout. Cash on delivery is not available in beta.
        </p>
        {placeError && <p className="checkout-place-error" role="alert">{placeError}</p>}
        <button
          type="button"
          className="btn btn-primary btn-block checkout-pay-btn"
          onClick={() => void handlePlaceOrder()}
          disabled={placing || sold || !selectedCourier}
        >
          {placing ? 'Opening Razorpay…' : `Pay ₹${total.toLocaleString('en-IN')}`}
        </button>
        <p className="checkout-razorpay-note">
          {isSupabaseConfigured ? 'Secure payments by Razorpay' : 'Local demo mode — no real payment'}
        </p>
      </div>
      <CheckoutStyles />
    </div>
  );
}

// Screen-scoped styles kept local to this file per file-ownership rules.
function CheckoutStyles() {
  return (
    <style>{`
      .checkout-page {
        display: flex;
        flex-direction: column;
        gap: 14px;
        padding-bottom: 24px;
      }

      .checkout-summary {
        display: flex;
        gap: 12px;
        padding: 16px;
      }

      .checkout-summary__tile {
        width: 72px;
        height: 72px;
        border-radius: var(--radius);
        flex-shrink: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 32px;
        overflow: hidden;
      }

      .checkout-summary__img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }

      .checkout-summary__info {
        display: flex;
        flex-direction: column;
        gap: 4px;
        justify-content: center;
        min-width: 0;
      }

      .checkout-summary__title {
        font-size: 15px;
        font-weight: 700;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .checkout-summary__meta {
        font-size: 13px;
        color: var(--ink-soft);
      }

      .checkout-section {
        margin: 0 16px;
        padding: 16px;
        border: 1px solid var(--border);
        border-radius: var(--radius);
        background: var(--surface);
      }

      .checkout-section__heading,
      .checkout-sheet__heading {
        font-size: 13px;
        font-weight: 700;
        color: var(--ink-soft);
        text-transform: uppercase;
        letter-spacing: 0.03em;
        margin-bottom: 12px;
      }

      .checkout-form-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 12px;
      }

      .checkout-field {
        display: flex;
        flex-direction: column;
        gap: 6px;
        min-width: 0;
        font-size: 12px;
        font-weight: 600;
        color: var(--ink-soft);
      }

      .checkout-field--wide {
        grid-column: 1 / -1;
      }

      .checkout-pin-row {
        display: grid;
        grid-template-columns: minmax(0, 1fr) auto;
        gap: 8px;
      }

      .checkout-pin-row .btn {
        white-space: nowrap;
      }

      .checkout-couriers {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }

      .checkout-courier {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        width: 100%;
        padding: 12px;
        border: 1.5px solid var(--border);
        border-radius: var(--radius-sm);
        background: var(--surface);
        color: var(--ink);
        text-align: left;
      }

      .checkout-courier.is-selected {
        border-color: var(--accent);
        background: color-mix(in srgb, var(--accent) 6%, var(--surface));
      }

      .checkout-courier span {
        display: flex;
        flex-direction: column;
        gap: 3px;
      }

      .checkout-courier strong {
        font-size: 14px;
      }

      .checkout-courier small {
        color: var(--ink-soft);
      }

      .checkout-card {
        margin: 0 16px;
        padding: 14px 16px;
        border-radius: var(--radius);
        background: var(--bg);
        display: flex;
        flex-direction: column;
        gap: 10px;
      }

      .checkout-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
      }

      .checkout-row__label {
        font-size: 14px;
        color: var(--ink-soft);
      }

      .checkout-row__value {
        font-size: 14px;
        font-weight: 600;
      }

      .checkout-row__value--mono {
        overflow-wrap: anywhere;
        text-align: right;
        font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
        font-size: 12px;
      }

      .checkout-row--total {
        padding-top: 10px;
        border-top: 1px dashed var(--border);
      }

      .checkout-row--total .checkout-row__label {
        font-weight: 700;
        color: var(--ink);
      }

      .checkout-sheet {
        margin-top: auto;
        padding: 18px 16px 20px;
        border-top: 1px solid var(--border);
        background: var(--surface);
        border-radius: 20px 20px 0 0;
        box-shadow: 0 -8px 24px rgba(19, 19, 19, 0.06);
        display: flex;
        flex-direction: column;
        gap: 10px;
      }

      .checkout-sheet__heading {
        margin-bottom: 0;
      }

      .checkout-payment-copy {
        font-size: 13px;
        line-height: 1.45;
        color: var(--ink-soft);
      }

      .checkout-place-error {
        font-size: 13px;
        font-weight: 600;
        color: var(--accent-2);
        text-align: center;
      }

      .checkout-pay-btn {
        margin-top: 6px;
      }

      .checkout-razorpay-note {
        text-align: center;
        font-size: 11px;
        color: var(--ink-soft);
        margin-top: 2px;
      }

      .checkout-success {
        display: flex;
        flex-direction: column;
        align-items: center;
        text-align: center;
        gap: 10px;
        padding: 40px 24px;
      }

      .checkout-success__badge {
        font-size: 48px;
      }

      .checkout-success__title {
        font-size: 20px;
      }

      .checkout-success__sub {
        font-size: 14px;
        color: var(--ink-soft);
        max-width: 320px;
      }

      .checkout-success__card {
        width: 100%;
        margin: 14px 0 4px;
        background: var(--bg);
      }

      .checkout-success__actions {
        width: 100%;
        display: flex;
        flex-direction: column;
        gap: 10px;
        margin-top: 12px;
      }

      @media (max-width: 430px) {
        .checkout-form-grid {
          grid-template-columns: 1fr;
        }

        .checkout-field--wide {
          grid-column: auto;
        }

        .checkout-pin-row {
          grid-template-columns: 1fr;
        }
      }
    `}</style>
  );
}
