import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft } from 'lucide-react'
import { useAuth, suggestHandles } from '../lib/auth'
import { setPageMeta } from '../lib/seo'
import './account.css'

// Mirrors profiles_handle_format in round8-handle-rules.sql. The database is the
// real gate; this only lets someone find out before submitting.
const HANDLE_PATTERN = /^[a-z0-9][a-z0-9_]{2,29}$/
const BIO_MAX = 500
const CITY_MAX = 80
const NAME_MAX = 80
const HANDLE_COOLDOWN_DAYS = 30

function daysUntilHandleChangeAllowed(handleChangedAt: string | null): number {
  if (!handleChangedAt) return 0
  const changed = new Date(handleChangedAt).getTime()
  if (Number.isNaN(changed)) return 0
  const allowedFrom = changed + HANDLE_COOLDOWN_DAYS * 24 * 60 * 60 * 1000
  const remaining = allowedFrom - Date.now()
  return remaining <= 0 ? 0 : Math.ceil(remaining / (24 * 60 * 60 * 1000))
}

export default function Account() {
  const { isAuthed, profile, loading, session, updateProfile, deleteAccount } = useAuth()
  const navigate = useNavigate()

  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const [handle, setHandle] = useState('')
  const [name, setName] = useState('')
  const [avatarEmoji, setAvatarEmoji] = useState('')
  const [bio, setBio] = useState('')
  const [city, setCity] = useState('')

  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)
  const [suggestions, setSuggestions] = useState<string[]>([])

  useEffect(() => {
    setPageMeta({
      title: 'Account details — Spotted',
      description: 'Update your username, name and shop details on Spotted.',
      canonicalPath: '/account',
      noIndex: true,
    })
  }, [])

  // Populated from the profile once it loads, not on every render, so typing is
  // never overwritten by a background refresh.
  useEffect(() => {
    if (!profile) return
    setHandle(profile.handle.replace(/^@/, ''))
    setName(profile.name)
    setAvatarEmoji(profile.avatarEmoji ?? '🙂')
    setBio(profile.bio ?? '')
    setCity(profile.city ?? '')
  }, [profile])

  const cooldownDays = useMemo(
    () => daysUntilHandleChangeAllowed(profile?.handleChangedAt ?? null),
    [profile?.handleChangedAt],
  )
  const handleLocked = cooldownDays > 0
  const handleChanged = profile ? handle !== profile.handle.replace(/^@/, '') : false

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setSaved(false)

    if (!HANDLE_PATTERN.test(handle)) {
      setError('Username can use letters, numbers and underscores only, and must be 3–30 characters.')
      return
    }
    if (name.trim().length < 1) {
      setError('Please enter your name.')
      return
    }
    if (city.trim().length < 1) {
      setError('Please enter your city.')
      return
    }
    if (avatarEmoji.trim().length < 1) {
      setError('Please choose an emoji for your profile.')
      return
    }

    setSaving(true)
    const { error: saveError } = await updateProfile({
      handle,
      name: name.trim(),
      avatarEmoji: avatarEmoji.trim(),
      bio: bio.trim(),
      city: city.trim(),
    })
    setSaving(false)

    if (saveError) {
      setError(saveError)
      // Only a name clash has an alternative worth offering. Every other
      // failure needs the person to change something else, and a list of
      // usernames would just be noise.
      if (saveError.includes('already taken')) {
        setSuggestions(await suggestHandles(handle))
      }
      return
    }
    setSuggestions([])
    setSaved(true)
  }

  if (loading) {
    return (
      <div className="account-page">
        <p className="account-note">Loading your details…</p>
      </div>
    )
  }

  if (!isAuthed || !profile) {
    return (
      <div className="account-page">
        <p className="account-note">You need to be signed in to see your account details.</p>
        <button type="button" className="btn btn-primary" onClick={() => navigate('/login?next=%2Faccount')}>
          Log in
        </button>
      </div>
    )
  }

  return (
    <div className="account-page">
      <header className="account-header">
        <button type="button" className="icon-btn" aria-label="Back" onClick={() => navigate('/profile')}>
          <ChevronLeft size={20} />
        </button>
        <h1 className="account-title">Account details</h1>
      </header>

      <form className="account-form" onSubmit={handleSubmit}>
        <h2 className="account-section">User details</h2>

        <div className="account-field">
          <label htmlFor="account-handle">Username</label>
          <input
            id="account-handle"
            type="text"
            value={handle}
            onChange={(e) =>
              setHandle(e.target.value.toLowerCase().replace(/[.-]/g, '_').replace(/[^a-z0-9_]/g, ''))
            }
            minLength={3}
            maxLength={30}
            disabled={handleLocked}
            required
          />
          {handleLocked ? (
            <p className="account-hint account-hint-warn">
              You changed your username recently. You can change it again in {cooldownDays}{' '}
              {cooldownDays === 1 ? 'day' : 'days'}.
            </p>
          ) : (
            <p className="account-hint">
              This is your shop address — spotted.co/shop/{handle || 'yourname'}. You can change it once
              every 30 days.
            </p>
          )}
          {handleChanged && !handleLocked && (
            <p className="account-hint account-hint-warn">
              Changing this will break existing links to your shop.
            </p>
          )}

          {suggestions.length > 0 && (
            <div className="account-suggestions">
              <p className="account-hint">Here are some that are free:</p>
              <div className="account-suggestion-row">
                {suggestions.map((s) => (
                  <button
                    key={s}
                    type="button"
                    className="account-suggestion"
                    onClick={() => {
                      setHandle(s)
                      setSuggestions([])
                      setError(null)
                    }}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Read-only. Changing an email is an auth operation with a
            confirmation round-trip, not a profile edit — it belongs with the
            password/2FA work rather than here. */}
        <div className="account-row">
          <span className="account-row-label">Email</span>
          <span className="account-row-value">{session?.user.email ?? '—'}</span>
        </div>

        <h2 className="account-section">About me</h2>

        <div className="account-field">
          <label htmlFor="account-name">Name</label>
          <input
            id="account-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={NAME_MAX}
            autoComplete="name"
            required
          />
        </div>

        <div className="account-field">
          <label htmlFor="account-emoji">Profile emoji</label>
          <input
            id="account-emoji"
            type="text"
            className="account-emoji-input"
            value={avatarEmoji}
            onChange={(e) => setAvatarEmoji(e.target.value)}
            maxLength={8}
            required
          />
        </div>

        <div className="account-field">
          <label htmlFor="account-city">City</label>
          <input
            id="account-city"
            type="text"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            maxLength={CITY_MAX}
            placeholder="Mumbai"
            required
          />
        </div>

        <div className="account-field">
          <label htmlFor="account-bio">Bio</label>
          {/* A bio is public on every listing. Contact details posted here are
              what move a sale off the platform, where there is no payment
              protection and no record if it goes wrong. */}
          <p className="account-callout">
            Never share personal details like your email address or phone number in your bio. Keep
            conversations in Spotted so your purchases stay protected.
          </p>
          <textarea
            id="account-bio"
            value={bio}
            onChange={(e) => setBio(e.target.value.slice(0, BIO_MAX))}
            rows={4}
            maxLength={BIO_MAX}
            placeholder="Tell buyers about your closet"
          />
          <p className="account-hint">
            {bio.length}/{BIO_MAX}
          </p>
        </div>

        {error && (
          <p className="account-error" role="alert">
            {error}
          </p>
        )}
        {saved && !error && (
          <p className="account-saved" role="status">
            Your details have been saved.
          </p>
        )}

        <button type="submit" className="btn btn-primary account-submit" disabled={saving} aria-busy={saving}>
          {saving ? 'Saving…' : 'Save'}
        </button>
      </form>

      <h2 className="account-section">Manage</h2>

      {!confirmDeleteOpen ? (
        <button
          type="button"
          className="account-danger-link"
          onClick={() => {
            setDeleteError(null)
            setConfirmDeleteOpen(true)
          }}
        >
          Delete account
        </button>
      ) : (
        <div className="account-delete-confirm">
          <p>
            You will be signed out and will not be able to sign in again. Your profile and anything
            still for sale will no longer appear on Spotted.
          </p>
          <p className="account-hint">
            Completed orders and payments are kept, because they are the record of purchases you and
            other people have already made.
          </p>

          {deleteError && (
            <p className="account-error" role="alert">
              {deleteError}
            </p>
          )}

          <button
            type="button"
            className="account-danger-link"
            disabled={deleting}
            aria-busy={deleting}
            onClick={async () => {
              setDeleting(true)
              setDeleteError(null)
              const { error: delError } = await deleteAccount()
              setDeleting(false)
              if (delError) {
                setDeleteError(delError)
                return
              }
              navigate('/')
            }}
          >
            {deleting ? 'Deleting…' : 'Yes, delete my account'}
          </button>
          <button
            type="button"
            className="account-cancel-link"
            disabled={deleting}
            onClick={() => setConfirmDeleteOpen(false)}
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  )
}
