# Deploy: BlankStare

BlankStare ships in two places: the extension (a folder people load into
Chrome, or a Chrome Web Store upload) and the docs site.

## Where it runs

- **Extension:** in each user's own Chrome. There is no server.
- **Docs site:** GitHub Pages, at
  https://docs.stravelakis.com/BlankStare-Dev-English-to-English/

## Environment variables

None. See `.env.example` for why.

## Release

Follow the release gate in the shared standards (§2), then:

1. Bump the version in **both** `manifest.json` and `package.json` (CI fails
   if they differ). Write the CHANGELOG entry.
2. Merge the release PR.
3. Tag and push: `git tag vX.Y.Z && git push origin vX.Y.Z`. The tag deploys
   the docs site (`.github/workflows/deploy-docs.yml`).
4. Create the GitHub Release from the tag with auto-generated notes; edit the
   summary line by hand.
5. **Chrome Web Store (if listed):** zip the extension files only, excluding
   `docs/`, `lab/`, `tests/`, `screenshots/`, `.github/`, `githooks/` and
   `node_modules/`, then upload in the Web Store developer dashboard.

```bash
git archive --format=zip -o blankstare-vX.Y.Z.zip HEAD manifest.json background.js content.js sidepanel settings utils vendor fonts icons LICENSE NOTICE
```

### First deploy of the docs site (once)

1. Repo **Settings → Pages → Source: GitHub Actions**.
2. **Settings → Environments → github-pages →** add a deployment rule for
   tags `v*`. Without it the first tag's deploy is rejected.
3. **Settings → General → Social preview:** upload `docs/public/og-image.png`.

## Rollback

- **Extension:** `git checkout vPREVIOUS`, reload unpacked. On the Web Store,
  upload the previous zip as a new version (the Store cannot roll back).
- **Docs site:** Actions → Deploy docs site → Run workflow on the previous tag.

## After deploying, check

- [ ] Docs site loads; the share card shows in LinkedIn Post Inspector
- [ ] Extension loads unpacked with no errors on `chrome://extensions`
- [ ] Select text on a page → translation streams in the panel
