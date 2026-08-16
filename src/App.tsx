import { useEffect } from 'react'
import { HashRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom'
import BottomNav from './components/BottomNav'
import { supabase } from './lib/supabase'
import { AuthProvider, useAuth, friendlyOAuthCallbackError } from './lib/auth'
import { AppStateProvider } from './lib/appState'
import { safeNext } from './lib/safeNext'
import Welcome from './pages/Welcome'
import Landing from './pages/Landing'
import Home from './pages/Home'
import Discover from './pages/Discover'
import Sell from './pages/Sell'
import Inbox from './pages/Inbox'
import Profile from './pages/Profile'
import Product from './pages/Product'
import Shop from './pages/Shop'
import Search from './pages/Search'
import Likes from './pages/Likes'
import Bag from './pages/Bag'
import Thread from './pages/Thread'
import Sizes from './pages/onboarding/Sizes'
import Brands from './pages/onboarding/Brands'
import Login from './pages/Login'
import Signup from './pages/Signup'
import SellNew from './pages/SellNew'
import Category from './pages/Category'
import { setPageIndexing } from './lib/seo'

function RouteIndexingPolicy() {
  const location = useLocation()

  useEffect(() => {
    const pageOwnsIndexing =
      location.pathname === '/' ||
      location.pathname === '/about' ||
      location.pathname === '/home' ||
      location.pathname.startsWith('/category/') ||
      location.pathname.startsWith('/listing/') ||
      location.pathname.startsWith('/p/')

    if (!pageOwnsIndexing) {
      setPageIndexing(false)
    }
  }, [location.pathname])

  return null
}

// GoTrue rejects a bad OAuth attempt (disabled provider, consent denied, etc.) by
// redirecting the browser back to `redirectTo` (== SITE_ORIGIN, no path — see
// lib/seo.ts) with `error`/`error_code`/`error_description` in the query string
// *or* the URL fragment, depending on where in the flow the rejection happened.
// Both land on us before HashRouter ever gets a chance to route.
type OAuthCallbackErrorFields = { error?: string; error_code?: string; error_description?: string }

function readParams(raw: string): OAuthCallbackErrorFields | null {
  const params = new URLSearchParams(raw)
  const error = params.get('error') ?? undefined
  const error_code = params.get('error_code') ?? undefined
  const error_description = params.get('error_description') ?? undefined
  if (!error && !error_code && !error_description) return null
  return { error, error_code, error_description }
}

function extractOAuthCallbackError(): OAuthCallbackErrorFields | null {
  const fromSearch = readParams(window.location.search)
  if (fromSearch) return fromSearch

  // A normal in-app hash route always starts with '#/' (see HashRouter's Routes below).
  // Only a bare '#error=...&error_description=...' fragment — which is NOT one of our
  // routes — is a GoTrue error payload. A successful implicit-flow token fragment
  // (`#access_token=...`) also doesn't start with '#/' but contains none of the error
  // keys, so readParams correctly leaves it alone for supabase-js to consume.
  const hash = window.location.hash
  if (hash && !hash.startsWith('#/')) {
    return readParams(hash.slice(1))
  }
  return null
}

// Runs synchronously during App's render, before <HashRouter> below reads
// window.location to establish its initial route. Rewriting the URL here — rather
// than in an effect — means HashRouter never sees the bad '#error=...' fragment, so
// there's no flash of the catch-all "*" route redirecting to '/' first (that catch-all
// is exactly how this used to fail silently: an unmatched hash route just bounces home
// with no explanation). Idempotent: once the error params are stripped, a second call
// (e.g. React.StrictMode's dev double-render) finds nothing and no-ops.
function resolveOAuthCallbackError(): void {
  const callbackError = extractOAuthCallbackError()
  if (!callbackError) return

  const message = friendlyOAuthCallbackError(callbackError)
  if (message) {
    sessionStorage.setItem('spotted_oauth_error', message)
  }
  // This attempt failed, so any pending redirect target from Login/Welcome must not
  // be honored by whatever sign-in the visitor tries next.
  sessionStorage.removeItem('spotted_oauth_next')

  const url = new URL(window.location.href)
  url.search = ''
  url.hash = '#/login'
  window.history.replaceState(null, '', url.toString())
}

// After an OAuth round-trip the browser reloads at the app root with a fresh session but
// no in-memory `next`. We stash the intended destination in sessionStorage before leaving
// (see Login) and consume it here once the session settles.
function OAuthReturn() {
  const { isAuthed } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (!isAuthed) return
    const pending = sessionStorage.getItem('spotted_oauth_next')
    if (!pending) return
    sessionStorage.removeItem('spotted_oauth_next')
    navigate(safeNext(pending), { replace: true })
  }, [isAuthed, navigate])

  return null
}

function AppShell() {
  const location = useLocation()
  // The sign-in gate and marketing page own the full viewport rather than the
  // marketplace's mobile-width column.
  const isFullBleed = location.pathname === '/' || location.pathname === '/about'
  const hideNav =
    isFullBleed ||
    location.pathname === '/login' ||
    location.pathname === '/signup' ||
    location.pathname === '/sell' ||
    location.pathname === '/sell/new' ||
    location.pathname.startsWith('/onboarding')

  useEffect(() => {
    // one screen-ping per route change; anon insert-only, never blocks the UI
    let sid = sessionStorage.getItem('spotted_sid')
    if (!sid) {
      sid = Math.random().toString(36).slice(2, 12)
      sessionStorage.setItem('spotted_sid', sid)
    }
    supabase
      .from('app_opens')
      .insert({
        ua: navigator.userAgent.slice(0, 300),
        path: location.pathname,
        session_id: sid,
      })
      .then(() => undefined, () => undefined)
  }, [location.pathname])

  return (
    <div className={isFullBleed ? 'app-shell app-shell--full' : 'app-shell'}>
      <RouteIndexingPolicy />
      <OAuthReturn />
      <Routes>
        <Route path="/" element={<Welcome />} />
        {/* The marketing page kept its metadata and category links; it is the only
            other route allowed to own indexing (see RouteIndexingPolicy). */}
        <Route path="/about" element={<Landing />} />
        <Route path="/home" element={<Home />} />
        <Route path="/discover" element={<Discover />} />
        <Route path="/sell" element={<Sell />} />
        <Route path="/inbox" element={<Inbox />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/listing/:id/:slug" element={<Product />} />
        <Route path="/listing/:id" element={<Product />} />
        <Route path="/p/:id" element={<Product />} />
        <Route path="/shop/:handle" element={<Shop />} />
        <Route path="/search" element={<Search />} />
        <Route path="/category/:slug" element={<Category />} />
        <Route path="/likes" element={<Likes />} />
        <Route path="/bag" element={<Bag />} />
        <Route path="/inbox/t/:handle" element={<Thread />} />
        <Route path="/onboarding/sizes" element={<Sizes />} />
        <Route path="/onboarding/brands" element={<Brands />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/sell/new" element={<SellNew />} />
        {/* Without this an unmatched hash renders an empty shell rather than a page. */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      {!hideNav && <BottomNav />}
    </div>
  )
}

export default function App() {
  // Must run before HashRouter (below) is rendered — see resolveOAuthCallbackError's
  // own comment for why this can't be an effect.
  resolveOAuthCallbackError()

  return (
    <HashRouter>
      <AuthProvider>
        <AppStateProvider>
          <AppShell />
        </AppStateProvider>
      </AuthProvider>
    </HashRouter>
  )
}
