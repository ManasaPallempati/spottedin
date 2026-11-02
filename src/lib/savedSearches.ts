// "Save this search" for the empty state. Stored on this device only (localStorage);
// there are no alerts yet, and the UI says so rather than promising notifications.

export type SavedSearch = { q: string; sizes: string[]; savedAt: number }

const KEY = 'spotted_saved_searches'
const MAX = 12

export function savedSearchKey(search: Pick<SavedSearch, 'q' | 'sizes'>): string {
  return `${search.q.trim().toLowerCase()}|${[...search.sizes].sort().join(',')}`
}

export function listSavedSearches(): SavedSearch[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(KEY) ?? '[]')
    return Array.isArray(parsed) ? parsed.filter((s) => typeof s?.q === 'string' && Array.isArray(s?.sizes)) : []
  } catch {
    return []
  }
}

function write(list: SavedSearch[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(list.slice(0, MAX)))
  } catch {
    // Storage full or blocked (private mode): saving is best-effort.
  }
}

export function saveSearch(search: Pick<SavedSearch, 'q' | 'sizes'>): SavedSearch[] {
  const key = savedSearchKey(search)
  const next = [
    { q: search.q.trim(), sizes: [...search.sizes], savedAt: Date.now() },
    ...listSavedSearches().filter((s) => savedSearchKey(s) !== key),
  ]
  write(next)
  return next.slice(0, MAX)
}

export function removeSavedSearch(search: Pick<SavedSearch, 'q' | 'sizes'>): SavedSearch[] {
  const key = savedSearchKey(search)
  const next = listSavedSearches().filter((s) => savedSearchKey(s) !== key)
  write(next)
  return next
}

export function savedSearchPath(search: Pick<SavedSearch, 'q' | 'sizes'>): string {
  const params = new URLSearchParams()
  if (search.q) params.set('q', search.q)
  for (const size of search.sizes) params.append('size', size)
  const qs = params.toString()
  return qs ? `/search?${qs}` : '/search'
}

export function savedSearchLabel(search: Pick<SavedSearch, 'q' | 'sizes'>): string {
  const parts = [search.q || 'Everything']
  if (search.sizes.length) parts.push(`size ${search.sizes.join('/')}`)
  return parts.join(' · ')
}
