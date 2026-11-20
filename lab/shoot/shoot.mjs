// lab/shoot/shoot.mjs — regenerates every BlankStare screenshot from the real
// extension. Nothing is mocked: the answers in the images are real answers
// from the free no-key AI (OVHcloud), fetched while the script runs.
//
//   cd lab/shoot && npm install && node shoot.mjs
//
// Needs a Chromium that can load unpacked extensions (branded Chrome cannot
// from the command line any more). Set CHROMIUM_PATH, or install one with
// `npx playwright-core install chromium`.
//
// Writes:
//   screenshots/*.png               README images (2x)
//   docs/public/screenshots/*.png   the same, plus slide-*.png for the carousel
//   store/*.png                     1280x800 Chrome Web Store images
//
// The extension runs in a throwaway profile that is deleted afterwards. A
// local server serves the repo only while the slides are framed.

import { chromium } from 'playwright-core';
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const OUT = { readme: path.join(ROOT, 'screenshots'), docs: path.join(ROOT, 'docs', 'public', 'screenshots'), store: path.join(ROOT, 'store') };
Object.values(OUT).forEach(d => fs.mkdirSync(d, { recursive: true }));
const wait = ms => new Promise(r => setTimeout(r, ms));

function findChromium() {
  if (process.env.CHROMIUM_PATH) return process.env.CHROMIUM_PATH;
  const base = path.join(process.env.LOCALAPPDATA || path.join(os.homedir(), '.cache'), 'ms-playwright');
  const dirs = fs.existsSync(base) ? fs.readdirSync(base).filter(d => /^chromium-\d+$/.test(d)).sort().reverse() : [];
  for (const d of dirs) {
    for (const exe of ['chrome-win64/chrome.exe', 'chrome-win/chrome.exe', 'chrome-linux/chrome', 'chrome-linux64/chrome']) {
      const p = path.join(base, d, exe);
      if (fs.existsSync(p)) return p;
    }
  }
  throw new Error('No Chromium found. Set CHROMIUM_PATH or run: npx playwright-core install chromium');
}
const CHROMIUM = findChromium();
const GL = ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'];

// Text a reader might select. These are inputs, not results.
const TYPE_ERROR = `TypeError: Cannot read properties of undefined (reading 'map')
    at ProductList (webpack-internal:///./src/ProductList.jsx:42:19)`;
const INSTALL = `Installation
1. Install Node.js 18 or newer.
2. Run npm install -g @anthropic-ai/claude-code
3. In your project folder, run claude and log in when the browser opens.
If you get EACCES permission errors, do not use sudo. Fix your npm permissions instead.`;

const save = async (page, name, opts = {}) => {
  const file = path.join(OUT.readme, name);
  await page.screenshot({ path: file, ...opts });
  fs.copyFileSync(file, path.join(OUT.docs, name));
  console.log('wrote', name);
};

// The element's box with some room around it; `maxH` caps it to the screen.
async function padBox(page, sel, pad, maxH) {
  const b = await page.locator(sel).boundingBox();
  const vp = page.viewportSize();
  const x = Math.max(0, b.x - pad), y = Math.max(0, b.y - pad);
  return { x, y, width: Math.min(vp.width - x, b.width + pad * 2), height: Math.min(maxH || vp.height, vp.height - y, b.height + pad * 2) };
}

// ══ 1. the real extension ═══════════════════════════════════════════════════
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'bs-shoot-'));
const ctx = await chromium.launchPersistentContext(profile, {
  executablePath: CHROMIUM, headless: true, deviceScaleFactor: 2, viewport: { width: 1280, height: 800 },
  args: [`--disable-extensions-except=${ROOT}`, `--load-extension=${ROOT}`, ...GL],
});
try {
  let [sw] = ctx.serviceWorkers();
  if (!sw) sw = await ctx.waitForEvent('serviceworker', { timeout: 15000 });
  const id = new URL(sw.url()).host;
  await wait(1500);

  // Settings: the first-run setup, then the settings page.
  const s = await ctx.newPage();
  await s.goto(`chrome-extension://${id}/settings/settings.html`);
  await wait(2200);
  await s.click('#wiz-next'); await wait(700);
  await s.click('#wiz-next'); await wait(1400);
  await save(s, 'settings-setup.png', { clip: await padBox(s, '.wiz-card', 24) });
  await s.click('#wiz-skip'); await wait(3200);
  await s.waitForFunction(() => /Ready|No free|Could not/.test(document.getElementById('status-pill').textContent), null, { timeout: 90000 });
  // Taller than the screen so the image fills its frame and fades out.
  await s.setViewportSize({ width: 1280, height: 1150 }); await wait(2800);
  await s.mouse.move(640, 300); await wait(900);
  await save(s, 'settings.png', { clip: await padBox(s, '.page', 0, 1150) });
  await s.close();

  // `node shoot.mjs settings` re-shoots Settings and the frames only.
  if (process.argv[2] !== 'settings') {

  // Side panel.
  const p = await ctx.newPage();
  await p.setViewportSize({ width: 380, height: 640 });
  await p.goto(`chrome-extension://${id}/sidepanel/sidepanel.html`);
  await wait(1500);
  await save(p, 'sidepanel-welcome.png');

  const ask = async (label, trigger) => {
    const t0 = Date.now();
    await trigger();
    await p.waitForFunction(() => !document.getElementById('explanation-actions').classList.contains('hidden')
      || !document.getElementById('state-error').classList.contains('hidden'), null, { timeout: 240000 });
    const err = await p.evaluate(() => document.getElementById('state-error').classList.contains('hidden') ? '' : document.getElementById('error-message').textContent);
    if (err) throw new Error(`${label}: the AI did not answer (${err}). No screenshot taken.`);
    await wait(1600);   // fades and the model-line decode finish
    console.log(`${label}: answered in ${((Date.now() - t0) / 1000).toFixed(1)}s by`, await p.textContent('#model-line'));
  };
  const select = text => p.evaluate(t => chrome.storage.session.set({ pendingText: t, pendingTimestamp: Date.now() }), text);

  await p.setViewportSize({ width: 380, height: 1150 });
  await ask('result', () => select(TYPE_ERROR));
  await p.evaluate(() => scrollTo(0, 0));
  await save(p, 'sidepanel-result.png');

  await ask('install', () => select(INSTALL));
  await ask('checklist', () => p.click('#checklist-btn'));
  await p.evaluate(() => { const b = document.querySelector('.md-checklist input'); if (b) b.click(); scrollTo(0, 0); });
  await wait(500);
  await save(p, 'sidepanel-checklist.png');

  await p.click('#lang-toggle'); await wait(500);
  await ask('greek', () => select(TYPE_ERROR));
  await p.evaluate(() => scrollTo(0, 0));
  await save(p, 'sidepanel-greek.png');

  await p.setViewportSize({ width: 380, height: 640 });
  await p.click('#history-btn'); await wait(700);
  await save(p, 'sidepanel-history.png');
  }
} finally {
  await ctx.close();
  fs.rmSync(profile, { recursive: true, force: true });
}

// ══ 2. frames for the docs carousel and the store ═══════════════════════════
const TYPES = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json',
  '.woff2': 'font/woff2', '.ttf': 'font/ttf', '.png': 'image/png', '.svg': 'image/svg+xml' };
const server = http.createServer((req, res) => {
  const file = path.join(ROOT, decodeURIComponent(new URL(req.url, 'http://x').pathname));
  if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404).end(); return; }
  res.writeHead(200, { 'content-type': TYPES[path.extname(file)] || 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const { port } = server.address();

const FRAMES = [
  // [image, title, caption, options]
  ['sidepanel-result.png',    'A TypeError, in plain English', 'Select the error on any page and the panel rewrites it as you watch.', {}, 'result'],
  ['sidepanel-checklist.png', 'Do it with me',                 'Instructions become a checklist you tick off, with every command in a copy box.', {}, 'checklist'],
  ['sidepanel-greek.png',     'The same, in Greek',            'Panel, answers and read-aloud voice switch to Greek with one button.', {}, 'greek'],
  ['sidepanel-history.png',   'Your last 20 answers',          'Open any earlier answer again without asking twice.', {}, 'history'],
  ['sidepanel-welcome.png',   'Ready when you are',            'Works with no key. Select text, right-click, or press Alt+Shift+E.', {}, 'welcome'],
  ['settings-setup.png',      'Pick your free AI',             'Start with no key, or add a free Gemini or Groq key in three minutes.', { wide: 1, iw: 640, top: 70 }, 'setup'],
  ['settings.png',            'Settings',                      'A 5-step setup, a free key if you want one, and everything saves by itself.', { wide: 1, iw: 640, top: 60 }, 'settings'],
];
const STORE = ['result', 'checklist', 'greek', 'setup', 'settings'];

const browser = await chromium.launch({ executablePath: CHROMIUM, headless: true, args: GL });
try {
  for (const [w, h, kind] of [[1600, 700, 'slide'], [1280, 800, 'store']]) {
    const page = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
    for (const [img, title, caption, opt, key] of FRAMES) {
      if (kind === 'store' && !STORE.includes(key)) continue;
      const q = new URLSearchParams({ img: `screenshots/${img}`, title, caption, ...Object.fromEntries(Object.entries(opt).map(([k, v]) => [k, String(v)])) });
      if (kind === 'store' && !opt.iw) q.set('iw', '430');
      await page.goto(`http://127.0.0.1:${port}/lab/shoot/slide.html?${q}`);
      await page.waitForFunction(() => document.body.dataset.ready === '1' && document.fonts.status === 'loaded');
      await wait(1200);
      const name = kind === 'slide' ? `slide-${key}.png` : `${STORE.indexOf(key) + 1}-${key}.png`;
      await page.screenshot({ path: kind === 'slide' ? path.join(OUT.docs, name) : path.join(OUT.store, name) });
      console.log('wrote', kind, name);
    }
    await page.close();
  }
} finally {
  await browser.close();
  server.close();
}
