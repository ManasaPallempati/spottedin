import { useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ChevronLeft, Copy, Check, Mail } from 'lucide-react'
import { useAppState, type Order as OrderModel } from '../lib/appState'
import { formatAddress } from '../lib/addresses'
import { formatInr } from '../lib/pricing'
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

        {isSeller && order.status === 'paid' && <ShipForm order={order} />}

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
            <span>{formatInr(order.shippingInr)}</span>
          </div>
          {!isSeller && (
            <div className="order-receipt-row">
              <span>Buyer protection fee</span>
              <span>{formatInr(order.buyerFeeInr)}</span>
            </div>
          )}
          <div className="order-receipt-row order-receipt-total">
            <span>{isSeller ? 'You receive' : 'Total'}</span>
            <span>{formatInr(isSeller ? order.totalInr + order.shippingInr : paidTotal)}</span>
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
