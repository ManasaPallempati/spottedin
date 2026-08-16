import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from './supabase'

export type Profile = {
  id: string
  handle: string
  name: string
  avatarEmoji: string | null
  bio: string | null
  city: string | null
  rating: number | null
  sales: number | null
  handleChangedAt: string | null
  firstName: string | null
  lastName: string | null
  avatarUrl: string | null
  dateOfBirth: string | null
  country: string | null
  interest: Interest | null
  guardianEmail: string | null
  guardianConsentAt: string | null
}

export type Interest = 'womenswear' | 'menswear' | 'both'

// Mirrors profiles_deletion_reason_valid. Free text is deliberately not an
// option: the list is fixed so it can be counted, and so nothing identifying
// ends up attached to a row that has just been anonymised.
export type DeletionReason =
  | 'not_using'
  | 'new_account'
  | 'not_selling'
  | 'transaction_issue'
  | 'policies'
  | 'fees'
  | 'safety_privacy'
  | 'other'

export type ProfileEdit = {
  handle: string
  name: string
  avatarEmoji: string
  bio: string
  city: string
  firstName: string | null
  lastName: string | null
  avatarUrl: string | null
  dateOfBirth: string | null
  country: string
  interest: Interest | null
  guardianEmail: string | null
}

export type AuthContextValue = {
  session: Session | null
  profile: Profile | null
  isAuthed: boolean
  loading: boolean
  signUp: (
    email: string,
    password: string,
    handle: string,
    name: string,
    dateOfBirth: string,
  ) => Promise<{ error: string | null }>
  signIn: (email: string, password: string) => Promise<{ error: string | null }>
  signInWithOAuth: (provider: OAuthProvider, options?: { redirectTo?: string }) => Promise<{ error: string | null }>
  signOut: () => Promise<void>
  updateProfile: (edit: ProfileEdit) => Promise<{ error: string | null }>
  deleteAccount: (reason?: DeletionReason) => Promise<{ error: string | null }>
}

export type OAuthProvider = 'google' | 'facebook'

type ProfileRow = {
  id: string
  handle: string
  name: string
  avatar_emoji: string | null
  bio: string | null
  city: string | null
  rating: number | null
  sales: number | null
  handle_changed_at?: string | null
  first_name?: string | null
  last_name?: string | null
  avatar_url?: string | null
  date_of_birth?: string | null
  country?: string | null
  interest?: Interest | null
  guardian_email?: string | null
  guardian_consent_at?: string | null
}

function mapProfile(row: ProfileRow): Profile {
  return {
    id: row.id,
    handle: row.handle,
    name: row.name,
    avatarEmoji: row.avatar_emoji,
    bio: row.bio,
    city: row.city,
    rating: row.rating,
    sales: row.sales,
    handleChangedAt: row.handle_changed_at ?? null,
    firstName: row.first_name ?? null,
    lastName: row.last_name ?? null,
    avatarUrl: row.avatar_url ?? null,
    dateOfBirth: row.date_of_birth ?? null,
    country: row.country ?? null,
    interest: row.interest ?? null,
    guardianEmail: row.guardian_email ?? null,
    guardianConsentAt: row.guardian_consent_at ?? null,
  }
}

// Underscore is the only permitted separator (see round8-handle-rules.sql), so a
// period in an email local part becomes one rather than being dropped —
// manasa.pallempati arrives as manasa_pallempati instead of manasapallempati.
// A handle must also start alphanumeric, hence the leading trim.
function sanitizeHandle(email: string): string {
  const local = email.split('@')[0]?.toLowerCase() ?? 'user'
  const cleaned = local.replace(/[.-]/g, '_').replace(/[^a-z0-9_]/g, '').replace(/^_+/, '')
  const trimmed = cleaned.slice(0, 30)
  return trimmed.length >= 3 ? trimmed : 'user'
}

function randomDigits(len: number): string {
  let out = ''
  for (let i = 0; i < len; i++) out += Math.floor(Math.random() * 10)
  return out
}

const PROFILE_COLUMNS =
  'id,handle,name,avatar_emoji,bio,city,rating,sales,handle_changed_at,guardian_email,guardian_consent_at,first_name,last_name,avatar_url,date_of_birth,country,interest'

async function ensureProfile(
  userId: string,
  meta: { handle?: string; name?: string; date_of_birth?: string },
  email: string,
): Promise<Profile | null> {
  const { data: existing } = await supabase.from('profiles').select(PROFILE_COLUMNS).eq('id', userId).maybeSingle()
  if (existing) return mapProfile(existing as ProfileRow)

  const baseHandle = meta.handle ?? sanitizeHandle(email)
  const name = meta.name ?? (email.split('@')[0] || 'User')

  const { data: inserted, error } = await supabase
    .from('profiles')
    // date_of_birth rides along from signup metadata. Without it the row is
    // created with a null date, which is_adult() treats as an adult — so an
    // OAuth signup, which has no date, is an adult until they set one.
    .insert({ id: userId, handle: baseHandle, name, date_of_birth: meta.date_of_birth ?? null })
    .select(PROFILE_COLUMNS)
    .single()

  if (!error && inserted) return mapProfile(inserted as ProfileRow)

  // unique-violation on handle: retry once with 2 random digits appended
  if (error && error.code === '23505') {
    const retryHandle = `${baseHandle}${randomDigits(2)}`
    const { data: retried, error: retryError } = await supabase
      .from('profiles')
      .insert({ id: userId, handle: retryHandle, name })
      .select(PROFILE_COLUMNS)
      .single()
    if (!retryError && retried) return mapProfile(retried as ProfileRow)
    console.warn(retryError)
    return null
  }

  console.warn(error)
  return null
}

// Shape covers both the AuthError instances supabase-js rejects with (which carry a
// stable `code` such as 'invalid_credentials' plus a `name` like 'AuthRetryableFetchError'
// for network failures) and the plain { message, code? } we synthesise from a GoTrue
// OAuth bounce-back query string in App.tsx, where there is no AuthError to unwrap.
export type AuthErrorLike = { message: string; code?: string; name?: string }

// Supabase surfaces provider, validation, and rate-limit failures as raw API strings such
// as "Unsupported provider: provider is not enabled". Those name internal causes the
// visitor cannot act on, so the ones we expect are translated here. `error.code` is stable
// across GoTrue releases and is checked first; the message substring checks are a fallback
// for the cases (older SDKs, synthesised OAuth-callback errors) where no code is present.
// Anything unrecognised is passed through unchanged rather than swallowed — see the
// console.warn below, which is what we grep for to add a new case.
export function friendlyAuthError(error: AuthErrorLike, provider?: OAuthProvider): string {
  const { code } = error
  const m = error.message.toLowerCase()
  const name = provider ? provider[0].toUpperCase() + provider.slice(1) : null

  if (code === 'invalid_credentials' || m.includes('invalid login credentials')) {
    return 'That email and password do not match. Please check and try again.'
  }
  if (code === 'email_not_confirmed' || m.includes('email not confirmed')) {
    return 'Please confirm your email address first — check your inbox for the link.'
  }
  if (code === 'user_already_exists' || m.includes('user already registered') || m.includes('already been registered')) {
    return 'An account with that email already exists. Try logging in instead.'
  }
  if (code === 'over_email_send_rate_limit' || m.includes('email rate limit')) {
    // Shared by signUp and signIn (password-reset / magic-link paths hit the same limiter),
    // so this can't say "sign-up emails". GoTrue's default window is ~1h, not "a few minutes".
    return 'Too many emails have been sent to this address. Please wait a while before trying again.'
  }
  if (code === 'email_address_invalid' || (m.includes('email address') && m.includes('invalid'))) {
    return "That email address doesn't look valid — please check it and try again."
  }
  // Checked before the generic validation_failed branch: GoTrue files the disabled-provider
  // rejection under error_code 'validation_failed', and field-validation copy would be
  // nonsense on a page where no fields were submitted.
  if (m.includes('provider is not enabled') || m.includes('unsupported provider')) {
    return name
      ? `${name} sign-in isn't available yet. Please continue with email.`
      : "This sign-in method isn't available yet. Please continue with email."
  }
  if (code === 'validation_failed') {
    return 'There was a problem with the information you entered. Please check the fields and try again.'
  }
  // Network failures never reach GoTrue, so they carry no `code`. auth-js labels them
  // AuthRetryableFetchError; the message is usually the fetch() rejection text verbatim
  // (e.g. "Failed to fetch" in Chrome).
  if (m.includes('failed to fetch') || (!code && error.name === 'AuthRetryableFetchError')) {
    return "Couldn't connect. Please check your internet connection and try again."
  }

  console.warn('[auth] untranslated error:', error)
  return error.message
}

// Turns a GoTrue OAuth bounce-back's error params (present in either the query string or
// the URL fragment — see App.tsx) into the same copy used for in-app auth failures.
// Returns null when none of the three params are present, so callers can use this as
// both the "was there an error" check and the message lookup in one call.
export function friendlyOAuthCallbackError(params: {
  error?: string | null
  error_code?: string | null
  error_description?: string | null
}): string | null {
  if (!params.error && !params.error_code && !params.error_description) return null
  // error_description is GoTrue's human-readable text (URL-decoded by URLSearchParams
  // already); error is the short machine code (e.g. 'access_denied') used only if that's
  // all we got.
  const message = params.error_description || params.error || 'OAuth sign-in failed'
  return friendlyAuthError({ message, code: params.error_code ?? undefined })
}

// Which OAuth providers to render buttons for. Only Google is enabled in the Supabase
// projects today — Facebook's app is still pending review, and an unlisted provider 400s
// in place on the supabase.co domain (no redirectTo, so the visitor is stranded off-site)
// rather than failing gracefully in the app. Same VITE_-prefixed, comma-separated env
// pattern as SITE_ORIGIN in lib/seo.ts; staging/prod can widen this via Netlify env without
// a code change once Facebook is approved.
// Distinguish "unset" (env var not defined at all — default to Google) from an explicit
// empty/garbage value (operator's choice, honored as-is even if that means no buttons).
const rawOAuthProviders: string | undefined = import.meta.env.VITE_OAUTH_PROVIDERS

export const ENABLED_OAUTH_PROVIDERS: OAuthProvider[] =
  rawOAuthProviders === undefined
    ? ['google']
    : rawOAuthProviders
        .split(',')
        .map((p) => p.trim().toLowerCase())
        .filter((p): p is OAuthProvider => p === 'google' || p === 'facebook')

// Offered when a username is already taken. Candidates are checked against the
// table in one query rather than one-at-a-time, and only free ones are shown —
// suggesting a name that is also taken is worse than suggesting nothing.
// Nothing here reserves a name: two people can still be offered the same
// suggestion, and whoever saves second gets the taken error again. The unique
// index is the only real arbiter.
export async function suggestHandles(base: string, wanted = 3): Promise<string[]> {
  const root = base.replace(/_+$/, '').slice(0, 24) || 'user'
  const candidates = new Set<string>()
  while (candidates.size < wanted * 3) {
    candidates.add(`${root}_${Math.floor(Math.random() * 9000) + 1000}`)
    candidates.add(`${root}${Math.floor(Math.random() * 90) + 10}`)
  }
  const list = [...candidates].filter((h) => /^[a-z0-9][a-z0-9_]{2,29}$/.test(h))

  const { data, error } = await supabase.from('profiles').select('handle').in('handle', list)
  if (error) {
    console.warn('[auth] handle suggestion lookup failed:', error)
    return list.slice(0, wanted)
  }
  const taken = new Set((data ?? []).map((r: { handle: string }) => r.handle.replace(/^@/, '')))
  return list.filter((h) => !taken.has(h)).slice(0, wanted)
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function bootstrap() {
      const { data } = await supabase.auth.getSession()
      if (cancelled) return
      setSession(data.session)
      if (data.session) {
        const meta = (data.session.user.user_metadata ?? {}) as { handle?: string; name?: string }
        const p = await ensureProfile(data.session.user.id, meta, data.session.user.email ?? '')
        if (cancelled) return
        setProfile(p)
      }
      setLoading(false)
    }

    bootstrap()

    const { data: sub } = supabase.auth.onAuthStateChange((event, newSession) => {
      if (event === 'SIGNED_IN' && newSession) {
        setSession(newSession)
        setLoading(true)
        const meta = (newSession.user.user_metadata ?? {}) as { handle?: string; name?: string }
        // Deferred out of the callback deliberately. supabase-js holds an internal
        // lock while it runs auth-state listeners, and ensureProfile calls
        // supabase.from(), so invoking it here directly can deadlock — the promise
        // never settles and setProfile is never reached. Line 219 above has already
        // set the session synchronously, so isAuthed flips true while profile stays
        // null, which renders the signed-out view to someone who is signed in.
        // Password sign-in hid this because bootstrap() had already loaded the
        // profile; OAuth reloads the page, so the listener is the only path.
        setTimeout(() => {
          if (cancelled) return
          ensureProfile(newSession.user.id, meta, newSession.user.email ?? '').then((p) => {
            if (cancelled) return
            setProfile(p)
            setLoading(false)
          })
        }, 0)
      } else if (event === 'SIGNED_OUT') {
        setSession(null)
        setProfile(null)
        setLoading(false)
      } else if (event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
        setSession(newSession)
      }
      // INITIAL_SESSION is handled by bootstrap() above — skip here to avoid a double fetch.
    })

    return () => {
      cancelled = true
      sub.subscription.unsubscribe()
    }
  }, [])

  async function signUp(
    email: string,
    password: string,
    handle: string,
    name: string,
    dateOfBirth: string,
  ): Promise<{ error: string | null }> {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { handle, name, date_of_birth: dateOfBirth } },
    })
    return { error: error ? friendlyAuthError(error) : null }
  }

  async function signIn(email: string, password: string): Promise<{ error: string | null }> {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return { error: error ? friendlyAuthError(error) : null }
  }

  // In the browser, signInWithOAuth's _handleProviderSignIn always hardcodes error: null
  // and navigates away (it builds the provider URL client-side; it never calls GoTrue to
  // validate the provider first) — so this branch is effectively dead there, but harmless
  // to keep for non-browser/SSR callers of this client. Rejections that actually happen
  // server-side (disabled provider, consent denial, etc.) instead come back as query/hash
  // params on the redirect back to us; see resolveOAuthCallbackError in App.tsx.
  async function signInWithOAuth(
    provider: OAuthProvider,
    options?: { redirectTo?: string },
  ): Promise<{ error: string | null }> {
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: options?.redirectTo },
    })
    return { error: error ? friendlyAuthError(error, provider) : null }
  }

  async function signOut(): Promise<void> {
    await supabase.auth.signOut()
  }

  // Two failures here come from the database rather than from validation, and
  // neither can be prevented client-side: another person can take a username
  // between the form rendering and the save, and the 30-day limit is enforced by
  // a trigger (round9) precisely so it cannot be bypassed. Both are translated
  // rather than surfaced raw.
  async function updateProfile(edit: ProfileEdit): Promise<{ error: string | null }> {
    if (!session) return { error: 'You need to be signed in to change your profile.' }

    const { data, error } = await supabase
      .from('profiles')
      .update({
        handle: edit.handle,
        name: edit.name,
        avatar_emoji: edit.avatarEmoji,
        bio: edit.bio,
        city: edit.city,
        first_name: edit.firstName,
        last_name: edit.lastName,
        avatar_url: edit.avatarUrl,
        date_of_birth: edit.dateOfBirth,
        country: edit.country,
        interest: edit.interest,
        guardian_email: edit.guardianEmail,
      })
      .eq('id', session.user.id)
      .select(PROFILE_COLUMNS)
      .single()

    if (error) {
      if (error.code === '23505') {
        return { error: 'That username is already taken. Please choose another.' }
      }
      if (error.message.includes('handle_change_too_soon')) {
        // The trigger puts the date the next change is allowed in the hint.
        const next = (error as { hint?: string }).hint
        return {
          error: next
            ? `You can change your username once every 30 days. You can change it again on ${next}.`
            : 'You can change your username once every 30 days.',
        }
      }
      if (error.message.includes('under_minimum_age')) {
        return { error: 'You need to be 18 or over to use Spotted.' }
      }
      if (error.message.includes('date_of_birth_in_future')) {
        return { error: 'Please enter a valid date of birth.' }
      }
      if (error.code === '23514') {
        return { error: 'Some of those details are not valid. Please check and try again.' }
      }
      console.warn('[auth] profile update failed:', error)
      return { error: 'We could not save your changes just now. Please try again.' }
    }

    setProfile(mapProfile(data as ProfileRow))
    return { error: null }
  }

  // Anonymises the account rather than erasing its rows — orders and payments
  // are retained records, and the other side of a completed sale still needs
  // their history. The work happens in the delete-account Edge Function, which
  // holds the service-role key; the browser only proves who is asking.
  // Signs out locally afterwards because the server-side ban does not by itself
  // clear the session already stored in this tab.
  // The reason is recorded before the account is closed, because the Edge
  // Function anonymises the row and the client loses its session immediately
  // afterwards — there is no later opportunity to write it.
  async function deleteAccount(reason?: DeletionReason): Promise<{ error: string | null }> {
    if (reason && session) {
      const { error: reasonError } = await supabase
        .from('profiles')
        .update({ deletion_reason: reason })
        .eq('id', session.user.id)
      // Losing the reason is not worth blocking someone from leaving.
      if (reasonError) console.warn('[auth] could not record deletion reason:', reasonError)
    }

    const { error } = await supabase.functions.invoke('delete-account', { body: {} })
    if (error) {
      console.warn('[auth] delete-account failed:', error)
      return { error: 'We could not close your account just now. Please try again.' }
    }
    await supabase.auth.signOut()
    return { error: null }
  }

  const value: AuthContextValue = {
    session,
    profile,
    isAuthed: session !== null,
    loading,
    signUp,
    signIn,
    signInWithOAuth,
    signOut,
    updateProfile,
    deleteAccount,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
