## Stack

A Manifest V3 Chrome extension in plain JavaScript. **No build step and no
runtime dependencies**; `package.json` exists only so `npm test` has a home.

```bash
git clone https://github.com/Stravelakis/BlankStare-Dev-English-to-English.git
# chrome://extensions → Developer mode → Load unpacked → the folder
npm test        # Node's built-in test runner over utils/pure.js
```

## Layout

| File | Job |
|---|---|
| `background.js` | service worker; opens the side panel inside a user gesture |
| `content.js` | selection and the floating button, in a closed shadow root |
| `sidepanel/` | the panel: streaming, i18n, history, voice |
| `settings/` | three tabs: Settings · How to use · About |
| `utils/pure.js` | testable logic: SSE frame reassembly, URL filtering, prompts |
| `utils/api.js` | every external call: Groq, YouTube, SearXNG |
| `utils/storage.js` | `chrome.storage` helpers and defaults |

## Calls it makes

- **Groq** (required, free key): streamed chat completions. Auto-fallback
  walks nine free models when one returns a rate limit.
- **YouTube Data API v3** (optional key): inline video search.
- **SearXNG** (optional, self-hosted): web search. Its origin is unknown in
  advance, so pressing **Test** asks Chrome for that one origin at runtime;
  declined, it falls back to DuckDuckGo.

`host_permissions` cover Groq and YouTube only — no blanket site access.

## Look

The Deco Noir identity is vendored in `vendor/`, never loaded from a CDN: an
extension cannot fetch remote code, and a failed font load degrades silently.
Preview the panel without loading the extension:

```bash
npx http-server . -p 8123 -c-1   # then open lab/preview.html
```

## Licence

Source available with attribution; no commercial use without permission.
See [LICENSE](https://github.com/Stravelakis/BlankStare-Dev-English-to-English/blob/main/LICENSE).
