import { useCallback, useEffect, useState } from 'react'
import { supabase } from './supabase'
import { useAuth } from './auth'

// Client side of the Shiprocket integration. The courier-label Edge Function
// holds the Shiprocket credentials and does every booking step; this module
// only asks whether booking is switched on, triggers it, and manages the
// seller's pickup address. When the function is missing or reports disabled,
// sellers keep the manual "mark as shipped" form (fail closed).

export type CourierBooking = { courier: string | null; trackingNumber: string | null; labelUrl: string }

let configPromise: Promise<boolean> | null = null

export function fetchCourierEnabled(): Promise<boolean> {
  configPromise ??= supabase.functions
    .invoke('courier-label', { body: { action: 'config' } })
    .then(({ data, error }) => !error && data?.enabled === true)
    .catch(() => false)
  return configPromise
}

export class CourierError extends Error {
  readonly code: string
  constructor(code: string, message: string) {
    super(message)
    this.code = code
  }
}

export async function bookCourier(orderId: string): Promise<CourierBooking> {
  const { data, error } = await supabase.functions.invoke('courier-label', { body: { action: 'book', orderId } })
  if (error) {
    let code = 'failed'
    let message = "Couldn't book the courier. Try again in a minute."
    const ctx = (error as { context?: Response }).context
    if (ctx instanceof Response) {
      try {
        const parsed = await ctx.clone().json()
        if (typeof parsed?.error === 'string') code = parsed.error
        if (typeof parsed?.message === 'string') message = parsed.message
      } catch {
        // keep the generic message
      }
    }
    throw new CourierError(code, message)
  }
  if (!data || typeof data.labelUrl !== 'string') throw new CourierError('failed', "Couldn't get the shipping label.")
  return { courier: data.courier ?? null, trackingNumber: data.trackingNumber ?? null, labelUrl: data.labelUrl }
}

// The address the courier collects a seller's parcels from: one of the
// seller's own saved addresses.
export function usePickupAddress() {
  const { session } = useAuth()
  const uid = session?.user.id ?? null
  const [addressId, setAddressId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!uid) {
      setAddressId(null)
      setLoading(false)
      return
    }
    let cancelled = false
    supabase
      .from('spotted_seller_pickup')
      .select('address_id')
      .eq('seller_id', uid)
      .maybeSingle()
      .then(({ data, error }) => {
        if (cancelled) return
        if (error) console.warn(error)
        setAddressId(data?.address_id ?? null)
        setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [uid])

  const savePickup = useCallback(
    async (id: string): Promise<string | null> => {
      if (!uid) return 'Log in to set a pickup address.'
      // courier_location resets to null so the server registers the new
      // address with Shiprocket on the next booking.
      const { error } = await supabase
        .from('spotted_seller_pickup')
        .upsert(
          { seller_id: uid, address_id: id, courier_location: null, updated_at: new Date().toISOString() },
          { onConflict: 'seller_id' }
        )
      if (error) {
        console.warn(error)
        return 'Could not save the pickup address. Try again.'
      }
      setAddressId(id)
      return null
    },
    [uid]
  )

  return { addressId, loading, savePickup }
}
