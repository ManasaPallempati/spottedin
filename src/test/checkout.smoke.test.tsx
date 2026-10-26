// Smoke tests for the set-password page, per-seller checkout and the order
// page. Like smoke.test.tsx on staging, they render the whole app (real
// routing, providers and pages) against the in-memory Supabase fake.
import { describe, expect, it } from 'vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import App from '../App'
import { db, inserts, makeSession, setSession, supabase } from './fakeSupabase'

function visit(path: string) {
  window.history.replaceState(null, '', path)
  return render(<App />)
}

function route() {
  return window.location.pathname + window.location.search
}

// Adults with a date of birth on file, so the birthday gate (App.tsx) lets them through.
const BUYER = { id: 'user-1', handle: 'asha', name: 'Asha', avatar_emoji: null, bio: null, city: null, rating: null, sales: null, date_of_birth: '1995-04-12' }
const SELLER = { id: 'seller-1', handle: 'meera', name: 'Meera', avatar_emoji: null, bio: null, city: null, rating: 4.8, sales: 12, date_of_birth: '1992-08-30' }
const OTHER_SELLER = { id: 'seller-2', handle: 'ravi', name: 'Ravi', avatar_emoji: null, bio: null, city: null, rating: null, sales: 0, date_of_birth: '1990-01-01' }

function listing(id: string, title: string, price: number, seller: { id: string; handle: string; name: string; rating: number | null; sales: number | null }) {
  return {
    id,
    title,
    description: null,
    size: 'M',
    price_inr: price,
    category: 'women',
    likes: 0,
    image_path: `https://img.test/${id}.jpg`,
    created_at: '2026-10-01T00:00:00Z',
    seller_id: seller.id,
    seller: { handle: seller.handle, name: seller.name, bio: null, rating: seller.rating, sales: seller.sales },
    status: 'live',
  }
}

const ADDRESS = {
  id: 'addr-1',
  user_id: 'user-1',
  name: 'Asha Rao',
  phone: '9876543210',
  line1: '12 MG Road',
  line2: '',
  city: 'Bengaluru',
  state: 'Karnataka',
  pincode: '560001',
}

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
    status: 'paid',
    courier: null,
    tracking_number: null,
    shipped_at: null,
    delivered_at: null,
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

function progress() {
  return screen.getByRole('progressbar', { name: 'Order progress' })
}

describe('set password', () => {
  it('sends signed-out visitors to log in first', async () => {
    visit('/account/password')
    await waitFor(() => expect(route()).toBe('/login?next=%2Faccount%2Fpassword'))
  })

  it('lets a Google sign-up add a password', async () => {
    db.profiles = [BUYER]
    setSession(makeSession('asha@example.com', 'user-1', 'google'))
    visit('/account/password')

    expect(await screen.findByRole('heading', { name: 'Set password' })).toBeTruthy()
    fireEvent.change(screen.getByLabelText('New password'), { target: { value: 'short' } })
    fireEvent.change(screen.getByLabelText('Confirm password'), { target: { value: 'short' } })
    fireEvent.click(screen.getByRole('button', { name: 'Set password' }))
    expect((await screen.findByRole('alert')).textContent).toBe('Password must be at least 8 characters')

    fireEvent.change(screen.getByLabelText('New password'), { target: { value: 'correct-horse-1!' } })
    fireEvent.change(screen.getByLabelText('Confirm password'), { target: { value: 'correct-horse-2!' } })
    fireEvent.click(screen.getByRole('button', { name: 'Set password' }))
    expect((await screen.findByRole('alert')).textContent).toBe("Passwords don't match")
    expect(supabase.auth.updateUser).not.toHaveBeenCalled()

    fireEvent.change(screen.getByLabelText('Confirm password'), { target: { value: 'correct-horse-1!' } })
    fireEvent.click(screen.getByRole('button', { name: 'Set password' }))

    expect(await screen.findByRole('heading', { name: 'Password saved' })).toBeTruthy()
    expect(supabase.auth.updateUser).toHaveBeenCalledWith({
      password: 'correct-horse-1!',
      nonce: undefined,
      data: { has_password: true },
    })
    expect(screen.getByText(/as well as with Google/)).toBeTruthy()
  })

  it('asks for the emailed code when Supabase wants reauthentication', async () => {
    db.profiles = [BUYER]
    setSession(makeSession('asha@example.com', 'user-1', 'google'))
    supabase.auth.updateUser.mockResolvedValueOnce({
      data: { user: null },
      error: { message: 'Reauthentication needed', code: 'reauthentication_needed' },
    })
    visit('/account/password')

    fireEvent.change(await screen.findByLabelText('New password'), { target: { value: 'correct-horse-1!' } })
    fireEvent.change(screen.getByLabelText('Confirm password'), { target: { value: 'correct-horse-1!' } })
    fireEvent.click(screen.getByRole('button', { name: 'Set password' }))

    fireEvent.change(await screen.findByLabelText('Verification code'), { target: { value: ' 123456 ' } })
    expect(supabase.auth.reauthenticate).toHaveBeenCalledTimes(1)
    fireEvent.click(screen.getByRole('button', { name: 'Set password' }))

    expect(await screen.findByRole('heading', { name: 'Password saved' })).toBeTruthy()
    expect(supabase.auth.updateUser).toHaveBeenLastCalledWith({
      password: 'correct-horse-1!',
      nonce: '123456',
      data: { has_password: true },
    })
  })
})

describe('per-seller checkout', () => {
  function seedBag() {
    db.profiles = [BUYER, SELLER, OTHER_SELLER]
    db.listings = [
      listing('l-1', 'Kanjivaram silk saree', 600, SELLER),
      listing('l-2', 'Block-print kurta', 950, SELLER),
      listing('l-3', 'Denim jacket', 200, OTHER_SELLER),
    ]
    db.bag_items = ['l-1', 'l-2', 'l-3'].map((id, i) => ({
      user_id: 'user-1',
      listing_id: id,
      added_at: `2026-10-2${i}T00:00:00Z`,
    }))
    setSession(makeSession('asha@example.com', 'user-1'))
  }

  it('groups the bag by seller, each with its own shipping and checkout', async () => {
    seedBag()
    visit('/bag')

    await screen.findByText('@meera')
    expect(screen.getByText('@ravi')).toBeTruthy()
    await screen.findByText('₹1,550')
    expect(screen.getAllByText('+ ₹79 shipping')).toHaveLength(2)
    expect(screen.getAllByRole('button', { name: 'Checkout' })).toHaveLength(2)
  })

  it('places one order for one seller with shipping and the buyer fee', async () => {
    seedBag()
    db.spotted_addresses = [ADDRESS]
    visit('/bag')

    await screen.findByText('₹1,550')
    fireEvent.click(screen.getAllByRole('button', { name: 'Checkout' })[0])

    expect(await screen.findByText('Total: ₹1,753')).toBeTruthy()
    expect(screen.getByText('Includes ₹79 shipping and ₹124 buyer protection fee')).toBeTruthy()
    await screen.findByText(/Asha Rao, 12 MG Road/)

    fireEvent.click(await screen.findByRole('button', { name: 'Place order (demo)' }))
    expect(await screen.findByText('Order placed!')).toBeTruthy()

    await waitFor(() => expect(inserts.some((i) => i.table === 'order_items')).toBe(true))
    const order = inserts.find((i) => i.table === 'orders')?.values as Record<string, unknown>
    expect(order).toMatchObject({
      buyer_id: 'user-1',
      seller_id: 'seller-1',
      total_inr: 1550,
      shipping_inr: 79,
      buyer_fee_inr: 124,
    })
    expect(order.ship_to).toMatchObject({ pincode: '560001', city: 'Bengaluru' })
    const items = inserts.find((i) => i.table === 'order_items')?.values as { listing_id: string }[]
    expect(items.map((i) => i.listing_id).sort()).toEqual(['l-1', 'l-2'])
    // No payment was taken, so the real listings must stay on sale.
    expect(supabase.rpc).not.toHaveBeenCalledWith('mark_listings_sold', expect.anything())
  })

  it('shows a bagged item that was deleted, so the buyer can remove it', async () => {
    seedBag()
    db.listings = db.listings.filter((l) => l.id !== 'l-3')
    visit('/bag')

    expect(await screen.findByText('This item is no longer available')).toBeTruthy()
    // Only the seller whose items loaded gets a Checkout button.
    await screen.findByText('₹1,550')
    expect(screen.getAllByRole('button', { name: 'Checkout' })).toHaveLength(1)
  })

  it('needs an address before the order can be placed', async () => {
    seedBag()
    visit('/bag')

    await screen.findByText('₹200')
    fireEvent.click(screen.getAllByRole('button', { name: 'Checkout' })[1])

    expect(await screen.findByText('Total: ₹308')).toBeTruthy()
    const blocked = await screen.findByRole('button', { name: 'Add an address to continue' })
    expect((blocked as HTMLButtonElement).disabled).toBe(true)

    fireEvent.click(screen.getByRole('button', { name: /Ships to/ }))
    fireEvent.change(screen.getByLabelText('Full name'), { target: { value: 'Asha Rao' } })
    fireEvent.change(screen.getByLabelText('Mobile number'), { target: { value: '9876543210' } })
    fireEvent.change(screen.getByLabelText('House no., building, street'), { target: { value: '12 MG Road' } })
    fireEvent.change(screen.getByLabelText('City'), { target: { value: 'Bengaluru' } })
    fireEvent.change(screen.getByLabelText('State'), { target: { value: 'Karnataka' } })
    fireEvent.change(screen.getByLabelText('PIN code'), { target: { value: '012345' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save address' }))
    expect((await screen.findByRole('alert')).textContent).toBe('Enter a 6-digit PIN code.')

    fireEvent.change(screen.getByLabelText('PIN code'), { target: { value: '560001' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save address' }))

    const place = await screen.findByRole('button', { name: 'Place order (demo)' })
    expect((place as HTMLButtonElement).disabled).toBe(false)
    expect(inserts.find((i) => i.table === 'spotted_addresses')?.values).toMatchObject({ pincode: '560001' })
  })
})

describe('order page progress', () => {
  it('labels a demo purchase as unpaid and keeps it off the seller\'s Sold list', async () => {
    db.profiles = [BUYER, SELLER]
    db.orders = [orderRow({ payment_status: 'demo' })]
    setSession(makeSession('asha@example.com', 'user-1'))
    visit('/order/order-uuid-1')

    expect(await screen.findByText('Demo order')).toBeTruthy()
    expect(screen.getByText("No payment was taken, so the seller won't ship this.")).toBeTruthy()
  })

  it('does not show a demo order to the seller', async () => {
    db.profiles = [SELLER]
    db.orders = [orderRow({ payment_status: 'demo' })]
    setSession(makeSession('meera@example.com', 'seller-1'))
    visit('/order/order-uuid-1')

    expect(await screen.findByText("We couldn't find this order.")).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Mark as shipped' })).toBeNull()
  })

  it('shows a new paid purchase as waiting to ship', async () => {
    db.profiles = [BUYER]
    db.orders = [orderRow()]
    setSession(makeSession('asha@example.com', 'user-1'))
    visit('/order/order-uuid-1')

    expect(await screen.findByText('Waiting for the seller to ship')).toBeTruthy()
    expect(progress().getAttribute('aria-valuenow')).toBe('0')
    expect(screen.queryByRole('button', { name: "I've received it" })).toBeNull()
  })

  it('lets the seller mark it shipped', async () => {
    db.profiles = [SELLER]
    db.orders = [orderRow()]
    setSession(makeSession('meera@example.com', 'seller-1'))
    visit('/order/order-uuid-1')

    expect(await screen.findByText('Ready to ship')).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'Sale' })).toBeTruthy()
    fireEvent.change(screen.getByLabelText('Courier'), { target: { value: 'Delhivery' } })
    fireEvent.change(screen.getByLabelText('Tracking number'), { target: { value: 'DL123456' } })
    fireEvent.click(screen.getByRole('button', { name: 'Mark as shipped' }))

    expect(await screen.findByText('On its way to the buyer')).toBeTruthy()
    expect(progress().getAttribute('aria-valuenow')).toBe('1')
    expect(screen.getByText('DL123456')).toBeTruthy()
    expect(supabase.rpc).toHaveBeenCalledWith('mark_order_shipped', {
      p_order_id: 'order-uuid-1',
      p_courier: 'Delhivery',
      p_tracking: 'DL123456',
    })
  })

  it('lets the buyer confirm a shipped order arrived', async () => {
    db.profiles = [BUYER]
    db.orders = [
      orderRow({ status: 'shipped', courier: 'Delhivery', tracking_number: 'DL123456', shipped_at: '2026-10-21T10:00:00Z' }),
    ]
    setSession(makeSession('asha@example.com', 'user-1'))
    visit('/order/order-uuid-1')

    expect(await screen.findByText('Your order is on its way')).toBeTruthy()
    expect(progress().getAttribute('aria-valuenow')).toBe('1')
    fireEvent.click(screen.getByRole('button', { name: "I've received it" }))

    expect(await screen.findByText("Your order's arrived")).toBeTruthy()
    expect(progress().getAttribute('aria-valuenow')).toBe('2')
    expect(supabase.rpc).toHaveBeenCalledWith('mark_order_received', { p_order_id: 'order-uuid-1' })
    const steps = within(document.querySelector('.order-steps') as HTMLElement)
    expect(steps.getByText('Delivered').className).toContain('active')
  })
})
