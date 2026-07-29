export function json(body: unknown, status = 200, headers: HeadersInit = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', ...headers },
  });
}

export function errorResponse(error: unknown, headers: HeadersInit = {}): Response {
  const message = error instanceof Error ? error.message : 'Unexpected server error';
  const status = message.startsWith('Unauthorized') ? 401
    : message.startsWith('Forbidden') ? 403
    : message.startsWith('Invalid') ? 400
    : 500;
  return json({ error: message }, status, headers);
}

export function corsHeaders(request: Request): Record<string, string> {
  const origin = request.headers.get('origin') ?? '';
  const allowed = (Deno.env.get('APP_ORIGINS') ?? '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
  return {
    ...(allowed.includes(origin) ? { 'access-control-allow-origin': origin } : {}),
    'access-control-allow-headers': 'authorization, apikey, content-type, x-client-info',
    'access-control-allow-methods': 'POST, OPTIONS',
    'vary': 'origin',
  };
}

export function handleOptions(request: Request): Response | null {
  if (request.method !== 'OPTIONS') return null;
  return new Response(null, { status: 204, headers: corsHeaders(request) });
}
