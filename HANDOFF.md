# Handoff: BlankStare

_Last updated: 2026-11-20 · by: Claude Code · version: v0.8.0 (released 20 Nov 2026)_

## In one paragraph

A Chrome side-panel extension that rewrites developer text into plain English
or Greek. v0.8.0 replaced the fixed Groq model list (Groq shut down 7 of its 9
models, which broke the extension for everyone) with a self-correcting list
rebuilt daily from The Nein and each provider's own catalogue. Works with no
key (OVHcloud), better with a free Gemini or Groq key. Released on GitHub;
not on the Chrome Web Store yet. Plan and sources: PLAN-v0.8.md.

## Current state (v0.8.0)

- **Released:** PR #7 merged, tag `v0.8.0`, GitHub Release with the
  English / Devenglish table (`docs/release-notes/v0.8.0.md`).
- **Release gate (STANDARDS §2):** all 8 passed. Full-repo audit (32 findings,
  all fixed), history secret scan clean, docs on the current theme with review
  stamps (Ak reviewed 20/11), Lighthouse locally 89–99 / 100 / 100 / 100,
  smoke test green on GitHub (real no-key answer in 4s), fresh screenshots.
- **Checks on GitHub:** `CI` (tests, version match, docs build, gitleaks),
  `smoke` (pinned to ubuntu-24.04: Playwright 1.57 cannot install Chromium
  on 26.04), `lighthouse` after every docs deploy, `Deploy docs site` on tags.
- **Tested in a real Chromium with the extension loaded:** no key → OVH;
  free Gemini key → gemini-3.8-live with voice; Groq key → qwen3.8 (2.4s); a
  dead model is skipped for the day; checklist / prerequisites / rephrase;
  first-run setup and key test (6.4s). `npm test`: 61 pass.
- **Not driven by any test:** the right-click menu and Alt+Shift+E after the
  `tabs` / `activeTab` permissions were removed. Try both in Chrome once.
- **Look:** "brass on black" (Ak, 20/11; the Deco Noir name is retired; the
  vendored stylesheet in `vendor/` keeps its file name). Settings = gradient
  blinds; panel = glowing edge, decode, sparks. Phase 2 teaser removed.
- **Google keys come in two shapes** (`AIza…` and `AQ.…`); only length is
  checked, the real test is asking Google.
- **Gemini free tier:** Google may use prompts to improve products and human
  reviewers may read them (ai.google.dev/gemini-api/terms). Stated in the
  privacy page and on the Gemini card.
- **Known issue:** OVH's no-key lane slows down instead of refusing under
  heavy use from one internet address; an answer can take 90–170s. Rotating
  models and a 20s first-word timeout soften it; a free key avoids it.
- **Keys for testing:** only free keys from Blacksmith's list (`crews.py`
  PROVIDERS). `BLACKSMITH_THE_NEIN_GEMINI_KEY` is proven free tier. Never
  `AK1_GEMINI_API_KEY` / `GEMINI_API_KEY` (paid / no free tier).
- **Tools:** `lab/shoot/shoot.mjs` (every screenshot, real extension),
  `tests/smoke/smoke.mjs`, `lab/looks.html` (design comparison), effects in
  `utils/fx.js`.
- **Docs theme drift:** this repo's `docs/src/components/DotField.astro` starts
  the dot background on first move (speed 75 → 89–99). The shared
  `repo standards/docs-theme` does not have that yet.

## Next steps, in order

1. Ak tries the right-click menu and Alt+Shift+E in a real Chrome.
2. Chrome Web Store listing: images in `store/`; privacy answers must list
   OVHcloud, Google (free-tier review rule), Groq and The Nein; zip with the
   `git archive` line in DEPLOY.md.
3. Copy the DotField speed fix into the shared docs theme.

## Open questions

- The author's email stays in README and LICENSE until stravelakis.com has a
  working contact page (none live as of 2026-09-26).
- Chrome Web Store: LICENSE says it is published there. Is it? If not, LICENSE
  should say "intended for".

---

# Reference (the full developer notes)

> **HISTORIC (v0.5 to v0.7). Superseded by v0.8 wherever it conflicts.** Everything
> below was written for the Groq-only, bring-your-own-key extension. The "Current
> state" section at the top of this file, `manifest.json` and the code are the
> truth. Known out-of-date items below are struck through (~~like this~~) or
> marked "v0.8:". Kept as history, not as a description of the code.
>
> What v0.8 changed in short: works with no key (OVHcloud anonymous AI first,
> optional free Gemini and Groq keys); a daily model roster built from The Nein
> plus each provider's own model list (`utils/api.js`, `modelRoster` in
> `chrome.storage.local`), so there is no fixed 9-model list or default model;
> no SearXNG (web search is a DuckDuckGo link); no `content.css`, no
> `optional_host_permissions`, no `chrome.permissions` calls; Settings rebuilt as
> a 5-step setup plus cards (You, Your free AI, Voice, How you open it, Extras);
> voice default is "Best available" (`ttsMode: 'auto'`).

## BlankStare — developer notes
_Updated end of v0.6.0 session. Use this to brief a new Claude instance. HISTORIC, see the note above._

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
- **Business model**: Zero cost. ~~BYOK: users supply their own free Groq API key.~~ v0.8: works with no key; free Gemini or Groq keys are optional. Optional support via Ko-fi. No subscription, never.
- **Target audience**: Vibecoders first and foremost (people building real things with AI coding tools without a traditional dev background), and secondarily anyone else who works alongside developers — designers, PMs, founders, marketers.

---

## 2. Tech stack

| Layer | Technology |
|---|---|
| Runtime | Chrome MV3, native `chrome.sidePanel` API |
| AI | ~~Groq API, 9-model registry~~ v0.8: OVHcloud (no key), Google Gemini and Groq (optional free keys); a daily ranked model roster with fallback |
| TTS | v0.8: Best available (Gemini Live voice, Orpheus via Groq for English, or the browser voice). Was: Orpheus via Groq by default |
| Video | YouTube Data API v3 (optional) |
| Search | ~~SearXNG self-hosted + DuckDuckGo fallback~~ v0.8: no SearXNG; "Search" opens DuckDuckGo in a new tab |
| Font | Comfortaa (Greek + Latin, bundled locally as woff2) |
| Icons | 12 Lottie JSON animations (bundled, colors baked in for lottie_light.min.js) |
| Build | No build step. Pure HTML/CSS/JS. No npm, no webpack. |

---

## 3. Folder structure

```
devtranslate/
├── manifest.json          ← MV3 config (version: see manifest.json)
├── background.js          ← Service worker (gesture-safe sidePanel coordinator)
├── content.js              ← Injected into pages (floating button, text selection)
├── ~~content.css~~          ← does not exist (v0.8); content.js styles its own button
│
├── sidepanel/
│   ├── sidepanel.html
│   ├── sidepanel.js
│   ├── sidepanel.css
│   └── deco-init.js        ← v0.8
│
├── settings/
│   ├── settings.html      ← Accordion-based layout (see §5)
│   ├── settings.js
│   └── settings.css
│
├── utils/
│   ├── api.js              ← v0.8: OVH/Gemini/Groq text, voices, YouTube, model roster (no SearXNG)
│   ├── storage.js          ← chrome.storage helpers + SETTINGS_DEFAULTS
│   ├── pure.js, fx.js      ← v0.8: tested pure logic; effects
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
└── HANDOFF.md              ← This file
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

## 5. Settings page layout (v0.5.0 restructure) — SUPERSEDED

> v0.8 Settings sections are: **You** (Language, How simple, About you), **Your free AI** (OVHcloud / Google Gemini / Groq cards, Today's models, Try first), **Voice** (Best available / Orpheus / Browser voice), **How you open it** (Right-click menu, Floating button, Jargon list under each answer), **Extras** (YouTube key, Stay quiet on these sites) and **Run the setup again**. The accordion layout, Web Search cards, "Trigger modes" and "Exclude list" below no longer exist.

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

## 6. Search provider active-state indicator (new in v0.5.0) — REMOVED in v0.8 (no SearXNG)

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

## 7. Model registry (in utils/api.js) — HISTORIC, replaced in v0.8

> v0.8 has no fixed list and no `llama-3.1-8b-instant` default. `utils/api.js` builds a ranked roster each day from The Nein, each provider's own model list and the optional "Try first" pin; failed models are benched for the day. The list below is the v0.4 to v0.7 Groq registry.

```
llama-3.1-8b-instant   → 14,400/day (v0.4-v0.7 default; not a default in v0.8)
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

- ~~**Orpheus-by-default**~~ (v0.8 default is "Best available")  burns the 100/day TTS quota faster than the old Browser default. This was an explicit request, but worth flagging to users who hit the limit and don't know why — consider a one-time toast or note if it becomes a support issue.
- Model dropdown option labels are long (include rate limits inline) — verify they don't clip on narrow viewports/zoom levels.

---

## 10. Bigger feature backlog (unchanged, in rough priority order)

1. ~~Screenshots for GitHub README~~ — done, see `screenshots/` and 14f for how
   they are produced
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

## 12. How changes get in

Branch → commit → push → pull request → merge (`gh pr merge`). Never a direct
push to `main`, never the GitHub web editor. Run `git config core.hooksPath
githooks` once per clone: the pre-commit hook blocks any commit that contains a
secret. Log in to git with `gh auth login`; no personal access tokens in notes.

---

## 13. License

Source Available with Attribution. Free personal use. Forks must credit
Lambros Stravelakis with link to stravelakis.com. No commercial use without
written permission. Contact: lambros@stravelakis.com

---

_End of handover. Good luck, next Claude!_

---

## 14. v0.6.0 — hardening pass and Deco Noir (read this before touching CSS)

### 14a. The eleven defects fixed

Four streaming faults in `utils/api.js` shared one root cause: a network
chunk was being treated as a message frame.

- **SSE frames split across chunk boundaries were silently dropped.** Each
  chunk was split on `\n` independently, so a `data:` line straddling two
  reads failed `JSON.parse` and was swallowed by a bare `catch`. Translations
  lost words with no error anywhere — it read as "the AI dropped a word".
  `createSSEParser()` in `utils/pure.js` now holds the incomplete tail back.
  **Do not "simplify" this back to a per-chunk split.**
- **The read loop had no try/catch**, so a connection dropped mid-stream threw
  past both `onDone` and `onError` and left the cursor blinking forever.
  Partial text is now returned and stays on screen with an explanation.
- **Nothing could be cancelled.** `explainWithGroq` takes an `AbortSignal`.
  The panel runs three lanes — translation, glossary, follow-up — so a second
  request replaces its predecessor without cancelling the one the reader is
  watching.
- **`max_tokens` was hardcoded at 700**, so "More detail" truncated at the
  same budget as the first pass. Now per-mode: 1400 for deeper/fullpage.

Security: SearXNG result URLs reached `href` unvalidated. `safeUrl()` gates
every remote string that becomes a URL; `embedVideo()` validates the id it
interpolates into a path.

Also: the glossary moved into `api.js`; history persists to
`chrome.storage.session` so it survives the panel closing; a 500ms polling
loop became `chrome.storage.session.onChanged`; the content script tracks
`triggerFloating`/`excludeList` live instead of needing a page reload; the
version comes from `chrome.runtime.getManifest().version`.

### 14b. Tests — there is still no build step

`utils/pure.js` holds the side-effect-free logic and ends with a guarded
`module.exports`, so it loads as a plain `<script>` in the extension and as a
CommonJS module under `node --test`. `npm test` runs the cases (39 as of v0.7.0). Anyone without
Node still loads unpacked exactly as before.

**Nothing in `utils/pure.js` may touch `chrome`, `document`, `window` or
`fetch`.** That constraint is what keeps it testable.

### 14c. Deco Noir

The identity system from `deco-noir/` is vendored into `vendor/`. Read
`deco-noir/AGENTS.md` before changing any styling — it carries MUST/NEVER
rules and a list of ideas already tried and rejected.

- **Side panel** is `data-dress="working"` — a documented departure. Deco Noir
  puts an extension surface at `plain`; the panel is the hero surface and sits
  open all day, so it carries ornament. Settings stays `plain`.
- **Ground and grain are off** on both surfaces. The panel streams text; an
  animated background behind live output is noise and would run all day.
- **`.state` was renamed to `.panel-state`.** Deco Noir defines `.state` as a
  switch's ON/OFF readout — inline-flex, uppercase, letter-spaced, display
  face — and BlankStare had it on all five full-panel sections. Loading the
  system silently restyled every state screen and pushed the display face onto
  body copy. **Before adding any class name, check it against
  `vendor/deco-noir.css`.** The remaining overlaps (`.btn`, `.btn-sm`, `.tab`)
  are the intended conversions.
- **Typography is per-language.** Poiret One carries no Greek glyphs, so
  `fonts/display.css` pairs it with GFS Didot for Greek and lets
  `unicode-range` pick per glyph. Both must be self-hosted — a CDN link in an
  extension fails silently to a serif.
- **The floating button gets none of this.** It is injected into every site on
  the web. It lives in a closed shadow root with hand-written styles, and the
  host element pins its layout inline at `!important` because the host is an
  ordinary div in the page's DOM that the site's own `div` rules match. A
  `:host` rule does not help — the outer document beats `:host` by spec.

### 14d. Previewing without loading the extension

`lab/preview.html` renders the real panel markup and stylesheet with the
extension APIs stubbed, with buttons for state, colourway, dress and language.
`lab/button-preview.html` is the floating button's isolation test against a
deliberately hostile host page. Serve the repo root over http and open them:

```
npx http-server . -p 8123 -c-1
```

### 14e. Still outstanding

- **Display fonts are bundled** (24KB total): `poiret-one-latin-400-normal.woff2`
  plus `gfs-didot-greek-400/greek-ext-400`. Note Cormorant was the original plan
  and was wrong — it ships no Greek subset at all. If you ever swap the Greek
  face, verify the subset exists before wiring it up:
  `ls node_modules/@fontsource/<face>/files | grep greek`.
- **Screenshots have now been reviewed**, via headless Chrome (see 14f). Two
  defects were found that way that every computed-style probe had passed:
  a native `<select>` painting the platform's grey border and arrow over the
  chamfer, and grey section headings — which Deco Noir §4 lists explicitly among
  the things already tried and rejected. Both fixed. The rest of the §5
  checklist, verified by probing computed styles:

  | §5 item | Result |
  |---|---|
  | Double brass rule, two chamfered corners only | 2 gradients, at `0% 0%` and `100% 100%` |
  | Every button a brass bezel, no green/red frames | no non-brass frames found |
  | Switch shows one state word, lamp lights | switch carries no text of its own |
  | Sliders use the same paddle | n/a — this UI has no sliders |
  | Section titles brass + deco face, controls not | display face on 0 controls |
  | Status pills good/warn/crit, never the accent | error resolves `--crit`, not `--accent` |
  | Nothing scrolls the page body horizontally | no horizontal overflow |
  | Keyboard focus visible on every control | 49 interactive elements, global `:focus-visible` |
  | `data-dress="plain"` still reads as the product | `--cut` and clip-path identical across all three levels; ornament steps 1 → 0.55 → 0 |
  | Ground grain irregular / retints | n/a — ground is off on both surfaces |
  | No `--panel-a/-b`, `--ink-dim`, `--ink-faint` | none present |
  | `.prose` styles long-form | the About and How-to-use bodies keep their existing bespoke classes; adding `.prose` would fight them |

  Colourways were also checked: all four resolve both `--accent` and the
  load-bearing `--accent-2`. What remains unverified is purely visual judgement
  — whether it actually looks right.
- **`host_permissions` is now narrowed** to `api.groq.com` and
  `www.googleapis.com` (v0.7; see v0.8 list below). ~~The self-hosted SearXNG origin is requested at runtime
  via `optional_host_permissions` / `chrome.permissions.request`.~~ v0.8: that
  is gone. `host_permissions` is now a fixed list (OVHcloud, Google Gemini,
  Groq, `www.googleapis.com`, and The Nein at stravelakis.com/wp-json/nein/);
  there is no `optional_host_permissions` and no `chrome.permissions` call.

  Note this does **not** remove the "Read and change all your data on all
  websites" install warning: `content_scripts.matches` is `<all_urls>`, which
  generates that warning on its own, and the floating button needs the script
  present on any page the user selects text on. Narrowing was worth doing for
  least privilege, not for install friction. Removing the warning would mean
  injecting on demand via `activeTab` + `chrome.scripting`, which would break
  select-to-explain — the button has to already be there when the selection
  happens.

### 14f. Taking a screenshot

The in-app Browser pane only composites frames while it is actually displayed,
so `computer{action:"screenshot"}` times out whenever it is hidden — which it
was for this entire project. Headless Chrome does not care:

```bash
"C:/Program Files/Google/Chrome/Application/chrome.exe"   --headless=new --disable-gpu --hide-scrollbars --force-device-scale-factor=2   --window-size=900,1500 --virtual-time-budget=6000   --screenshot="out.png" "http://localhost:8123/lab/preview.html"
```

**Shoot `lab/preview.html`, not `sidepanel/sidepanel.html`.** Headless lays the
page out wider than `--window-size` and then crops to it, so a narrow window
looks like a horizontal-overflow bug that is not real — it fooled this session
twice. `lab/preview.html` pins the panel to 380px inside its own frame, so a
wide window renders it at true side-panel width. To check actual overflow, use
the browser tool's `resize_window` and measure `scrollWidth` instead.

Two things worth knowing: the visual defects found this way were invisible to
token probes, and two of the four "bugs" spotted by eye turned out to be
rendering artefacts. Measure before fixing what a screenshot appears to show.

## 15. v0.7.0 — repo standards

- **Doc set** per the shared standards: INSTALL, GUIDE, DEPLOY, STANDARDS,
  CONNECT-AGENTS, NOTICE, SECURITY, CODE_OF_CONDUCT, CHANGELOG. This file was
  renamed from HANDOVER.md.
- **CI** (`.github/workflows/ci.yml`): tests, manifest/package version match,
  docs build, gitleaks over full history.
- **Docs site** in `docs/`, the shared theme unchanged except the content
  files. The playground imports `utils/pure.js` with `?raw` and runs it as-is,
  which is only possible because of the no-browser-globals rule in §14b.
- **Screenshots (v0.8):** `cd lab/shoot && npm install && node shoot.mjs`
  loads the real extension in Playwright's Chromium (branded Chrome no longer
  loads unpacked extensions from the command line), asks the free no-key AI
  for real answers, and writes `screenshots/`, `docs/public/screenshots/`
  (incl. the carousel `slide-*.png`) and `store/` (1280×800). About 5 min,
  most of it waiting on OVH. `node shoot.mjs settings` redoes Settings and the
  frames only. `lab/shoot/` has its own package.json so the extension stays
  dependency-free. `node docs/social/render.mjs` builds only the share card.
- **Fixed:** Greek read-aloud went to the English-only Orpheus model; the
  SearXNG setup text named a CORS option SearXNG doesn't have (SearXNG itself was later removed in v0.8); a doubled full stop in the system prompt.
- `minimum_chrome_version` is 116 (the side-panel calls used).
