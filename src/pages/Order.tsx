import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ChevronLeft, Copy, Check, Mail, Download } from 'lucide-react'
import { useAppState, type Order as OrderModel } from '../lib/appState'
import { formatAddress, type Address } from '../lib/addresses'
import { bookCourier, CourierError, fetchCourierEnabled, usePickupAddress } from '../lib/courier'
import { formatInr } from '../lib/pricing'
import AddressPicker from '../components/AddressPicker'
import './order.css'

// Sellers are asked to ship within this many days of the order.
const SHIP_WITHIN_DAYS = 3

function formatDate(ms: number) {
  return new Date(ms).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

function stepIndex(order: OrderModel): number {
  if (order.status === 'delivered') return 2
  if (order.status === 'shipped') return 1
  return 0
}

function statusCopy(order: OrderModel, isSeller: boolean): { title: string; detail: string } {
  const shipBy = formatDate(order.placedAt + SHIP_WITHIN_DAYS * 86_400_000)
  switch (order.status) {
    case 'delivered':
      return {
        title: isSeller ? 'Delivered to the buyer' : "Your order's arrived",
        detail: `Delivered: ${formatDate(order.deliveredAt ?? Date.now())}`,
      }
    case 'shipped':
      return {
        title: isSeller ? 'On its way to the buyer' : 'Your order is on its way',
        detail: `Shipped: ${formatDate(order.shippedAt ?? Date.now())}`,
      }
    case 'cancelled':
      return { title: 'Order cancelled', detail: `Placed: ${formatDate(order.placedAt)}` }
    default:
      // Sellers never see demo orders (is_order_seller), so this is the buyer's view.
      if (order.paymentStatus === 'demo') {
        return { title: 'Demo order', detail: "No payment was taken, so the seller won't ship this." }
      }
      return {
        title: isSeller ? 'Ready to ship' : 'Waiting for the seller to ship',
        detail: `Ship by ${shipBy}`,
      }
  }
}

function TrackingNumber({ courier, number }: { courier: string | null; number: string }) {
  const [copied, setCopied] = useState(false)

  async function copy() {
    try {
      await navigator.clipboard.writeText(number)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // clipboard can be blocked; the number is still on screen to copy by hand
    }
  }

  return (
    <div className="order-tracking">
      <p className="order-section-title">Tracking number{courier ? ` · ${courier}` : ''}</p>
      <div className="order-tracking-row">
        <span className="order-tracking-number">{number}</span>
        <button type="button" className="icon-btn" aria-label="Copy tracking number" onClick={copy}>
          {copied ? <Check size={20} /> : <Copy size={20} />}
        </button>
      </div>
    </div>
  )
}

function ShipForm({ order }: { order: OrderModel }) {
  const { markShipped } = useAppState()
  const [courier, setCourier] = useState('')
  const [tracking, setTracking] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  async function submit(e: FormEvent) {
    e.preventDefault()
    const c = courier.trim()
    const t = tracking.trim()
    if (!c || t.length < 4) {
      setError('Enter the courier name and the tracking number from your receipt.')
      return
    }
    setSaving(true)
    setError(null)
    const problem = await markShipped(order, c, t)
    setSaving(false)
    if (problem) setError(problem)
  }

  return (
    <form className="order-ship-form" onSubmit={submit} noValidate>
      <p className="order-section-title">Mark as shipped</p>
      <p className="order-action-copy">Book any courier, then enter its name and tracking number.</p>
      <label className="order-field">
        <span>Courier</span>
        <input value={courier} maxLength={40} placeholder="e.g. Delhivery, India Post" onChange={(e) => setCourier(e.target.value)} />
      </label>
      <label className="order-field">
        <span>Tracking number</span>
        <input value={tracking} maxLength={40} onChange={(e) => setTracking(e.target.value)} />
      </label>
      {error && (
        <p className="order-error" role="alert">
          {error}
        </p>
      )}
      <button type="submit" className="btn btn-primary" disabled={saving}>
        {saving ? 'Saving…' : 'Mark as shipped'}
      </button>
    </form>
  )
}

// Paid orders when Shiprocket booking is on: Spotted books the courier and
// the seller only prints the label. Tracking then updates on its own.
function CourierShipping({ order }: { order: OrderModel }) {
  const { applyCourierBooking } = useAppState()
  const { addressId, loading, savePickup } = usePickupAddress()
  const [pickup, setPickup] = useState<Address | null>(null)
  const [booking, setBooking] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function choosePickup(address: Address) {
    setPickup(address)
    if (address.id === addressId) return
    const problem = await savePickup(address.id)
    if (problem) setError(problem)
  }

  async function getLabel() {
    setBooking(true)
    setError(null)
    try {
      const result = await bookCourier(order.uuid)
      applyCourierBooking(order, result)
    } catch (err) {
      setError(err instanceof CourierError ? err.message : "Couldn't book the courier. Try again in a minute.")
    } finally {
      setBooking(false)
    }
  }

  if (order.labelUrl) {
    return (
      <div className="order-action">
        <p className="order-section-title">Ship now</p>
        <p className="order-action-copy">
          Pack the item, stick this label on the parcel and hand it to {order.courier ?? 'the courier'} at pickup.
          Tracking updates here automatically.
        </p>
        <a className="btn btn-primary order-label-btn" href={order.labelUrl} target="_blank" rel="noreferrer">
          <Download size={18} />
          Download shipping label
        </a>
      </div>
    )
  }

  return (
    <div className="order-action">
      <p className="order-section-title">Ship now</p>
      <p className="order-action-copy">
        Spotted books the courier. Get your label, pack the item and the courier collects it from you.
      </p>
      {!loading && (
        <AddressPicker
          label="Pickup from"
          autoSelect={false}
          selectedId={addressId}
          selected={pickup}
          onSelect={choosePickup}
        />
      )}
      {error && (
        <p className="order-error" role="alert">
          {error}
        </p>
      )}
      <button type="button" className="btn btn-primary" disabled={booking || !pickup} onClick={getLabel}>
        {booking ? 'Booking courier…' : !pickup ? 'Choose a pickup address' : 'Get shipping label'}
      </button>
    </div>
  )
}

function SellerShipping({ order }: { order: OrderModel }) {
  // Demo orders were never paid, so they never get a real courier booking.
  const eligible = order.paymentStatus === 'paid'
  const [courierOn, setCourierOn] = useState<boolean | null>(eligible ? null : false)

  useEffect(() => {
    if (!eligible) return
    let cancelled = false
    fetchCourierEnabled().then((on) => {
      if (!cancelled) setCourierOn(on)
    })
    return () => {
      cancelled = true
    }
  }, [eligible])

  if (courierOn === null) return null
  return courierOn || order.courierProvider === 'shiprocket' ? <CourierShipping order={order} /> : <ShipForm order={order} />
}

function courierStatusLabel(status: string): string {
  return status.charAt(0) + status.slice(1).toLowerCase()
}

export default function Order() {
  const { uuid } = useParams()
  const navigate = useNavigate()
  const { orders, sales, ready, isAuthed, markReceived } = useAppState()
  const [receiving, setReceiving] = useState(false)
  const [receiveError, setReceiveError] = useState<string | null>(null)

  const purchase = orders.find((o) => o.uuid === uuid)
  const sale = sales.find((o) => o.uuid === uuid)
  const order = purchase ?? sale
  const isSeller = !purchase && !!sale

  async function handleReceived() {
    if (!order) return
    setReceiving(true)
    setReceiveError(null)
    const problem = await markReceived(order)
    setReceiving(false)
    if (problem) setReceiveError(problem)
  }

  const header = (
    <header className="order-header">
      <button type="button" className="icon-btn" aria-label="Back" onClick={() => navigate(-1)}>
        <ChevronLeft size={24} />
      </button>
      <h1 className="order-title">{isSeller ? 'Sale' : 'Purchase'}</h1>
      <div />
    </header>
  )

  if (!order) {
    return (
      <div className="order-page">
        {header}
        <div className="order-missing">
          {!isAuthed ? (
            <Link to={`/login?next=${encodeURIComponent(`/order/${uuid ?? ''}`)}`} className="btn btn-primary">
              Log in to see this order
            </Link>
          ) : !ready ? (
            <p>Loading order…</p>
          ) : (
            <p>We couldn't find this order.</p>
          )}
        </div>
      </div>
    )
  }

  const step = stepIndex(order)
  const { title, detail } = statusCopy(order, isSeller)
  const paidTotal = order.totalInr + order.shippingInr + order.buyerFeeInr
  const peerHandle = isSeller ? order.buyerHandle : order.sellerHandle
  // When Spotted books the courier it pays for shipping out of the buyer's
  // shipping charge; otherwise the seller ships and keeps that charge.
  const sellerShipping = order.courierProvider === 'shiprocket' ? 0 : order.shippingInr

  return (
    <div className="order-page">
      {header}

      <div className="order-body">
        {order.items.map((item) => (
          <div className="order-item" key={item.listingId}>
            <img className="order-item-img" src={item.img ?? `https://picsum.photos/seed/${item.listingId}/200/200`} alt="" />
            <div className="order-item-info">
              <p className="order-item-title">{item.title ?? 'Item'}</p>
              {item.size && <p className="order-item-size">{item.size}</p>}
              <p className="order-item-price">{formatInr(item.priceInr)}</p>
            </div>
          </div>
        ))}

        <div className="order-status-card">
          <p className="order-status-title">{title}</p>
          <p className="order-status-detail">{detail}</p>
          {order.courierStatus && order.status !== 'delivered' && (
            <p className="order-status-detail">Latest update: {courierStatusLabel(order.courierStatus)}</p>
          )}
          {order.status !== 'cancelled' && (
            <>
              <div
                className="order-progress"
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={2}
                aria-valuenow={step}
                aria-label="Order progress"
              >
                <div className="order-progress-fill" style={{ width: `${(step / 2) * 100}%` }} />
              </div>
              <div className="order-steps">
                <span className="order-step active">Purchased</span>
                <span className={'order-step' + (step >= 1 ? ' active' : '')}>Shipped</span>
                <span className={'order-step' + (step >= 2 ? ' active' : '')}>Delivered</span>
              </div>
            </>
          )}
        </div>

        {order.trackingNumber && <TrackingNumber courier={order.courier} number={order.trackingNumber} />}

        {isSeller && order.status === 'paid' && <SellerShipping order={order} />}

        {!isSeller && order.status === 'shipped' && (
          <div className="order-action">
            <p className="order-action-copy">Got the parcel? Let the seller know it arrived.</p>
            {receiveError && (
              <p className="order-error" role="alert">
                {receiveError}
              </p>
            )}
            <button type="button" className="btn btn-primary" disabled={receiving} onClick={handleReceived}>
              {receiving ? 'Saving…' : "I've received it"}
            </button>
          </div>
        )}

        {order.shipTo && (
          <div className="order-section">
            <p className="order-section-title">{isSeller ? 'Ship to' : 'Shipping to'}</p>
            <p className="order-address-name">{order.shipTo.name}</p>
            <p className="order-address-line">{formatAddress(order.shipTo)}</p>
            {isSeller && <p className="order-address-line">{order.shipTo.phone}</p>}
          </div>
        )}

        <div className="order-section order-receipt">
          <p className="order-section-title">{isSeller ? 'Your earnings' : 'Receipt'}</p>
          <div className="order-receipt-row">
            <span>Item price</span>
            <span>{formatInr(order.totalInr)}</span>
          </div>
          <div className="order-receipt-row">
            <span>Shipping</span>
            <span>
              {isSeller && order.courierProvider === 'shiprocket'
                ? 'Paid by Spotted'
                : formatInr(order.shippingInr)}
            </span>
          </div>
          {!isSeller && (
            <div className="order-receipt-row">
              <span>Buyer protection fee</span>
              <span>{formatInr(order.buyerFeeInr)}</span>
            </div>
          )}
          <div className="order-receipt-row order-receipt-total">
            <span>{isSeller ? 'You receive' : 'Total'}</span>
            <span>{formatInr(isSeller ? order.totalInr + sellerShipping : paidTotal)}</span>
          </div>
          <p className="order-receipt-meta">
            Order {order.id} · placed {formatDate(order.placedAt)}
          </p>
        </div>

        {peerHandle && (
          <Link to={`/inbox/t/${encodeURIComponent(peerHandle)}`} className="order-message">
            <Mail size={20} />
            Message @{peerHandle}
          </Link>
        )}
      </div>
    </div>
  )
}
