// One source (STANDARDS.md §7): the site's Guide/Install text comes from the
// repo's own GUIDE.md and INSTALL.md, and the jargon tooltips from
// docs/glossary.yml. Runs before every dev/build, so the site can never hold
// text the repo doesn't.
//
// The theme lives in <repo>/docs, so the repo root is ".." by default.
// Override with DOCS_SOURCE_ROOT=<path> when the layout differs.
import { existsSync, mkdirSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// Links written for GitHub (INSTALL.md, docs/x.md, LICENSE) would break on the
// site: GUIDE/INSTALL go to their own sections here, anything else to GitHub.
// The repo address comes from site.config.ts (repoUrl). Found on Video Forge, 18 Nov 2026.
const repoUrl = (readFileSync(new URL("../site.config.ts", import.meta.url), "utf8").match(/repoUrl:\s*["']([^"']+)["']/) || [])[1];
const REPO_BLOB = repoUrl ? repoUrl.replace(/\/$/, "") + "/blob/main/" : null;
const fixLinks = (md) =>
  md.replace(/\]\((?!https?:|#|mailto:)([^)\s]+)\)/g, (m, target) => {
    const [file, hash] = target.split("#");
    if (/^GUIDE\.md$/i.test(file)) return `](#${hash || "guide"})`;
    if (/^INSTALL\.md$/i.test(file)) return `](#${hash || "install"})`;
    return REPO_BLOB ? `](${REPO_BLOB}${file}${hash ? `#${hash}` : ""})` : m;
  });


const themeDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const repoRoot = resolve(themeDir, process.env.DOCS_SOURCE_ROOT ?? '..');
const outDocs = join(themeDir, 'src', 'docs', 'source');
const outData = join(themeDir, 'src', 'data');

rmSync(outDocs, { recursive: true, force: true });
mkdirSync(outDocs, { recursive: true });
mkdirSync(outData, { recursive: true });

const copied = [];
for (const [file, slug] of [['GUIDE.md', 'guide'], ['INSTALL.md', 'install']]) {
  const src = join(repoRoot, file);
  if (!existsSync(src)) continue;
  writeFileSync(join(outDocs, `${slug}.md`), fixLinks(readFileSync(src, 'utf8')));
  copied.push(file);
}

// Tiny parser for the glossary shape only (term: / two-space key: value).
// Avoids a YAML dependency in every docs site.
function parseGlossary(text) {
  const terms = [];
  let cur = null;
  for (const raw of text.split(/\r?\n/)) {
    if (!raw.trim() || raw.trimStart().startsWith('#')) continue;
    const top = raw.match(/^([^\s#][^:]*):\s*$/);
    if (top) {
      cur = { term: top[1].trim().replace(/^["']|["']$/g, '') };
      terms.push(cur);
      continue;
    }
    const kv = raw.match(/^\s+(\w+):\s*(.*)$/);
    if (kv && cur) {
      let v = kv[2].trim();
      if (/^".*"$/.test(v) || /^'.*'$/.test(v)) v = v.slice(1, -1);
      cur[kv[1]] = kv[1] === 'explainer' ? v === 'true' : v;
    }
  }
  return terms.filter((t) => t.eli5 || t.english || t.dev);
}

const glossaryPaths = [join(repoRoot, 'docs', 'glossary.yml'), join(themeDir, 'glossary.yml')];
const glossaryFile = glossaryPaths.find(existsSync);
const glossary = glossaryFile ? parseGlossary(readFileSync(glossaryFile, 'utf8')) : [];
writeFileSync(join(outData, 'glossary.json'), JSON.stringify(glossary, null, 2));

console.log(
  `sync-docs: ${copied.length ? copied.join(', ') : 'no GUIDE.md/INSTALL.md found'} · ` +
    `${glossary.length} glossary terms${glossaryFile ? '' : ' (no glossary.yml found)'}`
);
