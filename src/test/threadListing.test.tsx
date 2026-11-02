// A chat started from a listing shows that listing with an Offer button, and
// keeps showing it when the chat is reopened from the inbox (no ?listing=).
import { describe, expect, it } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import App from '../App'
import { db } from './fakeSupabase'

const LISTING = {
  id: 'listing-chat-1',
  title: 'Banarasi saree',
  description: 'Red, worn once.',
  size: 'Free',
  price_inr: 2000,
  category: 'women',
  likes: 0,
  image_path: null,
  created_at: '2026-10-01T00:00:00Z',
  seller_id: 'seller-1',
  seller: { handle: 'meera', name: 'Meera Rao', bio: null, rating: 0, sales: 0 },
  status: 'live',
}

function visit(path: string) {
  window.history.replaceState(null, '', path)
  return render(<App />)
}

describe('chat with a seller about a listing', () => {
  it('shows the listing and a 10%-off Offer button, and remembers it', async () => {
    db.listings = [LISTING]
    visit('/inbox/t/meera?listing=listing-chat-1')
    expect(await screen.findByRole('button', { name: 'Offer ₹1,800' })).toBeTruthy()
    expect(screen.getByText('@meera', { selector: '.thread-intro-handle' })).toBeTruthy()
    cleanup()

    visit('/inbox/t/meera')
    expect(await screen.findByRole('button', { name: 'Offer ₹1,800' })).toBeTruthy()
  })
})
