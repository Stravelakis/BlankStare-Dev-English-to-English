// settings.js — BlankStare v0.8
//
// One page, two modes:
//   - first run (settings.onboarded false): a five-step setup over the blinds
//   - after that: normal settings, saved the moment something changes
//
// Needs, loaded before it: lottie, fx.js (BSFX), pure.js, storage.js, api.js.

const $  = id => document.getElementById(id);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

const BRASS = { colors: ['#0d0c0a', '#C9A227'], light: '#ffe4c4', spark: '#F2DCA0' };
const KEY_FIELD = { google_gemini: 'geminiApiKey', groq: 'groqApiKey', youtube: 'youtubeKey' };
// Google now issues two key shapes (AIza… and AQ.…), so Google keys are only
// checked for length; the real test is asking Google.
const KEY_PREFIX = { google_gemini: /^[\w.-]{20,}$/, groq: /^gsk_/, youtube: /^[\w.-]{20,}$/ };

let settings = {};
let bg = null;

$('about-version').textContent = `v${chrome.runtime.getManifest().version}`;

// ══ Background ═══════════════════════════════════════════════════════════════
bg = BSFX.blinds($('bg'), { colors: BRASS.colors, light: BRASS.light });

// Cards pick up a soft brass light where the pointer is.
document.addEventListener('pointermove', e => {
  const card = e.target.closest?.('.card');
  if (!card) return;
  const r = card.getBoundingClientRect();
  card.style.setProperty('--mx', `${e.clientX - r.left}px`);
  card.style.setProperty('--my', `${e.clientY - r.top}px`);
});

// ══ Lottie ═══════════════════════════════════════════════════════════════════
function lottieIn(id, file, { loop = true } = {}) {
  const el = $(id);
  if (!el || typeof lottie === 'undefined') return null;
  try {
    const a = lottie.loadAnimation({ container: el, renderer: 'svg', loop, autoplay: !BSFX.REDUCED, path: chrome.runtime.getURL(`icons/lottie/${file}`) });
    if (BSFX.REDUCED) a.addEventListener('DOMLoaded', () => a.goToAndStop(0, true));
    return a;
  } catch (_) { return null; }
}
function initLottie() {
  lottieIn('lottie-header', 'icon-settings.json');
  lottieIn('lottie-wiz', 'icon-settings.json');
  lottieIn('lottie-lang', 'icon-eyes.json');
  lottieIn('lottie-ai', 'icon-apikey.json');
  lottieIn('lottie-voice', 'icon-read.json');
  lottieIn('lottie-trigger', 'icon-assign.json');
  lottieIn('lottie-youtube', 'icon-video.json');
  lottieIn('lottie-about', 'icon-coding.json');
}

// ══ Entrance ═════════════════════════════════════════════════════════════════
const revealer = new IntersectionObserver(entries => {
  entries.forEach(e => {
    if (!e.isIntersecting) return;
    const i = $$('.reveal').indexOf(e.target);
    setTimeout(() => e.target.classList.add('seen'), Math.min(i, 6) * 80);
    revealer.unobserve(e.target);
  });
}, { threshold: 0.08 });
function startReveal() {
  $$('.reveal').forEach(el => revealer.observe(el));
  // Never leave a card invisible: whatever has not scrolled in by now shows anyway.
  setTimeout(() => $$('.reveal:not(.seen)').forEach(el => el.classList.add('seen')), 2500);
}

// ══ Saving ═══════════════════════════════════════════════════════════════════
let toastTimer = 0;
function toast(msg, bad = false) {
  const t = $('toast');
  t.textContent = msg;
  t.classList.toggle('bad', bad);
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 1800);
}

let saveTimer = 0, pending = {};
function save(partial, { quiet = false, now = false } = {}) {
  Object.assign(settings, partial);
  Object.assign(pending, partial);
  clearTimeout(saveTimer);
  const flush = async () => {
    const batch = pending; pending = {};
    await saveSettings(batch);
    chrome.runtime.sendMessage({ type: 'SETTINGS_CHANGED' }).catch(() => {});
    if (!quiet) toast('Saved ✓');
  };
  if (now) return flush();
  saveTimer = setTimeout(flush, 450);
}

// ══ Segmented choices (settings page) ═══════════════════════════════════════
function placeThumb(seg) {
  const sel = seg.querySelector('.seg-btn.sel');
  let thumb = seg.querySelector('.seg-thumb');
  if (!thumb) { thumb = document.createElement('span'); thumb.className = 'seg-thumb'; seg.prepend(thumb); }
  if (!sel) { thumb.style.width = '0'; return; }
  thumb.style.left = `${sel.offsetLeft}px`; thumb.style.top = `${sel.offsetTop}px`;
  thumb.style.width = `${sel.offsetWidth}px`; thumb.style.height = `${sel.offsetHeight}px`;
}
function setSeg(group, value) {
  $$(`.seg[data-group="${group}"]`).forEach(seg => {
    seg.querySelectorAll('.seg-btn').forEach(b => {
      b.classList.toggle('sel', b.dataset.value === value);
      b.setAttribute('aria-pressed', String(b.dataset.value === value));
    });
    placeThumb(seg);
  });
}
$$('.seg').forEach(seg => seg.addEventListener('click', e => {
  const b = e.target.closest('.seg-btn'); if (!b) return;
  const group = seg.dataset.group;
  setSeg(group, b.dataset.value);
  save({ [group]: b.dataset.value });
  if (group === 'ttsMode') voiceNote();
}));
addEventListener('resize', () => $$('.seg').forEach(placeThumb));

// ══ Tabs ═════════════════════════════════════════════════════════════════════
function moveInk() {
  const a = document.querySelector('.tab.active'), ink = document.querySelector('.tab-ink');
  if (!a || !ink) return;
  ink.style.left = `${a.offsetLeft}px`; ink.style.width = `${a.offsetWidth}px`;
}
$$('.tab').forEach(tab => tab.addEventListener('click', () => {
  $$('.tab').forEach(t => { t.classList.toggle('active', t === tab); t.setAttribute('aria-selected', String(t === tab)); });
  $$('.tab-content').forEach(c => c.classList.add('hidden'));
  const panel = $(`tab-${tab.dataset.tab}`);
  panel.classList.remove('hidden', 'entering'); void panel.offsetWidth; panel.classList.add('entering');
  $$('.reveal', panel).forEach(el => el.classList.add('seen'));
  moveInk();
  requestAnimationFrame(() => $$('.seg', panel).forEach(placeThumb));
  try { sessionStorage.setItem('bs-tab', tab.dataset.tab); } catch (_) {}
}));
addEventListener('resize', moveInk);

// ══ Keys ═════════════════════════════════════════════════════════════════════
$$('.eye').forEach(b => b.addEventListener('click', () => {
  const i = $(b.dataset.target);
  i.type = i.type === 'password' ? 'text' : 'password';
  b.textContent = i.type === 'password' ? '👁' : '🙈';
}));

function setBadge(provider, state) {
  const badge = $(`badge-${provider}`);
  const card = document.querySelector(`.provider[data-provider="${provider}"]`);
  if (!badge) return;
  const map = { none: ['No key', ''], saved: ['Key saved', 'wait'], ok: ['Working', 'on'], bad: ['Refused', 'bad'] };
  const [text, cls] = map[state] || map.none;
  badge.textContent = text; badge.className = `badge ${cls}`;
  card?.classList.toggle('live', state === 'ok');
}

function sparkAt(el) {
  const host = el.closest('.card, .wiz-card') || document.body;
  const r = el.getBoundingClientRect(), h = host.getBoundingClientRect();
  BSFX.sparks(host, r.left - h.left + r.width / 2, r.top - h.top + r.height / 2, { color: BRASS.spark, count: 26, boost: 1.4 });
}

// Runs a real check: the provider's model list plus one tiny answer.
async function checkKey(provider, key, out, btn) {
  out.className = 'result';
  if (provider !== 'ovh') {
    if (!key) { out.classList.add('bad'); out.textContent = 'Paste a key first.'; return false; }
    if (!KEY_PREFIX[provider].test(key)) {
      out.classList.add('bad');
      out.textContent = provider === 'groq' ? 'Groq keys start with gsk_. Copy it again.' : 'That does not look like a whole key. Copy it again.';
      return false;
    }
  }
  btn.classList.add('busy'); btn.disabled = true;
  BSFX.decode(out, provider === 'ovh' ? 'Asking OVHcloud for an answer…' : 'Checking the key… finding today’s free models…', { duration: 700 });
  try {
    if (provider === 'youtube') {
      const res = await fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&q=test&maxResults=1&key=${encodeURIComponent(key)}`);
      if (res.ok) { out.classList.add('ok'); await BSFX.decode(out, '✓ YouTube key works.', { duration: 600 }); sparkAt(btn); return true; }
      out.classList.add('bad');
      await BSFX.decode(out, res.status === 403 ? 'Refused. Check that YouTube Data API v3 is enabled for this key.' : `YouTube answered with error ${res.status}.`, { duration: 600 });
      return false;
    }
    const r = await testProvider(provider, key);
    if (r.ok) {
      out.classList.add('ok');
      const lines = [`✓ ${provider === 'ovh' ? 'OVHcloud answered' : 'Key works'}.`, `✓ ${r.count} free model${r.count === 1 ? '' : 's'} ready, answered by ${r.model.split('/').pop()}`];
      if (provider === 'google_gemini' && r.count > 1) lines.push('✓ Answers can come with a voice, too');
      await BSFX.decode(out, lines.join('\n'), { duration: 1100 });
      sparkAt(btn);
      return true;
    }
    out.classList.add('bad');
    await BSFX.decode(out, r.message, { duration: 600 });
    return false;
  } catch (err) {
    out.classList.add('bad');
    out.textContent = `Could not check: ${err.message}`;
    return false;
  } finally {
    btn.classList.remove('busy'); btn.disabled = false;
  }
}

['google_gemini', 'groq', 'youtube'].forEach(p => {
  const input = $(`key-${p}`);
  input.addEventListener('input', () => {
    const v = input.value.trim();
    save({ [KEY_FIELD[p]]: v }, { quiet: true });
    if (p !== 'youtube') setBadge(p, v ? 'saved' : 'none');
  });
  input.addEventListener('change', () => toast('Saved ✓'));
});
$$('[data-test]').forEach(btn => btn.addEventListener('click', async () => {
  const p = btn.dataset.test;
  const key = $(`key-${p}`).value.trim();
  await save({ [KEY_FIELD[p]]: key }, { quiet: true, now: true });
  const ok = await checkKey(p, key, $(`result-${p}`), btn);
  if (p !== 'youtube') { setBadge(p, ok ? 'ok' : key ? 'bad' : 'none'); loadRoster(true); }
}));

// ══ Today's models ═══════════════════════════════════════════════════════════
function status(text, cls) {
  const pill = $('status-pill');
  pill.className = `status-pill ${cls || ''}`;
  pill.querySelector('span').textContent = text;
}

async function loadRoster(force = false) {
  status('Checking today’s free AI…', 'busy');
  const btn = $('roster-refresh'); btn.classList.add('busy'); btn.disabled = true;
  try {
    const roster = await getRoster(settings, { force });
    const resting = await getResting();
    const now = Date.now();
    const items = roster.items || [];
    const list = $('roster-list');
    list.innerHTML = '';
    items.forEach((it, i) => {
      const li = document.createElement('li');
      const rest = (resting[`${it.provider}:${it.model}`] || 0) > now || (resting[`${it.provider}:*`] || 0) > now;
      li.classList.toggle('resting', rest);
      li.style.animationDelay = `${Math.min(i, 12) * 30}ms`;
      li.append(document.createTextNode(it.model.split('/').pop()));
      if (it.transport === 'live') { const t = document.createElement('span'); t.className = 'tag'; t.textContent = 'voice'; li.append(t); }
      const who = document.createElement('span'); who.className = 'who';
      who.textContent = (PROVIDERS[it.provider]?.label || it.provider).replace(/ \(.*\)$/, '') + (rest ? ' · resting' : '');
      li.append(who);
      list.append(li);
    });
    $('model-count').textContent = `(${items.length})`;

    const sel = $('pinned-model');
    sel.length = 1;
    items.forEach(it => sel.add(new Option(`${it.model.split('/').pop()} · ${(PROVIDERS[it.provider]?.label || it.provider).replace(/ \(.*\)$/, '')}`, `${it.provider}:${it.model}`)));
    sel.value = items.some(it => `${it.provider}:${it.model}` === settings.pinnedModel) ? settings.pinnedModel : '';

    const when = new Date(roster.checkedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const failed = Object.entries(roster.checks || {}).filter(([, v]) => v !== 'ok').map(([p]) => PROVIDERS[p]?.label.replace(/ \(.*\)$/, '') || p);
    $('roster-note').textContent = `Checked today at ${when}. ${roster.neinOk ? 'Free status from The Nein.' : 'The Nein was not reachable, so the built-in ranking is used.'}${failed.length ? ` Could not reach: ${failed.join(', ')}.` : ''}`;

    if (items.length) status(`Ready · ${items.length} free model${items.length === 1 ? '' : 's'} today`, 'ok');
    else status('No free model reachable right now', 'warn');
  } catch (err) {
    status('Could not check the AI right now', 'warn');
    $('roster-note').textContent = `Could not check: ${err.message}`;
  } finally {
    btn.classList.remove('busy'); btn.disabled = false;
  }
}
$('roster-refresh').addEventListener('click', () => loadRoster(true));
$('pinned-model').addEventListener('change', async e => {
  await save({ pinnedModel: e.target.value }, { now: true });
  loadRoster(false);
});

// ══ Voice ════════════════════════════════════════════════════════════════════
function voiceNote() {
  const mode = settings.ttsMode || 'auto';
  const hasGroq = !!(settings.groqApiKey || '').trim();
  const notes = {
    auto: 'Uses Gemini’s own voice when the answer came from Gemini Live, otherwise Orpheus (with a Groq key) or your browser’s voice.',
    orpheus: hasGroq ? 'Expressive English voice from Groq, about 100 a day free. Falls back to the browser voice.' : 'Orpheus needs a free Groq key (above). Until then, the browser voice is used.',
    browser: 'Your computer’s built-in voice. Free and unlimited, works in Greek too.',
  };
  $('tts-note').textContent = notes[mode];
  $('orpheus-row').classList.toggle('hidden', mode === 'browser');
}
$('orpheus-voice').addEventListener('change', e => save({ orpheusVoice: e.target.value }));

// ══ Toggles, text fields ════════════════════════════════════════════════════
const TRIGGERS = ['trigger-rightclick', 'trigger-floating'];
TRIGGERS.forEach(id => $(id).addEventListener('change', e => {
  if (!TRIGGERS.some(t => $(t).checked)) {
    e.target.checked = true;
    toast('Keep at least one way to open BlankStare.', true);
    return;
  }
  save({ triggerRightClick: $('trigger-rightclick').checked, triggerFloating: $('trigger-floating').checked });
}));
$('jargon-dictionary').addEventListener('change', e => save({ jargonDictionary: e.target.checked }));
$('user-context').addEventListener('input', e => save({ userContext: e.target.value.trim() }, { quiet: true }));
$('user-context').addEventListener('change', () => toast('Saved ✓'));
$('exclude-list').addEventListener('change', e => {
  const list = e.target.value.split('\n')
    .map(s => s.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, ''))
    .filter(Boolean);
  e.target.value = list.join('\n');
  save({ excludeList: list });
});
document.addEventListener('keydown', e => {
  if ((e.ctrlKey || e.metaKey) && e.key === 's') { e.preventDefault(); toast('Everything saves by itself ✓'); }
});

// ══ Fill the form ═══════════════════════════════════════════════════════════
function fillForm() {
  setSeg('language', settings.language || 'en');
  setSeg('readingLevel', VALID_LEVELS.includes(settings.readingLevel) ? settings.readingLevel : 'standard');
  setSeg('ttsMode', settings.ttsMode || 'auto');
  $('user-context').value = settings.userContext || '';
  $('key-google_gemini').value = settings.geminiApiKey || '';
  $('key-groq').value = settings.groqApiKey || '';
  $('key-youtube').value = settings.youtubeKey || '';
  setBadge('google_gemini', settings.geminiApiKey ? 'saved' : 'none');
  setBadge('groq', settings.groqApiKey ? 'saved' : 'none');
  $('orpheus-voice').value = settings.orpheusVoice || 'zoe';
  $('trigger-rightclick').checked = settings.triggerRightClick !== false;
  $('trigger-floating').checked = settings.triggerFloating !== false;
  $('jargon-dictionary').checked = !!settings.jargonDictionary;
  $('exclude-list').value = (settings.excludeList || []).join('\n');
  voiceNote();
}

// ══ First-run setup ═════════════════════════════════════════════════════════
const wiz = {
  step: 0,
  last: 4,
  picks: { language: 'en', readingLevel: 'standard', provider: 'ovh' },
};

function buildSteps() {
  const host = $('wiz-steps');
  host.innerHTML = '';
  for (let i = 0; i <= wiz.last; i++) {
    const d = document.createElement('div'); d.className = 'dot'; d.textContent = i + 1; host.append(d);
    if (i < wiz.last) { const b = document.createElement('div'); b.className = 'bar'; b.append(document.createElement('i')); host.append(b); }
  }
}

function wizGo(n) {
  n = Math.max(0, Math.min(wiz.last, n));
  wiz.step = n;
  $$('#wiz-stage .pane').forEach((p, i) => { p.classList.toggle('in', i === n); p.classList.toggle('out', i < n); });
  $$('#wiz-steps .dot').forEach((d, i) => { d.classList.toggle('on', i === n); d.classList.toggle('done', i < n); });
  $$('#wiz-steps .bar').forEach((b, i) => b.classList.toggle('fill', i < n));
  $('wiz-back').hidden = n === 0;
  $('wiz-next').textContent = n === wiz.last ? 'Start using BlankStare' : 'Next';
  if (n === 3) $$('[data-for]').forEach(el => el.classList.toggle('show', el.dataset.for === wiz.picks.provider));
  const focus = $$('#wiz-stage .pane')[n].querySelector('.choice.sel, input, .btn');
  setTimeout(() => focus?.focus({ preventScroll: true }), 350);
}

$$('#wizard .choices').forEach(g => {
  const group = g.dataset.group;
  g.addEventListener('click', e => {
    const b = e.target.closest('.choice'); if (!b) return;
    g.querySelectorAll('.choice').forEach(x => { x.classList.toggle('sel', x === b); x.setAttribute('aria-pressed', String(x === b)); });
    wiz.picks[group] = b.dataset.value;
  });
  g.addEventListener('dblclick', e => { if (e.target.closest('.choice')) wizGo(wiz.step + 1); });
});

function wizSelectDefaults() {
  for (const [group, value] of Object.entries(wiz.picks)) {
    $$(`#wizard .choices[data-group="${group}"] .choice`).forEach(b => { b.classList.toggle('sel', b.dataset.value === value); b.setAttribute('aria-pressed', String(b.dataset.value === value)); });
  }
}

$('wiz-test-ovh').addEventListener('click', e => checkKey('ovh', '', $('wiz-result-ovh'), e.currentTarget));
$$('[data-wiz-test]').forEach(btn => btn.addEventListener('click', async () => {
  const p = btn.dataset.wizTest;
  const key = $(`wiz-key-${p}`).value.trim();
  if (key && KEY_PREFIX[p].test(key)) await save({ [KEY_FIELD[p]]: key }, { quiet: true, now: true });
  const ok = await checkKey(p, key, $(`wiz-result-${p}`), btn);
  if (ok) setTimeout(() => { if (wiz.step === 3) wizGo(4); }, 1400);
}));

$('wiz-back').addEventListener('click', () => wizGo(wiz.step - 1));
$('wiz-next').addEventListener('click', () => {
  if (wiz.step === 0 || wiz.step === 1) save({ [wiz.step === 0 ? 'language' : 'readingLevel']: wiz.picks[wiz.step === 0 ? 'language' : 'readingLevel'] }, { quiet: true });
  if (wiz.step === 3 && wiz.picks.provider !== 'ovh') {
    const key = $(`wiz-key-${wiz.picks.provider}`).value.trim();
    if (key && KEY_PREFIX[wiz.picks.provider].test(key)) save({ [KEY_FIELD[wiz.picks.provider]]: key }, { quiet: true });
  }
  if (wiz.step < wiz.last) { wizGo(wiz.step + 1); return; }
  finishWizard();
});
$('wiz-skip').addEventListener('click', () => finishWizard());
document.addEventListener('keydown', e => {
  if ($('wizard').classList.contains('hidden')) return;
  if (e.key === 'Enter' && !e.target.closest('input, button, a, textarea')) { e.preventDefault(); $('wiz-next').click(); }
  if (e.key === 'Escape') finishWizard();
});

function openWizard() {
  wiz.picks.language = settings.language || 'en';
  wiz.picks.readingLevel = VALID_LEVELS.includes(settings.readingLevel) ? settings.readingLevel : 'standard';
  wiz.picks.provider = settings.geminiApiKey ? 'google_gemini' : settings.groqApiKey ? 'groq' : 'ovh';
  $('wiz-key-google_gemini').value = settings.geminiApiKey || '';
  $('wiz-key-groq').value = settings.groqApiKey || '';
  $$('#wizard .result').forEach(r => { r.textContent = ''; r.className = 'result'; });
  wizSelectDefaults();
  buildSteps();
  $('wizard').classList.remove('hidden', 'leaving');
  document.body.classList.add('wiz-open');
  wizGo(0);
}

async function finishWizard() {
  await save({
    language: wiz.picks.language,
    readingLevel: wiz.picks.readingLevel,
    onboarded: true,
  }, { quiet: true, now: true });
  $('wizard').classList.add('leaving');
  document.body.classList.remove('wiz-open');
  setTimeout(() => $('wizard').classList.add('hidden'), 700);
  fillForm();
  startReveal();
  requestAnimationFrame(() => { $$('.seg').forEach(placeThumb); moveInk(); });
  loadRoster(false);
  toast('All set ✓');
}
$('rerun-setup').addEventListener('click', openWizard);

// ══ Start ═══════════════════════════════════════════════════════════════════
(async () => {
  settings = await getSettings();
  fillForm();
  setTimeout(initLottie, 60);
  let tab = 'settings';
  try { tab = sessionStorage.getItem('bs-tab') || 'settings'; } catch (_) {}
  if (!settings.onboarded) {
    openWizard();
  } else {
    document.querySelector(`.tab[data-tab="${tab}"]`)?.click();
    startReveal();
    requestAnimationFrame(() => { $$('.seg').forEach(placeThumb); moveInk(); });
    loadRoster(false);
  }
})();
