// Whitelists the internal routes RequireAuth/Login are allowed to bounce a user
// back to. Never trust an unvalidated returnTo — it comes from location.state
// or a query param and must not become an open redirect.
const ALLOWED_ROUTE_PATTERNS = [
  /^\/$/,
  /^\/listing\/[^/]+$/,
  /^\/seller\/[^/]+$/,
  /^\/sell$/,
  /^\/checkout\/[^/]+$/,
  /^\/inbox$/,
  /^\/saved$/,
  /^\/chat\/[^/]+$/,
  /^\/login$/,
  /^\/reset-password$/,
];

function isSafeInternalPath(path: string): boolean {
  if (path.length === 0) return false;
  if (!path.startsWith('/')) return false;
  if (path.startsWith('//') || path.startsWith('/\\')) return false; // protocol-relative
  if (path.includes('://')) return false;

  const pathname = path.split(/[?#]/)[0];
  return ALLOWED_ROUTE_PATTERNS.some((pattern) => pattern.test(pathname));
}

/** Returns `path` unchanged if it is a recognized internal app route, else `fallback`. */
export function sanitizeReturnTo(path: unknown, fallback = '/'): string {
  return typeof path === 'string' && isSafeInternalPath(path) ? path : fallback;
}
