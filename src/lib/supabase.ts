import { createClient } from '@supabase/supabase-js'
import { resolveSupabaseConfig } from './supabaseConfig'

// Public client keys, set per site in the Netlify UI (or in .env.local for local
// dev). Row-level security protects the data. When they are missing there is no
// fallback to production: see lib/supabaseConfig.ts.
export const SUPABASE_CONFIG = resolveSupabaseConfig(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
  __PRODUCTION_DEPLOY__,
)
const SUPABASE_URL = SUPABASE_CONFIG.url
const SUPABASE_ANON_KEY = SUPABASE_CONFIG.anonKey

if (SUPABASE_CONFIG.warning === 'missing-config') {
  console.error(
    '[spotted] VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY are not set. This build has no database: listings will not load, and sign-in and saving will fail.',
  )
} else if (SUPABASE_CONFIG.warning === 'production-database') {
  console.error('[spotted] This non-production build is connected to the PRODUCTION Supabase project.')
}

// Public bucket that listing photos are uploaded to and served from. It is
// derived from SUPABASE_URL rather than hardcoded so that a staging build
// reads its own storage instead of production's.
export const LISTING_IMAGE_BASE = `${SUPABASE_URL}/storage/v1/object/public/listing-images/`

// PKCE, not the library default `implicit`: this app used HashRouter, and the implicit
// flow returns its tokens in the URL fragment (`#access_token=…`) — the exact place the
// router reads the route from, so the OAuth callback lands on an unmatched path. PKCE
// returns `?code=…` in the query string instead, which the router ignores.
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { flowType: 'pkce' },
})
