# Changelog

All notable changes to this project are documented here.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), versions follow [SemVer](https://semver.org/).

## [Unreleased]

## [0.7.0] - 2026-09-26

### Added
- Docs site at docs.stravelakis.com/BlankStare-Dev-English-to-English, with
  Dev / English / ELI5 reading levels, a walkthrough, and a playground that
  runs the extension's own `utils/pure.js` in the browser.
- Share image for links to the docs site.
- Screenshots in Greek and of the history drawer.
- `lab/shoot.mjs`: regenerates every panel screenshot with one command.
- The full standard document set: INSTALL, GUIDE, DEPLOY, CONNECT-AGENTS,
  STANDARDS, NOTICE, SECURITY, CODE_OF_CONDUCT, and this changelog.
- CI: tests, a docs-site build, a manifest/package version check and a
  secret scan over the whole history on every pull request.
- Secret scan on every commit (`githooks/pre-commit`), weekly Dependabot.
- `minimum_chrome_version: 116`, the first version with the side-panel
  calls BlankStare makes. Older browsers are now told so at install.

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
