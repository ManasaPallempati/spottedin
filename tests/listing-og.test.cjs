const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const { test } = require('node:test')
const ts = require('typescript')

const root = path.resolve(__dirname, '..')
const sourcePath = process.env.LISTING_OG_SOURCE || path.join(root, 'netlify/edge-functions/listing-og.ts')
const shell = fs.readFileSync(path.join(root, 'index.html'), 'utf8')
  .replace('</head>', '  <meta property="og:image" content="original.webp" />\n</head>')
const row = {
  id: '00000000-0000-4000-8000-000000000001',
  title: 'Silk Saree',
  description: 'A pre-owned silk saree.',
  price_inr: 1499,
  image_path: 'listing.webp',
}
const escapeHtml = (value) => value.replace(/&/g, '&amp;').replace(/"/g, '&quot;')
  .replace(/</g, '&lt;').replace(/>/g, '&gt;')

// Execute the real TypeScript edge function with Web Request/Response primitives.
// The only fetch in its VM is this per-test stub; no host network is available.
function loadHandler(env, fetchStub) {
  const loadModule = (filename) => {
    const module = { exports: {} }
    const result = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
      fileName: filename,
      reportDiagnostics: true,
    })
    assert.equal(result.diagnostics.filter((item) => item.category === ts.DiagnosticCategory.Error).length, 0)
    vm.runInNewContext(result.outputText, {
      exports: module.exports, module, URL, Request, Response, Headers, AbortSignal,
      Netlify: { env: { get: (key) => env[key] } },
      fetch: fetchStub,
      require: (specifier) => {
        assert.equal(specifier, '../../src/lib/listingUrls.ts')
        return loadModule(path.join(root, 'src/lib/listingUrls.ts'))
      },
    }, { filename })
    return module.exports
  }
  return loadModule(sourcePath).default
}

async function run(options = {}) {
  const env = {
    VITE_SUPABASE_URL: 'https://catalog.invalid',
    VITE_SUPABASE_ANON_KEY: 'synthetic-anon-key',
    ...options.env,
  }
  const calls = []
  const fetchStub = async (url, init) => {
    assert.equal(new URL(url).origin, 'https://catalog.invalid')
    calls.push({ url, init })
    if (options.fetch) return options.fetch(url, init)
    return Response.json(options.rows || [row])
  }
  const handler = loadHandler(env, fetchStub)
  const upstream = options.upstream || new Response(options.body ?? shell, {
    status: 203, statusText: 'Synthetic shell',
    headers: {
      'content-type': options.contentType || 'text/html; charset=utf-8',
      'x-shell-marker': 'unchanged',
      'content-length': String(Buffer.byteLength(options.body ?? shell)),
      ...options.headers,
    },
  })
  const response = await handler(
    new Request(options.url || 'https://preview.invalid/listing/requested-id/untrusted-slug'),
    { next: async () => upstream },
  )
  return { response, upstream, calls }
}

for (const token of ["$'", '$' + String.fromCharCode(96), '$&', '$$']) {
  test('metadata keeps replacement token ' + JSON.stringify(token) + ' literal', async () => {
    const text = 'Saree ' + token + ' " <silk> & sale'
    const image = 'https://images.invalid/' + token + '.webp'
    const { response, calls } = await run({ rows: [{ ...row, title: text, description: text, image_path: image }] })
    const html = await response.text()
    assert.ok(html.includes('<title>' + escapeHtml(text) + ' – ₹1,499 | SPOTTED</title>'))
    assert.ok(html.includes('<meta property="og:title" content="' + escapeHtml(text) + ' – ₹1,499 | SPOTTED" />'))
    assert.ok(html.includes('<meta property="og:description" content="' + escapeHtml(text) + '" />'))
    assert.ok(html.includes('<meta name="description" content="' + escapeHtml(text) + '" />'))
    assert.ok(html.includes('<meta property="og:image" content="' + escapeHtml(image) + '" />'))
    assert.ok(html.includes('<meta name="twitter:image" content="' + escapeHtml(image) + '" />'))
    assert.equal((html.match(/id="root"/g) || []).length, 1)
    assert.equal((html.match(/<script /g) || []).length, 1)
    assert.ok(html.length < shell.length + 2000)
    assert.ok(new URL(calls[0].url).searchParams.get('select').split(',').includes('id'))
    assert.equal(response.headers.has('content-length'), false)
  })
}

test('canonical uses returned listing ID and title instead of arbitrary request paths', async () => {
  for (const suffix of ["ignored-$'-$&-$$", 'another-slug?tracking=1']) {
    const { response } = await run({ url: 'https://preview.invalid/listing/requested-id/' + suffix })
    const html = await response.text()
    const expected = 'https://preview.invalid/listing/' + row.id + '/silk-saree'
    assert.ok(html.includes('<link rel="canonical" href="' + expected + '" />'))
    assert.ok(html.includes('<meta property="og:url" content="' + expected + '" />'))
    assert.equal((html.match(/id="root"/g) || []).length, 1)
  }
})

test('canonical honors the configured site origin without reflecting the preview path', async () => {
  const { response } = await run({ env: { VITE_SITE_ORIGIN: 'https://staging.invalid' } })
  assert.ok((await response.text()).includes('href="https://staging.invalid/listing/' + row.id + '/silk-saree"'))
})

test('post-read transform failure returns a readable, unmodified shell', async () => {
  const { response } = await run({ rows: [{ ...row, image_path: { toString: null } }] })
  assert.equal(response.bodyUsed, false)
  assert.equal(await response.text(), shell)
  assert.equal(response.status, 203)
  assert.equal(response.statusText, 'Synthetic shell')
  assert.equal(response.headers.get('x-shell-marker'), 'unchanged')
  assert.equal(response.headers.get('content-length'), String(Buffer.byteLength(shell)))
})

test('missing configuration and non-HTML responses do not perform lookups', async () => {
  for (const options of [
    { env: { VITE_SUPABASE_URL: undefined } },
    { env: { VITE_SUPABASE_ANON_KEY: undefined } },
    { contentType: 'text/plain', body: 'plain shell' },
  ]) {
    const { response, calls } = await run(options)
    assert.equal(calls.length, 0)
    assert.equal(await response.text(), options.body || shell)
  }
})

test('lookup HTTP errors, invalid JSON, empty data and missing IDs preserve the shell', async () => {
  for (const options of [
    { fetch: () => new Response('not available', { status: 503 }) },
    { fetch: () => new Response('invalid JSON') },
    { rows: [] },
    { rows: [{ ...row, id: undefined }] },
    { url: 'https://preview.invalid/listing/%ZZ/invalid' },
  ]) {
    const { response } = await run(options)
    assert.equal(await response.text(), shell)
    assert.equal(response.headers.get('x-shell-marker'), 'unchanged')
  }
})

test('a stalled lookup aborts and returns the original shell', async () => {
  const started = Date.now()
  let aborted = false
  const { response } = await run({
    fetch: (_url, init) => new Promise((resolve, reject) => {
      assert.ok(init.signal instanceof AbortSignal)
      const deadline = setTimeout(() => reject(new Error('lookup did not abort')), 2500)
      init.signal.addEventListener('abort', () => {
        aborted = true
        clearTimeout(deadline)
        reject(init.signal.reason)
      }, { once: true })
    }),
  })
  assert.equal(await response.text(), shell)
  assert.equal(aborted, true)
  assert.ok(Date.now() - started < 2400)
})

test('staging noindex applies to rewritten and fallback responses', async () => {
  for (const options of [
    {},
    { env: { VITE_SUPABASE_URL: undefined } },
    { rows: [{ ...row, image_path: { toString: null } }] },
  ]) {
    const { response } = await run({
      ...options, env: { ...options.env, VITE_NOINDEX: 'true' },
    })
    assert.equal(response.headers.get('x-robots-tag'), 'noindex, nofollow')
    assert.equal(response.bodyUsed, false)
    await response.text()
  }
})

test('existing preview noindex survives when the environment flag is false', async () => {
  const { response } = await run({
    env: { VITE_NOINDEX: 'false' },
    headers: { 'X-Robots-Tag': 'noindex, nofollow' },
  })
  assert.equal(response.headers.get('x-robots-tag'), 'noindex, nofollow')
  assert.equal(response.status, 203)
  assert.equal(response.headers.get('x-shell-marker'), 'unchanged')
})

test('missing metadata insertion preserves seller text containing every replacement token', async () => {
  const text = "Saree $' " + '$' + String.fromCharCode(96) + ' $& $$ <silk> & sale'
  const { response } = await run({
    body: shell.replace(/<meta\b[^>]*>/gi, ''),
    rows: [{ ...row, title: text, description: text }],
  })
  const html = await response.text()
  assert.ok(html.includes('<meta property="og:title" content="' + escapeHtml(text) + ' – ₹1,499 | SPOTTED" />'))
  assert.ok(html.includes('<meta property="og:description" content="' + escapeHtml(text) + '" />'))
  assert.ok(html.includes('<meta name="description" content="' + escapeHtml(text) + '" />'))
  assert.equal((html.match(/id="root"/g) || []).length, 1)
  assert.equal((html.match(/<script /g) || []).length, 1)
})

test('an upstream stream error leaves the original unread without claiming missing bytes', async () => {
  const upstream = new Response(new ReadableStream({
    start(controller) {
      controller.enqueue(new TextEncoder().encode('<html><head>'))
      controller.error(new Error('upstream ended early'))
    },
  }), { headers: { 'content-type': 'text/html' } })
  const { response } = await run({ upstream })
  assert.equal(response.bodyUsed, false)
  await assert.rejects(response.text(), /upstream ended early/)
})

for (const status of [204, 205, 304]) {
  test('null-body status ' + status + ' bypasses lookup and keeps staging headers', async () => {
    const upstream = new Response(null, {
      status, statusText: 'Synthetic no-body response',
      headers: { 'content-type': 'text/html', 'x-shell-marker': 'unchanged' },
    })
    const { response, calls } = await run({ upstream, env: { VITE_NOINDEX: 'true' } })
    assert.equal(calls.length, 0)
    assert.equal(response.status, status)
    assert.equal(response.statusText, 'Synthetic no-body response')
    assert.equal(response.headers.get('x-shell-marker'), 'unchanged')
    assert.equal(response.headers.get('x-robots-tag'), 'noindex, nofollow')
    assert.equal(response.body, null)
    assert.equal(await response.text(), '')
  })
}
