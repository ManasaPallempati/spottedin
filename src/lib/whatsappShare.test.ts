import { describe, expect, it } from 'vitest'
import { buildWhatsAppUrl, formatInr, listingShareText, profileShareText } from './whatsappShare'

describe('whatsappShare', () => {
  it('formats rupees with Indian digit grouping', () => {
    expect(formatInr(2500)).toBe('₹2,500')
    expect(formatInr(125000)).toBe('₹1,25,000')
  })

  it('builds a wa.me link with the text and canonical URL fully URL-encoded', () => {
    const url = 'https://www.spottedin.co/listing/a%20b/zara-m?x=1&y=2#top'
    const link = buildWhatsAppUrl(listingShareText('Zara & Co — size M', 1250), url)

    expect(link.startsWith('https://wa.me/?text=')).toBe(true)
    const query = link.slice('https://wa.me/?text='.length)
    // No raw reserved characters leak into the query value.
    expect(query).not.toMatch(/[&#?\s₹—]/)
    // Round-trips back to the original message.
    expect(decodeURIComponent(query)).toBe(`Zara & Co — size M for ₹1,250 on SPOTTED\n${url}`)
    expect(query).toContain('%E2%82%B9') // ₹
  })

  it('words the profile message around the handle', () => {
    expect(profileShareText('priya')).toBe('Check out @priya on SPOTTED')
  })
})
