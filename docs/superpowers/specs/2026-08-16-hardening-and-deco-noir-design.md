# BlankStare v0.6 — Hardening pass, then Deco Noir

_Design doc. Written 2026-08-16, against v0.5.0 (commit `74e7f0c`)._

---

## Why

BlankStare v0.5.0 works. A code read turned up eleven defects, three of which
are user-visible and hard to diagnose from a bug report: a streaming parser
that silently drops words, a stream that can hang the panel forever, and no way
to cancel an in-flight request. Separately, the extension has no visual
relationship to the other products in this portfolio.

Two phases, in order. Phase 1 is correctness and ships on its own. Phase 2 is
the Deco Noir identity, applied to a codebase that is no longer racing itself.

Restyling on top of a stream that can hang or interleave means debugging both
at once, so the order is not negotiable.

---

## Phase 1 — the fix pass

### 1.1 Streaming core (`utils/api.js`)

Four defects share one root — `_streamGroq` treats a network chunk as if it
were a message frame. They are fixed together.

**Frame reassembly.** `raw.split('\n')` assumes an SSE `data:` line never
straddles two reads. It does. The half-line fails `JSON.parse`, `catch (_) {}`
swallows it, and the translation loses words with no error surfaced anywhere.

Carry a `buffer` string across reads. Split on `\n`, hold the final (possibly
incomplete) element back for the next read, parse only what is complete. Flush
the buffer once on `done`.

**Mid-stream failure.** The read loop has no `try`/`catch`. A dropped
connection throws, so neither `onDone` nor `onError` fires and the cursor
blinks indefinitely. Wrap the loop; on throw, return
`{ ok: false, status: 0, error, partial }`. Partial text is preserved so the
caller can keep what arrived rather than discarding a mostly-complete answer.

**Cancellation.** `explainWithGroq` gains an `AbortSignal` parameter, forwarded
to `fetch`. The sidepanel holds one `currentController`; any new request aborts
the previous one first. An abort is not a failure — it is detected via
`err.name === 'AbortError'` and returns a distinct result so the caller shows
no error state.

**Token budget.** `max_tokens: 700` is hardcoded, so "Go deeper" gets the same
budget as the first pass and truncates mid-sentence. Becomes a parameter,
default 700; `deeper` and `fullpage` pass 1400.

**Fallback notice.** The rate-limit message is currently emitted through
`onChunk('', msg)`, so the sidepanel writes it into the same node the next real
chunk overwrites — it flickers and vanishes. It moves to its own `onStatus`
callback and its own DOM element, cleared when the next stream starts.

### 1.2 Glossary joins the same path

`runJargonDictionary` in `sidepanel.js` opens its own `fetch` to Groq with a
hardcoded model, no 401/429 mapping, and no fallback chain. It moves to
`fetchGlossary(text, key, model, signal)` in `api.js` and inherits all three.

### 1.3 Sidepanel

**Polling.** `setInterval(checkForPendingText, 500)` runs two
`chrome.storage.session` reads per second for as long as the panel is open.
Replaced with `chrome.storage.session.onChanged`. One reconcile still runs on
`visibilitychange`, covering the case where text was queued before the panel
document existed.

**History.** `sessionHistory` is an in-memory array in a document Chrome
destroys when the panel closes, so the advertised "last 20" is lost constantly.
It persists to `chrome.storage.session`: survives panel close, dies with the
browser, writes nothing to disk. Cap stays 20. No privacy posture change —
translated content already lived in session storage in transit.

**Accessibility.** `aria-live="polite"` on the explanation region and
`aria-busy` while streaming, so screen readers announce output instead of
silence. Card `role="button"` elements handle Enter but not Space; both now.

### 1.4 Link safety

SearXNG results reach the DOM as `href="${r.url}"`, unescaped and unvalidated.
A malicious or compromised instance can inject a `javascript:` URL into a
document holding extension privileges.

One helper, applied at every boundary where a remote string becomes a URL —
SearXNG result links, YouTube thumbnail `src`, resource links:

```js
function safeUrl(raw) {
  try {
    const u = new URL(raw);
    return (u.protocol === 'http:' || u.protocol === 'https:') ? u.href : '';
  } catch { return ''; }
}
```

Empty string means the link renders inert rather than dangerous.

### 1.5 Content script

`triggerFloating` and `excludeList` are read once at injection, so changing
either requires reloading every open tab. The context menu already syncs via
`SETTINGS_CHANGED`; the floating button should too. Add a
`chrome.storage.sync.onChanged` listener that attaches or detaches the
selection listeners live, and removes an already-rendered button when its
domain is newly excluded.

### 1.6 Version

The version string is maintained in five places — `manifest.json`, three JS
header comments, and the About tab. Single source:
`chrome.runtime.getManifest().version`, read at runtime for the About tab and
the install log. Header comments drop their version tags.

### 1.7 Tests, without a build step

No build step exists and none is added. The pure functions —
`isDomainExcluded`, `isLikelyGreek`, `safeUrl`, `buildSystemPrompt`, and the
new SSE line-buffer — move to `utils/pure.js`, written as a classic script
whose last statement is:

```js
if (typeof module !== 'undefined') module.exports = { /* … */ };
```

That loads via a plain `<script>` tag in the extension and `require()`s under
`node --test`. No bundler, no npm dependency, no change to "load unpacked" for
anyone without Node installed.

Test coverage targets the defects that are hard to reproduce by hand:

- SSE buffer: frames split mid-line, mid-JSON, and across `[DONE]`
- `safeUrl`: `javascript:`, `data:`, protocol-relative, malformed input
- `isDomainExcluded`: subdomain matching, scheme and path stripping, empties
- `isLikelyGreek`: the 0.2 ratio boundary, mixed content, empty string

### Out of scope for Phase 1

`host_permissions: ["<all_urls>"]` causes Chrome to warn *"Read and change all
your data on all websites"* at install. The actual fetch targets are Groq,
YouTube, and a user-supplied SearXNG URL. Narrowing this, with
`optional_host_permissions` for SearXNG, would lower install friction
noticeably for a public listing. It is a behavioural change to the permission
model and belongs in its own pass — noted here so it is not lost.

---

## Phase 2 — Deco Noir

Applied per `deco-noir/AGENTS.md`. `deco-noir.css` and `deco-noir.js` are
vendored into the repo, not linked from a CDN — an extension cannot fetch
remote code at runtime.

### 2.1 Two decisions taken up front

**Dress levels: sidepanel `working`, settings `plain`.** AGENTS.md §1 step 4
puts a browser extension at `plain` for both. Broken deliberately for the
sidepanel only: it is the hero surface and sits open all day, so it carries
ornament; the settings page stays quiet. This is reported as a rule break per
§7, item 4.

**Typography is per-language.** Poiret One is Latin-only, and BlankStare is a
full EN/EL product — under a literal reading, every Greek panel title would
fall back to Georgia and the identity would evaporate across half the UI.
Poiret One drives Latin titles; a Greek-capable display face drives Greek ones,
selected on the existing `documentElement.lang` that `applyI18n()` already
sets. Both self-hosted as subset woff2, matching how Comfortaa is already
bundled. Comfortaa remains the body face.

### 2.2 Surfaces

**Sidepanel and settings** convert per the AGENTS.md §2 component table —
buttons to `.btn.cut-sm`, cards to the three-layer `.frame`, toggles to
`.lever`, inputs to `.field > .inwrap.cut-sm > .input`, selects to `.picker`,
the reading-level control to `.seg`, the settings tab strip to `.tabs`, status
pills to `.tag`. The existing `--accent: #e8a838` is already close to brass, so
the colourway is `brass` and the migration is mostly mechanical.

`DecoNoir.init()` is called from a script file. MV3's CSP forbids inline
`<script>` blocks.

**The floating button does not get `deco-noir.css`.** It is injected into
arbitrary third-party pages; loading a full stylesheet there risks bleeding
into the host page, and the host's own CSS can bleed back in. It is
hand-styled: the chamfer and the brass bezel by hand, inside a Shadow root so
neither side can reach the other. This keeps the identity recognisable at the
one place where the system's own install instructions do not apply.

### 2.3 Lottie icons

The twelve bundled icons have amber baked into their JSON — `lottie_light.min.js`
has no expression support, which is why HANDOVER §4e describes a baking step.
Brass is close enough to the existing amber that re-baking is likely
unnecessary. Verified against a screenshot before deciding; if a re-bake is
needed, `c.k` must remain a four-value colour array (the v0.5.0 bug was a
stroke *width* written into a stroke *colour*).

### 2.4 Verification

AGENTS.md §5 checklist, run against actual screenshots of both surfaces in both
languages. Per §5, the identity is not reported as applied without having
viewed the result — the common failure is a missing chamfer at small sizes.

---

## Risks

**Font licensing and file size.** A second display face adds bundle weight to
an extension that has kept everything local on purpose. Subset to the glyphs
actually used in titles.

**Lottie/brass mismatch.** If brass reads wrong against the baked amber icons,
a re-bake is required and the v0.5.0 bug is a live trap. Screenshot before
committing.

**Settings page regression surface.** The v0.5.0 accordion restructure is
recent and its CSS carries known duplicate-block history. Converting it to
`.frame` structures touches that same CSS. Phase 2 lands after Phase 1 is
verified so the two are separable if something breaks.

---

## Success criteria

Phase 1:
- `node --test` passes, covering all four target areas in §1.7
- A stream interrupted mid-flight surfaces an error and keeps partial text
- Starting a second request while one is streaming produces exactly one output
- Panel close and reopen preserves history
- Toggling the floating button in settings takes effect without a page reload
- No `javascript:` URL can reach an `href` or `src`

Phase 2:
- Every AGENTS.md §5 checklist item confirmed against a screenshot
- Both surfaces verified in EN and EL
- Rule breaks reported per §7
