import { useState } from 'react'
import { SUPABASE_CONFIG } from '../lib/supabase'
import './EnvWarning.css'

const MESSAGES = {
  'missing-config':
    'No database: this build has no Supabase settings, so listings will not load and nobody can sign in or save. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY for this site in Netlify.',
  'invalid-url':
    'No database: VITE_SUPABASE_URL for this site is not a valid URL. It must start with https:// and have no quotes, e.g. https://<project>.supabase.co.',
  'production-database':
    'Careful: this is not the live site, but it is connected to the PRODUCTION database. Anything done here changes real data. Point VITE_SUPABASE_URL at the staging project.',
} as const

// Loud, top-of-screen warning for a build whose Supabase settings are missing or
// point a non-production build at live data (lib/supabaseConfig.ts). It can be
// hidden until the next page load, but never permanently.
export default function EnvWarning() {
  const [hidden, setHidden] = useState(false)
  const warning = SUPABASE_CONFIG.warning
  if (!warning || hidden) return null

  return (
    <div className="env-warning" role="alert">
      <p className="env-warning__text">{MESSAGES[warning]}</p>
      <button type="button" className="env-warning__hide" onClick={() => setHidden(true)}>
        Hide
      </button>
    </div>
  )
}
