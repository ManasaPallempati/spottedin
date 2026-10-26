// A sold or deleted item left in the bag must not inflate the total or be
// sent to checkout, and the buyer must be able to see and remove it.
import { describe, expect, it } from 'vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import App from '../App'
import { db, inserts, makeSession, setSession } from './fakeSupabase'

function listing(id: string, title: string, price: number, status: 'live' | 'sold') {
  return {
    id,
    title,
    description: null,
    size: 'M',
    price_inr: price,
    category: 'women',
    likes: 0,
    image_path: null,
    created_at: '2026-10-01T00:00:00Z',
    seller_id: 'seller-1',
    seller: { handle: 'meera', name: 'Meera', bio: null, rating: null, sales: 0 },
    status,
  }
}

function openBag() {
  setSession(makeSession('buyer@example.com', 'user-1'))
  db.profiles = [{ id: 'user-1', handle: 'asha', name: 'Asha', date_of_birth: '1995-04-12' }]
  window.history.replaceState(null, '', '/bag')
  render(<App />)
}

describe('bag with unavailable items', () => {
  it('prices only live items, labels sold and deleted ones, and orders only the live one', async () => {
    db.listings = [listing('live-1', 'Silk saree', 2500, 'live'), listing('sold-1', 'Sold kurta', 1000, 'sold')]
    db.bag_items = [
      { user_id: 'user-1', listing_id: 'live-1', added_at: '2026-10-26T10:00:00Z' },
      { user_id: 'user-1', listing_id: 'sold-1', added_at: '2026-10-26T10:01:00Z' },
      { user_id: 'user-1', listing_id: 'deleted-1', added_at: '2026-10-26T10:02:00Z' },
    ]
    openBag()

    expect(await screen.findByText('Sold, not included in your total')).toBeTruthy()
    expect(await screen.findByText('This item is no longer available')).toBeTruthy()

    const summary = document.querySelector('.bag-summary') as HTMLElement
    await waitFor(() => expect(within(summary).getByText('₹2,549')).toBeTruthy()) // 2500 + 49 shipping
    expect(within(summary).getAllByText('₹2,500').length).toBe(1)
    expect(within(summary).getByText('₹49')).toBeTruthy()

    fireEvent.click(within(summary).getByRole('button', { name: 'Checkout' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Place order (demo)' }))

    await waitFor(() => expect(inserts.some((i) => i.table === 'order_items')).toBe(true))
    const order = inserts.find((i) => i.table === 'orders')!.values as Record<string, unknown>
    expect(order.total_inr).toBe(2500)
    const items = inserts.find((i) => i.table === 'order_items')!.values as Record<string, unknown>[]
    expect(items.map((i) => i.listing_id)).toEqual(['live-1'])
  })

  it('disables checkout and charges no shipping when every item is unavailable', async () => {
    db.listings = [listing('sold-1', 'Sold kurta', 1000, 'sold')]
    db.bag_items = [{ user_id: 'user-1', listing_id: 'sold-1', added_at: '2026-10-26T10:00:00Z' }]
    openBag()

    expect(await screen.findByText('Sold, not included in your total')).toBeTruthy()
    const summary = document.querySelector('.bag-summary') as HTMLElement
    expect(within(summary).getByRole('button', { name: 'Checkout' })).toHaveProperty('disabled', true)
    expect(within(summary).queryByText('₹49')).toBeNull()
  })
})
