import { useState, type FormEvent } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import './auth.css'

// Account settings → Password. Lets users who signed up with Google (or Facebook)
// add a password, after which they can also log in with their email + that password.
// Users who already have one can change it here.
export default function AccountPassword() {
  const { isAuthed, loading, session, hasPassword, setPassword, sendReauthCode } = useAuth()

  const [password, setPasswordValue] = useState('')
  const [confirm, setConfirm] = useState('')
  const [code, setCode] = useState('')
  const [needsCode, setNeedsCode] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const [busy, setBusy] = useState(false)
  // Captured on save so the success copy doesn't flip once the session reports a password.
  const [addedNew, setAddedNew] = useState(false)

  if (!loading && !isAuthed) return <Navigate to="/login?next=%2Faccount%2Fpassword" replace />

  const email = session?.user.email ?? ''
  const verb = hasPassword ? 'Change' : 'Set'

  async function requestCode() {
    const { error: reauthError } = await sendReauthCode()
    if (reauthError) {
      setError(reauthError)
      return
    }
    setNeedsCode(true)
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    if (password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }
    if (password !== confirm) {
      setError("Passwords don't match")
      return
    }
    setBusy(true)
    const { error: updateError, code: errorCode } = await setPassword(password, needsCode ? code.trim() : undefined)
    if (errorCode === 'reauthentication_needed') {
      await requestCode()
      setBusy(false)
      return
    }
    setBusy(false)
    if (updateError) {
      setError(updateError)
      return
    }
    setAddedNew(!hasPassword)
    setDone(true)
  }

  if (done) {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <h1 className="auth-title">Password saved</h1>
          <div className="auth-confirm">
            <p>
              You can now log in with <strong>{email}</strong> and your password
              {addedNew ? ', as well as with Google.' : '.'}
            </p>
            <Link to="/profile">Back to profile</Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1 className="auth-title">{verb} password</h1>
        <p className="auth-subtitle">
          {hasPassword
            ? `Update the password you use to log in as ${email}`
            : `Add a password so you can also log in with ${email}`}
        </p>

        {error && (
          <p className="auth-error" role="alert">
            {error}
          </p>
        )}

        <form className="auth-form" onSubmit={handleSubmit}>
          {/* Lets password managers associate the new password with the account's email. */}
          <input type="email" value={email} autoComplete="username" readOnly hidden />

          <div className="auth-field">
            <label htmlFor="account-password">New password</label>
            <input
              id="account-password"
              type="password"
              value={password}
              onChange={(e) => setPasswordValue(e.target.value)}
              autoComplete="new-password"
              minLength={8}
              required
            />
            <p className="auth-hint">At least 8 characters</p>
          </div>

          <div className="auth-field">
            <label htmlFor="account-password-confirm">Confirm password</label>
            <input
              id="account-password-confirm"
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              autoComplete="new-password"
              required
            />
          </div>

          {needsCode && (
            <div className="auth-field">
              <label htmlFor="account-password-code">Verification code</label>
              <input
                id="account-password-code"
                inputMode="numeric"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                autoComplete="one-time-code"
                required
              />
              <p className="auth-hint">We emailed a code to {email} to confirm it's you</p>
            </div>
          )}

          <button type="submit" className="btn btn-primary auth-submit" disabled={busy || loading} aria-busy={busy}>
            {busy ? 'Saving…' : `${verb} password`}
          </button>
        </form>

        <p className="auth-footer">
          <Link to="/profile">Cancel</Link>
        </p>
      </div>
    </div>
  )
}
