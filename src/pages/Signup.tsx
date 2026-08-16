import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { safeNext } from '../lib/safeNext'
import {
  PASSWORD_HINT,
  PASSWORD_MIN_LENGTH,
  describePasswordProblems,
  passwordProblems,
} from '../lib/password'
import './auth.css'

// Mirrors sanitizeHandle in lib/auth.tsx, which is what an OAuth signup goes
// through. Periods become underscores rather than vanishing, so the suggested
// handle still reads like the person's name.
// Mirrors ageFrom in Account.tsx and the database trigger, so the form, the
// account screen and the server all agree on who is a minor.
function ageFromDate(dateOfBirth: string): number | null {
  if (!dateOfBirth) return null
  const dob = new Date(`${dateOfBirth}T00:00:00`)
  if (Number.isNaN(dob.getTime())) return null
  const now = new Date()
  let age = now.getFullYear() - dob.getFullYear()
  const beforeBirthday =
    now.getMonth() < dob.getMonth() ||
    (now.getMonth() === dob.getMonth() && now.getDate() < dob.getDate())
  if (beforeBirthday) age -= 1
  return age
}

function handleFromEmail(email: string): string {
  const local = email.split('@')[0]?.toLowerCase() ?? ''
  return local.replace(/[.-]/g, '_').replace(/[^a-z0-9_]/g, '').replace(/^_+/, '').slice(0, 30)
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
  const [dateOfBirth, setDateOfBirth] = useState('')
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

    const passwordMessage = describePasswordProblems(passwordProblems(password))
    if (passwordMessage) {
      setError(passwordMessage)
      return
    }

    // Required, not optional. is_adult() treats an unknown date of birth as an
    // adult so that profiles predating the column keep working — which means a
    // new account that never supplies one would bypass the minor restrictions
    // entirely. Asking here is what closes that.
    const age = ageFromDate(dateOfBirth)
    if (age === null) {
      setError('Please enter your date of birth.')
      return
    }
    if (age < 13) {
      setError('You need to be 13 or over to use Spotted.')
      return
    }

    if (!/^[a-z0-9][a-z0-9_]{2,29}$/.test(handle)) {
      setError('Username can use letters, numbers and underscores only, and must be 3–30 characters')
      return
    }

    // Depop's rule, and a sensible one: a handle is public on every listing and
    // shop page, so letting it be the email address leaks it to everyone.
    if (handle === email.trim().toLowerCase()) {
      setError('Username cannot be the same as your email address')
      return
    }

    setLoading(true)
    const { error: signUpError } = await signUp(email, password, handle, name, dateOfBirth)
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
            minLength={PASSWORD_MIN_LENGTH}
            required
          />
          <p className="auth-hint">{PASSWORD_HINT}</p>
        </div>

        <div className="auth-field">
          <label htmlFor="signup-handle">Username</label>
          <input
            id="signup-handle"
            type="text"
            value={handle}
            onChange={(e) => {
              setHandleEdited(true)
              setHandle(e.target.value.toLowerCase().replace(/[.-]/g, '_').replace(/[^a-z0-9_]/g, ''))
            }}
            pattern="^[a-z0-9][a-z0-9_]{2,29}$"
            minLength={3}
            maxLength={30}
            required
          />
          <p className="auth-hint">
            Letters, numbers and underscores. This is your shop name on Spotted.
          </p>
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

        <div className="auth-field">
          <label htmlFor="signup-dob">Date of birth</label>
          <input
            id="signup-dob"
            type="date"
            value={dateOfBirth}
            onChange={(e) => setDateOfBirth(e.target.value)}
            max={new Date().toISOString().slice(0, 10)}
            required
          />
          <p className="auth-hint">
            You need to be 13 or over. Under 18s can buy, but cannot list items to sell.
          </p>
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
