// Recently-viewed listing history — ids only, most-recent-first, client-side.
// Listing data is resolved at render time (useListingsByIds) so stale entries
// simply drop out of the rail instead of showing snapshotted data.

const RECENT_KEY = 'spotted_recently_viewed'
const RECENT_CAP = 20

export function readRecentlyViewed(): string[] {
  try {
    const raw = localStorage.getItem(RECENT_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    const seen = new Set<string>()
    const ids: string[] = []
    for (const entry of parsed) {
      if (typeof entry !== 'string' || entry === '' || seen.has(entry)) continue
      seen.add(entry)
      ids.push(entry)
      if (ids.length >= RECENT_CAP) break
    }
    return ids
  } catch {
    return []
  }
}

export function recordRecentlyViewed(id: string): void {
  if (!id) return
  try {
    const next = [id, ...readRecentlyViewed().filter((x) => x !== id)].slice(0, RECENT_CAP)
    localStorage.setItem(RECENT_KEY, JSON.stringify(next))
  } catch {
    // Storage unavailable (private mode, quota) — viewing history is a
    // nice-to-have, never worth surfacing an error for.
  }
}
