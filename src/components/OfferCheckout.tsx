import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CheckCircle } from 'lucide-react'
import { useAppState, type Offer, type Order } from '../lib/appState'
import { useAuth } from '../lib/auth'
import { fetchPaymentConfig, startRazorpayPayment, PaymentError, type PaymentConfig } from '../lib/payments'
import type { Listing } from '../data/listings'
import BottomSheet from './BottomSheet'
import './OfferCheckout.css'

const SHIPPING_INR = 49

type OfferCheckoutProps = {
  offer: Offer
  listing: Listing
  open: boolean
  onClose: () => void
}

export default function OfferCheckout({ offer, listing, open, onClose }: OfferCheckoutProps) {
  const navigate = useNavigate()
  const { placeOrder, applyPaidOrder, sendMessage } = useAppState()
  const { profile, session } = useAuth()
  const [placedOrder, setPlacedOrder] = useState<Order | null>(null)
  const [placedLive, setPlacedLive] = useState(false)
  const [payConfig, setPayConfig] = useState<PaymentConfig | null>(null)
  const [paying, setPaying] = useState(false)
  const [payError, setPayError] = useState<string | null>(null)
  const amount = offer.amountInr.toLocaleString('en-IN')
  // Displayed Total is item price + shipping, matching Bag.tsx's checkout sheet
  // convention — only the persisted Order.totalInr (via placeOrder) is item-price-only.
  const displayTotal = (offer.amountInr + SHIPPING_INR).toLocaleString('en-IN')

  // Demo is the default; live mode only after the Edge Function confirms the
  // server-side Razorpay gate is open. Any error resolves to demo (fail closed).
  useEffect(() => {
    if (!open) return
    let cancelled = false
    fetchPaymentConfig().then((config) => {
      if (!cancelled) setPayConfig(config)
    })
    return () => {
      cancelled = true
    }
  }, [open])

  const live = payConfig?.enabled === true
  const checkingPay = payConfig === null

  function handlePlaceOrder() {
    const order = placeOrder(
      [{ listingId: listing.id, priceInr: offer.amountInr }],
      { [listing.id]: { title: listing.brand, img: listing.img, size: listing.size } }
    )
    if (order) {
      sendMessage(
        offer.peerHandle,
        'Purchased for ₹' + offer.amountInr.toLocaleString('en-IN') + ' for order ' + order.id + '. Demo order, no payment was taken.'
      )
      setPlacedOrder(order)
    }
  }

  async function handlePayNow() {
    setPaying(true)
    setPayError(null)
    try {
      const paid = await startRazorpayPayment(
        { context: 'offer', offerId: offer.id },
        { name: profile?.name, email: session?.user?.email }
      )
      const order: Order = { id: paid.code, uuid: paid.uuid, items: paid.items, totalInr: paid.totalInr, placedAt: paid.placedAt }
      applyPaidOrder(order)
      sendMessage(
        offer.peerHandle,
        'Paid ₹' + offer.amountInr.toLocaleString('en-IN') + ' for order ' + order.id + ' via Razorpay.'
      )
      setPlacedLive(true)
      setPlacedOrder(order)
    } catch (err) {
      const e = err instanceof PaymentError ? err : new PaymentError('failed', 'Payment failed. You have not been charged.')
      setPayError(e.message)
    } finally {
      setPaying(false)
    }
  }

  function handleKeepBrowsing() {
    onClose()
    navigate('/home')
  }

  return (
    <BottomSheet open={open} onClose={onClose} title="Checkout">
      {placedOrder ? (
        <div className="offer-checkout-confirm">
          <CheckCircle size={64} className="offer-checkout-confirm-icon" />
          <h2 className="offer-checkout-confirm-title">Order placed!</h2>
          <p className="offer-checkout-confirm-id">{placedOrder.id}</p>
          <p className="offer-checkout-confirm-copy">
            {placedLive ? '₹' + displayTotal + ' paid via Razorpay.' : 'This is a demo — no payment was taken.'}
          </p>
          <div className="offer-checkout-confirm-actions">
            <button type="button" className="btn btn-primary" onClick={handleKeepBrowsing}>
              Keep browsing
            </button>
            <button type="button" className="btn btn-outline" onClick={() => navigate('/profile')}>
              View purchases
            </button>
          </div>
        </div>
      ) : (
        <div className="offer-checkout">
          <div className="offer-checkout-section">
            <p className="offer-checkout-label">Shipping address</p>
            <p className="offer-checkout-address">{profile?.name ?? 'Manasa P'}, 221 MG Road, Bengaluru 560001</p>
          </div>
          <div className="offer-checkout-section">
            <p className="offer-checkout-label">Payment</p>
            <div className="offer-checkout-payment-row">
              {live ? (
                <span>Razorpay · UPI, cards, netbanking</span>
              ) : (
                <>
                  <span>Spotted Pay · demo mode</span>
                  <span className="offer-checkout-demo-badge">DEMO</span>
                </>
              )}
            </div>
          </div>
          <div className="offer-checkout-section offer-checkout-summary">
            <div className="offer-checkout-summary-row">
              <span>Item price</span>
              <span>₹{amount}</span>
            </div>
            <div className="offer-checkout-summary-row">
              <span>Shipping</span>
              <span>₹{SHIPPING_INR}</span>
            </div>
            <div className="offer-checkout-summary-row offer-checkout-summary-total">
              <span>Total</span>
              <span>₹{displayTotal}</span>
            </div>
          </div>
          {payError && (
            <p className="offer-checkout-pay-error" role="alert">
              {payError}
            </p>
          )}
          {live ? (
            <button type="button" className="btn btn-primary offer-checkout-place-btn" disabled={paying} onClick={handlePayNow}>
              {paying ? 'Processing…' : `Pay ₹${displayTotal}`}
            </button>
          ) : (
            <button
              type="button"
              className="btn btn-primary offer-checkout-place-btn"
              disabled={checkingPay}
              onClick={handlePlaceOrder}
            >
              {checkingPay ? 'Checking payment options…' : 'Place order (demo)'}
            </button>
          )}
        </div>
      )}
    </BottomSheet>
  )
}
