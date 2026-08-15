export function listingSlug(title: string): string {
  const slug = title
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '')

  return slug || 'item'
}

export function listingPath(id: string, title: string): string {
  return `/listing/${encodeURIComponent(id)}/${listingSlug(title)}`
}
