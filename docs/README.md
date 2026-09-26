# BlankStare docs site

Built from the shared Stravelakis docs theme. Content lives in
`src/docs/*.md` (Dev / English / ELI5) and `src/pages/index.astro`; config in
`site.config.ts`. Everything else is the theme, unchanged.

```bash
npm ci && npm run dev      # preview
node social/render.mjs     # rebuild share card + carousel slides (run lab/shoot.mjs first)
```

Deploys on every `v*` tag via `.github/workflows/deploy-docs.yml` at the repo
root. See ../DEPLOY.md for first-time Pages setup.
