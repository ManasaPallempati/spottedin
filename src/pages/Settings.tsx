import { useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useAuth } from '../lib/auth'
import { setPageMeta } from '../lib/seo'
import './settings.css'

// The account hub. Sections mirror the reference app's grouping so that
// features land in a place people already expect them.
//
// Only rows that actually work are listed. A "Sell more" section belongs here
// too — boosting, bundles, sold-item search — but none of it exists yet, and a
// heading over a row that does nothing is worse than no heading. Sections
// appear as their contents do.
export default function Settings() {
  const { isAuthed, profile, signOut } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    setPageMeta({
      title: 'My account — Spotted',
      description: 'Manage your Spotted account.',
      canonicalPath: '/settings',
      noIndex: true,
    })
  }, [])

  async function handleLogout() {
    await signOut()
    navigate('/')
  }

  if (!isAuthed) {
    return (
      <div className="settings-page">
        <p className="settings-note">You need to be signed in to manage your account.</p>
        <Link to="/login?next=%2Fsettings" className="btn btn-primary">
          Log in
        </Link>
      </div>
    )
  }

  return (
    <div className="settings-page">
      <header className="settings-header">
        <button type="button" className="icon-btn" aria-label="Back" onClick={() => navigate('/profile')}>
          <ChevronLeft size={20} />
        </button>
        <h1 className="settings-title">My account</h1>
      </header>

      <h2 className="settings-section">Settings</h2>
      <nav className="settings-list">
        <Link to="/account" className="settings-row">
          <span>Account details</span>
          <span className="settings-row-meta">
            {profile ? `@${profile.handle.replace(/^@/, '')}` : ''}
            <ChevronRight size={18} />
          </span>
        </Link>
      </nav>

      <h2 className="settings-section">Support</h2>
      <nav className="settings-list">
        <a className="settings-row" href="mailto:support@spottedin.co">
          <span>Help and support</span>
          <span className="settings-row-meta">
            <ChevronRight size={18} />
          </span>
        </a>
      </nav>

      <button type="button" className="settings-logout" onClick={handleLogout}>
        Log out
      </button>
    </div>
  )
}
