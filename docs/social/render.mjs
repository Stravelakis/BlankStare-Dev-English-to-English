// Renders the docs site's share card and carousel slides with headless Chrome.
//   node docs/social/render.mjs      (after `node lab/shoot.mjs`)
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath, pathToFileURL } from 'node:url';

const run = promisify(execFile);
const HERE = path.dirname(fileURLToPath(import.meta.url));
const PUB = path.join(HERE, '..', 'public');
const CHROME = process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe';

const SLIDES = [
  ['slide-result.png',   'sidepanel-result.png',  'A TypeError, in plain English'],
  ['slide-greek.png',    'sidepanel-greek.png',   'The same, in Greek'],
  ['slide-history.png',  'sidepanel-history.png', 'Your last twenty answers'],
  ['slide-welcome.png',  'sidepanel-welcome.png', 'Waiting at the side of the page'],
  ['slide-settings.png', 'settings.png',          'One free key, and a test button'],
];

async function shoot(page, query, out, w, h) {
  const url = pathToFileURL(path.join(HERE, page)).href + (query ? '?' + query : '');
  await run(CHROME, ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--allow-file-access-from-files',
    `--window-size=${w},${h}`, '--virtual-time-budget=3000', `--screenshot=${out}`, url], { timeout: 60000 });
  console.log('wrote', path.basename(out));
}

await shoot('card.html', '', path.join(PUB, 'og-image.png'), 1200, 630);
for (const [out, img, title] of SLIDES)
  await shoot('slide.html', new URLSearchParams({ img, title }).toString(), path.join(PUB, 'screenshots', out), 1600, 700);
