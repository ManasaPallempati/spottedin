import { describe, expect, it } from 'vitest'
import { crawlerPolicy } from '../build/crawlerPolicy'

const SHELL = '<head>\n    <meta name="robots" content="index, follow" />\n</head>'

function run(noindex: boolean) {
  const plugin = crawlerPolicy(noindex)
  const transform = plugin.transformIndexHtml as (html: string) => string
  const emitted: Record<string, string> = {}
  const generate = plugin.generateBundle as (this: unknown) => void
  generate.call({ emitFile: (f: { fileName: string; source: string }) => (emitted[f.fileName] = f.source) })
  return { html: transform(SHELL), emitted }
}

describe('crawler policy', () => {
  it('keeps staging (VITE_NOINDEX) out of search results without running JavaScript', () => {
    const { html, emitted } = run(true)
    expect(html).toContain('<meta name="robots" content="noindex, nofollow" />')
    expect(html).not.toContain('index, follow')
    expect(emitted['_headers']).toBe('/*\n  X-Robots-Tag: noindex, nofollow\n')
    // Crawling stays allowed so the noindex can be seen.
    expect(emitted['robots.txt']).toBe('User-agent: *\nAllow: /\n')
  })

  it('leaves production indexable, with a real robots.txt', () => {
    const { html, emitted } = run(false)
    expect(html).toBe(SHELL)
    expect(emitted['_headers']).toBeUndefined()
    expect(emitted['robots.txt']).toBe('User-agent: *\nAllow: /\n')
  })

  it('fails the build rather than silently shipping an indexable staging page', () => {
    const transform = crawlerPolicy(true).transformIndexHtml as (html: string) => string
    expect(() => transform('<head></head>')).toThrow(/no <meta name="robots">/)
  })
})
