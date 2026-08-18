import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import {
  PASSWORD_HINT,
  PASSWORD_MIN_LENGTH,
  describePasswordProblems,
  passwordProblems,
} from '../lib/password'
import './auth.css'

// The form behind a recovery link. Reaching it signed in is the normal path:
// RecoveryReturn (App.tsx) navigates here after supabase-js exchanges the link's
// ?code= and emits PASSWORD_RECOVERY, so the visitor holds a recovery session and
// updateUser({ password }) applies to their account. Landing here without a session
// (typed URL, expired link, or a link opened in a browser other than the one that
// requested it — PKCE keeps the verifier in that browser's storage) gets a
// request-a-new-link state instead of a form that could only fail.
export default function ResetPassword() {
  const { isAuthed, loading, updatePassword, signOut } = useAuth()
  const navigate = useNavigate()

  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)

    const passwordMessage = describePasswordProblems(passwordProblems(password))
    if (passwordMessage) {
      setError(passwordMessage)
      return
    }
    if (password !== confirm) {
      setError('Those passwords do not match. Please check and try again.')
      return
    }

    setSaving(true)
    const { error: updateError } = await updatePassword(password)
    if (updateError) {
      setSaving(false)
      setError(updateError)
      return
    }

    // Read once by Login (same pattern as spotted_oauth_error) and shown in its
    // status region. Set before signOut so a session-ending hiccup can't lose it.
    sessionStorage.setItem('spotted_reset_success', 'Your password has been updated. Please log in.')
    // signOut flips isAuthed before navigate runs; without this the component
    // re-renders into the link-expired state for a frame on the way out.
    setDone(true)
    // The recovery session is a real session, but leaving the visitor silently
    // signed in after a reset is surprising — end it and have them log in fresh,
    // which also confirms the new password works.
    await signOut()
    navigate('/login', { replace: true })
  }

  // Two blank frames: while AuthProvider is still resolving the session (the
  // ?code= exchange from the emailed link may be in flight), and on the way out
  // to /login after a successful update. Render nothing rather than flashing
  // the link-expired state either side of a working link.
  if (done || (loading && !isAuthed)) {
    return <div className="auth-page" />
  }

  if (!isAuthed) {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <h1 className="auth-title">Choose a new password</h1>
          <div className="auth-confirm">
            <p>
              That link has expired or has already been used. Please request a new one.
            </p>
            <Link to="/forgot">Send a new reset link</Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1 className="auth-title">Choose a new password</h1>
        <p className="auth-subtitle">Almost done — pick something new</p>

        {error && (
          <p className="auth-error" role="alert">
            {error}
          </p>
        )}

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="auth-field">
            <label htmlFor="reset-password">New password</label>
            <input
              id="reset-password"
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
            <label htmlFor="reset-confirm">Confirm new password</label>
            <input
              id="reset-confirm"
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              autoComplete="new-password"
              minLength={PASSWORD_MIN_LENGTH}
              required
            />
          </div>

          <button type="submit" className="btn btn-primary auth-submit" disabled={saving} aria-busy={saving}>
            {saving ? 'Updating…' : 'Update password'}
          </button>
        </form>
      </div>
    </div>
  )
}
