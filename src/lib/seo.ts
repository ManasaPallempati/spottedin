type CanonicalMeta = {
  title: string
  description: string
  canonicalPath?: string
  noIndex?: boolean
  ogImage?: string
  ogType?: 'website' | 'product'
  canonical?: string
}

// Canonical origin for this deployment. It is also the OAuth `redirectTo`
// target (see pages/Login.tsx), so it must match the origin actually being
// served — otherwise a staging sign-in bounces the user to production.
// Staging sets VITE_SITE_ORIGIN; production falls back to the apex.
export const SITE_ORIGIN = import.meta.env.VITE_SITE_ORIGIN ?? 'https://spottedin.co'
const META_ID = 'spotted-seo-meta'
const SCRIPT_ID = 'spotted-jsonld'

function createOrUpdateMeta(name: string, attr: 'name' | 'property' | 'rel', value: string): void {
  if (typeof document === 'undefined') return
  if (attr === 'rel') {
    let existing = document.querySelector(`link[rel="${name}"]`) as HTMLLinkElement | null
    if (!existing) {
      existing = document.createElement('link')
      existing.setAttribute('rel', name)
      document.head.appendChild(existing)
    }
    existing.setAttribute('href', value)
    existing.setAttribute('id', META_ID)
    return
  }

  const selector = `meta[${attr}="${name}"]`
  let tag = document.querySelector(selector) as HTMLMetaElement | null
  if (!tag) {
    tag = document.createElement('meta')
    tag.setAttribute(attr, name)
    document.head.appendChild(tag)
  }
  tag.setAttribute('content', value)
  tag.setAttribute('id', `${META_ID}-${name}`)
}

export function canonicalUrl(pathname: string, search = '', hash = ''): string {
  const cleanPathname = pathname.startsWith('/') ? pathname : `/${pathname}`
  const qs = search ? (search.startsWith('?') ? search : `?${search}`) : ''
  const hashPath = hash ? (hash.startsWith('#') ? hash : `#${hash}`) : ''
  return `${SITE_ORIGIN}${cleanPathname}${qs}${hashPath}`
}

export function setPageMeta(meta: CanonicalMeta): void {
  if (typeof document === 'undefined') return

  document.title = meta.title
  createOrUpdateMeta('description', 'name', meta.description)
  createOrUpdateMeta('description', 'property', meta.description)
  createOrUpdateMeta('og:title', 'property', meta.title)
  createOrUpdateMeta('og:description', 'property', meta.description)
  createOrUpdateMeta('og:type', 'property', meta.ogType ?? 'website')
  const canonical = meta.canonical ?? canonicalUrl(meta.canonicalPath ?? '/', '', '')
  createOrUpdateMeta('canonical', 'rel', canonical)
  createOrUpdateMeta('og:url', 'property', canonical)
  createOrUpdateMeta('twitter:card', 'name', 'summary_large_image')
  createOrUpdateMeta('twitter:title', 'name', meta.title)
  createOrUpdateMeta('twitter:description', 'name', meta.description)

  if (meta.ogImage) {
    createOrUpdateMeta('og:image', 'property', meta.ogImage)
    createOrUpdateMeta('twitter:image', 'name', meta.ogImage)
  }

  createOrUpdateMeta('robots', 'name', meta.noIndex ? 'noindex' : 'index, follow')
}

export function setPageIndexing(indexable: boolean): void {
  createOrUpdateMeta('robots', 'name', indexable ? 'index, follow' : 'noindex, nofollow')
}

export function setStructuredData(data: unknown): void {
  if (typeof document === 'undefined') return
  const existing = document.getElementById(SCRIPT_ID)
  if (existing) existing.remove()

  const tag = document.createElement('script')
  tag.id = SCRIPT_ID
  tag.type = 'application/ld+json'
  tag.textContent = JSON.stringify(data)
  document.head.appendChild(tag)
}
