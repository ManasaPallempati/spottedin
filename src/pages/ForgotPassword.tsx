import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { SITE_ORIGIN } from '../lib/seo'
import './auth.css'

// Requests a password-reset email. The emailed link goes through GoTrue's /verify
// endpoint and comes back to SITE_ORIGIN with a PKCE ?code= — the same shape as an
// OAuth return — which supabase-js exchanges on boot, emitting PASSWORD_RECOVERY;
// RecoveryReturn in App.tsx then routes to /reset-password. Because PKCE keeps the
// code verifier in this browser's storage, the link only completes in the browser
// that asked for it (the same caveat Round 5 records for signup confirmations).
export default function ForgotPassword() {
  const { requestPasswordReset } = useAuth()

  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const { error: resetError } = await requestPasswordReset(email, SITE_ORIGIN)
    setLoading(false)
    if (resetError) {
      setError(resetError)
      return
    }
    setSent(true)
  }

  if (sent) {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <h1 className="auth-title">Reset your password</h1>
          <div className="auth-confirm">
            {/* Deliberately neutral: must not reveal whether an account exists. */}
            <p>
              If an account exists for that email, we&rsquo;ve sent a link to reset your
              password. Check your inbox.
            </p>
            <Link to="/login">Back to login</Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1 className="auth-title">Reset your password</h1>
        <p className="auth-subtitle">Enter your email and we&rsquo;ll send you a reset link</p>

        {error && (
          <p className="auth-error" role="alert">
            {error}
          </p>
        )}

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="auth-field">
            <label htmlFor="forgot-email">Email</label>
            <input
              id="forgot-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
            />
          </div>

          <button type="submit" className="btn btn-primary auth-submit" disabled={loading} aria-busy={loading}>
            {loading ? 'Sending…' : 'Send reset link'}
          </button>
        </form>

        <p className="auth-footer">
          Remembered it? <Link to="/login">Log in</Link>
        </p>
      </div>
    </div>
  )
}
