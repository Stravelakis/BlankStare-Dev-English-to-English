// Renders the docs site's share card with headless Chrome.
//   node docs/social/render.mjs
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath, pathToFileURL } from 'node:url';

const run = promisify(execFile);
const HERE = path.dirname(fileURLToPath(import.meta.url));
const PUB = path.join(HERE, '..', 'public');
const CHROME = process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe';

// The carousel slides are made by lab/shoot/shoot.mjs from real captures.


async function shoot(page, query, out, w, h) {
  const url = pathToFileURL(path.join(HERE, page)).href + (query ? '?' + query : '');
  await run(CHROME, ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--allow-file-access-from-files',
    `--window-size=${w},${h}`, '--virtual-time-budget=3000', `--screenshot=${out}`, url], { timeout: 60000 });
  console.log('wrote', path.basename(out));
}

await shoot('card.html', '', path.join(PUB, 'og-image.png'), 1200, 630);
