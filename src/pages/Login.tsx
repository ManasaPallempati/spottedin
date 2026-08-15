import { useState, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth, type OAuthProvider } from '../lib/auth'
import { GoogleMark, FacebookMark } from '../components/OAuthMarks'
import { safeNext } from '../lib/safeNext'
import { SITE_ORIGIN } from '../lib/seo'
import './auth.css'

type Pending = null | 'email' | OAuthProvider

export default function Login() {
  const { signIn, signInWithOAuth } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const next = safeNext(searchParams.get('next'), '/profile')

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState<Pending>(null)
  const busy = pending !== null

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setPending('email')
    const { error: signInError } = await signIn(email, password)
    if (signInError) {
      setPending(null)
      setError(signInError)
      return
    }
    // Clear stale OAuth target so an abandoned Google sign-in can't hijack
    // this email sign-in's redirect (see OAuthReturn in App.tsx).
    sessionStorage.removeItem('spotted_oauth_next')
    navigate(next)
  }

  async function handleOAuth(provider: OAuthProvider) {
    setError(null)
    setPending(provider)
    // Survives the full-page OAuth round-trip; OAuthReturn in App.tsx consumes it.
    sessionStorage.setItem('spotted_oauth_next', next)
    const redirectTo = SITE_ORIGIN
    const { error: oauthError } = await signInWithOAuth(provider, { redirectTo })
    if (oauthError) {
      sessionStorage.removeItem('spotted_oauth_next')
      setPending(null)
      setError(oauthError)
    }
    // On success the browser is already navigating to the provider.
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1 className="auth-title">Log in</h1>
        <p className="auth-subtitle">Welcome back to Spotted</p>

        {error && (
          <p className="auth-error" role="alert">
            {error}
          </p>
        )}

        <div className="auth-oauth">
          <button
            type="button"
            className="auth-oauth-btn"
            onClick={() => handleOAuth('google')}
            disabled={busy}
            aria-busy={pending === 'google'}
          >
            <GoogleMark />
            <span>{pending === 'google' ? 'Redirecting…' : 'Continue with Google'}</span>
          </button>
          <button
            type="button"
            className="auth-oauth-btn"
            onClick={() => handleOAuth('facebook')}
            disabled={busy}
            aria-busy={pending === 'facebook'}
          >
            <FacebookMark />
            <span>{pending === 'facebook' ? 'Redirecting…' : 'Continue with Facebook'}</span>
          </button>
        </div>

        <div className="auth-divider">
          <span>or continue with email</span>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="auth-field">
            <label htmlFor="login-email">Email</label>
            <input
              id="login-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
            />
          </div>

          <div className="auth-field">
            <label htmlFor="login-password">Password</label>
            <input
              id="login-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
          </div>

          <button type="submit" className="btn btn-primary auth-submit" disabled={busy} aria-busy={pending === 'email'}>
            {pending === 'email' ? 'Logging in…' : 'Log in'}
          </button>
        </form>

        <p className="auth-footer">
          New here? <Link to={`/signup?next=${encodeURIComponent(next)}`}>Sign up</Link>
        </p>
      </div>
    </div>
  )
}
