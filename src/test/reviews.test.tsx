// Buyer reviews (round 23): the buyer of a delivered, paid order rates the
// seller through leave_review(), and the seller's shop shows the reviews.
import { describe, expect, it } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import App from '../App'
import { db, makeSession, setSession, supabase } from './fakeSupabase'

function visit(path: string) {
  window.history.replaceState(null, '', path)
  return render(<App />)
}

const BUYER = { id: 'user-1', handle: 'asha', name: 'Asha', avatar_emoji: null, bio: null, city: null, rating: null, sales: null, date_of_birth: '1995-04-12' }
const SELLER = { id: 'seller-1', handle: 'meera', name: 'Meera', avatar_emoji: null, bio: null, city: null, rating: 0, sales: 0, date_of_birth: '1992-08-30' }

function orderRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'order-uuid-1',
    buyer_id: 'user-1',
    code: 'SP-1001',
    total_inr: 1550,
    placed_at: '2026-10-20T10:00:00Z',
    ship_to: { name: 'Asha Rao', phone: '9876543210', line1: '12 MG Road', line2: '', city: 'Bengaluru', state: 'Karnataka', pincode: '560001' },
    shipping_inr: 79,
    buyer_fee_inr: 124,
    status: 'delivered',
    courier: 'Delhivery',
    tracking_number: 'DL123456',
    shipped_at: '2026-10-21T10:00:00Z',
    delivered_at: '2026-10-24T10:00:00Z',
    payment_status: 'paid',
    courier_provider: null,
    courier_status: null,
    label_url: null,
    buyer: { handle: 'asha' },
    seller: { handle: 'meera' },
    order_items: [{ listing_id: 'l-1', price_inr: 1550, title: 'Kanjivaram silk saree', img: null, size: 'Free size' }],
    ...overrides,
  }
}

describe('reviews', () => {
  it('lets the buyer review a delivered order', async () => {
    db.profiles = [BUYER]
    db.orders = [orderRow()]
    setSession(makeSession('asha@example.com', 'user-1'))
    visit('/order/order-uuid-1')

    const post = await screen.findByRole('button', { name: 'Post review' })
    fireEvent.click(post)
    expect((await screen.findByRole('alert')).textContent).toBe('Tap a star to rate the seller.')

    fireEvent.click(screen.getByRole('radio', { name: '4 stars' }))
    fireEvent.change(screen.getByLabelText('Comment (optional)'), { target: { value: '  Lovely saree, packed well.  ' } })
    fireEvent.click(post)

    expect(await screen.findByText('Your review')).toBeTruthy()
    expect(screen.getByText('Lovely saree, packed well.')).toBeTruthy()
    expect(supabase.rpc).toHaveBeenCalledWith('leave_review', {
      p_order_id: 'order-uuid-1',
      p_rating: 4,
      p_comment: 'Lovely saree, packed well.',
    })
  })

  it('shows the existing review instead of the form', async () => {
    db.profiles = [BUYER]
    db.orders = [orderRow()]
    db.spotted_reviews = [
      { id: 'r-1', order_id: 'order-uuid-1', seller_id: 'seller-1', rating: 5, comment: 'Perfect', created_at: '2026-10-25T10:00:00Z', reviewer: { handle: 'asha' } },
    ]
    setSession(makeSession('asha@example.com', 'user-1'))
    visit('/order/order-uuid-1')

    expect(await screen.findByText('Your review')).toBeTruthy()
    expect(screen.getByText('Perfect')).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Post review' })).toBeNull()
  })

  it('does not offer a review before delivery or on a demo order', async () => {
    db.profiles = [BUYER]
    db.orders = [orderRow({ status: 'shipped', delivered_at: null })]
    setSession(makeSession('asha@example.com', 'user-1'))
    const { unmount } = visit('/order/order-uuid-1')
    expect(await screen.findByRole('button', { name: "I've received it" })).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Post review' })).toBeNull()
    unmount()

    db.orders = [orderRow({ payment_status: 'demo' })]
    visit('/order/order-uuid-1')
    await screen.findByText(/Order SP-1001/)
    expect(screen.queryByRole('button', { name: 'Post review' })).toBeNull()
  })

  it("shows the seller's reviews and average on their shop", async () => {
    db.profiles = [SELLER]
    db.listings = []
    db.spotted_reviews = [
      { id: 'r-1', order_id: 'o-1', seller_id: 'seller-1', rating: 5, comment: 'Perfect', created_at: '2026-10-25T10:00:00Z', reviewer: { handle: 'asha' } },
      { id: 'r-2', order_id: 'o-2', seller_id: 'seller-1', rating: 4, comment: '', created_at: '2026-10-26T10:00:00Z', reviewer: { handle: 'ravi' } },
    ]
    visit('/shop/meera')

    expect(await screen.findByRole('img', { name: '4.5 out of 5 stars' })).toBeTruthy()
    expect(screen.getByText('(2)')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Reviews' }))
    await waitFor(() => expect(screen.getByText('Perfect')).toBeTruthy())
    expect(screen.getByText('@ravi')).toBeTruthy()
  })

  it('calls a seller with no reviews a new seller', async () => {
    db.profiles = [SELLER]
    db.listings = []
    visit('/shop/meera')

    expect(await screen.findByText('New seller')).toBeTruthy()
  })
})
