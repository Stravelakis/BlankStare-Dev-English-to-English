// utils/api.js — BlankStare v0.5
// All external API calls: Groq (text + TTS), YouTube, SearXNG, resource links.

// ══ MODEL REGISTRY ════════════════════════════════════════════════════════════
// Every model Groq offers on the free tier, with display info and rate limits.
// The fallback chain is ordered: most daily requests → fewest.
const GROQ_MODELS = [
  // ── Fast tier ──
  { id: 'llama-3.1-8b-instant',                    name: '⚡ Llama 3.1 8B Instant',   tier: 'fast',     rpm: 30,  rpd: 14400, tpm: '6K',   note: 'Default — highest daily quota' },
  { id: 'meta-llama/llama-4-scout-17b-16e-instruct',name: '🔭 Llama 4 Scout 17B',       tier: 'fast',     rpm: 30,  rpd: 1000,  tpm: '30K',  note: 'Great speed + context window' },
  { id: 'qwen/qwen3-32b',                           name: '⚡ Qwen 3 32B',              tier: 'fast',     rpm: 60,  rpd: 1000,  tpm: '6K',   note: '60 req/min — fastest RPM' },
  { id: 'compound-mini',                            name: '🔬 Compound Mini',            tier: 'fast',     rpm: 30,  rpd: 250,   tpm: '70K',  note: 'No daily token limit' },
  // ── Powerful tier ──
  { id: 'llama-3.3-70b-versatile',                  name: '🧠 Llama 3.3 70B Versatile', tier: 'powerful', rpm: 30,  rpd: 1000,  tpm: '12K',  note: 'Best balance' },
  { id: 'compound',                                  name: '🧪 Compound',                 tier: 'powerful', rpm: 30,  rpd: 250,   tpm: '70K',  note: 'No daily token limit' },
  { id: 'openai/gpt-oss-120b',                       name: '🤖 GPT-OSS 120B',             tier: 'powerful', rpm: 30,  rpd: 1000,  tpm: '8K',   note: 'OpenAI-compatible, 120B params' },
  { id: 'qwen/qwen3.6-27b',                          name: '🔮 Qwen 3.6 27B',             tier: 'powerful', rpm: 30,  rpd: 1000,  tpm: '8K',   note: 'Strong multilingual' },
  { id: 'openai/gpt-oss-20b',                        name: '💡 GPT-OSS 20B',              tier: 'powerful', rpm: 30,  rpd: 1000,  tpm: '8K',   note: 'Lighter OpenAI-compatible' },
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

// ══ GROQ TEXT — STREAMING ═════════════════════════════════════════════════════
// Calls Groq's chat completions API with streaming.
// Auto-fallback: if the chosen model returns 429 (rate limited), tries the next
// model in FALLBACK_CHAIN automatically (if autoFallback is enabled in settings).

async function explainWithGroq(
  text, apiKey, model, systemPrompt, userPrompt,
  onChunk, onDone, onError,
  autoFallback = false
) {
  // Build the list of models to try
  const toTry = autoFallback
    ? [model, ...FALLBACK_CHAIN.filter(m => m !== model)]
    : [model];

  for (let i = 0; i < toTry.length; i++) {
    const tryModel = toTry[i];
    const isRetry  = i > 0;

    if (isRetry) {
      onChunk('', `⚠ ${toTry[i-1]} is rate-limited — trying ${tryModel}…\n\n`);
    }

    const result = await _streamGroq(tryModel, apiKey, systemPrompt, userPrompt, onChunk);
    if (result.ok) { onDone(result.text); return; }

    const isRateLimit = result.status === 429;
    if (isRateLimit && autoFallback && i < toTry.length - 1) continue; // try next

    // Non-recoverable error or no more fallbacks
    let msg = result.error || `Groq error ${result.status}`;
    if (result.status === 401) msg = 'Invalid Groq API key — check Settings.';
    if (result.status === 429 && !autoFallback) msg = 'Rate limit hit. Enable Auto-fallback in Settings to switch models automatically, or wait a moment.';
    if (isRateLimit && autoFallback && i === toTry.length - 1) msg = 'All models are currently rate-limited. Wait a minute and try again.';
    onError(new Error(msg));
    return;
  }
}

async function _streamGroq(model, apiKey, systemPrompt, userPrompt, onChunk) {
  let response;
  try {
    response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user',   content: userPrompt   },
        ],
        max_tokens: 700,
        temperature: 0.7,
        stream: true,
      }),
    });
  } catch (err) {
    return { ok: false, status: 0, error: `Network error: ${err.message}` };
  }

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    return { ok: false, status: response.status, error: errData?.error?.message };
  }

  const reader  = response.body.getReader();
  const decoder = new TextDecoder();
  let full = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const raw   = decoder.decode(value, { stream: true });
    for (const line of raw.split('\n')) {
      if (!line.startsWith('data: ')) continue;
      const payload = line.slice(6).trim();
      if (payload === '[DONE]') continue;
      try {
        const delta = JSON.parse(payload).choices?.[0]?.delta?.content || '';
        if (delta) { full += delta; onChunk(delta, full); }
      } catch (_) {}
    }
  }

  return { ok: true, text: full };
}

// ══ GROQ TTS — ORPHEUS ════════════════════════════════════════════════════════
// Canopylabs Orpheus-v1-english via Groq's audio/speech endpoint.
// Free tier: 100 requests/day, 10/min. Falls back to browser speechSynthesis.
// Available voices: tara, leah, leo, jess, zac, zoe, mia, julia
const ORPHEUS_VOICES = [
  { id: 'tara',  label: 'Tara — warm, clear'      },
  { id: 'leah',  label: 'Leah — friendly, bright'  },
  { id: 'leo',   label: 'Leo — confident, steady'  },
  { id: 'jess',  label: 'Jess — energetic, expressive' },
  { id: 'zac',   label: 'Zac — calm, measured'     },
  { id: 'zoe',   label: 'Zoe — cheerful, light'    },
  { id: 'mia',   label: 'Mia — smooth, professional' },
  { id: 'julia', label: 'Julia — rich, articulate' },
];

async function speakWithOrpheus(text, apiKey, voice = 'tara') {
  // Truncate to ~1500 chars to stay comfortably under token limits
  const input = text.slice(0, 1500);
  const response = await fetch('https://api.groq.com/openai/v1/audio/speech', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'canopylabs/orpheus-v1-english',
      input,
      voice,
      response_format: 'mp3',
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw Object.assign(new Error(err.error?.message || `TTS error ${response.status}`), { status: response.status });
  }

  const blob = await response.blob();
  return URL.createObjectURL(blob); // caller must revoke when done
}

// ══ YOUTUBE ═══════════════════════════════════════════════════════════════════
async function searchYouTube(query, apiKey) {
  const q   = encodeURIComponent(`${query} explained simply`);
  const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${q}&type=video&maxResults=4&videoDuration=medium&relevanceLanguage=en&key=${apiKey}`;
  const res = await fetch(url);
  if (!res.ok) {
    const d = await res.json().catch(() => ({}));
    const msg = d?.error?.message || `YouTube API error (${res.status})`;
    if (res.status === 403) throw new Error('YouTube API key invalid or quota exceeded.');
    throw new Error(msg);
  }
  const data = await res.json();
  return (data.items || []).map(item => ({
    videoId:     item.id.videoId,
    title:       item.snippet.title,
    channelName: item.snippet.channelTitle,
    thumbnail:   item.snippet.thumbnails?.medium?.url || item.snippet.thumbnails?.default?.url,
  }));
}

// ══ WEB SEARCH ════════════════════════════════════════════════════════════════
async function searchWeb(query, searxngUrl) {
  if (searxngUrl?.trim()) {
    try { return await _searchSearXNG(query, searxngUrl.trim()); }
    catch (err) {
      console.warn('[BlankStare] SearXNG failed, falling back to DuckDuckGo:', err.message);
      return null;
    }
  }
  return null;
}

async function _searchSearXNG(query, baseUrl) {
  const url = `${baseUrl.replace(/\/$/, '')}/search?q=${encodeURIComponent(query)}&format=json&categories=general`;
  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error(`SearXNG error (${res.status})`);
  const data = await res.json();
  return (data.results || []).slice(0, 6).map(r => ({
    title: r.title || 'Untitled', url: r.url, snippet: r.content || '',
  }));
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
