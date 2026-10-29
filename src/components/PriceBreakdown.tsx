import { useState } from 'react'
import { ChevronRight, HelpCircle } from 'lucide-react'
import { formatInr, type Charges } from '../lib/pricing'
import FullScreenPanel from './FullScreenPanel'
import './checkout.css'

type PriceBreakdownProps = {
  charges: Charges
  itemLabel: string
}

// "Order summary" row with the total; tapping it opens the full receipt on its
// own screen: item, shipping, buyer protection fee (with an explainer), total.
export default function PriceBreakdown({ charges, itemLabel }: PriceBreakdownProps) {
  const [open, setOpen] = useState(false)
  const [feeInfo, setFeeInfo] = useState(false)

  return (
    <div className="checkout-breakdown">
      <p className="checkout-section-heading">Order summary</p>
      <button type="button" className="checkout-row-btn" aria-haspopup="dialog" onClick={() => setOpen(true)}>
        <span className="checkout-row-text">
          <span className="checkout-total-line">Total: {formatInr(charges.total)}</span>
          <span className="checkout-row-value">
            Includes {formatInr(charges.shipping)} shipping and {formatInr(charges.buyerFee)} buyer protection fee
          </span>
        </span>
        <ChevronRight size={20} />
      </button>

      <FullScreenPanel open={open} onClose={() => setOpen(false)} title="Checkout summary">
        <div className="checkout-receipt">
          <div className="checkout-receipt-row">
            <span className="checkout-receipt-item">{itemLabel}</span>
            <span>{formatInr(charges.itemTotal)}</span>
          </div>
          <div className="checkout-receipt-row">
            <span>Shipping</span>
            <span>{formatInr(charges.shipping)}</span>
          </div>
          <div className="checkout-receipt-row">
            <span className="checkout-receipt-label">
              Buyer protection fee
              <button
                type="button"
                className="checkout-info-btn"
                aria-label="What is the buyer protection fee?"
                onClick={() => setFeeInfo((v) => !v)}
              >
                <HelpCircle size={16} />
              </button>
            </span>
            <span>{formatInr(charges.buyerFee)}</span>
          </div>
          {feeInfo && (
            <p className="checkout-receipt-note">
              Selling on Spotted is free. This fee covers secure payments, order tracking and help if something
              goes wrong. Includes GST.
            </p>
          )}
          <div className="checkout-receipt-row checkout-receipt-total">
            <span>Total</span>
            <span>{formatInr(charges.total)}</span>
          </div>
        </div>
      </FullScreenPanel>
    </div>
  )
}
