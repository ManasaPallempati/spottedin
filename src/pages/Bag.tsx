import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { ChevronLeft, ShoppingBag, CheckCircle, ShieldCheck } from 'lucide-react'
import { useAppState, type BagItem, type Order } from '../lib/appState'
import { useAuth } from '../lib/auth'
import { fetchPaymentConfig, startRazorpayPayment, PaymentError, type PaymentConfig } from '../lib/payments'
import { chargesFor, formatInr, SHIPPING_INR } from '../lib/pricing'
import type { Address } from '../lib/addresses'
import { useListing } from '../lib/useListings'
import { sellerFor, type Seller } from '../data/sellers'
import type { Listing } from '../data/listings'
import BottomSheet from '../components/BottomSheet'
import AddressPicker from '../components/AddressPicker'
import PriceBreakdown from '../components/PriceBreakdown'
import ListingPhoto from '../components/ListingPhoto'
import SellerAvatar from '../components/SellerAvatar'
import './bag.css'

type BagGroup = { seller: Seller; sellerId: string | null; items: BagItem[] }

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
  // Deleted or hidden since it was bagged: say so, so the buyer can clear it.
  if (!listing) {
    return (
      <div className="bag-row">
        <div className="bag-row-info">
          <p className="bag-row-brand">This item is no longer available</p>
        </div>
        <button type="button" className="bag-row-remove" onClick={() => removeFromBag(listingId)}>
          Remove
        </button>
      </div>
    )
  }

  return (
    <div className="bag-row">
      <div className="bag-row-thumb-wrap">
        <ListingPhoto className="bag-row-thumb" src={listing.img} alt={listing.brand} compact />
        {listing.status === 'sold' && <span className="bag-row-sold">SOLD</span>}
      </div>
      <div className="bag-row-info">
        <p className="bag-row-brand">{listing.brand}</p>
        <p className="bag-row-size">{listing.size}</p>
        <p className="bag-row-price">{formatInr(listing.price)}</p>
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
  // Checkout is per seller: the sheet opens for the group holding this listing.
  const [checkoutAnchor, setCheckoutAnchor] = useState<string | null>(null)
  const [shipTo, setShipTo] = useState<Address | null>(null)
  const [placedOrder, setPlacedOrder] = useState<Order | null>(null)
  const [placedLive, setPlacedLive] = useState(false)
  const [payConfig, setPayConfig] = useState<PaymentConfig | null>(null)
  const [paying, setPaying] = useState(false)
  const [payError, setPayError] = useState<string | null>(null)

  const checkoutOpen = checkoutAnchor !== null

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
    const requested = searchParams.get('checkout')
    if (!requested || bag.length === 0) return
    // ?checkout=<listingId> from Buy now; the legacy ?checkout=1 opens the most recently added item's seller.
    const anchor = bag.some((b) => b.listingId === requested)
      ? requested
      : [...bag].sort((a, b) => b.addedAt - a.addedAt)[0].listingId
    setCheckoutAnchor(anchor)
    // only react to the URL that mounted this page, not to later bag/state changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleResolved = useCallback((id: string, listing: Listing | null) => {
    setResolved((prev) => (prev[id] === listing ? prev : { ...prev, [id]: listing }))
  }, [])

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
      else map.set(seller.handle, { seller, sellerId: resolvedListing?.sellerId ?? null, items: [item] })
    }
    return Array.from(map.values())
  }, [bag, resolved])

  function liveItems(group: BagGroup): Listing[] {
    return group.items
      .map((item) => resolved[item.listingId])
      .filter((l): l is Listing => !!l && l.status !== 'sold')
  }

  function groupSubtotal(group: BagGroup): number {
    return liveItems(group).reduce((sum, l) => sum + l.price, 0)
  }

  const activeGroup = checkoutAnchor
    ? groups.find((g) => g.items.some((i) => i.listingId === checkoutAnchor)) ?? null
    : null
  const activeItems = activeGroup ? liveItems(activeGroup) : []
  const charges = chargesFor(activeItems.reduce((sum, l) => sum + l.price, 0))
  const itemLabel =
    activeItems.length === 1 ? activeItems[0].brand : `${activeItems.length} items from @${activeGroup?.seller.handle ?? ''}`

  function closeCheckout() {
    setCheckoutAnchor(null)
    setPayError(null)
  }

  function handlePlaceOrder() {
    if (!shipTo || activeItems.length === 0) return
    const items = activeItems.map((l) => ({ listingId: l.id, priceInr: l.price }))
    const snapshots: Record<string, { title: string; img: string; size: string }> = {}
    for (const l of activeItems) snapshots[l.id] = { title: l.brand, img: l.img, size: l.size }
    const order = placeOrder(items, snapshots, {
      shipTo,
      shippingInr: charges.shipping,
      buyerFeeInr: charges.buyerFee,
      sellerId: activeGroup?.sellerId ?? null,
      sellerHandle: activeGroup?.seller.handle ?? null,
    })
    if (order) {
      setPlacedOrder(order)
      closeCheckout()
    }
  }

  async function handlePayNow() {
    if (!shipTo || activeItems.length === 0) return
    setPaying(true)
    setPayError(null)
    try {
      const paid = await startRazorpayPayment(
        { context: 'bag', listingIds: activeItems.map((l) => l.id), addressId: shipTo.id },
        { name: profile?.name, email: session?.user?.email }
      )
      const order: Order = {
        id: paid.code,
        uuid: paid.uuid,
        items: paid.items.map((it) => {
          const l = activeItems.find((x) => x.id === it.listingId)
          return { ...it, title: l?.brand, img: l?.img, size: l?.size }
        }),
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
        sellerHandle: activeGroup?.seller.handle ?? null,
        paymentStatus: 'paid',
        courierProvider: null,
        courierStatus: null,
        labelUrl: null,
      }
      applyPaidOrder(order)
      setPlacedLive(true)
      setPlacedOrder(order)
      closeCheckout()
    } catch (err) {
      const e = err instanceof PaymentError ? err : new PaymentError('failed', 'Payment failed. You have not been charged.')
      setPayError(e.message)
    } finally {
      setPaying(false)
    }
  }

  const showEmpty = bag.length === 0 && !checkoutOpen && !placedOrder
  const canPay = !!shipTo && activeItems.length > 0

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
              ? formatInr(placedOrder.totalInr + placedOrder.shippingInr + placedOrder.buyerFeeInr) + ' paid via Razorpay.'
              : 'This is a demo — no payment was taken.'}{' '}
            We'll let you know when the seller ships it.
          </p>
          <div className="bag-confirmation-actions">
            <Link to={`/order/${placedOrder.uuid}`} className="btn btn-primary">
              Track order
            </Link>
            {bag.length > 0 ? (
              <button type="button" className="btn btn-outline" onClick={() => setPlacedOrder(null)}>
                Back to bag
              </button>
            ) : (
              <Link to="/home" className="btn btn-outline">
                Keep browsing
              </Link>
            )}
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
          <div className="bag-protection">
            <ShieldCheck size={22} className="bag-protection-icon" />
            <p>
              Selling is free on Spotted. Every order is tracked from purchase to delivery.
            </p>
          </div>
          <div className="bag-list">
            {groups.map((group) => {
              const subtotal = groupSubtotal(group)
              const count = liveItems(group).length
              // Wait for every item to load so the order never leaves one out by accident.
              const loaded = group.items.every((item) => item.listingId in resolved)
              return (
                <div className="bag-group" key={group.seller.handle || 'unknown-seller'}>
                  {group.seller.handle && (
                  <div className="bag-seller-header">
                    <SellerAvatar className="bag-seller-avatar" handle={group.seller.handle} name={group.seller.name} />
                    <div className="bag-seller-meta">
                      <span className="bag-seller-handle">@{group.seller.handle}</span>
                      <span className="bag-seller-count">
                        {group.items.length} item{group.items.length === 1 ? '' : 's'}
                      </span>
                    </div>
                    {count > 0 && (
                      <div className="bag-seller-price">
                        <span className="bag-seller-subtotal">{formatInr(subtotal)}</span>
                        <span className="bag-seller-shipping">+ {formatInr(SHIPPING_INR)} shipping</span>
                      </div>
                    )}
                  </div>
                  )}
                  {group.items.map((item) => (
                    <BagRow key={item.listingId} listingId={item.listingId} onResolved={handleResolved} />
                  ))}
                  {/* No checkout for items whose seller is unknown (still loading, or deleted). */}
                  {group.seller.handle && (
                    <button
                      type="button"
                      className="btn btn-primary bag-checkout-btn"
                      disabled={!loaded || count === 0}
                      onClick={() => setCheckoutAnchor(group.items[0].listingId)}
                    >
                      Checkout
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        </>
      )}

      <BottomSheet open={checkoutOpen} onClose={closeCheckout} title="Checkout">
        <div className="bag-checkout">
          <div className="bag-checkout-items">
            {activeItems.map((l) => (
              <div className="bag-checkout-item" key={l.id}>
                <ListingPhoto src={l.img} alt={l.brand} compact />
                <div>
                  <p className="bag-row-brand">{l.brand}</p>
                  <p className="bag-row-size">
                    {l.size} | {formatInr(l.price)}
                  </p>
                </div>
              </div>
            ))}
          </div>
          <div className="bag-checkout-section bag-checkout-divider">
            <PriceBreakdown charges={charges} itemLabel={itemLabel} />
          </div>
          <div className="bag-checkout-section bag-checkout-divider">
            <AddressPicker selected={shipTo} onSelect={setShipTo} />
          </div>
          <div className="bag-checkout-section bag-checkout-divider">
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
          {payError && (
            <p className="bag-pay-error" role="alert">
              {payError}
            </p>
          )}
          {live ? (
            <button type="button" className="btn btn-primary bag-checkout-btn" disabled={paying || !canPay} onClick={handlePayNow}>
              {paying ? 'Processing…' : !shipTo ? 'Add an address to continue' : `Pay ${formatInr(charges.total)}`}
            </button>
          ) : (
            <button
              type="button"
              className="btn btn-primary bag-checkout-btn"
              disabled={checkingPay || !canPay}
              onClick={handlePlaceOrder}
            >
              {checkingPay ? 'Checking payment options…' : !shipTo ? 'Add an address to continue' : 'Place order (demo)'}
            </button>
          )}
        </div>
      </BottomSheet>
    </div>
  )
}
