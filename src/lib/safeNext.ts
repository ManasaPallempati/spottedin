// Guards the post-auth `next` redirect against open-redirect abuse: only an internal,
// same-origin absolute path is honored. Protocol-relative (`//host`), absolute URLs
// (`https://…`), and backslash tricks browsers can normalize to `//` fall back to a
// safe default.
export function safeNext(raw: string | null | undefined, fallback = '/home'): string {
  if (!raw) return fallback
  if (!raw.startsWith('/') || raw.startsWith('//') || raw.includes('\\')) return fallback
  return raw
}
