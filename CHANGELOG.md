# Changelog

All notable changes to this project are documented here.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), versions follow [SemVer](https://semver.org/).

## [Unreleased]

## [0.8.0] - 2026-11-19

### Added
- Works with no key: OVHcloud's free, account-free AI is the default.
- Optional free Google Gemini key (Gemini 3.8 Live, Gemma 4), with answers
  read aloud in Gemini's own voice. Groq stays as the fastest option.
- Self-correcting model list: on the first use each day BlankStare reads The
  Nein and each provider's own model list. Gone models are skipped for the
  day, busy ones rest a minute, a refused key sets its provider aside.
- First-run setup in Settings: five steps, with a real key test that takes
  seconds. Can be run again from Settings.
- New Settings page: animated brass blinds behind frosted cards, settings
  save by themselves, today's model list with an optional "Try first" pin.
- Side panel: a brass light runs around the answer while it is written,
  symbols settle into "Translating…" until the first word, new paragraphs
  fade in once, a follow-up box with suggestion chips and sparks.
- Paste a screenshot (Ctrl+V) to have it explained.
- "What do I need first?" and "Do it with me" (a checklist you tick off).
- Commands in copy boxes, numbered steps that keep their numbers, quoted
  messages shown as quotes, the model that answered shown under each answer,
  today's count on the welcome screen.
- New screenshots, carousel slides and five 1280×800 Chrome Web Store images,
  all from the real extension with real answers (`lab/shoot/shoot.mjs`,
  which replaces `lab/shoot.mjs`).

### Changed
- Prompts rewritten for accuracy: exact commands kept, numbers and warnings
  kept, the AI says when it is unsure, page text cannot give it instructions.
  Follow-up questions use general knowledge when the page does not say.
- Privacy policy covers OVHcloud, Google (including its free-tier review
  rule), Groq and The Nein.

### Removed
- SearXNG support. Web search is a DuckDuckGo link.
- The hardcoded Groq model list, the model dropdown and "Auto-fallback".

### Fixed
- The Groq key test and translations failed because Groq shut down the
  models v0.7 relied on.
- Google keys in the newer `AQ.` format were not accepted.

## [0.7.0] - 2026-09-26

### Added
- Docs site at docs.stravelakis.com/BlankStare-Dev-English-to-English, with
  Dev / English / ELI5 reading levels, a walkthrough, and a playground that
  runs the extension's own `utils/pure.js` in the browser.
- Share image for links to the docs site.
- Privacy policy page on the docs site, for a Chrome Web Store listing.
- Screenshots in Greek and of the history drawer.
- `lab/shoot.mjs`: regenerates every panel screenshot with one command.
- The full standard document set: INSTALL, GUIDE, DEPLOY, CONNECT-AGENTS,
  STANDARDS, NOTICE, SECURITY, CODE_OF_CONDUCT, and this changelog.
- CI: tests, a docs-site build, a manifest/package version check and a
  secret scan over the whole history on every pull request.
- Secret scan on every commit (`githooks/pre-commit`), weekly Dependabot.
- `minimum_chrome_version: 116`, the first version with the side-panel
  calls BlankStare makes. Older browsers are now told so at install.

### Removed
- The "Keep open" setting. It was saved but did nothing; the old saved value
  is cleared on update.

### Fixed
- SearXNG setup told people to set a CORS option SearXNG doesn't have.
  It now gives the real requirement: JSON output turned on.
- In Greek, read-aloud sent Greek text to the English-only Orpheus voice.
  Greek now always uses the computer's Greek voice.
- The AI's instructions described the reader with a doubled full stop.
- README screenshots showed the test harness's toolbar.

### Changed
- `HANDOVER.md` renamed to `HANDOFF.md`, to match every other repo.
- `package-lock.json` is no longer git-ignored (the docs site needs it).

## [0.6.0] - 2026-08-18

### Fixed
- Words silently lost when a reply arrived split across network chunks.
- A connection dropped mid-reply left the panel spinning forever; the partial
  answer is now kept.
- Requests could not be cancelled; a new one now replaces the old.
- "Go deeper" was cut off at the same length as the first answer.
- Search results could put unsafe links into the panel.
- The floating button could be restyled by the page it sat on.

### Changed
- Deco Noir look for the panel and settings, Greek and Latin display faces.
- Asks for access to Groq and YouTube only; a private search server is
  requested by name when tested.
- History survives the panel closing.

### Added
- Test suite (`npm test`).

## [0.5.0] - 2026-06-30

### Changed
- Settings reorganised into folding sections; search provider shows which
  one is active. Orpheus voice by default. Unused icons and dead code removed.
