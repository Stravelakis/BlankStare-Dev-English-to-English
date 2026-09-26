// tests/pure.test.js — run with:  node --test
//
// Covers the logic that is hard to exercise by hand in a loaded extension:
// SSE frame reassembly, URL scheme filtering, domain exclusion, and the
// Greek-text heuristic.

const test   = require('node:test');
const assert = require('node:assert');

const {
  createSSEParser,
  safeUrl,
  searxngOriginPattern,
  isDomainExcluded,
  isLikelyGreek,
  buildSystemPrompt,
} = require('../utils/pure.js');

// ══ SSE FRAME REASSEMBLY ══════════════════════════════════════════════════════
// The v0.5.0 bug: each network chunk was split on '\n' independently, so any
// frame straddling a chunk boundary failed JSON.parse and was swallowed by a
// bare catch. Translations lost words with no error surfaced.

function frame(content) {
  return `data: ${JSON.stringify({ choices: [{ delta: { content } }] })}\n`;
}

test('SSE: whole frames in one chunk', () => {
  const p = createSSEParser();
  assert.deepStrictEqual(p.push(frame('Hello') + frame(' world')), ['Hello', ' world']);
});

test('SSE: frame split across two chunks is not dropped', () => {
  const p    = createSSEParser();
  const full = frame('Hello');
  const cut  = Math.floor(full.length / 2);

  assert.deepStrictEqual(p.push(full.slice(0, cut)), [], 'no delta until the frame completes');
  assert.deepStrictEqual(p.push(full.slice(cut)), ['Hello'], 'delta emitted once completed');
});

test('SSE: split mid-JSON across three chunks', () => {
  const p    = createSSEParser();
  const full = frame('reassembled');

  assert.deepStrictEqual(p.push(full.slice(0, 10)), []);
  assert.deepStrictEqual(p.push(full.slice(10, 25)), []);
  assert.deepStrictEqual(p.push(full.slice(25)), ['reassembled']);
});

test('SSE: byte-at-a-time still yields every delta in order', () => {
  const p      = createSSEParser();
  const stream = frame('a') + frame('b') + frame('c');
  const out    = [];
  for (const ch of stream) out.push(...p.push(ch));
  out.push(...p.flush());
  assert.deepStrictEqual(out, ['a', 'b', 'c']);
});

test('SSE: [DONE] sentinel produces no delta and does not throw', () => {
  const p = createSSEParser();
  assert.deepStrictEqual(p.push(frame('x') + 'data: [DONE]\n'), ['x']);
});

test('SSE: [DONE] split across chunks is still not parsed as a delta', () => {
  const p = createSSEParser();
  assert.deepStrictEqual(p.push(frame('x') + 'data: [DO'), ['x']);
  assert.deepStrictEqual(p.push('NE]\n'), []);
});

test('SSE: CRLF line endings are handled', () => {
  const p = createSSEParser();
  const f = `data: ${JSON.stringify({ choices: [{ delta: { content: 'crlf' } }] })}\r\n`;
  assert.deepStrictEqual(p.push(f), ['crlf']);
});

test('SSE: malformed frame is skipped without killing the stream', () => {
  const p = createSSEParser();
  assert.deepStrictEqual(p.push('data: {not json}\n' + frame('survived')), ['survived']);
});

test('SSE: non-data lines and blank keep-alives are ignored', () => {
  const p = createSSEParser();
  assert.deepStrictEqual(p.push('\n: keep-alive\n' + frame('ok')), ['ok']);
});

test('SSE: flush emits a trailing frame that arrived without a newline', () => {
  const p = createSSEParser();
  assert.deepStrictEqual(p.push(frame('tail').trimEnd()), []);
  assert.deepStrictEqual(p.flush(), ['tail']);
});

test('SSE: empty deltas are not emitted', () => {
  const p = createSSEParser();
  assert.deepStrictEqual(p.push(frame('') + frame('real')), ['real']);
});

// ══ URL SCHEME FILTERING ══════════════════════════════════════════════════════
// SearXNG results are remote strings that become href attributes in a document
// holding extension privileges.

test('safeUrl: passes http and https through', () => {
  assert.strictEqual(safeUrl('https://example.com/a?b=c'), 'https://example.com/a?b=c');
  assert.strictEqual(safeUrl('http://example.com/'),       'http://example.com/');
});

test('safeUrl: rejects javascript:', () => {
  assert.strictEqual(safeUrl('javascript:alert(1)'), '');
  assert.strictEqual(safeUrl('JaVaScRiPt:alert(1)'), '');
});

test('safeUrl: rejects data:, file: and blob:', () => {
  assert.strictEqual(safeUrl('data:text/html,<script>alert(1)</script>'), '');
  assert.strictEqual(safeUrl('file:///etc/passwd'), '');
  assert.strictEqual(safeUrl('blob:https://example.com/uuid'), '');
});

test('safeUrl: rejects chrome-extension: — page content must not link inward', () => {
  assert.strictEqual(safeUrl('chrome-extension://abc/sidepanel.html'), '');
});

test('safeUrl: rejects relative and protocol-relative input', () => {
  assert.strictEqual(safeUrl('//evil.com'),  '');
  assert.strictEqual(safeUrl('/local/path'), '');
});

test('safeUrl: rejects malformed and empty input', () => {
  for (const bad of ['', null, undefined, 'not a url', '   ', 123, {}]) {
    assert.strictEqual(safeUrl(bad), '', `expected '' for ${JSON.stringify(bad)}`);
  }
});

test('safeUrl: tolerates leading/trailing whitespace around a valid URL', () => {
  assert.strictEqual(safeUrl('  https://example.com/  '), 'https://example.com/');
});

// ══ OPTIONAL-PERMISSION ORIGIN PATTERN ════════════════════════════════════════
// This string is handed to chrome.permissions.request. Too broad and the user
// grants the whole web when they meant one server.

test('searxngOriginPattern: builds a single-origin match pattern', () => {
  assert.strictEqual(searxngOriginPattern('https://search.example.com'),  'https://search.example.com/*');
  assert.strictEqual(searxngOriginPattern('https://search.example.com/'), 'https://search.example.com/*');
});

test('searxngOriginPattern: a path on the URL does not widen the pattern', () => {
  assert.strictEqual(
    searxngOriginPattern('https://search.example.com/search?q=x'),
    'https://search.example.com/*'
  );
});

test('searxngOriginPattern: keeps a non-default port, which LAN instances use', () => {
  assert.strictEqual(searxngOriginPattern('http://192.168.1.20:8080'), 'http://192.168.1.20:8080/*');
});

test('searxngOriginPattern: preserves the scheme rather than assuming https', () => {
  assert.strictEqual(searxngOriginPattern('http://searx.lan'), 'http://searx.lan/*');
});

test('searxngOriginPattern: never returns a wildcard host', () => {
  for (const input of ['https://*/*', 'https://*.example.com', '*://*/*']) {
    const out = searxngOriginPattern(input);
    assert.ok(!/\/\/\*/.test(out), `wildcard host leaked from ${input}: ${out}`);
  }
});

test('searxngOriginPattern: refuses non-http schemes and junk', () => {
  for (const bad of ['javascript:alert(1)', 'file:///etc', 'ftp://x.com', '', null, undefined, 'not a url']) {
    assert.strictEqual(searxngOriginPattern(bad), '', `expected '' for ${JSON.stringify(bad)}`);
  }
});

// ══ DOMAIN EXCLUSION ══════════════════════════════════════════════════════════

test('isDomainExcluded: exact hostname match', () => {
  assert.strictEqual(isDomainExcluded('example.com', ['example.com']), true);
});

test('isDomainExcluded: subdomains of an excluded domain are excluded', () => {
  assert.strictEqual(isDomainExcluded('docs.example.com', ['example.com']), true);
});

test('isDomainExcluded: a suffix that is not a subdomain is not excluded', () => {
  assert.strictEqual(isDomainExcluded('notexample.com', ['example.com']), false);
});

test('isDomainExcluded: parent domain is not excluded by a subdomain entry', () => {
  assert.strictEqual(isDomainExcluded('example.com', ['docs.example.com']), false);
});

test('isDomainExcluded: strips scheme, path and case from list entries', () => {
  assert.strictEqual(isDomainExcluded('example.com', ['https://Example.com/some/path']), true);
});

test('isDomainExcluded: empty list, empty entries and blanks are safe', () => {
  assert.strictEqual(isDomainExcluded('example.com', []),            false);
  assert.strictEqual(isDomainExcluded('example.com', null),          false);
  assert.strictEqual(isDomainExcluded('example.com', undefined),     false);
  assert.strictEqual(isDomainExcluded('example.com', ['', '  ', null]), false);
});

// ══ GREEK HEURISTIC ═══════════════════════════════════════════════════════════
// Guards against sending Greek text to a translator whose job is English → plain.

test('isLikelyGreek: plain English is not Greek', () => {
  assert.strictEqual(isLikelyGreek('TypeError: cannot read property of undefined'), false);
});

test('isLikelyGreek: Greek prose is Greek', () => {
  assert.strictEqual(isLikelyGreek('Αυτό είναι ένα μήνυμα σφάλματος'), true);
});

test('isLikelyGreek: a stray Greek symbol in English does not trip it', () => {
  assert.strictEqual(isLikelyGreek('the λ calculus underpins functional programming'), false);
});

test('isLikelyGreek: empty and whitespace input does not divide by zero', () => {
  assert.strictEqual(isLikelyGreek(''),    false);
  assert.strictEqual(isLikelyGreek('   '), false);
  assert.strictEqual(isLikelyGreek(null),  false);
});

// ══ SYSTEM PROMPT ═════════════════════════════════════════════════════════════

test('buildSystemPrompt: unknown level falls back to standard rather than throwing', () => {
  const bogus   = buildSystemPrompt('en', 'nonsense-level', '');
  const fallback = buildSystemPrompt('en', 'standard', '');
  assert.strictEqual(bogus, fallback);
});

test('buildSystemPrompt: Greek requests instruct Greek output', () => {
  assert.match(buildSystemPrompt('el', 'standard', ''), /Greek/);
});

test('buildSystemPrompt: reader context is included when given, absent when not', () => {
  assert.match(buildSystemPrompt('en', 'standard', 'I am a designer'), /I am a designer/);
  assert.doesNotMatch(buildSystemPrompt('en', 'standard', ''), /Reader context/);
});

test('buildSystemPrompt: vibecoder level names the concepts the reader already has', () => {
  assert.match(buildSystemPrompt('en', 'vibecoder', ''), /ALREADY KNOW/);
});

test('buildSystemPrompt never ends the reader description with a double full stop', () => {
  const { VALID_LEVELS } = require('../utils/pure.js');
  for (const level of VALID_LEVELS) for (const lang of ['en', 'el']) {
    const readerLine = buildSystemPrompt(lang, level, '').split('\n')[0];
    assert.ok(!readerLine.includes('..'), `${lang}/${level}`);
  }
});
