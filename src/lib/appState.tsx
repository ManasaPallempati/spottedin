import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { supabase } from './supabase'
import { useAuth } from './auth'
import type { Listing } from '../data/listings'
import { sellerFor } from '../data/sellers'

export type BagItem = { listingId: string; addedAt: number }
export type OrderItem = { listingId: string; priceInr: number }
export type Order = { id: string; uuid: string; items: OrderItem[]; totalInr: number; placedAt: number }
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
  placeOrder: (items: OrderItem[], snapshots: Record<string, { title: string; img: string; size: string }>) => Order | null
  applyPaidOrder: (order: Order) => void
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
type OrderItemRow = { listing_id: string; price_inr: number }
type OrderRow = { id: string; code: string; total_inr: number; placed_at: string; order_items: OrderItemRow[] | null }
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
    supabase
      .from('orders')
      .select('id, code, total_inr, placed_at, order_items(listing_id, price_inr)')
      .eq('buyer_id', uid),
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
  const orders = ((ordersRes.data ?? []) as OrderRow[]).map((r) => ({
    id: r.code,
    uuid: r.id,
    items: (r.order_items ?? []).map((it) => ({ listingId: it.listing_id, priceInr: it.price_inr })),
    totalInr: r.total_inr,
    placedAt: toMillis(r.placed_at),
  }))
  const offers = ((offersRes.data ?? []) as OfferRow[])
    .map((r) => mapOffer(r, uid))
    .sort((a, b) => b.at - a.at)
  const threads = ((threadsRes.data ?? []) as ThreadRow[]).map((r) => mapThread(r, uid))

  return { likedIds, bag, follows, orders, offers, threads }
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
    snapshots: Record<string, { title: string; img: string; size: string }>
  ): Order | null {
    if (!requireAuth()) return null
    const uid = session!.user.id
    const uuid = crypto.randomUUID()
    const code = 'SP-' + randomAlphaNum(6)
    const totalInr = items.reduce((sum, i) => sum + i.priceInr, 0)
    const order: Order = { id: code, uuid, items, totalInr, placedAt: Date.now() }
    const ids = items.map((i) => i.listingId)

    setState((prev) => ({
      ...prev,
      orders: [...prev.orders, order],
      bag: prev.bag.filter((b) => !ids.includes(b.listingId)),
    }))

    void (async () => {
      const { error: orderError } = await supabase
        .from('orders')
        .insert({ id: uuid, buyer_id: uid, code, total_inr: totalInr })
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
      void supabase
        .rpc('mark_listings_sold', { p_listing_ids: ids })
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
