import { afterEach, beforeEach, vi } from 'vitest'
import { cleanup } from '@testing-library/react'
import { resetFakeSupabase } from './fakeSupabase'

// Every module that imports the Supabase client gets the in-memory fake instead.
vi.mock('../lib/supabase', () => import('./fakeSupabase'))

beforeEach(() => {
  resetFakeSupabase()
  localStorage.clear()
  sessionStorage.clear()
  window.history.replaceState(null, '', '/')
  // jsdom implements neither; the app calls scrollTo on every route change.
  window.scrollTo = vi.fn() as unknown as typeof window.scrollTo
  // Belt and braces: nothing in a smoke test may reach the network.
  vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new Error('Network access is disabled in tests'))))
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})
