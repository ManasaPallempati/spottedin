import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import TopBar from '../components/TopBar';
import PriceTag from '../components/PriceTag';
import EmptyState from '../components/EmptyState';
import { getListing, getSeller, placeOrder } from '../data/store';
import type { Order, PayMethod } from '../data/types';

const UPI_APPS: { id: string; label: string; emoji: string }[] = [
  { id: 'gpay', label: 'GPay', emoji: '🟢' },
  { id: 'phonepe', label: 'PhonePe', emoji: '🟣' },
  { id: 'paytm', label: 'Paytm', emoji: '🔵' },
  { id: 'bhim', label: 'BHIM', emoji: '🇮🇳' },
];

const PLATFORM_FEE = 15;

export default function Checkout() {
  const { id } = useParams();
  const navigate = useNavigate();
  const listing = id ? getListing(id) : undefined;
  const seller = listing ? getSeller(listing.sellerId) : undefined;

  const [method, setMethod] = useState<PayMethod>('upi');
  const [selectedUpiApp, setSelectedUpiApp] = useState(UPI_APPS[0].id);
  const [placing, setPlacing] = useState(false);
  const [order, setOrder] = useState<Order | null>(null);
  const [placeError, setPlaceError] = useState('');

  const total = useMemo(() => (listing ? listing.priceINR + PLATFORM_FEE : 0), [listing]);

  if (!listing) {
    return (
      <>
        <TopBar title="Checkout" />
        <EmptyState emoji="🔍" title="Listing not found" subtitle="This item may have been removed." />
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

  function handlePlaceOrder() {
    if (!listing || placing || sold) return;
    setPlacing(true);
    setPlaceError('');
    window.setTimeout(() => {
      try {
        const placed = placeOrder(listing.id, method);
        setOrder(placed);
      } catch (err) {
        setPlaceError(err instanceof Error ? err.message : 'Could not place order.');
      } finally {
        setPlacing(false);
      }
    }, 900);
  }

  if (order) {
    return (
      <div className="checkout-page">
        <TopBar title="Order placed" onBack={() => navigate('/')} />
        <div className="checkout-success">
          <div className="checkout-success__badge" aria-hidden="true">✅</div>
          <h2 className="checkout-success__title">Order confirmed!</h2>
          <p className="checkout-success__sub">
            Your order for <strong>{listing.title}</strong> has been placed.
          </p>

          <div className="checkout-card checkout-success__card">
            <div className="checkout-row">
              <span className="checkout-row__label">Order ID</span>
              <span className="checkout-row__value checkout-row__value--mono">{order.id}</span>
            </div>
            <div className="checkout-row">
              <span className="checkout-row__label">Paid via</span>
              <span className="checkout-row__value">{payMethodLabel(order.payMethod)}</span>
            </div>
            <div className="checkout-row">
              <span className="checkout-row__label">Amount</span>
              <PriceTag priceINR={total} size="md" />
            </div>
          </div>

          <p className="checkout-razorpay-note">Payments by Razorpay — sandbox</p>

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

      <div className="checkout-card">
        <div className="checkout-row">
          <span className="checkout-row__label">Item price</span>
          <PriceTag priceINR={listing.priceINR} size="sm" />
        </div>
        <div className="checkout-row">
          <span className="checkout-row__label">Platform fee</span>
          <PriceTag priceINR={PLATFORM_FEE} size="sm" />
        </div>
        <div className="checkout-row checkout-row--total">
          <span className="checkout-row__label">Total</span>
          <PriceTag priceINR={total} size="md" />
        </div>
      </div>

      <div className="checkout-sheet">
        <p className="checkout-sheet__heading">Choose payment method</p>

        <button
          type="button"
          className={`checkout-method${method === 'upi' ? ' is-selected' : ''}`}
          onClick={() => setMethod('upi')}
        >
          <span className="checkout-method__icon" aria-hidden="true">📲</span>
          <span className="checkout-method__label">UPI</span>
          <span className={`checkout-method__radio${method === 'upi' ? ' is-checked' : ''}`} aria-hidden="true" />
        </button>
        {method === 'upi' && (
          <div className="checkout-upi-row">
            {UPI_APPS.map((app) => (
              <button
                key={app.id}
                type="button"
                className={`checkout-upi-chip${selectedUpiApp === app.id ? ' is-selected' : ''}`}
                onClick={() => setSelectedUpiApp(app.id)}
              >
                <span aria-hidden="true">{app.emoji}</span>
                {app.label}
              </button>
            ))}
          </div>
        )}

        <button
          type="button"
          className={`checkout-method${method === 'card' ? ' is-selected' : ''}`}
          onClick={() => setMethod('card')}
        >
          <span className="checkout-method__icon" aria-hidden="true">💳</span>
          <span className="checkout-method__label">Credit / Debit card</span>
          <span className={`checkout-method__radio${method === 'card' ? ' is-checked' : ''}`} aria-hidden="true" />
        </button>
        {method === 'card' && (
          <div className="checkout-card-fields">
            <input className="input" placeholder="Card number" inputMode="numeric" disabled />
            <div className="checkout-card-fields__row">
              <input className="input" placeholder="MM/YY" disabled />
              <input className="input" placeholder="CVV" disabled />
            </div>
            <p className="checkout-sandbox-hint">Sandbox mode — no real card is charged.</p>
          </div>
        )}

        <button
          type="button"
          className={`checkout-method${method === 'cod' ? ' is-selected' : ''}`}
          onClick={() => setMethod('cod')}
        >
          <span className="checkout-method__icon" aria-hidden="true">💵</span>
          <span className="checkout-method__label">Cash on Delivery</span>
          <span className={`checkout-method__radio${method === 'cod' ? ' is-checked' : ''}`} aria-hidden="true" />
        </button>

        {placeError && <p className="checkout-place-error">{placeError}</p>}
        <button
          type="button"
          className="btn btn-primary btn-block checkout-pay-btn"
          onClick={handlePlaceOrder}
          disabled={placing || sold}
        >
          {placing ? 'Processing…' : `Pay ${'₹'}${total.toLocaleString('en-IN')}`}
        </button>
        <p className="checkout-razorpay-note">Payments by Razorpay — sandbox</p>
      </div>
      <CheckoutStyles />
    </div>
  );
}

function payMethodLabel(method: PayMethod): string {
  if (method === 'upi') return 'UPI';
  if (method === 'card') return 'Card';
  return 'Cash on Delivery';
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
        font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
        font-size: 13px;
      }

      .checkout-row--total {
        padding-top: 10px;
        border-top: 1px dashed var(--border);
      }

      .checkout-row--total .checkout-row__label {
        font-weight: 700;
        color: var(--ink);
      }

      /* ---- Razorpay-style payment sheet ---- */

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
        font-size: 13px;
        font-weight: 700;
        color: var(--ink-soft);
        text-transform: uppercase;
        letter-spacing: 0.03em;
        margin-bottom: 2px;
      }

      .checkout-method {
        display: flex;
        align-items: center;
        gap: 12px;
        width: 100%;
        padding: 13px 14px;
        border-radius: var(--radius-sm);
        border: 1.5px solid var(--border);
        background: var(--surface);
        text-align: left;
      }

      .checkout-method.is-selected {
        border-color: var(--accent);
        background: rgba(124, 58, 237, 0.05);
      }

      .checkout-method__icon {
        font-size: 18px;
        flex-shrink: 0;
      }

      .checkout-method__label {
        flex: 1;
        font-size: 14px;
        font-weight: 600;
      }

      .checkout-method__radio {
        width: 18px;
        height: 18px;
        border-radius: 50%;
        border: 1.5px solid var(--border);
        flex-shrink: 0;
      }

      .checkout-method__radio.is-checked {
        border-color: var(--accent);
        border-width: 5px;
      }

      .checkout-upi-row {
        display: flex;
        gap: 8px;
        padding: 2px 2px 8px;
        overflow-x: auto;
      }

      .checkout-upi-chip {
        display: flex;
        align-items: center;
        gap: 6px;
        flex-shrink: 0;
        padding: 9px 14px;
        border-radius: 999px;
        border: 1.5px solid var(--border);
        background: var(--surface);
        font-size: 13px;
        font-weight: 600;
        color: var(--ink);
      }

      .checkout-upi-chip.is-selected {
        border-color: var(--accent);
        background: var(--accent);
        color: #fff;
      }

      .checkout-card-fields {
        display: flex;
        flex-direction: column;
        gap: 8px;
        padding: 2px 2px 8px;
      }

      .checkout-card-fields__row {
        display: flex;
        gap: 8px;
      }

      .checkout-sandbox-hint {
        font-size: 12px;
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

      /* ---- Success state ---- */

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
    `}</style>
  );
}
