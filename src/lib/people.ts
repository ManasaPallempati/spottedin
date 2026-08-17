import { useEffect, useState } from 'react'
import { supabase } from './supabase'
import { LISTING_IMAGE_BASE } from './supabase'

export type Person = {
  handle: string
  name: string
  avatarEmoji: string | null
  avatarUrl: string | null
  city: string | null
}

type PersonRow = {
  handle: string
  name: string
  avatar_emoji: string | null
  avatar_url: string | null
  city: string | null
}

const RESULT_LIMIT = 20

// Searches handle and name together, because people look for a seller either
// way — "@manasa_bol" or "Manasa Bolla". Deleted accounts are excluded: their
// row is retained and anonymised (round 7) rather than removed, so without this
// a search for "deleted" would list every closed account.
export function usePeopleSearch(query: string) {
  const [people, setPeople] = useState<Person[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const term = query.trim()
    if (term.length < 2) {
      setPeople([])
      setLoading(false)
      return
    }

    let cancelled = false
    setLoading(true)

    // Debounced: this runs on every keystroke, and without it a fast typist
    // fires a query per character and the results flicker as they land out of
    // order.
    const timer = setTimeout(() => {
      // Escaping matters — a '%' typed by the visitor would otherwise match
      // everything, and ',' would break out of the or() filter's syntax.
      const safe = term.replace(/[%,()]/g, ' ')
      supabase
        .from('profiles')
        .select('handle,name,avatar_emoji,avatar_url,city')
        .is('deleted_at', null)
        .or(`handle.ilike.%${safe}%,name.ilike.%${safe}%`)
        .limit(RESULT_LIMIT)
        .then(({ data, error }) => {
          if (cancelled) return
          if (error) {
            console.warn('[people] search failed:', error)
            setPeople([])
          } else {
            setPeople(
              (data ?? []).map((row: PersonRow) => ({
                handle: row.handle.replace(/^@/, ''),
                name: row.name,
                avatarEmoji: row.avatar_emoji,
                avatarUrl: row.avatar_url,
                city: row.city,
              })),
            )
          }
          setLoading(false)
        })
    }, 250)

    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [query])

  return { people, loading }
}

export function personAvatarUrl(person: Person): string | null {
  if (!person.avatarUrl) return null
  // Stored as a full URL by the account screen, but tolerate a bare storage
  // path so both forms render.
  return /^https?:\/\//i.test(person.avatarUrl)
    ? person.avatarUrl
    : `${LISTING_IMAGE_BASE}${person.avatarUrl}`
}

export function personInitials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean)
  if (words.length === 0) return '?'
  if (words.length === 1) return words[0].slice(0, 1).toUpperCase()
  return (words[0].slice(0, 1) + words[1].slice(0, 1)).toUpperCase()
}
