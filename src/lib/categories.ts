import { useEffect, useState } from 'react'
import { supabase } from './supabase'

export type Category = {
  id: string
  parentId: string | null
  name: string
  position: number
}

type CategoryRow = {
  id: string
  parent_id: string | null
  name: string
  position: number
}

// The whole tree is ~270 rows of short strings, so it is fetched once and
// navigated in memory. Querying per level would put a network round trip
// between every tap of a drill-down that people move through quickly.
export function useCategories() {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    supabase
      .from('categories')
      .select('id,parent_id,name,position')
      .eq('active', true)
      .order('position')
      .then(({ data, error }) => {
        if (cancelled) return
        if (error) {
          console.warn('[categories] load failed:', error)
          setCategories([])
        } else {
          setCategories(
            (data ?? []).map((row: CategoryRow) => ({
              id: row.id,
              parentId: row.parent_id,
              name: row.name,
              position: row.position,
            })),
          )
        }
        setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  return { categories, loading }
}

export function childrenOf(categories: Category[], parentId: string | null): Category[] {
  return categories.filter((c) => c.parentId === parentId).sort((a, b) => a.position - b.position)
}

export function isLeaf(categories: Category[], id: string): boolean {
  return !categories.some((c) => c.parentId === id)
}

export function categoryById(categories: Category[], id: string | null): Category | null {
  if (!id) return null
  return categories.find((c) => c.id === id) ?? null
}

// "Women › Ethnic wear › Sarees" — shown once a leaf is chosen, so the
// selection is legible without reopening the picker.
export function categoryPath(categories: Category[], id: string | null): Category[] {
  const path: Category[] = []
  let current = categoryById(categories, id)
  // Bounded rather than while(true): a cycle in the data would otherwise hang
  // the render, and three levels is the shape the seed enforces.
  let guard = 0
  while (current && guard < 10) {
    path.unshift(current)
    current = categoryById(categories, current.parentId)
    guard += 1
  }
  return path
}

// The legacy listings.category column is NOT NULL with a CHECK, and still read
// by filters and the feed. Derive it from the department so both columns agree
// until the app has fully moved to category_id.
const DEPARTMENT_TO_LEGACY: Record<string, string> = {
  men: 'men',
  women: 'women',
  kids: 'kids',
  'everything-else': 'everything-else',
}

export function legacyCategoryFor(categories: Category[], id: string | null): string {
  const path = categoryPath(categories, id)
  const department = path[0]?.id
  return (department && DEPARTMENT_TO_LEGACY[department]) || 'everything-else'
}
