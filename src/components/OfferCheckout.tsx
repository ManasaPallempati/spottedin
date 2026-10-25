import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CheckCircle } from 'lucide-react'
import { useAppState, type Offer, type Order } from '../lib/appState'
import { useAuth } from '../lib/auth'
import { fetchPaymentConfig, startRazorpayPayment, PaymentError, type PaymentConfig } from '../lib/payments'
import { chargesFor, formatInr } from '../lib/pricing'
import type { Address } from '../lib/addresses'
import type { Listing } from '../data/listings'
import BottomSheet from './BottomSheet'
import AddressPicker from './AddressPicker'
import PriceBreakdown from './PriceBreakdown'
import './OfferCheckout.css'

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
  const [shipTo, setShipTo] = useState<Address | null>(null)
  // Displayed Total is item + shipping + buyer fee, matching Bag.tsx's checkout
  // sheet — only the persisted Order.totalInr (via placeOrder) is item-price-only.
  const charges = chargesFor(offer.amountInr)

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
    if (!shipTo) return
    const order = placeOrder(
      [{ listingId: listing.id, priceInr: offer.amountInr }],
      { [listing.id]: { title: listing.brand, img: listing.img, size: listing.size } },
      { shipTo, shippingInr: charges.shipping, buyerFeeInr: charges.buyerFee, sellerId: listing.sellerId ?? null, sellerHandle: offer.peerHandle }
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
    if (!shipTo) return
    setPaying(true)
    setPayError(null)
    try {
      const paid = await startRazorpayPayment(
        { context: 'offer', offerId: offer.id, addressId: shipTo.id },
        { name: profile?.name, email: session?.user?.email }
      )
      const order: Order = {
        id: paid.code,
        uuid: paid.uuid,
        items: paid.items.map((it) => ({ ...it, title: listing.brand, img: listing.img, size: listing.size })),
        totalInr: paid.totalInr,
        placedAt: paid.placedAt,
        shippingInr: paid.shippingInr,
        buyerFeeInr: paid.buyerFeeInr,
        shipTo,
        status: 'paid',
        courier: null,
        trackingNumber: null,
        shippedAt: null,
        deliveredAt: null,
        buyerHandle: null,
        sellerHandle: offer.peerHandle,
        paymentStatus: 'paid',
        courierProvider: null,
        courierStatus: null,
        labelUrl: null,
      }
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
            {placedLive ? formatInr(charges.total) + ' paid via Razorpay.' : 'This is a demo — no payment was taken.'}
          </p>
          <div className="offer-checkout-confirm-actions">
            <button type="button" className="btn btn-primary" onClick={handleKeepBrowsing}>
              Keep browsing
            </button>
            <button type="button" className="btn btn-outline" onClick={() => navigate(`/order/${placedOrder.uuid}`)}>
              Track order
            </button>
          </div>
        </div>
      ) : (
        <div className="offer-checkout">
          <div className="offer-checkout-section">
            <PriceBreakdown charges={charges} itemLabel={listing.brand} />
          </div>
          <div className="offer-checkout-section offer-checkout-divider">
            <AddressPicker selected={shipTo} onSelect={setShipTo} />
          </div>
          <div className="offer-checkout-section offer-checkout-divider">
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
          {payError && (
            <p className="offer-checkout-pay-error" role="alert">
              {payError}
            </p>
          )}
          {live ? (
            <button
              type="button"
              className="btn btn-primary offer-checkout-place-btn"
              disabled={paying || !shipTo}
              onClick={handlePayNow}
            >
              {paying ? 'Processing…' : !shipTo ? 'Add an address to continue' : `Pay ${formatInr(charges.total)}`}
            </button>
          ) : (
            <button
              type="button"
              className="btn btn-primary offer-checkout-place-btn"
              disabled={checkingPay || !shipTo}
              onClick={handlePlaceOrder}
            >
              {checkingPay ? 'Checking payment options…' : !shipTo ? 'Add an address to continue' : 'Place order (demo)'}
            </button>
          )}
        </div>
      )}
    </BottomSheet>
  )
}
