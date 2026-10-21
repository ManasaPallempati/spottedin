// Which Supabase project this build talks to, and whether that is safe.
//
// There is deliberately no fallback to the production project. A build missing
// its settings gets a placeholder project whose requests all fail, so nothing is
// read from or written to any real database, and EnvWarning shows a banner.
// Netlify builds of `main` refuse to build at all without the settings — see
// vite.config.ts.

// Not a secret: the project ref is part of the public Supabase URL. It is kept
// only to recognise a non-production build that has been pointed at live data.
export const PRODUCTION_PROJECT_REF = 'masdygvcssrtwseopfmj'

// `.invalid` is a reserved TLD (RFC 2606) that never resolves, so every request
// to the placeholder fails fast instead of reaching anyone's project.
const UNCONFIGURED_URL = 'https://supabase-not-configured.invalid'
const UNCONFIGURED_ANON_KEY = 'supabase-not-configured'

export type SupabaseWarning = 'missing-config' | 'production-database'

export type SupabaseConfig = {
  url: string
  anonKey: string
  warning: SupabaseWarning | null
}

export function resolveSupabaseConfig(
  rawUrl: string | undefined,
  rawAnonKey: string | undefined,
  isProductionDeploy: boolean,
): SupabaseConfig {
  const url = rawUrl?.trim()
  const anonKey = rawAnonKey?.trim()
  if (!url || !anonKey) {
    return { url: UNCONFIGURED_URL, anonKey: UNCONFIGURED_ANON_KEY, warning: 'missing-config' }
  }
  const pointsAtProduction = url.includes(PRODUCTION_PROJECT_REF)
  return { url, anonKey, warning: pointsAtProduction && !isProductionDeploy ? 'production-database' : null }
}
