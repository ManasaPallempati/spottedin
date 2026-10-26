// Inventory honesty: the app must never present stock photography as an item or
// a seller, and an empty marketplace must say so instead of looking populated.
import { describe, expect, it } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import App from '../App'
import { listingPath } from '../lib/listingUrls'
import { db } from './fakeSupabase'

function visit(path: string) {
  window.history.replaceState(null, '', path)
  return render(<App />)
}

const NO_PHOTO_LISTING = {
  id: 'listing-no-photo',
  title: 'Chanderi silk kurta',
  description: 'Ivory, worn twice.',
  size: 'M',
  price_inr: 1400,
  category: 'women',
  likes: 0,
  image_path: null,
  created_at: '2026-10-01T00:00:00Z',
  seller_id: 'seller-1',
  seller: { handle: 'meera', name: 'Meera Rao', bio: null, rating: 0, sales: 0 },
  status: 'live',
}

function externalImageSources(container: HTMLElement): string[] {
  return Array.from(container.querySelectorAll('img'))
    .map((img) => img.getAttribute('src') ?? '')
    .filter((src) => /^https?:\/\//i.test(src))
}

describe('listing photos', () => {
  it('shows "Photo unavailable" instead of a stock photo when a listing has none', async () => {
    db.listings = [NO_PHOTO_LISTING]
    const { container } = visit(listingPath(NO_PHOTO_LISTING.id, NO_PHOTO_LISTING.title))

    expect(await screen.findByRole('heading', { level: 1, name: /Chanderi silk kurta/ })).toBeTruthy()
    expect(screen.getAllByRole('img', { name: /photo unavailable/i }).length).toBeGreaterThan(0)
    expect(externalImageSources(container)).toEqual([])
  })

  it("shows the seller's initials, not a stranger's photo", async () => {
    db.listings = [NO_PHOTO_LISTING]
    const { container } = visit(listingPath(NO_PHOTO_LISTING.id, NO_PHOTO_LISTING.title))

    await screen.findByRole('heading', { level: 1, name: /Chanderi silk kurta/ })
    const avatar = container.querySelector('.product-seller-avatar')
    expect(avatar?.tagName).toBe('SPAN')
    expect(avatar?.textContent).toBe('MR')
  })

  it('uses the uploaded photo when there is one', async () => {
    db.listings = [{ ...NO_PHOTO_LISTING, image_path: 'seller-1/kurta.jpg' }]
    const { container } = visit(listingPath(NO_PHOTO_LISTING.id, NO_PHOTO_LISTING.title))

    await screen.findByRole('heading', { level: 1, name: /Chanderi silk kurta/ })
    expect(externalImageSources(container)).toEqual(['https://storage.test/listing-images/seller-1/kurta.jpg'])
    expect(screen.queryByRole('img', { name: /photo unavailable/i })).toBeNull()
  })
})

describe('empty marketplace', () => {
  it('says there are no listings yet and offers a way to start selling', async () => {
    db.listings = []
    visit('/home')

    expect(await screen.findByRole('heading', { name: 'No listings yet' })).toBeTruthy()
    const cta = screen.getByRole('link', { name: 'Start selling' })
    expect(cta.getAttribute('href')).toBe('/sell')
  })

  it('shows listings, not the empty state, once there are some', async () => {
    db.listings = [NO_PHOTO_LISTING]
    visit('/home')

    await waitFor(() => expect(screen.getAllByText('Chanderi silk kurta').length).toBeGreaterThan(0))
    expect(screen.queryByRole('heading', { name: 'No listings yet' })).toBeNull()
  })
})

describe('seller and item details', () => {
  it('shows the condition the seller recorded, and none when there is none', async () => {
    db.listings = [{ ...NO_PHOTO_LISTING, condition: 'like-new' }]
    const first = visit(listingPath(NO_PHOTO_LISTING.id, NO_PHOTO_LISTING.title))
    await screen.findByRole('heading', { level: 1, name: /Chanderi silk kurta/ })
    expect(screen.getByText('Like new')).toBeTruthy()
    first.unmount()

    db.listings = [{ ...NO_PHOTO_LISTING, condition: null }]
    visit(listingPath(NO_PHOTO_LISTING.id, NO_PHOTO_LISTING.title))
    await screen.findByRole('heading', { level: 1, name: /Chanderi silk kurta/ })
    expect(screen.queryByText('Condition')).toBeNull()
  })

  it('labels a seller with no sales as new, with no stars, reviews or activity claims', async () => {
    db.listings = [NO_PHOTO_LISTING]
    const { container } = visit(listingPath(NO_PHOTO_LISTING.id, NO_PHOTO_LISTING.title))

    await screen.findByRole('heading', { level: 1, name: /Chanderi silk kurta/ })
    expect(screen.getByText('New seller')).toBeTruthy()
    expect(container.querySelector('.product-seller-rating')).toBeNull()
    expect(screen.queryByText(/reviews/i)).toBeNull()
    expect(screen.queryByText(/Active (this week|today)/)).toBeNull()
  })

  it('has no shop pages for the old sample sellers', async () => {
    visit('/shop/ritu.thrifts')
    expect(await screen.findByText('Shop not found')).toBeTruthy()
    expect(screen.queryByText(/reviews/i)).toBeNull()
  })

  it('never posts a reply on the seller’s behalf', async () => {
    const { makeSession, setSession, inserts } = await import('./fakeSupabase')
    setSession(makeSession('buyer@example.com', 'user-1'))
    db.profiles = [{ id: 'user-1', handle: 'asha', name: 'Asha', date_of_birth: '1995-04-12' }]
    visit('/inbox/t/nobody_here')

    const box = await screen.findByRole('textbox')
    fireEvent.change(box, { target: { value: 'Is this still available?' } })
    fireEvent.click(screen.getByRole('button', { name: 'Send message' }))

    await waitFor(() => expect(inserts.some((i) => i.table === 'spotted_messages')).toBe(true))
    await new Promise((resolve) => setTimeout(resolve, 1600))
    const messages = inserts.filter((i) => i.table === 'spotted_messages')
    expect(messages).toHaveLength(1)
    expect(screen.queryByText(/still available 😊|Ships in 2–3 days/)).toBeNull()
  })
})
