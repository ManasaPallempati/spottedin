import { createClient } from '@supabase/supabase-js'

// Public client keys — safe to commit. Row-level security protects the data.
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL ?? 'https://masdygvcssrtwseopfmj.supabase.co'
const SUPABASE_ANON_KEY =
  import.meta.env.VITE_SUPABASE_ANON_KEY ??
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1hc2R5Z3Zjc3NydHdzZW9wZm1qIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUzMDc0MzEsImV4cCI6MjEwMDg4MzQzMX0.3ysulv0P9TaYGehO6bEH72IRwfIZRzfwppcVkt6IlQQ'

// PKCE, not the library default `implicit`: this app uses HashRouter, and the implicit
// flow returns its tokens in the URL fragment (`#access_token=…`) — the exact place the
// router reads the route from, so the OAuth callback lands on an unmatched path. PKCE
// returns `?code=…` in the query string instead, which the router ignores.
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { flowType: 'pkce' },
})
