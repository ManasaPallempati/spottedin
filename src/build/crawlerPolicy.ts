import type { Plugin } from 'vite'

const ROBOTS_META = /<meta name="robots" content="[^"]*"\s*\/?>/

// What crawlers see before any JavaScript runs. seo.ts sets robots meta at
// runtime, which non-JS crawlers never execute, and a context-scoped
// netlify.toml header never reaches the staging site (it builds its own branch
// as `production`). So a VITE_NOINDEX build (staging) gets noindex in the HTML
// itself and an X-Robots-Tag on every response via a generated _headers file.
// Every build gets a real robots.txt; without one the SPA rewrite answered
// /robots.txt with the app's HTML. Staging's robots.txt still allows crawling,
// so crawlers can see the noindex; a Disallow would hide it from them.
export function crawlerPolicy(noindex: boolean): Plugin {
  return {
    name: 'spotted-crawler-policy',
    transformIndexHtml(html) {
      if (!noindex) return html
      if (!ROBOTS_META.test(html)) throw new Error('index.html has no <meta name="robots"> to switch to noindex')
      return html.replace(ROBOTS_META, '<meta name="robots" content="noindex, nofollow" />')
    },
    generateBundle() {
      this.emitFile({ type: 'asset', fileName: 'robots.txt', source: 'User-agent: *\nAllow: /\n' })
      if (noindex) {
        this.emitFile({ type: 'asset', fileName: '_headers', source: '/*\n  X-Robots-Tag: noindex, nofollow\n' })
      }
    },
  }
}
