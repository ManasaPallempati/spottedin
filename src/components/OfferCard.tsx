import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAppState, type Offer } from '../lib/appState'
import { useListing } from '../lib/useListings'
import { listingPath } from '../lib/listingUrls'
import OfferCheckout from './OfferCheckout'
import './OfferCard.css'

export default function OfferCard({ offer }: { offer: Offer }) {
  const { listing } = useListing(offer.listingId)
  const { respondToOffer, hasPurchased } = useAppState()
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false)
  const amount = offer.amountInr.toLocaleString('en-IN')
  const isSold = listing?.status === 'sold'
  const purchased = hasPurchased(offer.listingId)
  const amountLine = (
    <p className="offer-card-line">
      {offer.direction === 'made' ? 'You offered ' : `@${offer.peerHandle} offered `}
      <strong>₹{amount}</strong>
    </p>
  )

  return (
    <div className="offer-card">
      {listing && (
        <Link to={listingPath(listing.id, listing.brand)} className="offer-card-listing">
          <img className="offer-card-thumb" src={listing.img} alt={listing.brand} />
          <div className="offer-card-listing-info">
            <span className="offer-card-brand">{listing.brand}</span>
            <span className="offer-card-price">₹{listing.price.toLocaleString('en-IN')}</span>
          </div>
        </Link>
      )}

      {offer.direction === 'received' && offer.status === 'pending' && (
        <>
          {amountLine}
          <div className="offer-card-actions">
            <button
              type="button"
              className="btn btn-outline offer-card-btn"
              onClick={() => respondToOffer(offer, 'decline')}
            >
              Decline
            </button>
            <button
              type="button"
              className="btn btn-primary offer-card-btn"
              onClick={() => respondToOffer(offer, 'accept')}
            >
              Accept
            </button>
          </div>
        </>
      )}

      {offer.direction === 'made' && offer.status === 'pending' && (
        <div className="offer-card-row">
          {amountLine}
          <span className="offer-card-pill offer-card-pill-pending">Pending</span>
        </div>
      )}

      {offer.status === 'accepted' && (
        <>
          {offer.direction === 'made' && purchased && (
            <div className="offer-card-row">
              {amountLine}
              <span className="offer-card-pill offer-card-pill-success">Purchased ✓</span>
            </div>
          )}

          {offer.direction === 'made' && !purchased && isSold && (
            <div className="offer-card-row">
              {amountLine}
              <span className="offer-card-pill offer-card-pill-sold">Sold</span>
            </div>
          )}

          {offer.direction === 'made' && !purchased && !isSold && (
            <>
              <div className="offer-card-row">
                {amountLine}
                <span className="offer-card-pill offer-card-pill-accepted">Accepted</span>
              </div>
              <button
                type="button"
                className="btn btn-primary offer-card-buy-btn"
                disabled={!listing}
                onClick={() => setIsCheckoutOpen(true)}
              >
                Buy now for ₹{amount}
              </button>
            </>
          )}

          {offer.direction === 'received' && isSold && (
            <div className="offer-card-row">
              {amountLine}
              <span className="offer-card-pill offer-card-pill-success">Sold ✓</span>
            </div>
          )}

          {offer.direction === 'received' && !isSold && (
            <div className="offer-card-row">
              {amountLine}
              <span className="offer-card-pill offer-card-pill-accepted">Accepted</span>
            </div>
          )}
        </>
      )}

      {offer.status === 'declined' && (
        <div className="offer-card-row">
          {amountLine}
          <span className="offer-card-pill offer-card-pill-declined">Declined</span>
        </div>
      )}

      {listing && (
        <OfferCheckout
          offer={offer}
          listing={listing}
          open={isCheckoutOpen}
          onClose={() => setIsCheckoutOpen(false)}
        />
      )}
    </div>
  )
}
