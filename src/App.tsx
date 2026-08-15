import { useEffect } from 'react'
import { HashRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom'
import BottomNav from './components/BottomNav'
import { supabase } from './lib/supabase'
import { AuthProvider, useAuth } from './lib/auth'
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
