import { useEffect, useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { useAuth, type OAuthProvider } from '../lib/auth'
import { GoogleMark, FacebookMark } from '../components/OAuthMarks'
import { setPageMeta, setStructuredData, SITE_ORIGIN } from '../lib/seo'
import './welcome.css'

const NEXT = '/home'

export default function Welcome() {
  const { signInWithOAuth, isAuthed, loading } = useAuth()
  const navigate = useNavigate()
  const [pending, setPending] = useState<OAuthProvider | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setPageMeta({
      title: 'Spotted — Buy & Sell Pre-Owned Indian Fashion',
      description:
        'Spotted is the resale marketplace for Indian fashion. Buy and sell pre-owned sarees, lehengas, kurtas, sherwanis and wedding wear across India and the United States — with zero selling fees.',
      canonicalPath: '/',
    })
    setStructuredData({
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: 'Spotted',
      url: `${SITE_ORIGIN}/`,
      description: 'Resale marketplace for pre-owned Indian fashion.',
    })
  }, [])

  async function handleOAuth(provider: OAuthProvider) {
    setError(null)
    setPending(provider)
    // Survives the full-page OAuth round-trip; OAuthReturn in App.tsx consumes it.
    sessionStorage.setItem('spotted_oauth_next', NEXT)
    // Pinned to canonical origin so Supabase always matches its allow-list.
    // Dynamic redirectTo breaks OAuth when apex vs www produce different origins.
    const redirectTo = SITE_ORIGIN
    const { error: oauthError } = await signInWithOAuth(provider, { redirectTo })
    if (oauthError) {
      sessionStorage.removeItem('spotted_oauth_next')
      setPending(null)
      setError(oauthError)
    }
    // On success the browser is already navigating to the provider.
  }

  // A returning member should never be shown the sign-in gate.
  if (!loading && isAuthed) return <Navigate to={NEXT} replace />

  const busy = pending !== null

  return (
    <div className="welcome">
      <button type="button" className="welcome-skip" onClick={() => navigate(NEXT)}>
        Skip
      </button>

      <div className="welcome-spacer" />

      <div className="welcome-brand">
        <h1 className="welcome-wordmark">Spotted</h1>
        <p className="welcome-tagline">
          Buy, sell, and rediscover
          <br />
          preloved Indian fashion
        </p>
      </div>

      <div className="welcome-actions">
        {error && (
          <p className="welcome-error" role="alert">
            {error}
          </p>
        )}

        <button
          type="button"
          className="welcome-btn welcome-btn-solid"
          onClick={() => handleOAuth('google')}
          disabled={busy}
          aria-busy={pending === 'google'}
        >
          <GoogleMark />
          <span>{pending === 'google' ? 'Redirecting…' : 'Continue with Google'}</span>
        </button>

        <button
          type="button"
          className="welcome-btn welcome-btn-solid"
          onClick={() => handleOAuth('facebook')}
          disabled={busy}
          aria-busy={pending === 'facebook'}
        >
          <FacebookMark />
          <span>{pending === 'facebook' ? 'Redirecting…' : 'Continue with Facebook'}</span>
        </button>

        <p className="welcome-or">or</p>

        <Link to={`/login?next=${encodeURIComponent(NEXT)}`} className="welcome-btn welcome-btn-ghost">
          Continue with email
        </Link>
      </div>

      <p className="welcome-legal">
        By continuing you agree to our <strong>Terms of Service</strong>. Spotted services are subject to
        our <strong>Privacy Policy</strong>.
      </p>
    </div>
  )
}
