// Only root-relative, same-origin destinations are allowed after authentication.
// URL parsers remove tabs/newlines and normalize backslashes, so reject controls
// and backslashes before parsing rather than checking the raw prefix alone.
const VALIDATION_ORIGIN = 'https://spotted.invalid'

export function safeNext(raw: string | null | undefined, fallback = '/home'): string {
  if (!raw || !raw.startsWith('/') || raw.startsWith('//')) return fallback
  if (/[\u0000-\u001f\u007f\\]/.test(raw)) return fallback

  try {
    // A fixed reserved origin makes validation independent of browser globals.
    // No request is made; root-relative paths must retain this origin.
    const destination = new URL(raw, VALIDATION_ORIGIN)
    if (destination.origin !== VALIDATION_ORIGIN) return fallback
    // Dot-segment normalization can expose a leading double slash. Do not hand
    // that back to a router as a protocol-relative destination.
    if (destination.pathname.startsWith('//')) return fallback
    return destination.pathname + destination.search + destination.hash
  } catch {
    return fallback
  }
}
