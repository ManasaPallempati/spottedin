import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { supabase } from './supabase'
import { useAuth } from './auth'
import type { Listing } from '../data/listings'
import { sellerFor } from '../data/sellers'

export type BagItem = { listingId: string; addedAt: number }
export type OrderItem = { listingId: string; priceInr: number; title?: string; img?: string; size?: string }
export type OrderStatus = 'paid' | 'shipped' | 'delivered' | 'cancelled'
export type ShipTo = { name: string; phone: string; line1: string; line2: string; city: string; state: string; pincode: string }
// totalInr is item prices only; the buyer paid totalInr + shippingInr + buyerFeeInr.
export type Order = {
  id: string
  uuid: string
  items: OrderItem[]
  totalInr: number
  placedAt: number
  shippingInr: number
  buyerFeeInr: number
  shipTo: ShipTo | null
  status: OrderStatus
  courier: string | null
  trackingNumber: string | null
  shippedAt: number | null
  deliveredAt: number | null
  buyerHandle: string | null
  sellerHandle: string | null
  // 'paid' only for Razorpay-paid orders; demo orders are 'demo'.
  paymentStatus: 'demo' | 'paid' | 'refunded'
  // Set once Shiprocket has booked the parcel; tracking then updates on its own.
  courierProvider: 'shiprocket' | null
  courierStatus: string | null
  labelUrl: string | null
}
// What the checkout sheets pass alongside the items when placing an order.
export type CheckoutDetails = {
  shipTo: ShipTo
  shippingInr: number
  buyerFeeInr: number
  sellerId: string | null
  sellerHandle: string | null
}
export type ThreadMessage = { id: string; from: 'me' | 'them'; text: string; at: number }
export type ThreadView = { id: string; handle: string; peerIsReal: boolean; messages: ThreadMessage[] }
export type OfferStatus = 'pending' | 'accepted' | 'declined'
export type Offer = {
  id: string
  listingId: string
  amountInr: number
  at: number
  status: OfferStatus
  direction: 'made' | 'received'
  peerHandle: string
}

export type AppState = {
  likedIds: string[]
  bag: BagItem[]
  follows: string[]
  orders: Order[]
  // Orders other people placed for this user's listings.
  sales: Order[]
  offers: Offer[]
  threads: ThreadView[]
}

export type AppStateContextValue = AppState & {
  isAuthed: boolean
  ready: boolean
  bagCount: number
  toggleLike: (id: string) => void
  isLiked: (id: string) => boolean
  likeCountFor: (listing: Listing) => number
  addToBag: (id: string) => void
  removeFromBag: (id: string) => void
  follow: (handle: string) => void
  unfollow: (handle: string) => void
  isFollowing: (handle: string) => boolean
  hasPurchased: (listingId: string) => boolean
  placeOrder: (
    items: OrderItem[],
    snapshots: Record<string, { title: string; img: string; size: string }>,
    details: CheckoutDetails
  ) => Order | null
  applyPaidOrder: (order: Order) => void
  markShipped: (order: Order, courier: string, trackingNumber: string) => Promise<string | null>
  markReceived: (order: Order) => Promise<string | null>
  applyCourierBooking: (order: Order, booking: { courier: string | null; trackingNumber: string | null; labelUrl: string }) => void
  sendMessage: (handle: string, text: string) => void
  makeOffer: (listing: Listing, amountInr: number) => void
  respondToOffer: (offer: Offer, action: 'accept' | 'decline') => void
  offersWith: (handle: string) => Offer[]
  threadFor: (handle: string) => ThreadView | null
}

const EMPTY_STATE: AppState = {
  likedIds: [],
  bag: [],
  follows: [],
  orders: [],
  sales: [],
  offers: [],
  threads: [],
}

// Cycle: 1st them-reply in a thread, 2nd, then 3rd+ repeats the last entry.
const CANNED_REPLIES = [
  "Hi! Yes, it's still available 😊",
  'Ships in 2–3 days anywhere in India.',
  'Sounds good — feel free to make an offer!',
]

function randomAlphaNum(len: number): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let out = ''
  for (let i = 0; i < len; i++) out += chars[Math.floor(Math.random() * chars.length)]
  return out
}

function toMillis(iso: string): number {
  return new Date(iso).getTime()
}

// --- hydrate mapping -------------------------------------------------------

type LikeRow = { listing_id: string }
type BagRow = { listing_id: string; added_at: string }
type FollowRow = { followee_handle: string }
type OfferRow = {
  id: string
  user_id: string
  listing_id: string
  amount_inr: number
  status: OfferStatus
  created_at: string
  seller_id: string | null
  seller_handle: string
  buyer: { handle: string } | { handle: string }[] | null
}
type OrderItemRow = { listing_id: string; price_inr: number; title: string | null; img: string | null; size: string | null }
type OrderRow = {
  id: string
  buyer_id: string
  code: string
  total_inr: number
  placed_at: string
  ship_to: ShipTo | null
  shipping_inr: number | null
  buyer_fee_inr: number | null
  status: OrderStatus | null
  courier: string | null
  tracking_number: string | null
  shipped_at: string | null
  delivered_at: string | null
  payment_status: 'demo' | 'paid' | 'refunded' | null
  courier_provider: 'shiprocket' | null
  courier_status: string | null
  label_url: string | null
  buyer: { handle: string } | { handle: string }[] | null
  seller: { handle: string } | { handle: string }[] | null
  order_items: OrderItemRow[] | null
}

// Orders RLS returns both the caller's purchases and orders for listings the
// caller sells (orders_select_seller), so one query feeds both lists.
const ORDER_COLUMNS =
  'id, buyer_id, code, total_inr, placed_at, ship_to, shipping_inr, buyer_fee_inr, status, courier, tracking_number, shipped_at, delivered_at, payment_status, courier_provider, courier_status, label_url, buyer:profiles!orders_buyer_id_fkey(handle), seller:profiles!orders_seller_id_fkey(handle), order_items(listing_id, price_inr, title, img, size)'

function mapOrder(r: OrderRow): Order {
  const buyer = Array.isArray(r.buyer) ? r.buyer[0] : r.buyer
  const seller = Array.isArray(r.seller) ? r.seller[0] : r.seller
  return {
    id: r.code,
    uuid: r.id,
    items: (r.order_items ?? []).map((it) => ({
      listingId: it.listing_id,
      priceInr: it.price_inr,
      title: it.title ?? undefined,
      img: it.img ?? undefined,
      size: it.size ?? undefined,
    })),
    totalInr: r.total_inr,
    placedAt: toMillis(r.placed_at),
    shippingInr: r.shipping_inr ?? 0,
    buyerFeeInr: r.buyer_fee_inr ?? 0,
    shipTo: r.ship_to,
    status: r.status ?? 'paid',
    courier: r.courier,
    trackingNumber: r.tracking_number,
    shippedAt: r.shipped_at ? toMillis(r.shipped_at) : null,
    deliveredAt: r.delivered_at ? toMillis(r.delivered_at) : null,
    buyerHandle: buyer?.handle ?? null,
    sellerHandle: seller?.handle ?? null,
    paymentStatus: r.payment_status ?? 'demo',
    courierProvider: r.courier_provider,
    courierStatus: r.courier_status,
    labelUrl: r.label_url,
  }
}
type MessageRow = { id: string; sender_id: string | null; body: string; created_at: string }
type ThreadRow = {
  id: string
  owner_id: string
  peer_id: string | null
  peer_handle: string
  owner: { handle: string } | { handle: string }[] | null
  messages: MessageRow[] | null
}

function mapThread(row: ThreadRow, uid: string): ThreadView {
  const ownerEmbed = Array.isArray(row.owner) ? row.owner[0] : row.owner
  const handle = row.owner_id === uid ? row.peer_handle : ownerEmbed?.handle ?? row.peer_handle
  const messages = (row.messages ?? [])
    .slice()
    .sort((a, b) => toMillis(a.created_at) - toMillis(b.created_at))
    .map((m) => ({
      id: m.id,
      from: (m.sender_id === uid ? 'me' : 'them') as 'me' | 'them',
      text: m.body,
      at: toMillis(m.created_at),
    }))
  return { id: row.id, handle, peerIsReal: row.peer_id !== null, messages }
}

function mapOffer(row: OfferRow, uid: string): Offer {
  const buyerEmbed = Array.isArray(row.buyer) ? row.buyer[0] : row.buyer
  const direction: 'made' | 'received' = row.user_id === uid ? 'made' : 'received'
  const peerHandle = direction === 'made' ? row.seller_handle : buyerEmbed?.handle ?? ''
  return {
    id: row.id,
    listingId: row.listing_id,
    amountInr: row.amount_inr,
    at: toMillis(row.created_at),
    status: row.status,
    direction,
    peerHandle,
  }
}

async function hydrateAll(uid: string): Promise<AppState> {
  const [likesRes, bagRes, followsRes, ordersRes, threadsRes, offersRes] = await Promise.all([
    supabase.from('likes').select('listing_id').eq('user_id', uid),
    supabase.from('bag_items').select('listing_id, added_at').eq('user_id', uid),
    supabase.from('follows').select('followee_handle').eq('user_id', uid),
    supabase.from('orders').select(ORDER_COLUMNS),
    supabase
      .from('threads')
      .select('id, owner_id, peer_id, peer_handle, owner:profiles!threads_owner_id_fkey(handle), messages:spotted_messages(id, sender_id, body, created_at)')
      .or(`owner_id.eq.${uid},peer_id.eq.${uid}`),
    supabase
      .from('offers')
      .select(
        'id, user_id, listing_id, amount_inr, status, created_at, seller_id, seller_handle, buyer:profiles!offers_user_id_fkey(handle)'
      )
      .or(`user_id.eq.${uid},seller_id.eq.${uid}`),
  ])

  const likedIds = ((likesRes.data ?? []) as LikeRow[]).map((r) => r.listing_id)
  const bag = ((bagRes.data ?? []) as BagRow[]).map((r) => ({ listingId: r.listing_id, addedAt: toMillis(r.added_at) }))
  const follows = ((followsRes.data ?? []) as FollowRow[]).map((r) => r.followee_handle)
  if (ordersRes.error) console.warn(ordersRes.error)
  const orderRows = (ordersRes.data ?? []) as OrderRow[]
  const orders = orderRows.filter((r) => r.buyer_id === uid).map(mapOrder)
  // Sellers only ever see paid orders (is_order_seller enforces the same):
  // a demo order was never paid for and must not look like a sale to ship.
  const sales = orderRows.filter((r) => r.buyer_id !== uid && r.payment_status === 'paid').map(mapOrder)
  const offers = ((offersRes.data ?? []) as OfferRow[])
    .map((r) => mapOffer(r, uid))
    .sort((a, b) => b.at - a.at)
  const threads = ((threadsRes.data ?? []) as ThreadRow[]).map((r) => mapThread(r, uid))

  return { likedIds, bag, follows, orders, sales, offers, threads }
}

const AppStateContext = createContext<AppStateContextValue | null>(null)

export function AppStateProvider({ children }: { children: ReactNode }) {
  const { session, isAuthed, loading: authLoading } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const [state, setState] = useState<AppState>(EMPTY_STATE)
  const [hydrating, setHydrating] = useState(false)

  // Mirrors `state` for reads from code that can't rely on a fresh render
  // closure (setTimeout callbacks like fireCannedReply below) or on a
  // setState updater's `prev` param (which isn't guaranteed to run
  // synchronously, so a ref written *inside* an updater and read right
  // after setState() is not reliable — confirmed by testing: the updater
  // ran, the UI updated, but the ref read after it was still null).
  const stateRef = useRef(state)
  useEffect(() => {
    stateRef.current = state
  }, [state])

  useEffect(() => {
    if (authLoading) return

    if (!isAuthed || !session) {
      setState(EMPTY_STATE)
      return
    }

    let cancelled = false
    setHydrating(true)
    hydrateAll(session.user.id)
      .then((next) => {
        if (!cancelled) setState(next)
      })
      .catch((err) => {
        console.warn(err)
        if (!cancelled) setState(EMPTY_STATE)
      })
      .finally(() => {
        if (!cancelled) setHydrating(false)
      })

    return () => {
      cancelled = true
    }
  }, [authLoading, isAuthed, session])

  function requireAuth(): boolean {
    if (isAuthed) return true
    navigate(`/login?next=${encodeURIComponent(location.pathname + location.search)}`)
    return false
  }

  function toggleLike(id: string) {
    if (!requireAuth()) return
    const uid = session!.user.id
    const wasLiked = state.likedIds.includes(id)
    setState((prev) => ({
      ...prev,
      likedIds: wasLiked ? prev.likedIds.filter((x) => x !== id) : [...prev.likedIds, id],
    }))
    const query = wasLiked
      ? supabase.from('likes').delete().eq('user_id', uid).eq('listing_id', id)
      : supabase.from('likes').insert({ user_id: uid, listing_id: id })
    void query.then(({ error }) => {
      if (error) console.warn(error)
    })
  }

  function isLiked(id: string) {
    return state.likedIds.includes(id)
  }

  function likeCountFor(listing: Listing) {
    return listing.likes + (isLiked(listing.id) ? 1 : 0)
  }

  function addToBag(id: string) {
    if (!requireAuth()) return
    if (state.bag.some((b) => b.listingId === id)) return
    const uid = session!.user.id
    setState((prev) =>
      prev.bag.some((b) => b.listingId === id)
        ? prev
        : { ...prev, bag: [...prev.bag, { listingId: id, addedAt: Date.now() }] }
    )
    void supabase
      .from('bag_items')
      .insert({ user_id: uid, listing_id: id })
      .then(({ error }) => {
        if (error) console.warn(error)
      })
  }

  function removeFromBag(id: string) {
    if (!requireAuth()) return
    const uid = session!.user.id
    setState((prev) => ({ ...prev, bag: prev.bag.filter((b) => b.listingId !== id) }))
    void supabase
      .from('bag_items')
      .delete()
      .eq('user_id', uid)
      .eq('listing_id', id)
      .then(({ error }) => {
        if (error) console.warn(error)
      })
  }

  function follow(handle: string) {
    if (!requireAuth()) return
    if (state.follows.includes(handle)) return
    const uid = session!.user.id
    setState((prev) => (prev.follows.includes(handle) ? prev : { ...prev, follows: [...prev.follows, handle] }))
    void supabase
      .from('follows')
      .insert({ user_id: uid, followee_handle: handle })
      .then(({ error }) => {
        if (error) console.warn(error)
      })
  }

  function unfollow(handle: string) {
    if (!requireAuth()) return
    const uid = session!.user.id
    setState((prev) => ({ ...prev, follows: prev.follows.filter((h) => h !== handle) }))
    void supabase
      .from('follows')
      .delete()
      .eq('user_id', uid)
      .eq('followee_handle', handle)
      .then(({ error }) => {
        if (error) console.warn(error)
      })
  }

  function isFollowing(handle: string) {
    return state.follows.includes(handle)
  }

  function placeOrder(
    items: OrderItem[],
    snapshots: Record<string, { title: string; img: string; size: string }>,
    details: CheckoutDetails
  ): Order | null {
    if (!requireAuth()) return null
    const uid = session!.user.id
    const uuid = crypto.randomUUID()
    const code = 'SP-' + randomAlphaNum(6)
    const totalInr = items.reduce((sum, i) => sum + i.priceInr, 0)
    const order: Order = {
      id: code,
      uuid,
      items: items.map((item) => ({ ...item, ...snapshots[item.listingId] })),
      totalInr,
      placedAt: Date.now(),
      shippingInr: details.shippingInr,
      buyerFeeInr: details.buyerFeeInr,
      shipTo: details.shipTo,
      status: 'paid',
      courier: null,
      trackingNumber: null,
      shippedAt: null,
      deliveredAt: null,
      buyerHandle: null,
      sellerHandle: details.sellerHandle,
      paymentStatus: 'demo',
      courierProvider: null,
      courierStatus: null,
      labelUrl: null,
    }
    const ids = items.map((i) => i.listingId)

    setState((prev) => ({
      ...prev,
      orders: [...prev.orders, order],
      bag: prev.bag.filter((b) => !ids.includes(b.listingId)),
    }))

    void (async () => {
      const { error: orderError } = await supabase
        .from('orders')
        .insert({
          id: uuid,
          buyer_id: uid,
          code,
          total_inr: totalInr,
          seller_id: details.sellerId,
          ship_to: details.shipTo,
          shipping_inr: details.shippingInr,
          buyer_fee_inr: details.buyerFeeInr,
        })
      if (orderError) {
        console.warn(orderError)
        return
      }
      const rows = items.map((item) => {
        const snap = snapshots[item.listingId] ?? { title: '', img: '', size: '' }
        return {
          order_id: uuid,
          listing_id: item.listingId,
          price_inr: item.priceInr,
          title: snap.title,
          img: snap.img,
          size: snap.size,
        }
      })
      const { error: itemsError } = await supabase.from('order_items').insert(rows)
      if (itemsError) console.warn(itemsError)

      void supabase
        .from('bag_items')
        .delete()
        .eq('user_id', uid)
        .in('listing_id', ids)
        .then(({ error }) => {
          if (error) console.warn(error)
        })
    })()

    return order
  }

  // Registers an order that the razorpay-order Edge Function already wrote
  // server-side (orders, order_items, bag_items cleanup, listings sold) —
  // local state only, no DB writes, unlike placeOrder's demo path.
  function applyPaidOrder(order: Order) {
    const ids = order.items.map((i) => i.listingId)
    setState((prev) => ({
      ...prev,
      orders: [...prev.orders, order],
      bag: prev.bag.filter((b) => !ids.includes(b.listingId)),
    }))
  }

  // Seller: paid -> shipped. Server checks the caller sold a listing in the order.
  async function markShipped(order: Order, courier: string, trackingNumber: string): Promise<string | null> {
    const { error } = await supabase.rpc('mark_order_shipped', {
      p_order_id: order.uuid,
      p_courier: courier,
      p_tracking: trackingNumber,
    })
    if (error) {
      console.warn(error)
      return 'Could not mark this order as shipped. Check the details and try again.'
    }
    const shippedAt = Date.now()
    setState((prev) => ({
      ...prev,
      sales: prev.sales.map((o) =>
        o.uuid === order.uuid ? { ...o, status: 'shipped', courier, trackingNumber, shippedAt } : o
      ),
    }))
    if (order.buyerHandle) {
      sendMessage(
        order.buyerHandle,
        `Your order ${order.id} has shipped with ${courier}. Tracking number: ${trackingNumber}`
      )
    }
    return null
  }

  // Registers a Shiprocket booking the courier-label Edge Function already
  // stored server-side — local state only.
  function applyCourierBooking(
    order: Order,
    booking: { courier: string | null; trackingNumber: string | null; labelUrl: string }
  ) {
    setState((prev) => ({
      ...prev,
      sales: prev.sales.map((o) =>
        o.uuid === order.uuid
          ? {
              ...o,
              courierProvider: 'shiprocket',
              courier: booking.courier,
              trackingNumber: booking.trackingNumber,
              labelUrl: booking.labelUrl,
              courierStatus: o.courierStatus ?? 'AWB ASSIGNED',
            }
          : o
      ),
    }))
  }

  // Buyer: shipped -> delivered.
  async function markReceived(order: Order): Promise<string | null> {
    const { error } = await supabase.rpc('mark_order_received', { p_order_id: order.uuid })
    if (error) {
      console.warn(error)
      return 'Could not update this order. Try again.'
    }
    const deliveredAt = Date.now()
    setState((prev) => ({
      ...prev,
      orders: prev.orders.map((o) => (o.uuid === order.uuid ? { ...o, status: 'delivered', deliveredAt } : o)),
    }))
    return null
  }

  function hasPurchased(listingId: string): boolean {
    return state.orders.some((o) => o.items.some((i) => i.listingId === listingId))
  }

  function threadFor(handle: string): ThreadView | null {
    return state.threads.find((t) => t.handle === handle) ?? null
  }

  function fireCannedReply(threadId: string) {
    // Read via stateRef (always current, unlike the `state` closure variable
    // a setTimeout callback like this one captures) BEFORE calling setState,
    // so replyMsg is available synchronously for the DB write right after —
    // no dependency on when React actually invokes the updater function.
    const thread = stateRef.current.threads.find((t) => t.id === threadId)
    if (!thread) return
    const themCount = thread.messages.filter((m) => m.from === 'them').length
    const reply = CANNED_REPLIES[Math.min(themCount, CANNED_REPLIES.length - 1)]
    const replyMsg: ThreadMessage = { id: crypto.randomUUID(), from: 'them', text: reply, at: Date.now() }

    setState((prev) => ({
      ...prev,
      threads: prev.threads.map((t) => (t.id === threadId ? { ...t, messages: [...t.messages, replyMsg] } : t)),
    }))

    void supabase
      .from('spotted_messages')
      .insert({ id: replyMsg.id, thread_id: threadId, sender_id: null, body: replyMsg.text })
      .then(({ error }) => {
        if (error) console.warn(error)
      })
  }

  function sendMessage(handle: string, text: string) {
    if (!requireAuth()) return
    const uid = session!.user.id
    const msg: ThreadMessage = { id: crypto.randomUUID(), from: 'me', text, at: Date.now() }
    const existing = state.threads.find((t) => t.handle === handle)
    const threadId = existing?.id ?? crypto.randomUUID()
    const isNewThread = !existing

    setState((prev) => {
      if (existing) {
        return {
          ...prev,
          threads: prev.threads.map((t) => (t.id === threadId ? { ...t, messages: [...t.messages, msg] } : t)),
        }
      }
      return { ...prev, threads: [...prev.threads, { id: threadId, handle, peerIsReal: false, messages: [msg] }] }
    })

    void (async () => {
      let peerIsReal = existing?.peerIsReal ?? false
      try {
        if (isNewThread) {
          const { data: peerProfile } = await supabase.from('profiles').select('id').eq('handle', handle).maybeSingle()
          const peerId: string | null = peerProfile?.id ?? null
          peerIsReal = peerId !== null
          setState((prev) => ({
            ...prev,
            threads: prev.threads.map((t) => (t.id === threadId ? { ...t, peerIsReal } : t)),
          }))
          const { error } = await supabase
            .from('threads')
            .insert({ id: threadId, owner_id: uid, peer_id: peerId, peer_handle: handle })
          if (error) console.warn(error)
        }
        const { error: msgError } = await supabase
          .from('spotted_messages')
          .insert({ id: msg.id, thread_id: threadId, sender_id: uid, body: msg.text })
        if (msgError) console.warn(msgError)
      } catch (err) {
        console.warn(err)
      }

      if (!peerIsReal) {
        setTimeout(() => fireCannedReply(threadId), 1200)
      }
    })()
  }

  function makeOffer(listing: Listing, amountInr: number) {
    if (!requireAuth()) return
    const uid = session!.user.id
    const id = crypto.randomUUID()
    const seller = sellerFor(listing)
    const offer: Offer = {
      id,
      listingId: listing.id,
      amountInr,
      at: Date.now(),
      status: 'pending',
      direction: 'made',
      peerHandle: seller.handle,
    }
    setState((prev) => ({ ...prev, offers: [offer, ...prev.offers] }))
    void supabase
      .from('offers')
      .insert({
        id,
        user_id: uid,
        listing_id: listing.id,
        amount_inr: amountInr,
        seller_id: listing.sellerId ?? null,
        seller_handle: seller.handle,
      })
      .then(({ error }) => {
        if (error) console.warn(error)
      })
    sendMessage(seller.handle, `Offered ₹${amountInr.toLocaleString('en-IN')} for ${listing.brand}`)
  }

  function respondToOffer(offer: Offer, action: 'accept' | 'decline') {
    if (!requireAuth()) return
    if (offer.direction !== 'received' || offer.status !== 'pending') return
    const status: OfferStatus = action === 'accept' ? 'accepted' : 'declined'
    setState((prev) => ({
      ...prev,
      offers: prev.offers.map((o) => (o.id === offer.id ? { ...o, status } : o)),
    }))
    void supabase
      .from('offers')
      .update({ status })
      .eq('id', offer.id)
      .then(({ error }) => {
        if (error) console.warn(error)
      })
    const text =
      action === 'accept'
        ? `Accepted your offer of ₹${offer.amountInr.toLocaleString('en-IN')} — it's yours! Message me here to arrange delivery.`
        : `Declined your offer of ₹${offer.amountInr.toLocaleString('en-IN')}. Feel free to send another.`
    sendMessage(offer.peerHandle, text)
  }

  function offersWith(handle: string): Offer[] {
    return state.offers.filter((o) => o.peerHandle === handle).sort((a, b) => b.at - a.at)
  }

  const value: AppStateContextValue = {
    ...state,
    isAuthed,
    ready: !authLoading && !hydrating,
    bagCount: state.bag.length,
    toggleLike,
    isLiked,
    likeCountFor,
    addToBag,
    removeFromBag,
    follow,
    unfollow,
    isFollowing,
    hasPurchased,
    placeOrder,
    applyPaidOrder,
    markShipped,
    markReceived,
    applyCourierBooking,
    sendMessage,
    makeOffer,
    respondToOffer,
    offersWith,
    threadFor,
  }

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>
}

export function useAppState(): AppStateContextValue {
  const ctx = useContext(AppStateContext)
  if (!ctx) throw new Error('useAppState must be used within AppStateProvider')
  return ctx
}
