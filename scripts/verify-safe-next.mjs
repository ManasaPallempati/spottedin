// Run with `node --test scripts/verify-safe-next.mjs` using existing TypeScript.
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import ts from 'typescript'

const source = readFileSync(new URL('../src/lib/safeNext.ts', import.meta.url), 'utf8')
const { outputText } = ts.transpileModule(source, {
  compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.ESNext },
})
const { safeNext } = await import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`)

// URLSearchParams decodes `next` before the app calls safeNext. Test that exact
// boundary rather than treating percent-encoded controls as literal text.
function nextFromQuery(value) {
  return new URLSearchParams(`next=${encodeURIComponent(value)}`).get('next')
}

test('rejects controls throughout a decoded next parameter', () => {
  for (const code of [...Array(32).keys(), 127]) {
    const control = String.fromCharCode(code)
    for (const raw of [`/${control}/redirect-target.invalid`, `/home${control}`, `/search?q=${control}`, `/home#${control}`]) {
      assert.equal(safeNext(nextFromQuery(raw)), '/home', JSON.stringify(raw))
      assert.equal(safeNext(nextFromQuery(raw), '/profile'), '/profile', JSON.stringify(raw))
    }
  }
})

test('rejects external schemes, protocol-relative paths and backslash tricks', () => {
  for (const raw of [
    '//redirect-target.invalid', '///redirect-target.invalid',
    'https://redirect-target.invalid', 'http://redirect-target.invalid',
    'javascript:alert(1)', 'data:text/html,example', 'home', '?next=/home',
    '/\\redirect-target.invalid', '/folder\\..\\redirect-target.invalid',
    ' /home', '\t/home',
  ]) assert.equal(safeNext(raw, '/profile'), '/profile', JSON.stringify(raw))
})

test('does not return a protocol-relative path exposed by normalization', () => {
  for (const raw of ['/folder/..//redirect-target.invalid', '/%2e//redirect-target.invalid', '/%2e%2e//redirect-target.invalid']) {
    assert.equal(safeNext(raw), '/home', raw)
  }
})

test('keeps internal destinations with query, hash, encoded content and fallback', () => {
  for (const raw of [
    '/', '/home', '/bag?checkout=1', '/listing/id/saree?from=feed#photos',
    '/search?q=kurta%20cotton#sizes', '/search?q=https%3A%2F%2Fexample.invalid',
    '/search?q=%09#encoded-control', '/path%2Fsegment?tag=a%26b#details',
  ]) {
    const result = safeNext(raw)
    assert.equal(result, raw)
    assert.equal(new URL(result, 'https://app.example').origin, 'https://app.example')
  }
  assert.equal(safeNext('/folder/../bag?checkout=1#items'), '/bag?checkout=1#items')
  assert.equal(safeNext(null), '/home')
  assert.equal(safeNext(undefined, '/profile'), '/profile')
  assert.equal(safeNext('', '/onboarding/birthday'), '/onboarding/birthday')
})
