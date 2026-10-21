// Smoke tests for the three flows Manasa demos on staging: sign-in, a listing
// page, and the 3-step sell flow. They render the whole app (real routing,
// providers and pages) against the in-memory Supabase fake.
import { describe, expect, it } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import App from '../App'
import { listingPath } from '../lib/listingUrls'
import { db, inserts, makeSession, setSession, supabase } from './fakeSupabase'

function visit(path: string) {
  window.history.replaceState(null, '', path)
  return render(<App />)
}

const LISTING = {
  id: 'listing-1',
  title: 'Kanjivaram silk saree',
  description: 'Worn once at a wedding.',
  size: 'Free size',
  price_inr: 2500,
  category: 'women',
  likes: 3,
  image_path: null,
  created_at: '2026-10-01T00:00:00Z',
  seller_id: 'seller-1',
  seller: { handle: 'meera', name: 'Meera', bio: null, rating: 4.8, sales: 12 },
  status: 'live',
}

// An adult with a date of birth on file, so the birthday gate (App.tsx) lets them through.
const BUYER_PROFILE = { id: 'user-1', handle: 'asha', name: 'Asha', date_of_birth: '1995-04-12' }
const SELLER_PROFILE = { id: 'seller-1', handle: 'meera', name: 'Meera', date_of_birth: '1992-08-30' }

describe('sign-in', () => {
  it('signs in with email and password, then returns to the requested page', async () => {
    db.profiles = [BUYER_PROFILE]
    visit('/login?next=%2Fhome')

    fireEvent.change(await screen.findByLabelText('Email'), { target: { value: 'buyer@example.com' } })
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'correct-horse-1!' } })
    fireEvent.click(screen.getByRole('button', { name: 'Log in' }))

    await waitFor(() =>
      expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
        email: 'buyer@example.com',
        password: 'correct-horse-1!',
      }),
    )
    await waitFor(() => expect(window.location.pathname).toBe('/home'))
  })

  it('shows the error and stays on the login page when sign-in fails', async () => {
    supabase.auth.signInWithPassword.mockResolvedValueOnce({
      data: { session: null, user: null },
      error: { message: 'Invalid login credentials', code: 'invalid_credentials' },
    } as never)
    visit('/login')

    fireEvent.change(await screen.findByLabelText('Email'), { target: { value: 'buyer@example.com' } })
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'wrong-password' } })
    fireEvent.click(screen.getByRole('button', { name: 'Log in' }))

    expect((await screen.findByRole('alert')).textContent).toBe(
      'That email and password do not match. Please check and try again.',
    )
    expect(window.location.pathname).toBe('/login')
  })
})

describe('listing page', () => {
  it('shows the title, price and the Buy and Offer actions', async () => {
    db.listings = [LISTING]
    visit(listingPath(LISTING.id, LISTING.title))

    expect(await screen.findByRole('heading', { level: 1, name: /Kanjivaram silk saree/ })).toBeTruthy()
    expect(screen.getAllByText('₹2,500').length).toBeGreaterThan(0)
    expect(screen.getAllByRole('button', { name: 'Buy now' }).length).toBeGreaterThan(0)
    expect(screen.getByRole('button', { name: 'Make offer' })).toBeTruthy()
  })

  it('shows a not-found page instead of a blank screen for an unknown listing', async () => {
    visit('/listing/does-not-exist/anything')

    expect(await screen.findByRole('heading', { name: 'This item cannot be found' })).toBeTruthy()
  })
})

describe('sell flow', () => {
  it('walks Photos → Details → Describe & list and creates the listing', async () => {
    const session = makeSession('seller@example.com', 'seller-1')
    setSession(session)
    db.profiles = [SELLER_PROFILE]
    db.categories = [
      { id: 'cat-women', parent_id: null, name: 'Women', position: 0, active: true },
      { id: 'cat-sarees', parent_id: 'cat-women', name: 'Sarees', position: 0, active: true },
    ]
    visit('/sell/new')

    // Step 1: Photos (optional) → Next.
    expect(await screen.findByRole('heading', { name: 'List an item' })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Next' }))

    // Step 2: Details are validated before moving on.
    const titleInput = await screen.findByLabelText('Title')
    fireEvent.click(screen.getByRole('button', { name: 'Next' }))
    expect(await screen.findByText('Title is required.')).toBeTruthy()

    fireEvent.change(titleInput, { target: { value: 'Banarasi silk saree' } })
    fireEvent.change(screen.getByLabelText('Price'), { target: { value: '1800' } })
    await waitFor(() => expect(screen.getByLabelText('Category')).toHaveProperty('disabled', false))
    fireEvent.click(screen.getByLabelText('Category'))
    fireEvent.click(await screen.findByRole('button', { name: /Women/ }))
    fireEvent.click(await screen.findByRole('button', { name: /Sarees/ }))
    await waitFor(() => expect(screen.getByLabelText('Category').textContent).toContain('Sarees'))
    fireEvent.click(screen.getByRole('button', { name: 'Next' }))

    // Step 3: Describe & list.
    fireEvent.change(await screen.findByLabelText('Description (optional)'), {
      target: { value: 'Bought last year, worn twice.' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'List item' }))

    await waitFor(() => expect(inserts.some((i) => i.table === 'listings')).toBe(true))
    const listing = inserts.find((i) => i.table === 'listings')!.values as Record<string, unknown>
    expect(listing).toMatchObject({
      seller_id: 'seller-1',
      title: 'Banarasi silk saree',
      description: 'Bought last year, worn twice.',
      price_inr: 1800,
      category_id: 'cat-sarees',
    })
    // status and likes are left to their database defaults (column-scoped INSERT grant).
    expect(listing).not.toHaveProperty('status')
    expect(listing).not.toHaveProperty('likes')
    await waitFor(() => expect(window.location.pathname).toBe(listingPath(String(listing.id), 'Banarasi silk saree')))
  })

  it('sends a signed-out seller to log in first', async () => {
    visit('/sell/new')

    await waitFor(() => expect(window.location.pathname).toBe('/login'))
    expect(new URLSearchParams(window.location.search).get('next')).toBe('/sell/new')
  })
})
