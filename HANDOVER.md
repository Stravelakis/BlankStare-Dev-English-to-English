# BlankStare — Developer Handover Document
_Updated end of v0.5.0 session. Use this to brief a new Claude instance._

---

## 1. What this is

**BlankStare: Dev English to English** — a Chrome MV3 sidebar extension that
**translates** (not explains, not annotates — translates) developer documentation,
error messages, terminal output, READMEs, and config files into plain English,
so a non-developer can read the translation *instead of* the original.

- **GitHub**: https://github.com/Stravelakis/BlankStare-Dev-English-to-English
- **Creator**: Lambros Stravelakis — lambros@stravelakis.com — https://stravelakis.com
- **Ko-fi**: https://ko-fi.com/stravelakis
- **Built with**: Claude Code + Hermes agent
- **Business model**: Zero cost BYOK (Bring Your Own Key). Users supply their own free Groq API key. Optional support via Ko-fi. No subscription, never.
- **Target audience**: Vibecoders first and foremost (people building real things with AI coding tools without a traditional dev background), and secondarily anyone else who works alongside developers — designers, PMs, founders, marketers.

---

## 2. Tech stack

| Layer | Technology |
|---|---|
| Runtime | Chrome MV3, native `chrome.sidePanel` API |
| AI | Groq API (streaming chat completions), 9-model registry with auto-fallback |
| TTS | Canopylabs Orpheus-v1-english via Groq audio/speech (default), browser Web Speech API fallback |
| Video | YouTube Data API v3 (optional) |
| Search | SearXNG self-hosted (optional, becomes primary once tested working) + DuckDuckGo fallback |
| Font | Comfortaa (Greek + Latin, bundled locally as woff2) |
| Icons | 12 Lottie JSON animations (bundled, colors baked in for lottie_light.min.js) |
| Build | No build step. Pure HTML/CSS/JS. No npm, no webpack. |

---

## 3. Folder structure

```
devtranslate/
├── manifest.json          ← MV3 config, v0.5.0
├── background.js          ← Service worker (gesture-safe sidePanel coordinator)
├── content.js              ← Injected into pages (floating button, text selection)
├── content.css
│
├── sidepanel/
│   ├── sidepanel.html
│   ├── sidepanel.js
│   └── sidepanel.css
│
├── settings/
│   ├── settings.html      ← Accordion-based layout (see §5)
│   ├── settings.js
│   └── settings.css
│
├── utils/
│   ├── api.js              ← Groq text+TTS, YouTube, SearXNG/DDG, model registry
│   ├── storage.js          ← chrome.storage helpers + SETTINGS_DEFAULTS
│   └── lottie.min.js
│
├── fonts/
├── icons/
│   ├── icon16/32/48/128.png   ← New split-circle icon, June 2026 refresh
│   └── lottie/             ← 12 animated icons (5 unused ones removed in v0.5.0)
│
├── .github/ISSUE_TEMPLATE/
├── LICENSE
├── README.md
└── HANDOVER.md             ← This file
```

---

## 4. Critical architectural decisions (do not change without understanding why)

### 4a. sidePanel.open() MUST be called synchronously
`chrome.sidePanel.open()` must be the **first line** inside
`chrome.action.onClicked` or `chrome.contextMenus.onClicked`, before any `await`.
Chrome's user-gesture token expires the moment you hit the first `await`.

### 4b. Floating button only shows when panel is already open
Content script pings the side panel (`IS_PANEL_OPEN`) before showing the
floating button. Cache TTL 2500ms.

### 4c. Floating button cannot open the panel (Chrome limitation)
Content script clicks don't carry a user-gesture token to the background
worker. Right-click and the keyboard shortcut remain the reliable openers.

### 4d. Context menu must be removed when right-click is disabled
`SETTINGS_CHANGED` triggers `chrome.contextMenus.remove('blankstare-explain')`.

### 4e. Lottie icons require expression baking
`lottie_light.min.js` has no expression support, so a baking step replaces
expression refs with direct color values. **Known bug fixed in v0.5.0**: the
bake script had previously written the *stroke width* value (`16`) into the
*stroke color* (`c`) field for `icon-read.json`, making most of its strokes
render as invalid/invisible. Fixed by replacing those broken `c.k` values with
the correct light color `[0.9098, 0.9255, 0.9569, 1.0]`. If you bake new icons,
verify `c.k` is always a 4-value color array, never a bare number.

### 4f. Translation philosophy (NOT explanation)
"REWRITE the content. Never say 'This means...'. Write a TRANSLATION."

---

## 5. Settings page layout (v0.5.0 restructure)

The settings page was reorganized into accordions to cut down on scroll length.
Naming convention: top-of-section content stays visible; secondary/setup
content collapses into `<details class="section-accordion">` blocks (closed by
default). Structure, top to bottom:

1. **Language** — EN/EL toggle visible, **"Default reading level"** accordion (closed) at the end.
2. **AI Engine — Groq** — only the API key field + Test button visible.
   - Accordion: **"What you get for free, in 3 minutes and 5 steps"** — pricing, how-to-get-key, what-is-Groq, why-set-this-up.
   - Accordion: **"Tweak the Brain"** — model dropdown (9 models), auto-fallback toggle, TTS mode (Browser/Orpheus) + voice picker. **Defaults: Orpheus + Zoe voice** (changed from Browser/Tara in v0.5.0 — note this means fresh installs use the 100/day Orpheus quota by default).
3. **YouTube** — key field + Test visible; setup guide in one accordion.
4. **Web Search** — DDG and SearXNG provider cards stay visible with a **dynamic active/fallback badge** (see §6); SearXNG setup details collapse into an accordion.
5. **Trigger modes** — unchanged, fully visible (frequently adjusted).
6. **Exclude list** — the entire section is now a closed top-level accordion (`<details class="section-accordion-top">`), least-used setting.

CSS additions: `.section-accordion` / `.section-accordion-body` (nested accordions), `.section-accordion-top` / `.section-accordion-top-summary` (whole-section accordion, used only for Exclude list).

---

## 6. Search provider active-state indicator (new in v0.5.0)

Previously the DDG card always showed "Active by default" with a hardcoded
green border, even after a working SearXNG URL was saved — confusing, since
`searchWeb()` in `utils/api.js` actually tries SearXNG first whenever the URL
is set, falling back to DDG only on failure.

Fixed with `updateSearchActiveUI()` in `settings.js`:
- On load: if a SearXNG URL was already saved, assume it's active (badge/border move to SearXNG, DDG becomes "Fallback only").
- Typing a *new* URL does **not** flip the badge — only a successful **Test** click does (`forceActive: ok` in `runTest('searxng')`).
- Clearing the URL field immediately reverts to DDG-active.
- An inline note (`#searxng-active-note`) explains the fallback-only-on-failure behavior once SearXNG is active.

IDs to know: `search-card-ddg`, `search-card-searxng`, `search-badge-ddg`, `search-badge-searxng`, `searxng-active-note`.

---

## 7. Model registry (in utils/api.js) — unchanged from v0.4.0

```
llama-3.1-8b-instant   → 14,400/day (default, highest quota)
llama-4-scout-17b      → 1,000/day  (good speed + 30K TPM)
qwen/qwen3-32b         → 1,000/day  (60 RPM fastest)
llama-3.3-70b          → 1,000/day  (best balance)
qwen/qwen3.6-27b       → 1,000/day
openai/gpt-oss-20b     → 1,000/day
openai/gpt-oss-120b    → 1,000/day
compound-mini          → 250/day    (no token limit)
compound                → 250/day    (no token limit)
```

---

## 8. What changed in this v0.5.0 session

- Fixed broken `icon-read.json` Lottie stroke colors (see §4e) — this was the "blue/invisible icon" bug reported on the Web Search section.
- Replaced extension icon set (16/32/48/128) with an improved transparent-background PNG supplied by Ak.
- Restructured `settings.html`/`settings.css`/`settings.js` into the accordion layout described in §5.
- Added dynamic SearXNG/DDG active-provider indicator (§6).
- Changed default TTS settings: `ttsMode: 'orpheus'`, `orpheusVoice: 'zoe'` (was `'browser'`/`'tara'`).
- Rewrote the About tab to lead with vibecoders as the primary audience.
- Removed 6 unused Lottie JSON files (`icon-collapse`, `icon-copy`, `icon-expand`, `icon-fullpage`, `icon-jargon`, `icon-powerhouse`) — none were referenced anywhere in the codebase.
- Removed dead code: a `.guide-open` CSS class was being toggled by JS but had no matching style (no-op); replaced with a working `open` attribute on the new Groq info accordion when no API key is set.
- Cleaned up duplicate/conflicting CSS blocks at the end of `settings.css` (duplicate `.about-body`, `.howto-extras`, `.about-*` rules with conflicting values — the later ones were silently overriding the earlier ones).
- Bumped version to 0.5.0 across `manifest.json`, all JS file header comments, and the About tab.

---

## 9. Known tradeoffs / things to watch

- **Orpheus-by-default** burns the 100/day TTS quota faster than the old Browser default. This was an explicit request, but worth flagging to users who hit the limit and don't know why — consider a one-time toast or note if it becomes a support issue.
- Model dropdown option labels are long (include rate limits inline) — verify they don't clip on narrow viewports/zoom levels.

---

## 10. Bigger feature backlog (unchanged, in rough priority order)

1. Screenshots for GitHub README
2. Voice picker in the panel itself (not just settings)
3. "What do I need to know first?" prereq mode
4. Onboarding flow — first install opens How To Use tab
5. Image/screenshot explain (Groq vision)

### Next project idea (unchanged):
A **Settings Support Extension** — same BYOK architecture, specialized for
complex settings pages (Open WebUI, LibreChat, Hermes, Notion, Gemini,
NotebookLM). Could be BlankStare v2.0 or a separate extension.

---

## 11. How to install for development (load unpacked)

1. Extract the zip / clone the repo
2. Chrome → `chrome://extensions` → enable Developer mode
3. Click "Load unpacked" → select the BlankStare folder
4. Click the icon → Settings opens → add Groq API key → Test → Save
5. Right-click any selected text → "Explain with BlankStare" to test

---

## 12. How to push to GitHub (for Lambros)

```powershell
git add .
git commit -m "describe what changed"
git push
```
If prompted: username = `Stravelakis`, password = Personal Access Token (ghp_...)
Get token: GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic) → New token → tick `repo` → Generate

---

## 13. License

Source Available with Attribution. Free personal use. Forks must credit
Lambros Stravelakis with link to stravelakis.com. No commercial use without
written permission. Contact: lambros@stravelakis.com

---

_End of handover. Good luck, next Claude!_
