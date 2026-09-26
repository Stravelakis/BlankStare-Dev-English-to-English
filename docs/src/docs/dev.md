## Dev

BlankStare is a Manifest V3 Chrome extension with **no build step**. Load the folder unpacked and it runs; `npm test` exists only for the Node test suite.

### Architecture

| Part | File | Job |
|---|---|---|
| Service worker | `background.js` | Context menu, keyboard commands, opens the side panel. `chrome.sidePanel.open()` must run synchronously inside the user gesture, so nothing is awaited before it. |
| Content script | `utils/pure.js`, `content.js` | Tracks the selection and draws the floating button inside a **closed shadow root**. The host element pins its own layout inline at `!important`, because the page's CSS beats `:host` by spec. |
| Side panel | `sidepanel/*` | Streaming UI, i18n (EN/EL), history, TTS, glossary, follow-ups. |
| Settings | `settings/*` | Keys, model, voice, search provider, triggers, exclude list. |
| API layer | `utils/api.js` | Groq chat (SSE), Groq TTS (Orpheus), YouTube Data v3, SearXNG with DuckDuckGo fallback. |
| Pure logic | `utils/pure.js` | SSE reassembly, URL filtering, domain exclusion, Greek detection, prompt building. Never touches `chrome`, `document`, `window` or `fetch`. |

### Streaming

`explainWithGroq({ apiKey, model, systemPrompt, userPrompt, maxTokens, autoFallback, signal, onChunk, onDone, onError, onStatus })`.

- **Frames, not chunks.** `createSSEParser()` buffers the incomplete tail of each network read. Splitting each chunk on `\n` on its own silently drops any `data:` line that straddles two reads.
- **Cancellation.** Three independent `AbortController` lanes in the panel (translation, glossary, follow-up question), so a new request replaces its own predecessor only.
- **Failure mid-stream** returns the partial text through `onDone` with a notice, never a hung cursor.
- **Token budget per mode:** 700 for normal and rephrase, 1400 for "go deeper" and full-page.
- **Auto-fallback** walks a nine-model registry on HTTP 429.

### Permissions

- `host_permissions`: `https://api.groq.com/*`, `https://www.googleapis.com/*`.
- `optional_host_permissions`: `http://*/*`, `https://*/*`, used for one origin only: the user's SearXNG server, requested by `chrome.permissions.request` from the settings **Test** button (it needs a gesture). `searchWeb()` checks `chrome.permissions.contains` first.
- `content_scripts.matches` is `<all_urls>`, which alone causes Chrome's "read and change all your data" warning. It stays, because the button must already exist when a selection happens.
- Every remote string that becomes an `href` or `src` passes `safeUrl()` (http/https only).

### Storage

`chrome.storage.sync` for settings, `chrome.storage.session` for the last 20 results (survives the panel closing, cleared with the browser). The panel listens with `storage.session.onChanged`; no polling.

### Look

Deco Noir, vendored in `vendor/`. Panel `data-dress="working"`, settings `plain`. Display face per glyph via `unicode-range`: Poiret One (Latin) and GFS Didot (Greek), all self-hosted in `fonts/`.

### Test and preview

```bash
npm test                          # node --test, pure logic
npx http-server . -p 8123 -c-1    # then open lab/preview.html
```
