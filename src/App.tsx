import { useEffect, useState } from 'react';
import { HashRouter, Link, Route, Routes, useLocation } from 'react-router-dom';
import Feed from './screens/Feed';
import ListingDetail from './screens/ListingDetail';
import SellerProfile from './screens/SellerProfile';
import CreateListing from './screens/CreateListing';
import Login from './screens/Login';
import Checkout from './screens/Checkout';
import Inbox from './screens/Inbox';
import Chat from './screens/Chat';
import ClawPanel from './claw/ClawPanel';
import { getUser, subscribe } from './data/store';

// Routes where the bottom tab bar is hidden — full-screen / transactional flows.
function showBottomNav(pathname: string): boolean {
  if (pathname.startsWith('/listing/')) return false;
  if (pathname.startsWith('/checkout/')) return false;
  if (pathname.startsWith('/chat/')) return false;
  if (pathname === '/login') return false;
  return true;
}

function BottomNav() {
  const location = useLocation();
  const [user, setUser] = useState(() => getUser());

  useEffect(() => subscribe(() => setUser(getUser())), []);

  if (!showBottomNav(location.pathname)) return null;

  const profilePath = user ? `/seller/${user.sellerId}` : '/login';
  const isProfileActive = location.pathname.startsWith('/seller/');

  return (
    <nav className="bottom-nav">
      <Link
        to="/"
        className={`bottom-nav__item${location.pathname === '/' ? ' is-active' : ''}`}
      >
        <span className="bottom-nav__icon" aria-hidden="true">🏠</span>
        Home
      </Link>
      <Link
        to="/sell"
        className={`bottom-nav__item${location.pathname === '/sell' ? ' is-active' : ''}`}
      >
        <span className="bottom-nav__sell" aria-hidden="true">➕</span>
        Sell
      </Link>
      <Link
        to="/inbox"
        className={`bottom-nav__item${location.pathname === '/inbox' ? ' is-active' : ''}`}
      >
        <span className="bottom-nav__icon" aria-hidden="true">💬</span>
        Inbox
      </Link>
      <Link
        to={profilePath}
        className={`bottom-nav__item${isProfileActive ? ' is-active' : ''}`}
      >
        <span className="bottom-nav__icon" aria-hidden="true">🧑</span>
        Profile
      </Link>
    </nav>
  );
}

function AppShell() {
  const location = useLocation();
  const hasNav = showBottomNav(location.pathname);

  return (
    <div className="app-frame">
      <div className={`app-content${hasNav ? '' : ' app-content--no-nav'}`}>
        <Routes>
          <Route path="/" element={<Feed />} />
          <Route path="/listing/:id" element={<ListingDetail />} />
          <Route path="/seller/:id" element={<SellerProfile />} />
          <Route path="/sell" element={<CreateListing />} />
          <Route path="/checkout/:id" element={<Checkout />} />
          <Route path="/inbox" element={<Inbox />} />
          <Route path="/chat/:id" element={<Chat />} />
          <Route path="/login" element={<Login />} />
        </Routes>
      </div>
      <BottomNav />
      {/* CLAW_MOUNT */}
      <ClawPanel />
    </div>
  );
}

export default function App() {
  return (
    <HashRouter>
      <div className="app-shell">
        <AppShell />
      </div>
    </HashRouter>
  );
}
