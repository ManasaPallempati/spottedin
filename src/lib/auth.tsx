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
}

export type AuthContextValue = {
  session: Session | null
  profile: Profile | null
  isAuthed: boolean
  loading: boolean
  signUp: (email: string, password: string, handle: string, name: string) => Promise<{ error: string | null }>
  signIn: (email: string, password: string) => Promise<{ error: string | null }>
  signInWithOAuth: (provider: OAuthProvider, options?: { redirectTo?: string }) => Promise<{ error: string | null }>
  signOut: () => Promise<void>
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
  }
}

function sanitizeHandle(email: string): string {
  const local = email.split('@')[0]?.toLowerCase() ?? 'user'
  const cleaned = local.replace(/[^a-z0-9._]/g, '')
  return cleaned.slice(0, 20) || 'user'
}

function randomDigits(len: number): string {
  let out = ''
  for (let i = 0; i < len; i++) out += Math.floor(Math.random() * 10)
  return out
}

const PROFILE_COLUMNS = 'id,handle,name,avatar_emoji,bio,city,rating,sales'

async function ensureProfile(userId: string, meta: { handle?: string; name?: string }, email: string): Promise<Profile | null> {
  const { data: existing } = await supabase.from('profiles').select(PROFILE_COLUMNS).eq('id', userId).maybeSingle()
  if (existing) return mapProfile(existing as ProfileRow)

  const baseHandle = meta.handle ?? sanitizeHandle(email)
  const name = meta.name ?? (email.split('@')[0] || 'User')

  const { data: inserted, error } = await supabase
    .from('profiles')
    .insert({ id: userId, handle: baseHandle, name })
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
        ensureProfile(newSession.user.id, meta, newSession.user.email ?? '').then((p) => {
          if (cancelled) return
          setProfile(p)
          setLoading(false)
        })
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

  async function signUp(email: string, password: string, handle: string, name: string): Promise<{ error: string | null }> {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { handle, name } },
    })
    return { error: error?.message ?? null }
  }

  async function signIn(email: string, password: string): Promise<{ error: string | null }> {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return { error: error?.message ?? null }
  }

  // Redirects the browser to the provider on success; only returns here when the request
  // is rejected before the redirect (e.g. the provider isn't enabled in Supabase).
  async function signInWithOAuth(
    provider: OAuthProvider,
    options?: { redirectTo?: string },
  ): Promise<{ error: string | null }> {
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: options?.redirectTo },
    })
    return { error: error?.message ?? null }
  }

  async function signOut(): Promise<void> {
    await supabase.auth.signOut()
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
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
