import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { safeNext } from '../lib/safeNext'
import './auth.css'

function handleFromEmail(email: string): string {
  const local = email.split('@')[0]?.toLowerCase() ?? ''
  return local.replace(/[^a-z0-9._]/g, '').slice(0, 20)
}

export default function Signup() {
  const { signUp, session } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const next = safeNext(searchParams.get('next'), '/profile')

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [handle, setHandle] = useState('')
  const [handleEdited, setHandleEdited] = useState(false)
  const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [phase, setPhase] = useState<'form' | 'checking' | 'confirm'>('form')

  function handleEmailBlur() {
    if (!handleEdited && email) {
      setHandle(handleFromEmail(email))
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)

    if (password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }

    setLoading(true)
    const { error: signUpError } = await signUp(email, password, handle, name)
    if (signUpError) {
      setLoading(false)
      setError(signUpError)
      return
    }
    setPhase('checking')
  }

  // If email confirmation is off, signUp signs the user in almost immediately and
  // `session` (from AuthProvider's onAuthStateChange listener) flips non-null shortly
  // after. Give it a brief window before falling back to the "check your email" state.
  useEffect(() => {
    if (phase !== 'checking') return
    if (session) {
      // Clear stale OAuth target (same race condition as Login.tsx — OAuthReturn
      // in App.tsx would hijack this signup's redirect).
      sessionStorage.removeItem('spotted_oauth_next')
      navigate(next)
      return
    }
    const timer = setTimeout(() => {
      setLoading(false)
      setPhase('confirm')
    }, 600)
    return () => clearTimeout(timer)
  }, [phase, session, next, navigate])

  if (phase === 'confirm') {
    return (
      <div className="auth-page">
        <h1 className="auth-title">Create your account</h1>
        <div className="auth-confirm">
          <p>Check your email to confirm, then log in</p>
          <Link to="/login">Back to login</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="auth-page">
      <h1 className="auth-title">Create your account</h1>

      <form className="auth-form" onSubmit={handleSubmit}>
        <div className="auth-field">
          <label htmlFor="signup-email">Email</label>
          <input
            id="signup-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onBlur={handleEmailBlur}
            autoComplete="email"
            required
          />
        </div>

        <div className="auth-field">
          <label htmlFor="signup-password">Password</label>
          <input
            id="signup-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            minLength={8}
            required
          />
          <p className="auth-hint">At least 8 characters</p>
        </div>

        <div className="auth-field">
          <label htmlFor="signup-handle">Handle</label>
          <input
            id="signup-handle"
            type="text"
            value={handle}
            onChange={(e) => {
              setHandleEdited(true)
              setHandle(e.target.value.toLowerCase().replace(/[^a-z0-9._]/g, ''))
            }}
            pattern="^[a-z0-9._]{3,20}$"
            minLength={3}
            maxLength={20}
            required
          />
        </div>

        <div className="auth-field">
          <label htmlFor="signup-name">Name</label>
          <input
            id="signup-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="name"
            required
          />
        </div>

        {error && (
          <p className="auth-error" role="alert">
            {error}
          </p>
        )}

        <button type="submit" className="btn btn-primary auth-submit" disabled={loading}>
          {loading ? 'Signing up…' : 'Sign up'}
        </button>
      </form>

      <p className="auth-footer">
        Already have an account? <Link to={`/login?next=${encodeURIComponent(next)}`}>Log in</Link>
      </p>
    </div>
  )
}
