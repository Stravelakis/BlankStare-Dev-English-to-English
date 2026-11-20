// Smoke test (STANDARDS.md §2): does BlankStare start, and does its one job work?
//
//   cd tests/smoke && npm install && node smoke.mjs
//
// Loads the real unpacked extension in Chromium, with no key at all, and:
//   1. the background worker starts
//   2. Settings opens with the first-run setup and no page errors
//   3. the side panel opens with no page errors
//   4. selected text gets a real answer from the free no-key AI (OVHcloud)
//
// Step 4 needs the internet. SMOKE_OFFLINE=1 skips it (and says so).
// Needs a Chromium that loads unpacked extensions: CHROMIUM_PATH, or one
// installed with `npx playwright-core install chromium`.

import { chromium } from 'playwright-core';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const wait = ms => new Promise(r => setTimeout(r, ms));
let failed = 0;
const ok = (msg) => console.log(`  ✓ ${msg}`);
const bad = (msg) => { failed++; console.log(`  ✗ ${msg}`); };

function findChromium() {
  if (process.env.CHROMIUM_PATH) return process.env.CHROMIUM_PATH;
  const base = process.env.PLAYWRIGHT_BROWSERS_PATH
    || path.join(process.env.LOCALAPPDATA || path.join(os.homedir(), '.cache'), 'ms-playwright');
  const dirs = fs.existsSync(base) ? fs.readdirSync(base).filter(d => /^chromium-\d+$/.test(d)).sort().reverse() : [];
  for (const d of dirs) for (const exe of ['chrome-win64/chrome.exe', 'chrome-win/chrome.exe', 'chrome-linux64/chrome', 'chrome-linux/chrome']) {
    const p = path.join(base, d, exe);
    if (fs.existsSync(p)) return p;
  }
  throw new Error('No Chromium found. Set CHROMIUM_PATH or run: npx playwright-core install chromium');
}

const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'bs-smoke-'));
const ctx = await chromium.launchPersistentContext(profile, {
  executablePath: findChromium(), headless: true,
  args: [`--disable-extensions-except=${ROOT}`, `--load-extension=${ROOT}`, '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
try {
  console.log('BlankStare smoke test');
  let [sw] = ctx.serviceWorkers();
  if (!sw) sw = await ctx.waitForEvent('serviceworker', { timeout: 20000 });
  const id = new URL(sw.url()).host;
  ok('background worker started');
  await wait(1500);

  const errorsOf = page => { const e = []; page.on('pageerror', x => e.push(x.message)); return e; };

  const s = await ctx.newPage();
  const sErr = errorsOf(s);
  await s.goto(`chrome-extension://${id}/settings/settings.html`);
  await wait(2000);
  (await s.isVisible('#wizard')) ? ok('Settings shows the first-run setup') : bad('Settings did not show the first-run setup');
  sErr.length ? bad(`Settings page errors: ${sErr.join(' | ')}`) : ok('Settings has no page errors');
  await s.close();

  const p = await ctx.newPage();
  const pErr = errorsOf(p);
  await p.goto(`chrome-extension://${id}/sidepanel/sidepanel.html`);
  await wait(1200);
  (await p.isVisible('#state-welcome')) ? ok('side panel shows the welcome screen') : bad('side panel did not show the welcome screen');

  if (process.env.SMOKE_OFFLINE === '1') {
    console.log('  - answer check skipped (SMOKE_OFFLINE=1)');
  } else {
    const t0 = Date.now();
    await p.evaluate(t => chrome.storage.session.set({ pendingText: t, pendingTimestamp: Date.now() }),
      "TypeError: Cannot read properties of undefined (reading 'map')");
    await p.waitForFunction(() => !document.getElementById('explanation-actions').classList.contains('hidden')
      || !document.getElementById('state-error').classList.contains('hidden'), null, { timeout: 240000 }).catch(() => {});
    await wait(1200);   // the model line finishes its decode animation
    const r = await p.evaluate(() => ({
      text: document.getElementById('explanation-text').innerText.trim(),
      model: document.getElementById('model-line').textContent,
      error: document.getElementById('state-error').classList.contains('hidden') ? '' : document.getElementById('error-message').textContent,
    }));
    const secs = ((Date.now() - t0) / 1000).toFixed(0);
    if (r.text.length > 40 && !r.error) ok(`real answer in ${secs}s (${r.model})`);
    else bad(`no answer after ${secs}s${r.error ? `: ${r.error}` : ''}`);
  }
  pErr.length ? bad(`side panel page errors: ${pErr.join(' | ')}`) : ok('side panel has no page errors');
} finally {
  await ctx.close();
  fs.rmSync(profile, { recursive: true, force: true });
}
console.log(failed ? `\n${failed} check(s) failed` : '\nall checks passed');
process.exit(failed ? 1 : 0);
