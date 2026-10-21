import { useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../../lib/auth'
import { safeNext } from '../../lib/safeNext'
import { DEFAULT_COUNTRY } from '../../data/countries'
import '../auth.css'

// Mirrors profiles_handle_format (round8-handle-rules.sql) exactly, including the
// optional leading '@' the constraint tolerates. That CHECK is NOT VALID, so it is
// re-evaluated against the whole new tuple on ANY update of the row — meaning a
// legacy handle containing periods (spotted.demo, prudhvi.pallempati) makes every
// save from this screen fail with 23514 even though the handle field isn't on it.
// Testing the stored handle against the same pattern predicts that failure
// client-side, so the screen can point at the real problem instead of letting the
// save bounce with copy about details that aren't visible here.
const DB_HANDLE_PATTERN = /^@?[a-z0-9][a-z0-9_]{2,29}$/

// Mirrors ageFromDate in Signup.tsx, ageFrom in Account.tsx and the database
// trigger, so every form and the server agree on who is a minor.
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

// The blocking onboarding step DobGate (App.tsx) redirects to when a signed-in
// account has no date of birth. OAuth providers don't supply one, so a Google
// signup's profile row is created with null — which is_adult() treats as an
// adult, silently exempting the account from the minor restrictions. Email
// signup has required the date since round 10; this closes the same door for
// social sign-in (and for any pre-existing account that predates the column).
export default function Birthday() {
  const { isAuthed, profile, loading, updateProfile, signOut } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const next = safeNext(searchParams.get('next'), '/home')

  const [dateOfBirth, setDateOfBirth] = useState('')
  const [guardianEmail, setGuardianEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const enteredAge = ageFromDate(dateOfBirth)
  const isMinor = enteredAge !== null && enteredAge < 18

  // Derived per render, not state, so it clears the moment the profile context
  // reflects a rename made on /account.
  const legacyHandle = profile !== null && !DB_HANDLE_PATTERN.test(profile.handle)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!profile) return
    setError(null)

    // The round 8 handle CHECK is re-evaluated on any update of the row, so for a
    // legacy handle this save can only fail with 23514 — checked first, before the
    // date is even validated, and without a doomed network call. /account is
    // exempt from the gate, so the rename is reachable from the link above.
    if (legacyHandle) {
      setError(
        'Please choose a new username in Account details first — then you can save your date of birth.',
      )
      return
    }

    // Same rules as Signup.tsx: the date is required and 13 is the floor. The
    // database trigger (round 11) is the real gate; this only lets someone find
    // out before submitting.
    const age = ageFromDate(dateOfBirth)
    if (age === null) {
      setError('Please enter your date of birth.')
      return
    }
    if (age < 13) {
      setError('You need to be 13 or over to use Spotted.')
      return
    }
    // Under the DPDP Act a child's data may not be processed without a
    // guardian's consent, so the address to seek it from is not optional
    // (same rule as Account.tsx).
    if (age < 18 && !guardianEmail.trim()) {
      setError("Please add a parent or guardian's email address so we can ask for their consent.")
      return
    }

    setSaving(true)
    const { error: saveError } = await updateProfile({
      // Everything except the date (and, for a minor, the guardian address) is
      // carried through unchanged so this save cannot clear a field set
      // elsewhere. The handle is written back byte-identical — no '@' stripping —
      // so the round 9 cooldown trigger genuinely no-ops and nothing is renamed
      // as a side effect of adding a birthday.
      handle: profile.handle,
      name: profile.name,
      avatarEmoji: profile.avatarEmoji ?? '🙂',
      bio: profile.bio ?? '',
      city: profile.city ?? '',
      firstName: profile.firstName,
      lastName: profile.lastName,
      avatarUrl: profile.avatarUrl,
      dateOfBirth,
      country: profile.country ?? DEFAULT_COUNTRY,
      interest: profile.interest,
      guardianEmail: age < 18 ? guardianEmail.trim() : profile.guardianEmail,
    })
    setSaving(false)

    if (saveError) {
      setError(saveError)
      return
    }
    navigate(next, { replace: true })
  }

  // The screen blocks everything except /account, so it needs its own exit for
  // someone who is signed into the wrong account (or refuses to give a date).
  async function handleLogout() {
    await signOut()
    navigate('/')
  }

  if (loading) return null
  if (!isAuthed) return <Navigate to="/login" replace />
  // Already has a date (or the profile row failed to load, in which case the
  // gate would never have sent them here) — nothing to ask.
  if (!profile || profile.dateOfBirth !== null) return <Navigate to={next} replace />

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1 className="auth-title">Add your date of birth</h1>
        <p className="auth-subtitle">
          Your account doesn't have a date of birth yet. Add it once and you can carry on.
        </p>

        {/* Without this link the screen is a dead end for those accounts: BottomNav is
            hidden on /onboarding/*, /profile is behind the gate, and the save below can
            only fail until the username changes. */}
        {legacyHandle && (
          <p className="auth-notice">
            Your username was made under our old rules, so we can't save changes to your
            account until it changes. Pick a new username in{' '}
            <Link to="/account">Account details</Link> first, then come back here.
          </p>
        )}

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="auth-field">
            <label htmlFor="birthday-dob">Date of birth</label>
            <input
              id="birthday-dob"
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

          {isMinor && (
            <div className="auth-field">
              <label htmlFor="birthday-guardian">Parent or guardian's email</label>
              <input
                id="birthday-guardian"
                type="email"
                value={guardianEmail}
                onChange={(e) => setGuardianEmail(e.target.value)}
                autoComplete="off"
                required
              />
              <p className="auth-hint">
                Because you're under 18, we need a parent or guardian to confirm they're happy for
                you to use Spotted. We'll email them to ask.
              </p>
            </div>
          )}

          {error && (
            <p className="auth-error" role="alert">
              {error}
            </p>
          )}

          <button type="submit" className="btn btn-primary auth-submit" disabled={saving}>
            {saving ? 'Saving…' : 'Save and continue'}
          </button>
        </form>

        <p className="auth-footer">
          <button type="button" className="auth-linklike" onClick={handleLogout}>
            Log out
          </button>
        </p>
      </div>
    </div>
  )
}
