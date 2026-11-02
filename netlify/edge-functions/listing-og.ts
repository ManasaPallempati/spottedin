// Link-preview crawlers (WhatsApp, Instagram, X, iMessage) do not run JavaScript, so
// the per-listing meta that lib/seo.ts sets client-side is invisible to them. This
// edge function rewrites the static Open Graph tags in index.html for
// /listing/<id>/<slug> using the public listing row. Lookup and transform failures
// return the unmodified shell; an upstream body-stream failure remains an error.
import type { Context } from 'https://edge.netlify.com'
import { listingPath } from '../../src/lib/listingUrls.ts'

declare const Netlify: { env: { get(key: string): string | undefined } }

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

function setMeta(html: string, attr: 'property' | 'name', key: string, value: string): string {
  const tag = `<meta ${attr}="${key}" content="${esc(value)}" />`
  const re = new RegExp(`<meta\\s+${attr}="${key}"[^>]*>`, 'i')
  // Seller text must remain literal: string replacements expand $&, $', $` and $$.
  return re.test(html) ? html.replace(re, () => tag) : html.replace('</head>', () => `    ${tag}\n  </head>`)
}

export default async function handler(request: Request, context: Context) {
  let response = await context.next()
  let shell: string | undefined
  try {
    if (Netlify.env.get('VITE_NOINDEX') === 'true') {
      const headers = new Headers(response.headers)
      headers.set('X-Robots-Tag', 'noindex, nofollow')
      response = new Response(response.body, { status: response.status, statusText: response.statusText, headers })
    }

    // Null-body responses (including 204, 205 and 304) cannot carry rewritten HTML.
    if (response.body === null) return response

    const supabaseUrl = Netlify.env.get('VITE_SUPABASE_URL')
    const anonKey = Netlify.env.get('VITE_SUPABASE_ANON_KEY')
    const id = new URL(request.url).pathname.split('/')[2]
    if (!supabaseUrl || !anonKey || !id) return response
    if (!(response.headers.get('content-type') ?? '').includes('text/html')) return response

    const api = `${supabaseUrl}/rest/v1/listings?id=eq.${encodeURIComponent(decodeURIComponent(id))}&select=id,title,description,price_inr,image_path&limit=1`
    const res = await fetch(api, {
      headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}` },
      signal: AbortSignal.timeout(1500),
    })
    if (!res.ok) return response
    const [row] = (await res.json()) as Array<{ id: string; title: string; description: string | null; price_inr: number; image_path: string | null }>
    if (!row || typeof row.id !== 'string' || typeof row.title !== 'string') return response

    const price = `₹${Number(row.price_inr).toLocaleString('en-IN')}`
    const title = `${row.title} – ${price} | SPOTTED`
    const description = (row.description?.trim() || `Shop ${row.title} for ${price} on SPOTTED, a marketplace for pre-owned Indian clothing.`).slice(0, 200)
    const origin = new URL(Netlify.env.get('VITE_SITE_ORIGIN') || request.url).origin
    const canonical = new URL(listingPath(row.id, row.title), origin).href

    // Keep the original unread if the stream fails; cache a complete shell for
    // later transform failures. A broken upstream stream cannot supply missing bytes.
    shell = await response.clone().text()
    let html = shell
    html = html.replace(/<title>[^<]*<\/title>/i, () => `<title>${esc(title)}</title>`)
    html = setMeta(html, 'property', 'og:title', title)
    html = setMeta(html, 'property', 'og:description', description)
    html = setMeta(html, 'name', 'description', description)
    html = setMeta(html, 'property', 'og:type', 'product')
    html = setMeta(html, 'property', 'og:url', canonical)
    html = html.replace(/<link rel="canonical"[^>]*>/i, () => `<link rel="canonical" href="${esc(canonical)}" />`)
    if (row.image_path) {
      const image = /^https?:/.test(row.image_path)
        ? row.image_path
        : `${supabaseUrl}/storage/v1/object/public/listing-images/${row.image_path}`
      html = setMeta(html, 'property', 'og:image', image)
      html = setMeta(html, 'name', 'twitter:image', image)
    }

    const headers = new Headers(response.headers)
    headers.delete('content-length')
    return new Response(html, { status: response.status, statusText: response.statusText, headers })
  } catch {
    return shell === undefined
      ? response
      : new Response(shell, { status: response.status, statusText: response.statusText, headers: response.headers })
  }
}

export const config = { path: '/listing/*' }
