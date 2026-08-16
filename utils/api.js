// utils/api.js — BlankStare
// All external API calls: Groq (text + TTS), YouTube, SearXNG, resource links.
//
// Depends on utils/pure.js for createSSEParser and safeUrl — load it first.

// ══ MODEL REGISTRY ════════════════════════════════════════════════════════════
// Every model Groq offers on the free tier, with display info and rate limits.
// The fallback chain is ordered: most daily requests → fewest.
const GROQ_MODELS = [
  // ── Fast tier ──
  { id: 'llama-3.1-8b-instant',                     name: '⚡ Llama 3.1 8B Instant',    tier: 'fast',     rpm: 30, rpd: 14400, tpm: '6K',  note: 'Default — highest daily quota' },
  { id: 'meta-llama/llama-4-scout-17b-16e-instruct', name: '🔭 Llama 4 Scout 17B',       tier: 'fast',     rpm: 30, rpd: 1000,  tpm: '30K', note: 'Great speed + context window' },
  { id: 'qwen/qwen3-32b',                            name: '⚡ Qwen 3 32B',              tier: 'fast',     rpm: 60, rpd: 1000,  tpm: '6K',  note: '60 req/min — fastest RPM' },
  { id: 'compound-mini',                             name: '🔬 Compound Mini',           tier: 'fast',     rpm: 30, rpd: 250,   tpm: '70K', note: 'No daily token limit' },
  // ── Powerful tier ──
  { id: 'llama-3.3-70b-versatile',                   name: '🧠 Llama 3.3 70B Versatile', tier: 'powerful', rpm: 30, rpd: 1000,  tpm: '12K', note: 'Best balance' },
  { id: 'compound',                                  name: '🧪 Compound',                tier: 'powerful', rpm: 30, rpd: 250,   tpm: '70K', note: 'No daily token limit' },
  { id: 'openai/gpt-oss-120b',                       name: '🤖 GPT-OSS 120B',            tier: 'powerful', rpm: 30, rpd: 1000,  tpm: '8K',  note: 'OpenAI-compatible, 120B params' },
  { id: 'qwen/qwen3.6-27b',                          name: '🔮 Qwen 3.6 27B',            tier: 'powerful', rpm: 30, rpd: 1000,  tpm: '8K',  note: 'Strong multilingual' },
  { id: 'openai/gpt-oss-20b',                        name: '💡 GPT-OSS 20B',             tier: 'powerful', rpm: 30, rpd: 1000,  tpm: '8K',  note: 'Lighter OpenAI-compatible' },
];

// Auto-fallback chain: ordered by reliability (most RPD first, then by quality)
const FALLBACK_CHAIN = [
  'llama-3.1-8b-instant',
  'meta-llama/llama-4-scout-17b-16e-instruct',
  'qwen/qwen3-32b',
  'llama-3.3-70b-versatile',
  'qwen/qwen3.6-27b',
  'openai/gpt-oss-20b',
  'openai/gpt-oss-120b',
  'compound-mini',
  'compound',
];

const GROQ_CHAT_URL   = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_SPEECH_URL = 'https://api.groq.com/openai/v1/audio/speech';

// Model used for the supplementary glossary pass — cheapest, highest quota.
const GLOSSARY_MODEL = 'llama-3.1-8b-instant';

// ══ GROQ TEXT — STREAMING ═════════════════════════════════════════════════════
// Auto-fallback: on 429 (rate limited), tries the next model in FALLBACK_CHAIN
// if the user enabled it.
//
// Callbacks:
//   onChunk(delta, full)  — a token arrived
//   onDone(full)          — the stream completed
//   onError(err)          — unrecoverable; `err.partial` holds any text received
//   onStatus(msg)         — transient notice (e.g. falling back to another model)
//
// `signal` aborts the request. An abort is NOT an error: no callback fires,
// because the caller already knows — it is the one that aborted.

async function explainWithGroq({
  apiKey,
  model,
  systemPrompt,
  userPrompt,
  maxTokens = 700,
  autoFallback = false,
  signal,
  onChunk = () => {},
  onDone = () => {},
  onError = () => {},
  onStatus = () => {},
}) {
  const toTry = autoFallback
    ? [model, ...FALLBACK_CHAIN.filter(m => m !== model)]
    : [model];

  for (let i = 0; i < toTry.length; i++) {
    const tryModel = toTry[i];

    if (i > 0) onStatus(`${toTry[i - 1]} is rate-limited — trying ${tryModel}…`);

    const result = await _streamGroq({
      model: tryModel, apiKey, systemPrompt, userPrompt, maxTokens, signal, onChunk,
    });

    if (result.aborted) return;                 // caller cancelled; stay silent
    if (result.ok)      { onStatus(''); onDone(result.text); return; }

    const isRateLimit = result.status === 429;
    const hasMore     = i < toTry.length - 1;

    // Only a rate limit is worth retrying on another model. A bad key or a
    // dropped connection will fail identically nine more times.
    if (isRateLimit && autoFallback && hasMore) continue;

    onStatus('');
    onError(_describeFailure(result, { autoFallback, exhausted: isRateLimit && !hasMore }));
    return;
  }
}

function _describeFailure(result, { autoFallback, exhausted }) {
  let msg = result.error || `Groq error ${result.status}`;

  if (result.status === 401) {
    msg = 'Invalid Groq API key — check Settings.';
  } else if (result.status === 429 && !autoFallback) {
    msg = 'Rate limit hit. Enable Auto-fallback in Settings to switch models automatically, or wait a moment.';
  } else if (exhausted) {
    msg = 'All models are currently rate-limited. Wait a minute and try again.';
  } else if (result.status === 0 && result.partial) {
    msg = 'The connection dropped part-way through. The partial translation is shown above — try again for the rest.';
  }

  return Object.assign(new Error(msg), { status: result.status, partial: result.partial || '' });
}

async function _streamGroq({ model, apiKey, systemPrompt, userPrompt, maxTokens, signal, onChunk }) {
  let response;
  try {
    response = await fetch(GROQ_CHAT_URL, {
      method: 'POST',
      signal,
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user',   content: userPrompt   },
        ],
        max_tokens:  maxTokens,
        temperature: 0.7,
        stream:      true,
      }),
    });
  } catch (err) {
    if (_isAbort(err)) return { aborted: true };
    return { ok: false, status: 0, error: `Network error: ${err.message}`, partial: '' };
  }

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    return { ok: false, status: response.status, error: errData?.error?.message, partial: '' };
  }

  const reader  = response.body.getReader();
  const decoder = new TextDecoder();
  const parser  = createSSEParser();
  let full = '';

  const take = deltas => {
    for (const delta of deltas) {
      full += delta;
      onChunk(delta, full);
    }
  };

  // The read loop can throw at any point — a dropped connection mid-stream used
  // to escape here, leaving the caller with neither onDone nor onError and a
  // cursor blinking forever. Whatever arrived before the drop is handed back.
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      take(parser.push(decoder.decode(value, { stream: true })));
    }
    take(parser.flush());
  } catch (err) {
    if (_isAbort(err)) return { aborted: true };
    return { ok: false, status: 0, error: `Connection lost: ${err.message}`, partial: full };
  }

  return { ok: true, text: full };
}

function _isAbort(err) {
  return err?.name === 'AbortError';
}

// ══ GLOSSARY ══════════════════════════════════════════════════════════════════
// Supplementary pass, run after a translation is shown. Non-streaming.
// Lives here rather than in the sidepanel so it inherits the same key handling
// and error vocabulary as everything else.

async function fetchGlossary({ translation, apiKey, signal }) {
  const prompt =
    'From this plain-English translation, identify any technical terms or acronyms that still appear ' +
    '(the ones the translator could not fully avoid). Return ONLY valid JSON (no markdown, no backticks): ' +
    '[{"term":"word","def":"5-10 word plain definition"}]. If none remain, return []. Translation:\n' +
    translation;

  const res = await fetch(GROQ_CHAT_URL, {
    method: 'POST',
    signal,
    headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model:       GLOSSARY_MODEL,
      messages:    [{ role: 'user', content: prompt }],
      max_tokens:  400,
      temperature: 0.2,
    }),
  });

  if (!res.ok) {
    if (res.status === 401) throw new Error('Invalid Groq API key — check Settings.');
    if (res.status === 429) throw new Error('Rate limited — the glossary will work again shortly.');
    throw new Error(`Glossary unavailable (${res.status}).`);
  }

  const data = await res.json();
  const raw  = data.choices?.[0]?.message?.content || '[]';

  let terms;
  try {
    terms = JSON.parse(raw.replace(/```json|```/g, '').trim());
  } catch (_) {
    throw new Error('Glossary returned an unreadable answer.');
  }

  if (!Array.isArray(terms)) return [];

  return terms
    .filter(t => t && typeof t.term === 'string' && typeof t.def === 'string')
    .slice(0, 20);
}

// ══ GROQ TTS — ORPHEUS ════════════════════════════════════════════════════════
// Canopylabs Orpheus-v1-english via Groq's audio/speech endpoint.
// Free tier: 100 requests/day, 10/min. Falls back to browser speechSynthesis.
const ORPHEUS_VOICES = [
  { id: 'tara',  label: 'Tara — warm, clear'            },
  { id: 'leah',  label: 'Leah — friendly, bright'       },
  { id: 'leo',   label: 'Leo — confident, steady'       },
  { id: 'jess',  label: 'Jess — energetic, expressive'  },
  { id: 'zac',   label: 'Zac — calm, measured'          },
  { id: 'zoe',   label: 'Zoe — cheerful, light'         },
  { id: 'mia',   label: 'Mia — smooth, professional'    },
  { id: 'julia', label: 'Julia — rich, articulate'      },
];

// Kept under the endpoint's practical input ceiling. Reported back to the
// caller so the UI can say the readout was shortened rather than let it just
// stop mid-sentence.
const ORPHEUS_MAX_CHARS = 1500;

async function speakWithOrpheus(text, apiKey, voice = 'tara', signal) {
  const input     = text.slice(0, ORPHEUS_MAX_CHARS);
  const truncated = text.length > ORPHEUS_MAX_CHARS;

  const response = await fetch(GROQ_SPEECH_URL, {
    method: 'POST',
    signal,
    headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model:           'canopylabs/orpheus-v1-english',
      input,
      voice,
      response_format: 'mp3',
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    const msg = response.status === 429
      ? 'Orpheus daily limit reached — using the browser voice instead.'
      : (err.error?.message || `TTS error ${response.status}`);
    throw Object.assign(new Error(msg), { status: response.status });
  }

  const blob = await response.blob();
  return { url: URL.createObjectURL(blob), truncated }; // caller must revoke the url
}

// ══ YOUTUBE ═══════════════════════════════════════════════════════════════════
async function searchYouTube(query, apiKey, signal) {
  const q   = encodeURIComponent(`${query} explained simply`);
  const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${q}&type=video&maxResults=4&videoDuration=medium&relevanceLanguage=en&key=${apiKey}`;

  const res = await fetch(url, { signal });
  if (!res.ok) {
    const d = await res.json().catch(() => ({}));
    if (res.status === 403) throw new Error('YouTube API key invalid or quota exceeded.');
    throw new Error(d?.error?.message || `YouTube API error (${res.status})`);
  }

  const data = await res.json();
  return (data.items || [])
    .filter(item => item?.id?.videoId)
    .map(item => ({
      videoId:     item.id.videoId,
      title:       item.snippet?.title        || 'Untitled',
      channelName: item.snippet?.channelTitle || '',
      // Remote string heading for an <img src> — filtered, not trusted.
      thumbnail:   safeUrl(item.snippet?.thumbnails?.medium?.url || item.snippet?.thumbnails?.default?.url || ''),
    }));
}

// ══ WEB SEARCH ════════════════════════════════════════════════════════════════
// Returns null when no SearXNG instance is configured or it failed, which the
// caller renders as the DuckDuckGo hand-off.
async function searchWeb(query, searxngUrl, signal) {
  if (!searxngUrl?.trim()) return null;
  try {
    return await _searchSearXNG(query, searxngUrl.trim(), signal);
  } catch (err) {
    if (_isAbort(err)) throw err;
    console.warn('[BlankStare] SearXNG failed, falling back to DuckDuckGo:', err.message);
    return null;
  }
}

async function _searchSearXNG(query, baseUrl, signal) {
  const url = `${baseUrl.replace(/\/$/, '')}/search?q=${encodeURIComponent(query)}&format=json&categories=general`;
  const res = await fetch(url, { signal, headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error(`SearXNG error (${res.status})`);

  const data = await res.json();
  return (data.results || [])
    .map(r => ({
      title:   r.title   || 'Untitled',
      // A self-hosted instance is still a remote source; its links land in a
      // document with extension privileges.
      url:     safeUrl(r.url),
      snippet: r.content || '',
    }))
    .filter(r => r.url)
    .slice(0, 6);
}

function duckDuckGoUrl(query) {
  return `https://duckduckgo.com/?q=${encodeURIComponent(query + ' developer explained')}`;
}

// ══ RESOURCE LINKS ════════════════════════════════════════════════════════════
function buildResourceLinks(selectedText) {
  const q = encodeURIComponent(selectedText.trim());
  return {
    mdn:     `https://developer.mozilla.org/en-US/search?q=${q}`,
    w3s:     `https://www.w3schools.com/search/search_result.asp?search=${q}`,
    devdocs: `https://devdocs.io/#q=${q}`,
  };
}
