import type { MutableRefObject } from 'react'

type Primitive = string | number | boolean | null | undefined
export type AnalyticsProps = Record<string, Primitive | Array<Primitive> | Record<string, Primitive>>

type QueuePayload = {
  event_name: string
  ts: number
  url: string
  path: string
  ref?: string | null
  session_id: string
  platform: 'web'
} & AnalyticsProps

const STORAGE_KEY = 'spotted_event_log'
const SESSION_KEY = 'spotted_session_id'
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 14

const REFERRER: MutableRefObject<string | null> = { current: null }
if (typeof document !== 'undefined' && typeof window !== 'undefined') {
  REFERRER.current = document.referrer || null
}

function getSessionId(): string {
  if (typeof localStorage === 'undefined') return 'no-storage'
  const existing = localStorage.getItem(SESSION_KEY)
  if (existing) return existing
  const next = Math.random().toString(36).slice(2, 10).toUpperCase()
  localStorage.setItem(SESSION_KEY, next)
  localStorage.setItem(`${SESSION_KEY}_ts`, String(Date.now()))
  return next
}

function pruneOldEvents(events: QueuePayload[]) {
  const cutoff = Date.now() - SESSION_TTL_MS
  return events.filter((event) => event.ts >= cutoff)
}

function persistEvent(event: QueuePayload) {
  if (typeof localStorage === 'undefined') return
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    const rows = raw ? ((JSON.parse(raw) as QueuePayload[]) || []) : []
    const updated = pruneOldEvents([...rows, event]).slice(-200)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
  } catch {
    // Local persistence is best-effort.
  }
}

export function trackEvent(eventName: string, props: AnalyticsProps = {}): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') return

  const event: QueuePayload = {
    event_name: eventName,
    ts: Date.now(),
    url: window.location.href,
    path: window.location.pathname + window.location.hash + window.location.search,
    ref: REFERRER.current,
    session_id: getSessionId(),
    platform: 'web',
    ...props,
  }

  persistEvent(event)

  const dataLayer = (window as Window & { dataLayer?: Array<Record<string, unknown>> }).dataLayer
  if (Array.isArray(dataLayer)) {
    dataLayer.push({
      event: eventName,
      ...props,
      timestamp: event.ts,
      path: event.path,
    })
  }

  if (import.meta.env.DEV) {
    console.debug('[spotted analytics]', eventName, props)
  }
}
