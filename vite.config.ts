import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// Node 20+ exposes the web-compatible atob global. Declaring it here avoids a
// runtime-only secret check without adding @types/node just for Vite config.
declare const atob: (value: string) => string;

function isLegacyServiceRoleKey(key: string): boolean {
  const parts = key.split('.');
  if (parts.length !== 3) return false;
  try {
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
    const payload = JSON.parse(atob(padded)) as { role?: string };
    return payload.role === 'service_role';
  } catch {
    return false;
  }
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', 'VITE_');
  const supabaseUrl = env.VITE_SUPABASE_URL?.trim();
  const publishableKey = env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim();

  if (Boolean(supabaseUrl) !== Boolean(publishableKey)) {
    throw new Error('VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY must be configured together');
  }
  if (publishableKey?.startsWith('sb_secret_') || (publishableKey && isLegacyServiceRoleKey(publishableKey))) {
    throw new Error('Refusing to bundle a Supabase secret or service-role key into the browser build');
  }

  return {
    base: '/maanster-market/',
    plugins: [react()],
  };
});
