import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  // Absolute base: both sites are Netlify serving from the domain root, and the
  // canonical share/SEO URLs are path-based (/listing/<id>/<slug>). With the old
  // GitHub-Pages-era `base: './'`, the shell served for a deep path referenced
  // ./assets/… relative to that path, Netlify's /* rewrite answered with
  // index.html, the module failed its MIME check, and the page went blank before
  // any script ran. Round 8's path→hash bootstrap needs the app to boot there.
  base: '/',
  plugins: [react()],
})
