// Helpers for the "Share on WhatsApp" action. Pure functions, no DOM access,
// so they can be unit tested without a browser.

/** Rupee amount in Indian digit grouping, e.g. 125000 -> "₹1,25,000". */
export function formatInr(value: number): string {
  return `₹${value.toLocaleString('en-IN')}`
}

/** Message body for a listing: "<title> for ₹<price> on SPOTTED". */
export function listingShareText(title: string, priceInr: number): string {
  return `${title} for ${formatInr(priceInr)} on SPOTTED`
}

/** Message body for a seller profile. */
export function profileShareText(handle: string): string {
  return `Check out @${handle} on SPOTTED`
}

/**
 * wa.me deep link with the message prefilled. The canonical URL goes on its own
 * line so WhatsApp can render a link preview; everything is percent-encoded so
 * characters like "&", "#", "+" and non-ASCII (₹) survive.
 */
export function buildWhatsAppUrl(text: string, url: string): string {
  return `https://wa.me/?text=${encodeURIComponent(`${text}\n${url}`)}`
}
