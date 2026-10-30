// Saves are private bookmarks: the listing's Save button writes a row to
// public.saves (round 22) and the item shows on the profile's Saves tab.
import { describe, expect, it } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import App from '../App'
import { listingPath } from '../lib/listingUrls'
import { db, inserts, makeSession, setSession } from './fakeSupabase'

const LISTING = {
  id: 'listing-save-1',
  title: 'Linen co-ord set',
  description: 'Sage green.',
  size: 'S',
  price_inr: 1500,
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

describe('saves', () => {
  it('saves a listing from its page', async () => {
    setSession(makeSession('asha@example.com', 'user-1'))
    db.profiles = [{ id: 'user-1', handle: 'asha', name: 'Asha', date_of_birth: '1995-04-12' }]
    db.listings = [LISTING]
    visit(listingPath(LISTING.id, LISTING.title))

    fireEvent.click(await screen.findByRole('button', { name: 'Save' }))
    expect(screen.getByRole('button', { name: 'Remove from saves' }).getAttribute('aria-pressed')).toBe('true')
    await waitFor(() =>
      expect(inserts).toContainEqual({ table: 'saves', values: { user_id: 'user-1', listing_id: LISTING.id } })
    )
  })

  it('lists saved items on the profile Saves tab', async () => {
    setSession(makeSession('asha@example.com', 'user-1'))
    db.profiles = [{ id: 'user-1', handle: 'asha', name: 'Asha', date_of_birth: '1995-04-12' }]
    db.listings = [LISTING]
    db.saves = [{ user_id: 'user-1', listing_id: LISTING.id, created_at: '2026-10-02T00:00:00Z' }]
    const { container } = visit('/profile')

    fireEvent.click(await screen.findByRole('button', { name: 'Saves' }))
    await waitFor(() => expect(container.querySelector(`.profile-grid a[href*="${LISTING.id}"]`)).not.toBeNull())
  })
})
