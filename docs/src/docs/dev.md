## Dev

BlankStare is a Manifest V3 Chrome extension with **no build step**. Load the folder unpacked and it runs; `npm test` exists only for the Node test suite.

### Architecture

| Part | File | Job |
|---|---|---|
| Service worker | `background.js` | Context menu, keyboard commands, opens the side panel. `chrome.sidePanel.open()` must run synchronously inside the user gesture, so nothing is awaited before it. |
| Content script | `utils/pure.js`, `content.js` | Tracks the selection and draws the floating button inside a **closed shadow root**. The host element pins its own layout inline at `!important`, because the page's CSS beats `:host` by spec. |
| Side panel | `sidepanel/*` | Streaming UI, i18n (EN/EL), history, TTS, glossary, follow-ups. |
| Settings | `settings/*` | First-run setup, keys with a live test, today's model list and pin, voice, triggers, exclude list. Saves on change. |
| API layer | `utils/api.js` | Daily model roster (The Nein + provider catalogues), `generate()` failover across OVHcloud / Google Gemini / Groq (SSE and the Gemini Live WebSocket), Groq TTS (Orpheus), YouTube Data v3. |
| Pure logic | `utils/pure.js` | SSE reassembly, URL filtering, domain exclusion, Greek detection, prompt building. Never touches `chrome`, `document`, `window` or `fetch`. |

### Streaming

`generate({ settings, mode, systemPrompt, userPrompt, image, maxTokens, temperature, signal, onChunk, onModel, onStatus, onDone, onError })`.

- **Frames, not chunks.** `createSSEParser()` buffers the incomplete tail of each network read. Splitting each chunk on `\n` on its own silently drops any `data:` line that straddles two reads.
- **Cancellation.** Three independent `AbortController` lanes in the panel (translation, glossary, follow-up question), so a new request replaces its own predecessor only.
- **Failure mid-stream** returns the partial text through `onDone` with a notice, never a hung cursor.
- **Token budget per mode** (room for models that think first): 4096 for normal, rephrase and follow-ups, 8192 for "go deeper" and full-page, 3072 prerequisites, 6144 checklist.
- **Failover** walks today's ranked roster: a missing model rests 24h, a busy one (429/503, or no first word in 20s keyless / 60s keyed) 60s, a refused key benches its provider for 24h.

### Permissions

- `host_permissions`: the OVHcloud AI endpoint, `generativelanguage.googleapis.com`, `api.groq.com`, `www.googleapis.com` (YouTube) and The Nein's model list on `stravelakis.com`. No optional permissions.
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
