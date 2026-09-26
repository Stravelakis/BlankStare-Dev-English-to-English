# Standards

This repo follows **strav's repo standards**: the shared rules for every
Stravelakis repo (required files, SemVer and releases, the secret hook, the
docs site). They are kept outside this repo. This file lists only what
BlankStare does differently, and why.

- **Custom licence, not MIT.** "Source available with attribution": free for
  personal use, no commercial use without permission, forks must keep the
  credit. See [LICENSE](LICENSE). The author's contact address appears in it
  and in the README on purpose, as the route for commercial permission.
- **§6 (installable apps) does not apply.** A browser extension has no Windows
  installer, no local port and no in-app Update button: Chrome installs,
  updates and removes it.
- **No build step, on purpose.** Loading the folder unpacked must keep working
  for someone without Node. `package.json` exists only for `npm test`.
- **The docs site lives in `docs/`**, with its deploy workflow at the repo root
  (`.github/workflows/deploy-docs.yml`). `docs/superpowers/` holds design
  specs and is not part of the site.
- **Look: Deco Noir inside the extension, the docs theme outside it.** The
  extension wears the Deco Noir identity (vendored in `vendor/`). The docs site
  uses the shared docs theme unchanged, as the standards require. Share images
  and carousel slides carry the Deco Noir look, since they show the product.
- **Nothing in `utils/pure.js` may touch `chrome`, `document`, `window` or
  `fetch`.** That is what lets it run under the test suite and in the docs
  playground unchanged.
