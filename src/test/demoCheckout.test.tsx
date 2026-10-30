// A demo checkout takes no payment, so it must not take real inventory off
// sale. Only the razorpay-order Edge Function (after a verified payment) may
// mark a listing sold.
import { describe, expect, it } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import App from '../App'
import { db, inserts, makeSession, setSession, supabase } from './fakeSupabase'

const LISTING = {
  id: 'listing-1',
  title: 'Kanjivaram silk saree',
  description: null,
  size: 'Free size',
  price_inr: 2500,
  category: 'women',
  likes: 3,
  image_path: null,
  created_at: '2026-10-01T00:00:00Z',
  seller_id: 'seller-1',
  seller: { handle: 'meera', name: 'Meera', bio: null, rating: null, sales: 0 },
  status: 'live',
}

describe('demo checkout (payments not enabled)', () => {
  it('records the demo order but never marks the real listing sold', async () => {
    setSession(makeSession('buyer@example.com', 'user-1'))
    db.profiles = [{ id: 'user-1', handle: 'asha', name: 'Asha', date_of_birth: '1995-04-12' }]
    db.listings = [LISTING]
    db.bag_items = [{ user_id: 'user-1', listing_id: 'listing-1', added_at: '2026-10-26T10:00:00Z' }]
    db.spotted_addresses = [
      { id: 'addr-1', user_id: 'user-1', name: 'Asha Rao', phone: '9876543210', line1: '12 MG Road', line2: '', city: 'Bengaluru', state: 'Karnataka', pincode: '560001' },
    ]
    window.history.replaceState(null, '', '/bag')
    render(<App />)

    fireEvent.click((await screen.findAllByRole('button', { name: 'Checkout' }))[0])
    fireEvent.click(await screen.findByRole('button', { name: 'Place order (demo)' }))

    await waitFor(() => expect(inserts.some((i) => i.table === 'order_items')).toBe(true))
    expect(await screen.findByText(/This is a demo — no payment was taken\./)).toBeTruthy()
    expect(supabase.rpc).not.toHaveBeenCalledWith('mark_listings_sold', expect.anything())
    expect(db.listings[0].status).toBe('live')
  })
})
