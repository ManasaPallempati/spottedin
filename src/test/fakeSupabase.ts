// In-memory stand-in for src/lib/supabase.ts, swapped in for every test by
// src/test/setup.ts. Tests never reach a real Supabase project.
//
// Queries read from `db` by table name. Only eq/in filters are applied (enough
// for the id and status lookups the smoke tests exercise); ordering, ranges and
// other filters are ignored. Inserts are recorded in `inserts` and echoed back.
import { vi } from 'vitest'

type Row = Record<string, unknown>
type Result = { data: unknown; error: { message: string; code?: string } | null; count?: number }
type AuthListener = (event: string, session: FakeSession | null) => void

export type FakeSession = {
  access_token: string
  refresh_token: string
  expires_in: number
  token_type: 'bearer'
  user: { id: string; email: string; user_metadata: Record<string, unknown>; identities: unknown[] }
}

export const db: Record<string, Row[]> = {}
export const inserts: { table: string; values: unknown }[] = []
// Every .select(columns) call, in order, so tests can check what was asked for.
export const selects: { table: string; columns: string }[] = []

let currentSession: FakeSession | null = null
const missingRpcs = new Set<string>()

export function setRpcMissing(name: string) {
  missingRpcs.add(name)
}
const listeners = new Set<AuthListener>()

// provider 'google' makes an account with no password (signed up with Google).
export function makeSession(email = 'buyer@example.com', id = 'user-1', provider = 'email'): FakeSession {
  return {
    access_token: 'test-access-token',
    refresh_token: 'test-refresh-token',
    expires_in: 3600,
    token_type: 'bearer',
    user: { id, email, user_metadata: {}, identities: [{ provider }] },
  }
}

// Start a test already signed in (before rendering), or signed out with null.
export function setSession(session: FakeSession | null) {
  currentSession = session
}

function emit(event: string) {
  for (const listener of listeners) listener(event, currentSession)
}

function query(
  table: string,
  options: { filter?: (row: Row) => boolean; error?: Result['error']; source?: string } = {},
) {
  const filters: ((row: Row) => boolean)[] = options.filter ? [options.filter] : []
  let single = false
  let inserted: Row[] | null = null
  let patch: Row | null = null

  const result = (): Result => {
    if (options.error) return { data: null, error: options.error }
    if (inserted) return { data: single ? inserted[0] ?? null : inserted, error: null }
    const rows = (db[table] ?? []).filter((row) => filters.every((keep) => keep(row)))
    if (patch) {
      for (const row of rows) Object.assign(row, patch)
      return { data: null, error: null }
    }
    return single ? { data: rows[0] ?? null, error: null } : { data: rows, error: null, count: rows.length }
  }

  const builder: unknown = new Proxy(
    {},
    {
      get(_target, prop) {
        if (prop === 'then') {
          return (resolve: (r: Result) => unknown, reject: (e: unknown) => unknown) =>
            Promise.resolve(result()).then(resolve, reject)
        }
        return (...args: unknown[]) => {
          if (prop === 'eq') filters.push((row) => row[args[0] as string] === args[1])
          if (prop === 'in') filters.push((row) => (args[1] as unknown[]).includes(row[args[0] as string]))
          if (prop === 'single' || prop === 'maybeSingle') single = true
          if (prop === 'insert' || prop === 'upsert') {
            const values = args[0] as Row | Row[]
            inserts.push({ table, values })
            inserted = (Array.isArray(values) ? values : [values]).map((row) => ({ ...row }))
            db[table] = [...(db[table] ?? []), ...inserted]
          }
          if (prop === 'update') patch = args[0] as Row
          if (prop === 'select') selects.push({ table: options.source ?? table, columns: String(args[0] ?? '*') })
          return builder
        }
      },
    },
  )
  return builder
}

const auth = {
  getSession: vi.fn(async () => ({ data: { session: currentSession }, error: null })),
  getUser: vi.fn(async () => ({ data: { user: currentSession?.user ?? null }, error: null })),
  onAuthStateChange: vi.fn((listener: AuthListener) => {
    listeners.add(listener)
    return { data: { subscription: { unsubscribe: () => listeners.delete(listener) } } }
  }),
  signInWithPassword: vi.fn(async ({ email }: { email: string; password: string }) => {
    currentSession = makeSession(email)
    emit('SIGNED_IN')
    return { data: { session: currentSession, user: currentSession.user }, error: null }
  }),
  signUp: vi.fn(async () => ({ data: { session: null, user: null }, error: null })),
  signOut: vi.fn(async () => {
    currentSession = null
    emit('SIGNED_OUT')
    return { error: null }
  }),
  signInWithOAuth: vi.fn(async () => ({ data: {}, error: null })),
  resetPasswordForEmail: vi.fn(async () => ({ data: {}, error: null })),
  updateUser: vi.fn(async (_attrs: Record<string, unknown>) => ({
    data: { user: currentSession?.user ?? null },
    error: null as { message: string; code?: string } | null,
  })),
  reauthenticate: vi.fn(async () => ({ data: {}, error: null })),
}

export const supabase = {
  auth,
  from: vi.fn((table: string) => query(table)),
  // my_profile() (round 18) returns the caller's own profile row; other
  // functions resolve to no data. setRpcMissing simulates a project where a
  // function is not deployed yet (PostgREST answers PGRST202).
  rpc: vi.fn((name: string) => {
    if (missingRpcs.has(name)) {
      return query('__rpc__', { error: { code: 'PGRST202', message: `Could not find the function public.${name}` } })
    }
    if (name === 'my_profile') {
      const uid = currentSession?.user.id
      return query('profiles', { filter: (row) => uid !== undefined && row.id === uid, source: 'rpc:my_profile' })
    }
    return query('__rpc__', { filter: () => false })
  }),
  functions: { invoke: vi.fn(async () => ({ data: null, error: null })) },
  storage: {
    from: () => ({
      upload: vi.fn(async (path: string) => ({ data: { path }, error: null })),
      remove: vi.fn(async () => ({ data: [], error: null })),
      getPublicUrl: (path: string) => ({ data: { publicUrl: `${LISTING_IMAGE_BASE}${path}` } }),
    }),
  },
}

export const LISTING_IMAGE_BASE = 'https://storage.test/listing-images/'

export function resetFakeSupabase() {
  for (const table of Object.keys(db)) delete db[table]
  inserts.length = 0
  selects.length = 0
  listeners.clear()
  missingRpcs.clear()
  currentSession = null
  vi.clearAllMocks()
}
