import { useEffect, useState } from 'react'
import { CheckCircle } from 'lucide-react'
import BottomSheet from './BottomSheet'
import { useAuth } from '../lib/auth'
import {
  BOOST_TIERS,
  PaymentError,
  fetchBoostConfig,
  startBoostPayment,
  type BoostResult,
  type BoostTier,
  type PaymentConfig,
} from '../lib/payments'
import './BoostSheet.css'

function formatInr(value: number) {
  return `₹${value.toLocaleString('en-IN')}`
}

function formatUntil(epochMs: number) {
  return new Date(epochMs).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}

type BoostSheetProps = {
  listingId: string
  open: boolean
  onClose: () => void
  onBoosted: (boost: BoostResult) => void
}

// Tier picker + payment for boosting the seller's own listing. Mirrors the
// Bag checkout sheet: demo is the default, and the "Pay ₹N" button only
// appears after the boost-order config action reports live payments enabled.
export default function BoostSheet({ listingId, open, onClose, onBoosted }: BoostSheetProps) {
  const { profile, session } = useAuth()
  const [tierId, setTierId] = useState<BoostTier['id']>(BOOST_TIERS[0].id)
  const [config, setConfig] = useState<PaymentConfig | null>(null)
  const [paying, setPaying] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<BoostResult | null>(null)

  // Demo is the default; live mode only after the Edge Function confirms the
  // server-side Razorpay gate is open. Any error resolves to demo (fail closed).
  useEffect(() => {
    if (!open) return
    let cancelled = false
    fetchBoostConfig().then((c) => {
      if (!cancelled) setConfig(c)
    })
    return () => {
      cancelled = true
    }
  }, [open])

  const live = config?.enabled === true
  const checking = config === null
  const tier = BOOST_TIERS.find((t) => t.id === tierId) ?? BOOST_TIERS[0]

  function handleClose() {
    setError(null)
    setResult(null)
    onClose()
  }

  async function handleBoost() {
    setPaying(true)
    setError(null)
    try {
      const boost = await startBoostPayment(listingId, tier.id, {
        name: profile?.name,
        email: session?.user?.email,
      })
      setResult(boost)
      onBoosted(boost)
    } catch (err) {
      const e = err instanceof PaymentError ? err : new PaymentError('failed', 'Could not boost the listing. Please try again.')
      setError(e.message)
    } finally {
      setPaying(false)
    }
  }

  return (
    <BottomSheet open={open} onClose={handleClose} title={result ? undefined : 'Boost this listing'}>
      {result ? (
        <div className="boost-confirm">
          <CheckCircle size={48} className="boost-confirm-icon" />
          <h4 className="boost-confirm-title">Listing boosted!</h4>
          <p className="boost-confirm-copy">
            {result.paymentStatus === 'paid'
              ? `${formatInr(result.amountInr)} paid via Razorpay. Boosted until ${formatUntil(result.expiresAt)}.`
              : `This is a demo — no payment was taken. Boosted until ${formatUntil(result.expiresAt)}.`}
          </p>
          <button type="button" className="btn btn-primary boost-confirm-btn" onClick={handleClose}>
            Done
          </button>
        </div>
      ) : (
        <div className="boost-body">
          <p className="boost-intro">
            Boosted listings appear at the top of the Home feed with a “Boosted” label until the boost
            expires.
          </p>

          <fieldset className="boost-tiers">
            <legend className="boost-tiers-legend">Choose a duration</legend>
            {BOOST_TIERS.map((t) => (
              <label key={t.id} className={'boost-tier' + (tierId === t.id ? ' selected' : '')}>
                <input
                  type="radio"
                  className="boost-tier-input"
                  name="boost-tier"
                  value={t.id}
                  checked={tierId === t.id}
                  onChange={() => setTierId(t.id)}
                />
                <span className="boost-tier-days">{t.days} days</span>
                <span className="boost-tier-price">{formatInr(t.amountInr)}</span>
              </label>
            ))}
          </fieldset>

          <div className="boost-payment-row">
            {live ? (
              <span>Razorpay · UPI, cards, netbanking</span>
            ) : (
              <>
                <span>Spotted Pay · demo mode</span>
                <span className="boost-demo-badge">DEMO</span>
              </>
            )}
          </div>

          {error && (
            <p className="boost-error" role="alert">
              {error}
            </p>
          )}

          {live ? (
            <button type="button" className="btn btn-primary boost-pay-btn" disabled={paying} onClick={handleBoost}>
              {paying ? 'Processing…' : `Pay ${formatInr(tier.amountInr)}`}
            </button>
          ) : (
            <button
              type="button"
              className="btn btn-primary boost-pay-btn"
              disabled={checking || paying}
              onClick={handleBoost}
            >
              {checking ? 'Checking payment options…' : paying ? 'Boosting…' : 'Boost listing (demo)'}
            </button>
          )}
        </div>
      )}
    </BottomSheet>
  )
}
