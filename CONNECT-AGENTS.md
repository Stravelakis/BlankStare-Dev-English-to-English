# Connecting AI agents: BlankStare

## Read first

1. [HANDOFF.md](HANDOFF.md): where things stand, and the decisions not to undo.
2. [STANDARDS.md](STANDARDS.md): the house rules and where this repo differs.
3. This file.

## Setup

```bash
git clone https://github.com/Stravelakis/BlankStare-Dev-English-to-English.git
cd BlankStare-Dev-English-to-English
git config core.hooksPath githooks
```

There is no `.env` and nothing to install for the extension itself. Keys are
entered in the extension's Settings page by whoever uses it; never ask for
them and never write one into a file.

## Rules

- Work on a branch and open a PR. Never push to `main`.
- Before adding any CSS class, search `vendor/deco-noir.css` for the name. A
  collision silently restyles the panel (it happened with `.state`).
- Keep `utils/pure.js` free of `chrome`, `document`, `window` and `fetch`.
- `chrome.sidePanel.open()` must stay synchronous inside the user gesture in
  `background.js`. Awaiting anything first breaks it.
- Do not replace `createSSEParser()` with a per-chunk split. That was the bug.
- Flag anything risky, irreversible or lock-in in one line, up front.
- Update HANDOFF.md before ending a session.

## Checks

```bash
npm test                        # pure logic, Node's own test runner
node lab/shoot.mjs              # regenerate panel screenshots (headless Chrome)
cd docs && npm ci && npm run build   # docs site still builds
```

To look at the panel without loading the extension, serve the repo root and
open `lab/preview.html` (see GUIDE.md → Previewing).

## Off limits

- Never start long-lived servers from a background shell; they outlive the
  session. `lab/shoot.mjs` runs its own server and closes it.
- Nothing from the Hermes Agent install, ever (a machine-wide rule on the
  maintainer's PC).
