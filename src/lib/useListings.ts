import { useEffect, useState } from 'react'
import { supabase, LISTING_IMAGE_BASE } from './supabase'
import type { Listing } from '../data/listings'
import { describeListing } from '../data/sellers'
import { normalizeCategory } from '../data/taxonomy'
import type { Profile } from './auth'

const STORAGE_BASE = LISTING_IMAGE_BASE

type SellerEmbed = { handle: string; name: string; bio: string | null; rating: number | null; sales: number | null }

type ListingRow = {
  id: string
  title: string
  description: string | null
  size: string | null
  price_inr: number
  category?: string | null
  likes: number
  image_path: string | null
  created_at: string
  seller_id: string | null
  seller: SellerEmbed | SellerEmbed[] | null
  status: string
}

// `profiles!listings_seller_id_fkey` (not bare `profiles`) because two FK paths
// connect listings to profiles — the direct seller_id one, and an indirect one
// via a pre-existing `favorites` table — so PostgREST can't auto-disambiguate.
const LISTING_COLUMNS =
  'id,title,description,size,price_inr,category,likes,image_path,created_at,seller_id,seller:profiles!listings_seller_id_fkey(handle,name,bio,rating,sales),status'

function resolveImage(row: ListingRow): string {
  if (row.image_path) {
    if (/^https?:\/\//i.test(row.image_path)) return row.image_path
    return `${STORAGE_BASE}${row.image_path}`
  }
  return `https://picsum.photos/seed/${row.id}/600/600`
}

function mapRow(row: ListingRow): Listing {
  const seller = Array.isArray(row.seller) ? row.seller[0] : row.seller
  return {
    id: row.id,
    brand: row.title,
    description: row.description ?? undefined,
    size: row.size ?? '',
    price: row.price_inr,
    category: row.category ? normalizeCategory(row.category) : 'other',
    likes: row.likes,
    img: resolveImage(row),
    sellerId: row.seller_id ?? undefined,
    sellerHandle: seller?.handle,
    sellerName: seller?.name,
    sellerBio: seller?.bio ?? undefined,
    sellerRating: seller?.rating,
    sellerSales: seller?.sales,
    status: row.status === 'sold' ? 'sold' : 'live',
  }
}

export function useListings(): { listings: Listing[]; loading: boolean } {
  const [listings, setListings] = useState<Listing[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function load() {
      const { data, error } = await supabase
        .from('listings')
        .select(LISTING_COLUMNS)
        .eq('status', 'live')
        .order('created_at', { ascending: false })
        .limit(40)

      if (cancelled) return

      if (error || !data || data.length === 0) {
        setListings([])
        setLoading(false)
        return
      }

      setListings((data as unknown as ListingRow[]).map(mapRow))
      setLoading(false)
    }

    load().catch(() => {
      if (cancelled) return
      setListings([])
      setLoading(false)
    })

    return () => {
      cancelled = true
    }
  }, [])

  return { listings, loading }
}

export function useListing(id: string): { listing: Listing | null; loading: boolean } {
  const [listing, setListing] = useState<Listing | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)

    async function load() {
      const { data, error } = await supabase.from('listings').select(LISTING_COLUMNS).eq('id', id).maybeSingle()

      if (cancelled) return

      if (error || !data) {
        setListing(null)
      } else {
        setListing(mapRow(data as unknown as ListingRow))
      }
      setLoading(false)
    }

    load().catch(() => {
      if (cancelled) return
      setListing(null)
      setLoading(false)
    })

    return () => {
      cancelled = true
    }
  }, [id])

  return { listing, loading }
}

export function useMyListings(status: 'live' | 'sold'): { listings: Listing[]; loading: boolean } {
  const [listings, setListings] = useState<Listing[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)

    async function load() {
      const { data: userData } = await supabase.auth.getUser()
      const uid = userData.user?.id
      if (!uid) {
        if (!cancelled) {
          setListings([])
          setLoading(false)
        }
        return
      }

      const { data, error } = await supabase
        .from('listings')
        .select(LISTING_COLUMNS)
        .eq('seller_id', uid)
        .eq('status', status)
        .order('created_at', { ascending: false })

      if (cancelled) return
      setListings(error || !data ? [] : (data as unknown as ListingRow[]).map(mapRow))
      setLoading(false)
    }

    load().catch(() => {
      if (cancelled) return
      setListings([])
      setLoading(false)
    })

    return () => {
      cancelled = true
    }
  }, [status])

  return { listings, loading }
}

export function useListingsBySeller(sellerId: string): { listings: Listing[]; loading: boolean } {
  const [listings, setListings] = useState<Listing[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)

    async function load() {
      const { data, error } = await supabase
        .from('listings')
        .select(LISTING_COLUMNS)
        .eq('seller_id', sellerId)
        .eq('status', 'live')
        .order('created_at', { ascending: false })

      if (cancelled) return
      setListings(error || !data ? [] : (data as unknown as ListingRow[]).map(mapRow))
      setLoading(false)
    }

    load().catch(() => {
      if (cancelled) return
      setListings([])
      setLoading(false)
    })

    return () => {
      cancelled = true
    }
  }, [sellerId])

  return { listings, loading }
}

type ProfileRow = {
  id: string
  handle: string
  name: string
  avatar_emoji: string | null
  bio: string | null
  city: string | null
  rating: number | null
  sales: number | null
}

function mapProfileRow(row: ProfileRow): Profile {
  return {
    // This maps a seller's public profile as shown on a listing. The account
    // fields below are not selected by that query and are not displayed there,
    // so they are null rather than fetched — only the owner's own Account
    // screen reads them.
    handleChangedAt: null,
    firstName: null,
    lastName: null,
    avatarUrl: null,
    dateOfBirth: null,
    country: null,
    interest: null,
    id: row.id,
    handle: row.handle,
    name: row.name,
    avatarEmoji: row.avatar_emoji,
    bio: row.bio,
    city: row.city,
    rating: row.rating,
    sales: row.sales,
  }
}

export function useProfileByHandle(handle: string): { profile: Profile | null; loading: boolean } {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)

    async function load() {
      const { data, error } = await supabase
        .from('profiles')
        .select('id,handle,name,avatar_emoji,bio,city,rating,sales')
        .eq('handle', handle)
        .maybeSingle()

      if (cancelled) return
      setProfile(error || !data ? null : mapProfileRow(data as ProfileRow))
      setLoading(false)
    }

    load().catch(() => {
      if (cancelled) return
      setProfile(null)
      setLoading(false)
    })

    return () => {
      cancelled = true
    }
  }, [handle])

  return { profile, loading }
}

export function searchListings(listings: Listing[], q: string): Listing[] {
  const query = q.trim().toLowerCase()
  if (!query) return listings

  const hashtagQuery = query.startsWith('#') ? query.slice(1) : query

  return listings.filter((listing) => {
    if (listing.brand.toLowerCase().includes(query)) return true
    if (listing.size.toLowerCase().includes(query)) return true
    const { hashtags } = describeListing(listing)
    return hashtags.some((tag) => tag.includes(hashtagQuery))
  })
}
