// lab/shoot.mjs — regenerates the README and docs-site screenshots.
//
//   node lab/shoot.mjs
//
// Serves the repo on a random free port for as long as the shots take, drives
// headless Chrome against lab/preview.html?shot=..., then closes the server.
// Nothing is left running. Output: screenshots/*.png, copied to docs/public.

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

// Must be async: a synchronous call would block the server below from
// answering the very page Chrome is waiting for.
const run = promisify(execFile);
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CHROME = process.env.CHROME_PATH
  || 'C:/Program Files/Google/Chrome/Application/chrome.exe';

// [file, query, height in CSS px]. Width is always the real panel width.
const SHOTS = [
  ['sidepanel-result.png',  'shot=result',          1150],
  ['sidepanel-greek.png',   'shot=result&lang=el',  1150],
  ['sidepanel-welcome.png', 'shot=welcome',          640],
  ['sidepanel-history.png', 'shot=result&history',   640],
];

const TYPES = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript',
  '.json': 'application/json', '.woff2': 'font/woff2', '.png': 'image/png', '.svg': 'image/svg+xml' };

const server = http.createServer((req, res) => {
  const file = path.join(ROOT, decodeURIComponent(new URL(req.url, 'http://x').pathname));
  if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    res.writeHead(404).end(); return;
  }
  res.writeHead(200, { 'content-type': TYPES[path.extname(file)] || 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
});

await new Promise(r => server.listen(0, '127.0.0.1', r));
const { port } = server.address();

try {
  for (const [name, query, height] of SHOTS) {
    const out = path.join(ROOT, 'screenshots', name);
    await run(CHROME, [
      '--headless=new', '--disable-gpu', '--hide-scrollbars',
      '--force-device-scale-factor=2', `--window-size=380,${height}`,
      '--virtual-time-budget=6000', `--screenshot=${out}`,
      `http://127.0.0.1:${port}/lab/preview.html?${query}`,
    ], { timeout: 60000 });
    fs.copyFileSync(out, path.join(ROOT, 'docs', 'public', 'screenshots', name));
    console.log('wrote', name);
  }
} finally {
  server.close();
}
