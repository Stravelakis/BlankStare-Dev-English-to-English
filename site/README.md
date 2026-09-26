# docs-theme

The shared docs-site theme for every published repo (see `STANDARDS.md` §7 in repo-standards).

Dark, animated, in the Stravelakis logo colors: React Bits Dot Field backgrounds (page and sidebar), a Dev / English / ELI5 reading-level switch under the project name, animated menu with section tracking, tilt cards, an autoplay carousel, and an optional sandboxed playground.

One codebase. A project without a real playground sets `playground.enabled: false`; nothing else changes.

## Use it in a project

1. Copy this folder into the repo (root, or a subfolder like `/docs`).
2. Edit `site.config.ts`: name, description, repo URL, favicon, playground on/off, background settings.
3. Put the three reading levels in `src/docs/dev.md`, `plain.md`, `eli5.md`. At release time Claude generates these; they are not hand-written.
4. Put real screenshots in `public/` and pass them to `<Carousel slides={...} />` in `src/pages/index.astro`.
5. In `astro.config.mjs`, set `site` and `base` to the GitHub Pages address. Stravelakis repos: `site: 'https://docs.stravelakis.com'` (the org's Pages domain), `base: '/repo-name'`.
6. **Share card.** Put a 1200x630 PNG in `public/` (e.g. `og-image.png`: brand art plus the project name and a one-line pitch) and set `seoTitle`, `socialImage` and `socialImageAlt` in `site.config.ts`. Without it, a shared link shows no image. After deploying, refresh the cached preview with LinkedIn Post Inspector or Facebook's Sharing Debugger. Worked example: `scripts/social/` in Stravelakis/mystory renders one from HTML with Electron.
7. `npm install`, then `npm run dev` to preview.
8. Deploys run from `.github/workflows/deploy.yml` on every `v*` tag. Turn on Pages once: repo Settings → Pages → Source: GitHub Actions. Then allow tags to deploy: Settings → Environments → `github-pages` → add a deployment rule for tag `v*`. Out of the box only `main` may deploy, so the first tag's deploy is rejected. If the theme is in a subfolder, see the note at the top of the workflow.

## What's where

| Path | What |
|---|---|
| `site.config.ts` | the only file most projects touch |
| `src/layouts/DocsLayout.astro` | page shell, SEO tags, page background, scroll reveal |
| `src/components/Sidebar.astro` | brand, reading-level switch, menu, author links, sidebar background |
| `src/components/VernacularSwitcher.astro` / `VernacularPanels.astro` | the Dev / English / ELI5 switch and its panels (choice is remembered) |
| `src/components/FeatureCards.astro` | tilt cards |
| `src/components/Carousel.astro` | autoplay carousel: arrows, dots with progress, keyboard, swipe |
| `src/components/Playground.astro` | sandboxed live code runner |
| `src/scripts/dot-field.ts` | Dot Field background engine |
| `src/styles/theme.css` | palette and all styling |

## Performance and accessibility

- Dot Field paints resting dots once and only repaints what moves; it stops entirely when idle, off-screen, or in a background tab.
- Respects "reduce motion": no autoplay, no tilt, static backgrounds.
- Keyboard: skip link, arrow keys on the reading-level switch and carousel, visible focus rings.
- Sora is self-hosted, so the site makes no requests to Google (GDPR).

## Licenses

MIT for this theme. The Dot Field port is MIT + Commons Clause (React Bits); see `NOTICE`.
