import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { ChevronLeft, ShoppingBag, CheckCircle } from 'lucide-react'
import { useAppState, type BagItem, type Order } from '../lib/appState'
import { useAuth } from '../lib/auth'
import { fetchPaymentConfig, startRazorpayPayment, PaymentError, type PaymentConfig } from '../lib/payments'
import { useListing } from '../lib/useListings'
import { SHIPPING_INR, summarizeBag } from '../lib/bagSummary'
import { sellerFor, type Seller } from '../data/sellers'
import type { Listing } from '../data/listings'
import BottomSheet from '../components/BottomSheet'
import ListingPhoto from '../components/ListingPhoto'
import SellerAvatar from '../components/SellerAvatar'
import './bag.css'

function formatInr(value: number) {
  return `₹${value.toLocaleString('en-IN')}`
}

type BagGroup = { seller: Seller; items: BagItem[] }

type BagRowProps = {
  listingId: string
  onResolved: (id: string, listing: Listing | null) => void
}

function BagRow({ listingId, onResolved }: BagRowProps) {
  const { listing, loading } = useListing(listingId)
  const { removeFromBag } = useAppState()

  useEffect(() => {
    if (!loading) onResolved(listingId, listing)
  }, [loading, listing, listingId, onResolved])

  if (loading) return <div className="bag-row bag-row-loading" />
  // Deleted or hidden since it was bagged: say so and let the buyer remove it.
  // Rendering nothing left an invisible item that still broke payment.
  if (!listing) {
    return (
      <div className="bag-row bag-row-unavailable">
        <div className="bag-row-info">
          <p className="bag-row-brand">This item is no longer available</p>
          <p className="bag-row-size">It is not included in your total.</p>
        </div>
        <button type="button" className="bag-row-remove" onClick={() => removeFromBag(listingId)}>
          Remove
        </button>
      </div>
    )
  }

  const sold = listing.status === 'sold'

  return (
    <div className={sold ? 'bag-row bag-row-unavailable' : 'bag-row'}>
      <ListingPhoto className="bag-row-thumb" src={listing.img} alt={listing.brand} compact />
      <div className="bag-row-info">
        <p className="bag-row-brand">{listing.brand}</p>
        <p className="bag-row-size">{listing.size}</p>
        {sold ? (
          <p className="bag-row-sold">Sold, not included in your total</p>
        ) : (
          <p className="bag-row-price">{formatInr(listing.price)}</p>
        )}
      </div>
      <button type="button" className="bag-row-remove" onClick={() => removeFromBag(listingId)}>
        Remove
      </button>
    </div>
  )
}

export default function Bag() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { bag, placeOrder, applyPaidOrder } = useAppState()
  const { isAuthed, profile, session } = useAuth()

  const [resolved, setResolved] = useState<Record<string, Listing | null>>({})
  const [checkoutOpen, setCheckoutOpen] = useState(false)
  const [placedOrder, setPlacedOrder] = useState<Order | null>(null)
  const [placedLive, setPlacedLive] = useState(false)
  const [payConfig, setPayConfig] = useState<PaymentConfig | null>(null)
  const [paying, setPaying] = useState(false)
  const [payError, setPayError] = useState<string | null>(null)

  // Demo is the default; live mode only after the Edge Function confirms the
  // server-side Razorpay gate is open. Any error resolves to demo (fail closed).
  useEffect(() => {
    if (!checkoutOpen) return
    let cancelled = false
    fetchPaymentConfig().then((config) => {
      if (!cancelled) setPayConfig(config)
    })
    return () => {
      cancelled = true
    }
  }, [checkoutOpen])

  const live = payConfig?.enabled === true
  const checkingPay = payConfig === null

  useEffect(() => {
    if (searchParams.get('checkout') === '1' && bag.length > 0) {
      setCheckoutOpen(true)
    }
    // only react to the URL that mounted this page, not to later bag/state changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function handleResolved(id: string, listing: Listing | null) {
    setResolved((prev) => (prev[id] === listing ? prev : { ...prev, [id]: listing }))
  }

  const groups = useMemo(() => {
    const map = new Map<string, BagGroup>()
    for (const item of bag) {
      const resolvedListing = resolved[item.listingId]
      // Until a row resolves (or if it never does) its seller is unknown: group
      // it without a header rather than attributing it to anyone.
      const seller: Seller = resolvedListing
        ? sellerFor(resolvedListing)
        : { handle: '', name: '', bio: '', rating: null, sold: 0 }
      const existing = map.get(seller.handle)
      if (existing) existing.items.push(item)
      else map.set(seller.handle, { seller, items: [item] })
    }
    return Array.from(map.values())
  }, [bag, resolved])

  // Only live items are priced and paid for; see summarizeBag.
  const summary = summarizeBag(bag.map((item) => item.listingId), resolved)
  const { subtotal, shipping, total, availableIds } = summary
  const canCheckout = !summary.pending && availableIds.length > 0

  function handlePlaceOrder() {
    if (!canCheckout) return
    const items = availableIds.map((listingId) => ({
      listingId,
      priceInr: resolved[listingId]?.price ?? 0,
    }))
    const snapshots: Record<string, { title: string; img: string; size: string }> = {}
    for (const listingId of availableIds) {
      const listing = resolved[listingId]
      if (listing) snapshots[listingId] = { title: listing.brand, img: listing.img, size: listing.size }
    }
    const order = placeOrder(items, snapshots)
    if (order) {
      setPlacedOrder(order)
      setCheckoutOpen(false)
    }
  }

  async function handlePayNow() {
    if (!canCheckout) return
    setPaying(true)
    setPayError(null)
    try {
      const paid = await startRazorpayPayment(
        { context: 'bag', listingIds: availableIds },
        { name: profile?.name, email: session?.user?.email }
      )
      const order: Order = { id: paid.code, uuid: paid.uuid, items: paid.items, totalInr: paid.totalInr, placedAt: paid.placedAt }
      applyPaidOrder(order)
      setPlacedLive(true)
      setPlacedOrder(order)
      setCheckoutOpen(false)
    } catch (err) {
      const e = err instanceof PaymentError ? err : new PaymentError('failed', 'Payment failed. You have not been charged.')
      setPayError(e.message)
    } finally {
      setPaying(false)
    }
  }

  const showEmpty = bag.length === 0 && !checkoutOpen && !placedOrder

  return (
    <div className="bag-page">
      <header className="bag-header">
        <button type="button" className="icon-btn bag-back" aria-label="Back" onClick={() => navigate(-1)}>
          <ChevronLeft size={24} />
        </button>
        <h1 className="bag-title">Bag</h1>
        <div className="bag-header-spacer" />
      </header>

      {placedOrder ? (
        <div className="bag-confirmation">
          <CheckCircle size={64} className="bag-confirmation-icon" />
          <h2 className="bag-confirmation-title">Order placed!</h2>
          <p className="bag-confirmation-id">{placedOrder.id}</p>
          <p className="bag-confirmation-copy">
            {placedLive
              ? formatInr(placedOrder.totalInr + SHIPPING_INR) + ' paid via Razorpay.'
              : 'This is a demo — no payment was taken.'}
          </p>
          <div className="bag-confirmation-actions">
            <Link to="/home" className="btn btn-primary">
              Keep browsing
            </Link>
            <Link to="/profile" className="btn btn-outline">
              View purchases
            </Link>
          </div>
        </div>
      ) : !isAuthed ? (
        <div className="bag-empty">
          <ShoppingBag size={64} className="bag-empty-icon" strokeWidth={1.25} />
          <p className="bag-empty-title">Log in to see your bag</p>
          <Link to="/login?next=%2Fbag" className="btn btn-primary">
            Log in
          </Link>
        </div>
      ) : showEmpty ? (
        <div className="bag-empty">
          <ShoppingBag size={64} className="bag-empty-icon" strokeWidth={1.25} />
          <p className="bag-empty-title">Your bag is empty</p>
          <Link to="/home" className="btn btn-primary">
            Start exploring
          </Link>
        </div>
      ) : (
        <>
          <div className="bag-list">
            {groups.map((group) => (
              <div className="bag-group" key={group.seller.handle || 'unknown-seller'}>
                {group.seller.handle && (
                  <div className="bag-seller-header">
                    <SellerAvatar className="bag-seller-avatar" handle={group.seller.handle} name={group.seller.name} />
                    <span className="bag-seller-handle">@{group.seller.handle}</span>
                  </div>
                )}
                {group.items.map((item) => (
                  <BagRow key={item.listingId} listingId={item.listingId} onResolved={handleResolved} />
                ))}
              </div>
            ))}
          </div>

          <div className="bag-summary">
            <div className="bag-summary-row">
              <span>Subtotal</span>
              <span>{formatInr(subtotal)}</span>
            </div>
            <div className="bag-summary-row">
              <span>Shipping</span>
              <span>{formatInr(shipping)}</span>
            </div>
            <div className="bag-summary-row bag-summary-total">
              <span>Total</span>
              <span>{formatInr(total)}</span>
            </div>
            <button
              type="button"
              className="btn btn-primary bag-checkout-btn"
              disabled={!canCheckout}
              onClick={() => setCheckoutOpen(true)}
            >
              Checkout
            </button>
          </div>
        </>
      )}

      <BottomSheet open={checkoutOpen} onClose={() => setCheckoutOpen(false)} title="Checkout">
        <div className="bag-checkout">
          <div className="bag-checkout-section">
            <p className="bag-checkout-label">Shipping address</p>
            <p className="bag-checkout-address">{profile?.name ?? 'Manasa P'}, 221 MG Road, Bengaluru 560001</p>
          </div>
          <div className="bag-checkout-section">
            <p className="bag-checkout-label">Payment</p>
            <div className="bag-checkout-payment-row">
              {live ? (
                <span>Razorpay · UPI, cards, netbanking</span>
              ) : (
                <>
                  <span>Spotted Pay · demo mode</span>
                  <span className="bag-demo-badge">DEMO</span>
                </>
              )}
            </div>
          </div>
          <div className="bag-checkout-section bag-checkout-summary">
            <div className="bag-summary-row">
              <span>Subtotal</span>
              <span>{formatInr(subtotal)}</span>
            </div>
            <div className="bag-summary-row">
              <span>Shipping</span>
              <span>{formatInr(shipping)}</span>
            </div>
            <div className="bag-summary-row bag-summary-total">
              <span>Total</span>
              <span>{formatInr(total)}</span>
            </div>
          </div>
          {payError && (
            <p className="bag-pay-error" role="alert">
              {payError}
            </p>
          )}
          {live ? (
            <button type="button" className="btn btn-primary bag-checkout-btn" disabled={paying || !canCheckout} onClick={handlePayNow}>
              {paying ? 'Processing…' : `Pay ${formatInr(total)}`}
            </button>
          ) : (
            <button type="button" className="btn btn-primary bag-checkout-btn" disabled={checkingPay || !canCheckout} onClick={handlePlaceOrder}>
              {checkingPay ? 'Checking payment options…' : 'Place order (demo)'}
            </button>
          )}
        </div>
      </BottomSheet>
    </div>
  )
}
