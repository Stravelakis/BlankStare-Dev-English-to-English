// utils/api.js — BlankStare
// Every network call: the three AI providers, the daily model check, read-aloud
// and YouTube.
//
// Depends on utils/pure.js (roster logic, SSE parser, prompts) — load it first.

// ══ DAILY MODEL CHECK ═════════════════════════════════════════════════════════
// v0.7 shipped a fixed list of nine Groq models; Groq shut seven of them down
// and the extension stopped working. Now the list is rebuilt on the first use of
// each day, from:
//   1. The Nein — a public daily check of which free models really work
//   2. each provider's own model catalogue — what exists right now
// and stored in chrome.storage.local until tomorrow. If both are unreachable,
// the hand-ranked list in pure.js is used, so there is always something to try.

const ROSTER_KEY  = 'modelRoster';
const RESTING_KEY = 'modelResting';
const USAGE_KEY   = 'usageToday';
const FETCH_TIMEOUT_MS = 9000;

function usableProviders(settings) {
  return PROVIDER_ORDER.filter(p => {
    const need = PROVIDERS[p].needsKey;
    return !need || !!settings[need]?.trim();
  });
}

function keyFor(settings, provider) {
  const need = PROVIDERS[provider].needsKey;
  return need ? (settings[need] || '').trim() : '';
}

function authHeaders(provider, key) {
  if (!key) return {};
  return provider === 'google_gemini' ? { 'x-goog-api-key': key } : { Authorization: `Bearer ${key}` };
}

async function fetchWithTimeout(url, opts = {}, ms = FETCH_TIMEOUT_MS) {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), ms);
  try { return await fetch(url, { ...opts, signal: ctl.signal }); }
  finally { clearTimeout(t); }
}

async function fetchNein() {
  try {
    const res = await fetchWithTimeout(NEIN_URL, { headers: { Accept: 'application/json' } });
    if (!res.ok) return null;
    const data = await res.json();
    return Array.isArray(data?.models) ? data.models : null;
  } catch (_) { return null; }
}

async function fetchCatalogue(provider, key) {
  try {
    const res = await fetchWithTimeout(PROVIDERS[provider].listUrl, { headers: authHeaders(provider, key) });
    if (!res.ok) return { ok: false, status: res.status };
    const data = await res.json();
    if (provider === 'google_gemini') {
      return { ok: true, ids: (data.models || [])
        .filter(m => (m.supportedGenerationMethods || []).some(x => x === 'generateContent' || x === 'bidiGenerateContent'))
        .map(m => String(m.name).replace(/^models\//, '')) };
    }
    return { ok: true, ids: (data.data || []).filter(m => m.active !== false).map(m => m.id) };
  } catch (_) { return { ok: false, status: 0 }; }
}

function keysSignature(settings) {
  return usableProviders(settings).join(',');
}

async function refreshRoster(settings) {
  const usable = usableProviders(settings);
  const [nein, ...lists] = await Promise.all([
    fetchNein(),
    ...usable.map(p => fetchCatalogue(p, keyFor(settings, p))),
  ]);

  const catalogues = {};
  const checks = {};
  usable.forEach((p, i) => {
    checks[p] = lists[i].ok ? 'ok' : `failed (${lists[i].status || 'network'})`;
    if (lists[i].ok) catalogues[p] = lists[i].ids;
  });

  const items = buildRoster({ nein, catalogues, usable, pinned: settings.pinnedModel || '' });
  const record = {
    date: todayKey(), sig: keysSignature(settings), pinned: settings.pinnedModel || '',
    checkedAt: Date.now(), neinOk: !!nein, checks, items,
  };
  await chrome.storage.local.set({ [ROSTER_KEY]: record });
  return record;
}

async function getRoster(settings, { force = false } = {}) {
  const { [ROSTER_KEY]: saved } = await chrome.storage.local.get(ROSTER_KEY);
  const fresh = saved && saved.date === todayKey() && saved.sig === keysSignature(settings) &&
                saved.pinned === (settings.pinnedModel || '') && saved.items?.length;
  if (fresh && !force) return saved;
  return refreshRoster(settings);
}

async function getResting() {
  const { [RESTING_KEY]: r } = await chrome.storage.local.get(RESTING_KEY);
  return r && typeof r === 'object' ? r : {};
}

async function rest(entry, status, message) {
  const { scope, ms } = restFor(status, message);
  await restUntil(scope === 'provider' ? `${entry.provider}:*` : `${entry.provider}:${entry.model}`, ms);
  return scope;
}

async function restUntil(key, ms) {
  const r = await getResting();
  const now = Date.now();
  for (const k of Object.keys(r)) if (r[k] < now) delete r[k];   // tidy expired
  r[key] = Math.max(r[key] || 0, now + ms);
  await chrome.storage.local.set({ [RESTING_KEY]: r });
}

async function countUse(entry) {
  const { [USAGE_KEY]: u } = await chrome.storage.local.get(USAGE_KEY);
  const today = todayKey();
  const usage = u?.date === today ? u : { date: today, total: 0, byModel: {} };
  usage.total++;
  const k = `${entry.provider}:${entry.model}`;
  usage.byModel[k] = (usage.byModel[k] || 0) + 1;
  await chrome.storage.local.set({ [USAGE_KEY]: usage });
  return usage;
}

async function getUsage() {
  const { [USAGE_KEY]: u } = await chrome.storage.local.get(USAGE_KEY);
  return u?.date === todayKey() ? u : { date: todayKey(), total: 0, byModel: {} };
}

// ══ GENERATE — one request, walking down today's list ═════════════════════════
// Callbacks:
//   onChunk(delta, full) — text arrived
//   onModel(entry)       — this model is now answering
//   onStatus(msg)        — a one-line note, e.g. "switched to X"
//   onDone(full, meta)   — finished; meta = { entry, audio? }
//   onError(err)         — nothing could answer; err.partial holds any text
// An abort fires no callback: the caller is the one who aborted.

async function generate({
  settings, mode = 'normal', systemPrompt, userPrompt, image = null,
  maxTokens = 4096, temperature = 0.3, signal,
  onChunk = () => {}, onModel = () => {}, onStatus = () => {}, onDone = () => {}, onError = () => {},
}) {
  const roster  = await getRoster(settings);
  const resting = await getResting();
  let chain = image
    ? visionChain(usableProviders(settings), roster.items, resting)
    : chainFor(roster.items, mode, resting);

  // Everything is on a short rest (a burst of requests on the no-key lane):
  // better a slow answer than none. Only long rests — gone models, refused
  // keys — still count.
  if (!chain.length && !image) {
    const now = Date.now();
    const longOnly = Object.fromEntries(Object.entries(resting).filter(([, until]) => until - now > 2 * 60 * 1000));
    chain = chainFor(roster.items, mode, longOnly, now);
  }

  if (!chain.length) {
    onError(Object.assign(new Error(image
      ? 'No free model that can read images is available right now. Try again in a minute.'
      : 'Every free model is busy right now. Wait a minute and try again.'), { partial: '' }));
    return;
  }

  let lastFailure = null, lastWhy = '';
  for (let i = 0; i < chain.length; i++) {
    const entry = chain[i];
    if (i > 0) onStatus(`${shortName(chain[i - 1])} ${lastWhy} — switched to ${shortName(entry)}.`);
    onModel(entry);

    const result = await runModel({
      entry, key: keyFor(settings, entry.provider), systemPrompt, userPrompt, image,
      maxTokens, temperature, signal, onChunk,
    });

    if (result.aborted) return;
    if (result.ok && result.text.trim()) {
      await countUse(entry);
      // OVH's no-key lane allows 2 requests a minute per model, and over that
      // it slows down rather than refusing (a checklist took 164s in testing).
      // Resting the model for 30s spreads the next requests across the others.
      if (!PROVIDERS[entry.provider].needsKey) await restUntil(`${entry.provider}:${entry.model}`, 30 * 1000);
      if (i === 0) onStatus('');
      onDone(normalizeText(result.text), { entry, audio: result.audio || null });
      return;
    }

    // Text already on screen is worth keeping: a half answer beats starting a
    // different model from scratch over the top of it.
    if (result.partial) {
      onError(Object.assign(new Error('The connection dropped part-way through. The partial translation is shown above — try again for the rest.'),
        { partial: normalizeText(result.partial), status: result.status }));
      return;
    }

    lastFailure = result;
    const scope = await rest(entry, result.status, result.error);
    lastWhy = restFor(result.status, result.error).ms >= 24 * 3600 * 1000 && scope === 'model'
      ? 'is no longer available' : 'was busy';
    if (scope === 'provider' && PROVIDERS[entry.provider].needsKey) {
      onStatus(`${PROVIDERS[entry.provider].label} refused the key — check it in Settings. Using the next provider.`);
    }
  }

  onStatus('');
  onError(Object.assign(new Error(describeFailure(lastFailure)), { partial: '', status: lastFailure?.status }));
}

function shortName(entry) {
  return entry.model.split('/').pop();
}

function describeFailure(r) {
  if (!r) return 'Something went wrong.';
  if (r.status === 0)   return 'Could not reach any AI service. Check your internet connection.';
  if (r.status === 429) return 'Every free model is rate-limited right now. Wait a minute and try again.';
  return r.error || `The AI service answered with error ${r.status}.`;
}

function visionChain(usable, items, resting, now = Date.now()) {
  const want = {
    google_gemini: ['gemma-4-31b-it', 'gemma-4-26b-a4b-it', 'gemini-3.5-flash-lite'],
    groq:          ['qwen/qwen3.8-27b'],
    ovh:           ['Qwen2.5-VL-72B-Instruct', 'qwen3-vl-30b-a3b'],
  };
  const out = [];
  for (const provider of PROVIDER_ORDER) {
    if (!usable.includes(provider) || (resting[`${provider}:*`] || 0) > now) continue;
    for (const model of want[provider]) {
      if ((resting[`${provider}:${model}`] || 0) > now) continue;
      // Vision models are not in the translation roster (they are filtered out
      // as "not a translator"), so only skip ones today's roster shows as gone
      // from a catalogue we did manage to read — approximated by trying them.
      out.push({ provider, model, transport: transportFor(provider, model) });
    }
  }
  return out;
}

// ══ TRANSPORTS ════════════════════════════════════════════════════════════════

async function runModel(args) {
  if (args.entry.transport === 'live') return runLive(args);
  return runHttpStream(args);
}

function _isAbort(err) { return err?.name === 'AbortError'; }

async function runHttpStream({ entry, key, systemPrompt, userPrompt, image, maxTokens, temperature, signal, onChunk, firstWordMs: firstWordOverride }) {
  const { provider, model } = entry;
  const url = PROVIDERS[provider].chatUrl(model);
  let body;

  if (entry.transport === 'gemini') {
    const parts = [{ text: userPrompt }];
    if (image) parts.push({ inlineData: { mimeType: image.mime, data: image.base64 } });
    body = {
      systemInstruction: { parts: [{ text: systemPrompt }] },
      contents: [{ role: 'user', parts }],
      generationConfig: { temperature, maxOutputTokens: maxTokens },
    };
  } else {
    const content = image
      ? [{ type: 'text', text: userPrompt }, { type: 'image_url', image_url: { url: `data:${image.mime};base64,${image.base64}` } }]
      : userPrompt;
    body = {
      model,
      messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content }],
      max_tokens: maxTokens, temperature, stream: true,
      ...requestExtras(provider, model),
    };
  }

  // A stalled model is treated like a busy one. OVH's no-key lane slows down
  // instead of refusing when it is over its limit (a first answer once took
  // 68s), so if no word has arrived in time, give the next model a turn.
  // The reader's own abort still wins: it is checked first.
  const firstWordMs = firstWordOverride || (PROVIDERS[provider].needsKey ? 60000 : 20000);
  const stall = new AbortController();
  const onOuterAbort = () => stall.abort();
  signal?.addEventListener('abort', onOuterAbort);
  let stallTimer = setTimeout(() => stall.abort(), firstWordMs);
  const stalled = () => !signal?.aborted && stall.signal.aborted;
  const cleanup = () => { clearTimeout(stallTimer); signal?.removeEventListener('abort', onOuterAbort); };

  let response;
  try {
    response = await fetch(url, {
      method: 'POST', signal: stall.signal,
      headers: { 'Content-Type': 'application/json', ...authHeaders(provider, key) },
      body: JSON.stringify(body),
    });
  } catch (err) {
    cleanup();
    if (stalled()) return { ok: false, status: 503, error: 'No answer in time.', partial: '' };
    if (_isAbort(err)) return { aborted: true };
    return { ok: false, status: 0, error: `Network error: ${err.message}`, partial: '' };
  }

  if (!response.ok) {
    cleanup();
    const errData = await response.json().catch(() => ({}));
    const raw = Array.isArray(errData) ? errData[0] : errData;
    return { ok: false, status: response.status, error: raw?.error?.message || '', partial: '' };
  }

  // A 2xx with no body is possible (a 204, or a proxy that strips it). Reading
  // .getReader() off null would throw past both callbacks and hang the cursor.
  if (!response.body) { cleanup(); return { ok: false, status: response.status, error: 'The response arrived empty.', partial: '' }; }

  const decoder = new TextDecoder();
  const parser  = createSSEParser();
  let full = '';
  // Thinking models stream their thinking first; any bytes at all prove the
  // model is alive, so the stall clock is reset on every chunk, not only on
  // answer text.
  const take = deltas => { for (const d of deltas) { full += d; onChunk(d, full); } };
  const alive = () => { clearTimeout(stallTimer); stallTimer = setTimeout(() => stall.abort(), firstWordMs); };

  try {
    const reader = response.body.getReader();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      alive();
      take(parser.push(decoder.decode(value, { stream: true })));
    }
    take(parser.flush());
  } catch (err) {
    cleanup();
    if (stalled()) return { ok: false, status: 503, error: 'The model stopped answering.', partial: full };
    if (_isAbort(err)) return { aborted: true };
    return { ok: false, status: 0, error: `Connection lost: ${err.message}`, partial: full };
  }
  cleanup();

  // A model that spent its whole budget thinking answers 200 with no text.
  // Treat that as a failure so the next model gets a turn.
  if (!full.trim()) return { ok: false, status: 204, error: 'The model returned no answer.', partial: '' };
  return { ok: true, text: full };
}

// Gemini Live: a WebSocket session. The model only answers in voice; the
// written transcript of that voice is the translation. The voice is kept so
// "Read aloud" can play it instantly, free.
function runLive({ entry, key, systemPrompt, userPrompt, signal, onChunk }) {
  return new Promise(resolve => {
    let full = '', settled = false, started = false;
    const audio = [];
    const ws = new WebSocket(`${PROVIDERS.google_gemini.liveUrl}?key=${encodeURIComponent(key)}`);
    ws.binaryType = 'arraybuffer';

    const finish = r => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      signal?.removeEventListener('abort', onAbort);
      try { ws.close(); } catch (_) {}
      resolve(r);
    };
    const onAbort = () => finish({ aborted: true });
    signal?.addEventListener('abort', onAbort);
    const timer = setTimeout(() => finish(full
      ? { ok: true, text: full, audio: audio.length ? audio : null }
      : { ok: false, status: 0, error: 'Gemini Live took too long to answer.', partial: '' }), 150000);

    ws.onopen = () => ws.send(JSON.stringify({ setup: {
      model: `models/${entry.model}`,
      generationConfig: { responseModalities: ['AUDIO'] },
      systemInstruction: { parts: [{ text: systemPrompt }] },
      outputAudioTranscription: {},
    } }));

    ws.onmessage = ev => {
      let msg;
      try { msg = JSON.parse(typeof ev.data === 'string' ? ev.data : new TextDecoder().decode(ev.data)); }
      catch (_) { return; }

      if (msg.setupComplete && !started) {
        started = true;
        ws.send(JSON.stringify({ clientContent: { turns: [{ role: 'user', parts: [{ text: userPrompt }] }], turnComplete: true } }));
        return;
      }
      const sc = msg.serverContent;
      if (!sc) return;
      const piece = sc.outputTranscription?.text;
      if (piece) { full += piece; onChunk(piece, full); }
      for (const p of sc.modelTurn?.parts || []) {
        if (p.inlineData?.data) audio.push(base64ToBytes(p.inlineData.data));
      }
      if (sc.turnComplete) finish({ ok: true, text: full, audio: audio.length ? audio : null });
    };

    ws.onerror = () => {};   // details arrive in onclose
    ws.onclose = ev => {
      if (settled) return;
      const reason = ev.reason || '';
      const status = /quota|exhausted|rate/i.test(reason) ? 429
                   : /free tier|billing|api key|permission/i.test(reason) ? 403
                   : /not found|not supported/i.test(reason) ? 404 : 0;
      finish(full ? { ok: false, status, error: reason, partial: full }
                  : { ok: false, status, error: reason || 'Gemini Live closed the connection.', partial: '' });
    };
  });
}

function base64ToBytes(b64) {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function liveAudioUrl(chunks) {
  return URL.createObjectURL(new Blob([pcmToWav(chunks)], { type: 'audio/wav' }));
}

// ══ KEY TEST — used by Settings ═══════════════════════════════════════════════
// Checks the key against the provider's own model list, then asks the best
// model it finds for one word. Never names a fixed model: that is exactly what
// broke in v0.7.
async function testProvider(provider, key) {
  const cat = await fetchCatalogue(provider, key);
  if (!cat.ok) {
    if (cat.status === 401 || cat.status === 403 || cat.status === 400) return { ok: false, message: 'That key was refused. Copy it again from the provider and paste it here.' };
    if (cat.status === 0) return { ok: false, message: 'Could not reach the provider. Check your internet connection.' };
    return { ok: false, message: `The provider answered with error ${cat.status}.` };
  }
  const nein  = await fetchNein();
  const items = buildRoster({ nein, catalogues: { [provider]: cat.ids }, usable: [provider] })
    .filter(r => r.transport !== 'live');
  if (!items.length) return { ok: false, message: 'The key works, but no free translation model is available on it today.' };

  // Ask up to three models at once and take the first answer: a key test
  // should take seconds, and one slow model (Gemma thinks before it answers)
  // once made it take over a minute.
  const tries = items.slice(0, 3).map(entry => runHttpStream({
    entry, key, systemPrompt: 'Reply with the single word OK.', userPrompt: 'OK?',
    maxTokens: 512, temperature: 0, onChunk: () => {}, firstWordMs: 25000,
  }).then(r => ({ ...r, entry }), err => ({ ok: false, error: err.message, entry })));
  const results = [];
  const first = await new Promise(resolve => {
    let left = tries.length;
    tries.forEach(t => t.then(r => {
      results.push(r);
      if (r.ok) resolve(r);
      else if (--left === 0) resolve(null);
    }));
  });
  if (first) return { ok: true, model: first.entry.model, count: items.length + (cat.ids.some(id => /-live$/.test(id)) ? 1 : 0) };
  const refused = results.find(r => r.status === 401 || r.status === 403);
  if (refused) {
    return { ok: false, message: /free tier is not available|billing/i.test(refused.error || '')
      ? 'This key belongs to a Google project without the free tier. Make a new key in a project with no billing set up.'
      : 'That key was refused. Copy it again and paste it here.' };
  }
  return { ok: false, message: 'The key works, but every free model is busy. Try again in a minute.' };
}

// ══ GLOSSARY ══════════════════════════════════════════════════════════════════
// Supplementary pass after a translation is shown. Uses the same chain as
// everything else, minus the Live model (it needs strict JSON, not speech).
function fetchGlossary({ settings, source, signal }) {
  return new Promise((resolve, reject) => {
    generate({
      settings, mode: 'glossary', signal, maxTokens: 2048, temperature: 0.1,
      systemPrompt: 'You extract technical terms. You answer only with JSON.',
      userPrompt: buildGlossaryPrompt(source),
      onDone: raw => {
        try {
          const json = raw.replace(/```json|```/g, '').trim();
          const start = json.indexOf('['), end = json.lastIndexOf(']');
          const terms = JSON.parse(start >= 0 ? json.slice(start, end + 1) : '[]');
          resolve((Array.isArray(terms) ? terms : [])
            .filter(t => t && typeof t.term === 'string' && typeof t.def === 'string').slice(0, 20));
        } catch (_) { reject(new Error('The glossary came back unreadable. Try again.')); }
      },
      onError: err => reject(err),
    });
    signal?.addEventListener('abort', () => reject(Object.assign(new Error('aborted'), { name: 'AbortError' })));
  });
}

// ══ GROQ TTS — ORPHEUS ════════════════════════════════════════════════════════
// English-only voice, used when the answer did not come with its own voice
// from Gemini Live. Falls back to the browser's voice.
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

const ORPHEUS_MAX_CHARS = 1500;

async function speakWithOrpheus(text, apiKey, voice = 'tara', signal) {
  const input     = text.slice(0, ORPHEUS_MAX_CHARS);
  const truncated = text.length > ORPHEUS_MAX_CHARS;

  const response = await fetch('https://api.groq.com/openai/v1/audio/speech', {
    method: 'POST', signal,
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: 'canopylabs/orpheus-v1-english', input, voice, response_format: 'mp3' }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    const msg = response.status === 429
      ? 'Orpheus daily limit reached — using the browser voice instead.'
      : (err.error?.message || `Voice error ${response.status}`);
    throw Object.assign(new Error(msg), { status: response.status });
  }

  const blob = await response.blob();
  return { url: URL.createObjectURL(blob), truncated };   // caller must revoke the url
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
      thumbnail:   safeUrl(item.snippet?.thumbnails?.medium?.url || item.snippet?.thumbnails?.default?.url || ''),
    }));
}

