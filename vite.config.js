import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
function isLegacyServiceRoleKey(key) {
    const parts = key.split('.');
    if (parts.length !== 3)
        return false;
    try {
        const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
        const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
        const payload = JSON.parse(atob(padded));
        return payload.role === 'service_role';
    }
    catch {
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
        plugins: [
            react(),
            VitePWA({
                registerType: 'autoUpdate',
                includeAssets: ['apple-touch-icon.png'],
                // Supabase calls are deliberately absent from runtimeCaching: auth
                // sessions, listings, and messages must never be served stale.
                workbox: {
                    globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
                    navigateFallback: '/maanster-market/index.html',
                    cleanupOutdatedCaches: true,
                },
                manifest: {
                    name: 'Maanster Market',
                    short_name: 'Maanster',
                    description: 'Pre-loved resale marketplace for India. Buy and sell fashion, sneakers, electronics, home goods and vintage finds.',
                    id: '/maanster-market/',
                    start_url: '/maanster-market/',
                    scope: '/maanster-market/',
                    display: 'standalone',
                    orientation: 'portrait',
                    background_color: '#FAFAF7',
                    theme_color: '#7C3AED',
                    icons: [
                        { src: 'pwa-192.png', sizes: '192x192', type: 'image/png' },
                        { src: 'pwa-512.png', sizes: '512x512', type: 'image/png' },
                        {
                            src: 'pwa-maskable-512.png',
                            sizes: '512x512',
                            type: 'image/png',
                            purpose: 'maskable',
                        },
                    ],
                },
            }),
        ],
    };
});
