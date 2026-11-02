import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

// Separate from vite.config.ts so the app's build config stays untouched. The
// Supabase client is replaced by an in-memory fake in src/test/setup.ts.
export default defineConfig({
  plugins: [react()],
  define: {
    __PRODUCTION_DEPLOY__: 'false',
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
  },
})
