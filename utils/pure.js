// utils/pure.js — BlankStare
//
// Side-effect-free logic, kept separate so it can be tested outside Chrome.
// Loads as a classic <script> in the extension AND as a CommonJS module under
// `node --test` (see the export guard at the bottom). No build step.
//
// Nothing in this file may touch `chrome`, `document`, `window` or `fetch`.

// ══ SSE FRAME REASSEMBLY ══════════════════════════════════════════════════════
// A network chunk is not a message frame. Reading `data:` lines out of each
// chunk independently drops any frame that straddles a chunk boundary — the
// half-line fails JSON.parse and the tokens vanish silently.
//
// The parser holds the incomplete tail back until the rest of it arrives.

function createSSEParser() {
  let buffer = '';

  function extract(lines) {
    const deltas = [];
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith('data:')) continue;      // comments, blanks, keep-alives

      const payload = trimmed.slice(5).trim();
      if (!payload || payload === '[DONE]') continue;

      try {
        const delta = JSON.parse(payload)?.choices?.[0]?.delta?.content;
        if (delta) deltas.push(delta);
      } catch (_) {
        // A frame that is complete but malformed. Skipping it is correct —
        // killing the stream over one bad frame would lose the rest.
      }
    }
    return deltas;
  }

  return {
    // Feed a decoded network chunk; returns the deltas that completed with it.
    push(chunk) {
      buffer += chunk;
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';   // last element is incomplete until proven otherwise
      return extract(lines);
    },

    // Call once the stream ends, in case the final frame arrived without a
    // trailing newline.
    flush() {
      const tail = buffer;
      buffer = '';
      return tail.trim() ? extract([tail]) : [];
    },
  };
}

// ══ URL SCHEME FILTERING ══════════════════════════════════════════════════════
// Search results are remote strings that become href/src attributes inside a
// document with extension privileges. Only http(s) may make that journey.
// Returns '' for anything else, so the caller renders an inert element.

function safeUrl(raw) {
  if (typeof raw !== 'string') return '';
  try {
    const url = new URL(raw.trim());
    return (url.protocol === 'http:' || url.protocol === 'https:') ? url.href : '';
  } catch (_) {
    return '';   // relative, protocol-relative, or malformed
  }
}

// ══ OPTIONAL-PERMISSION ORIGIN PATTERN ════════════════════════════════════════
// The SearXNG instance is user-supplied, so its origin cannot be declared in the
// manifest ahead of time. It is requested at runtime instead, which needs a
// match pattern rather than a URL: "https://search.example.com/*".
//
// Scoped to the single origin the user typed — never a broad "https://*/*", so
// granting SearXNG access does not hand the extension the whole web. Returns ''
// for anything that is not an http(s) URL, so the caller can refuse to ask.

function searxngOriginPattern(raw) {
  const url = safeUrl(raw);
  if (!url) return '';
  try {
    const { protocol, host } = new URL(url);
    if (!host) return '';

    // `new URL("https://*/*")` parses happily, with host "*". Echoing that back
    // would turn a request for one server into a request for the entire web, so
    // the host has to look like a real host: letters, digits, dots, hyphens,
    // a port, or bracketed IPv6. Anything else is refused.
    if (!/^[a-z0-9.\-]+(:\d+)?$/i.test(host) && !/^\[[0-9a-f:]+\](:\d+)?$/i.test(host)) {
      return '';
    }

    return `${protocol}//${host}/*`;
  } catch (_) {
    return '';
  }
}

// ══ SHARED LIMITS ═════════════════════════════════════════════════════════════
// The page-content budget was hardcoded as 4000 in both content.js and
// sidepanel.js, so changing it meant changing it twice.
const MAX_PAGE_CHARS = 4000;

// ══ DOMAIN EXCLUSION ══════════════════════════════════════════════════════════
// Entries may be pasted as full URLs; normalise to a bare hostname first.
// Matching is exact or a true subdomain — 'example.com' must not silence
// 'notexample.com'.

function isDomainExcluded(hostname, list) {
  if (!Array.isArray(list) || !list.length) return false;
  const host = String(hostname || '').toLowerCase();
  if (!host) return false;

  return list.some(entry => {
    if (typeof entry !== 'string') return false;
    const pattern = entry
      .trim()
      .toLowerCase()
      .replace(/^[a-z][a-z0-9+.-]*:\/\//, '')   // scheme
      .replace(/\/.*$/, '');                    // path
    if (!pattern) return false;
    return host === pattern || host.endsWith('.' + pattern);
  });
}

// ══ GREEK HEURISTIC ═══════════════════════════════════════════════════════════
// BlankStare translates English dev text. Greek input is almost always a user
// mistake, so it is caught before a request is spent on it. A stray λ in an
// English sentence must not trip the guard — hence a ratio, not a flag.

const GREEK_RATIO_THRESHOLD = 0.2;

function isLikelyGreek(text) {
  const str = String(text || '').trim();
  if (!str.length) return false;
  const greek = (str.match(/[Ͱ-Ͽἀ-῿]/g) || []).length;
  return greek / str.length > GREEK_RATIO_THRESHOLD;
}

// ══ READING LEVELS ════════════════════════════════════════════════════════════
// Standard reaches for everyday analogies; Vibecoder uses AI/API concepts as
// bridges, because that reader already has them.

const VALID_LEVELS = ['eli5', 'newbie', 'standard', 'vibecoder'];

const LEVEL_DESC = {
  eli5: {
    en: 'a 5-year-old child — use the simplest possible words, the shortest sentences, and playful everyday analogies. Zero jargon.',
    el: 'παιδί 5 ετών — απλούστατες λέξεις, κοντές προτάσεις, παιχνιδιάρικες αναλογίες. Μηδέν ορολογία.',
  },
  newbie: {
    en: 'a curious adult who has heard of coding but never done it — use friendly analogies from everyday life, be encouraging, assume nothing technical.',
    el: 'αρχάριο που γνωρίζει ότι υπάρχει κώδικας αλλά δεν έχει ασχοληθεί — φιλικές αναλογίες από καθημερινή ζωή.',
  },
  standard: {
    en: 'an intelligent non-developer who works with developers — smart, works in product/design/marketing/management, uses tools like Notion/Figma/Slack but has never written code. Use analogies from work life (documents, folders, processes, phone calls).',
    el: 'έξυπνο μη-προγραμματιστή που δουλεύει με developers — χρησιμοποιεί Notion/Figma/Slack αλλά δεν γράφει κώδικα. Αναλογίες από εργασιακή ζωή.',
  },
  vibecoder: {
    en: 'a vibecoder who builds software using AI tools (Claude, Cursor, Copilot, ChatGPT) but does not write traditional code. They ALREADY KNOW: what an API is, what a model/token/prompt is, what git roughly does, what a server is, what "running locally" means. Use these as bridge concepts — do NOT over-explain them. They do NOT know: compiler errors, syntax rules, package manager internals, algorithm complexity, low-level architecture.',
    el: 'vibecoder που φτιάχνει με AI (Claude, Cursor) αλλά δεν γράφει παραδοσιακό κώδικα. ΞΕΡΕΙ ήδη: API, model, token, prompt, git βασικά, server. ΔΕΝ ΞΕΡΕΙ: compiler errors, syntax, package managers σε βάθος.',
  },
};

// ══ SYSTEM PROMPT — TRANSLATION, NOT EXPLANATION ══════════════════════════════
// The output replaces the original. The reader should never need to go back and
// read the dev text.

function buildSystemPrompt(lang, level, userContext) {
  const who = LEVEL_DESC[level]?.[lang] || LEVEL_DESC.standard[lang] || LEVEL_DESC.standard.en;

  const langInstr = lang === 'el'
    ? 'Write your translation in Greek (Ελληνικά). All output must be Greek.'
    : 'Write in plain English.';

  const ctx = userContext ? `\nReader context: "${userContext}"` : '';

  return `You are a translator from Dev English (technical developer jargon) into plain language. Your reader is: ${who.replace(/\.$/, '')}.${ctx}

TRANSLATION RULES — follow these exactly:
1. REWRITE the content in plain language so the reader can fully understand it WITHOUT ever seeing the original. Write a TRANSLATION, not a footnote or a dictionary entry.
2. Start with 1-2 plain sentences that capture the COMPLETE meaning. Your reader should be able to act on those 2 sentences alone.
3. NEVER say "This means..." or "This is a..." or "In developer terms..." — just state it directly as if you wrote the original in plain language.
4. Translate jargon within your sentences, not as separate bullet definitions.
5. If the content requires action, state that action in plain terms: what to do, not what the error is called.
6. Use analogies naturally inside sentences, not as separate "think of it like..." paragraphs.
7. No code unless the reader specifically asks.
8. ${langInstr}`;
}

// ══ EXPORT GUARD ══════════════════════════════════════════════════════════════
// Present for `node --test`, absent in the browser. Keeps this file loadable by
// a plain <script> tag with no bundler and no module type.
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    createSSEParser,
    safeUrl,
    searxngOriginPattern,
    isDomainExcluded,
    isLikelyGreek,
    buildSystemPrompt,
    VALID_LEVELS,
    LEVEL_DESC,
    GREEK_RATIO_THRESHOLD,
    MAX_PAGE_CHARS,
  };
}
