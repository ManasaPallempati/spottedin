import { useCallback, useEffect, useState } from 'react'
import { supabase } from './supabase'
import { useAuth } from './auth'

export type Address = {
  id: string
  name: string
  phone: string
  line1: string
  line2: string
  city: string
  state: string
  pincode: string
}

export type AddressDraft = Omit<Address, 'id'>

export const EMPTY_ADDRESS: AddressDraft = { name: '', phone: '', line1: '', line2: '', city: '', state: '', pincode: '' }

const COLUMNS = 'id, name, phone, line1, line2, city, state, pincode'

export function formatAddress(a: Pick<Address, 'line1' | 'line2' | 'city' | 'state' | 'pincode'>): string {
  return [a.line1, a.line2, a.city, `${a.state} ${a.pincode}`].filter((part) => part.trim() !== '').join(', ')
}

// Mirrors the check constraints on spotted_addresses so the form fails before
// the insert does. Returns the first problem, or null when the draft is valid.
export function validateAddress(d: AddressDraft): string | null {
  if (!d.name.trim()) return 'Enter the name of the person receiving the parcel.'
  if (!/^[6-9][0-9]{9}$/.test(d.phone.trim())) return 'Enter a 10-digit mobile number.'
  if (!d.line1.trim()) return 'Enter the house number and street.'
  if (!d.city.trim()) return 'Enter the city.'
  if (!d.state.trim()) return 'Enter the state.'
  if (!/^[1-9][0-9]{5}$/.test(d.pincode.trim())) return 'Enter a 6-digit PIN code.'
  return null
}

export function useAddresses() {
  const { session } = useAuth()
  const uid = session?.user.id ?? null
  const [addresses, setAddresses] = useState<Address[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!uid) {
      setAddresses([])
      setLoading(false)
      return
    }
    let cancelled = false
    setLoading(true)
    supabase
      .from('spotted_addresses')
      .select(COLUMNS)
      .eq('user_id', uid)
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (cancelled) return
        if (error) console.warn(error)
        setAddresses((data ?? []) as Address[])
        setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [uid])

  const addAddress = useCallback(
    async (draft: AddressDraft): Promise<Address> => {
      if (!uid) throw new Error('Log in to save an address.')
      const row = {
        user_id: uid,
        name: draft.name.trim(),
        phone: draft.phone.trim(),
        line1: draft.line1.trim(),
        line2: draft.line2.trim(),
        city: draft.city.trim(),
        state: draft.state.trim(),
        pincode: draft.pincode.trim(),
      }
      const { data, error } = await supabase.from('spotted_addresses').insert(row).select(COLUMNS).single()
      if (error || !data) {
        console.warn(error)
        throw new Error('Could not save this address. Try again.')
      }
      const saved = data as Address
      setAddresses((prev) => [saved, ...prev])
      return saved
    },
    [uid]
  )

  const removeAddress = useCallback(
    async (id: string): Promise<void> => {
      if (!uid) throw new Error('Log in to change your addresses.')
      const { error } = await supabase.from('spotted_addresses').delete().eq('id', id).eq('user_id', uid)
      if (error) {
        console.warn(error)
        throw new Error('Could not remove this address. Try again.')
      }
      setAddresses((prev) => prev.filter((a) => a.id !== id))
    },
    [uid]
  )

  return { addresses, loading, addAddress, removeAddress }
}
