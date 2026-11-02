import { createLogger, defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { isUsableSupabaseUrl } from './src/lib/supabaseConfig'
import { crawlerPolicy } from './src/build/crawlerPolicy'

export default defineConfig(({ command, mode }) => {
  // The '' prefix reads every variable, including the ones Netlify sets for
  // the build (NETLIFY, CONTEXT, BRANCH), not just VITE_*.
  const env = loadEnv(mode, '.', '')

  // Both Netlify sites build their own branch under the `production` context,
  // so the branch is what tells the live site apart from staging. Deploy
  // previews run under `deploy-preview`, even for a pull request whose head is
  // `main`.
  const productionDeploy = env.NETLIFY === 'true' && env.CONTEXT === 'production' && env.BRANCH === 'main'
  const supabaseUrl = env.VITE_SUPABASE_URL?.trim() ?? ''
  const supabaseConfigured = isUsableSupabaseUrl(supabaseUrl) && Boolean(env.VITE_SUPABASE_ANON_KEY?.trim())

  if (command === 'build' && !supabaseConfigured) {
    if (productionDeploy) {
      throw new Error(
        'Refusing to build main without a valid VITE_SUPABASE_URL (https://…) and VITE_SUPABASE_ANON_KEY. ' +
          'Set both for the production site in Netlify (Site configuration -> Environment variables).',
      )
    }
    createLogger().warn(
      '\n⚠️  VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY are missing or invalid. This build has no database ' +
        '(no fallback to production) and will show a warning banner.\n',
    )
  }

  return {
    // Absolute base: both sites are Netlify serving from the domain root, and the
    // canonical share/SEO URLs are path-based (/listing/<id>/<slug>). With the old
    // GitHub-Pages-era `base: './'`, the shell served for a deep path referenced
    // ./assets/… relative to that path, Netlify's /* rewrite answered with
    // index.html, the module failed its MIME check, and the page went blank before
    // any script ran. Round 8's path→hash bootstrap needs the app to boot there.
    base: '/',
    plugins: [react(), crawlerPolicy(env.VITE_NOINDEX === 'true')],
    define: {
      __PRODUCTION_DEPLOY__: JSON.stringify(productionDeploy),
    },
  }
})
