// settings.js — BlankStare v0.3

// ── Helpers ───────────────────────────────────────────────────────────────────
const $ = id => document.getElementById(id);

// ── Lottie loader ─────────────────────────────────────────────────────────────
// Extension pages can load local files via chrome.runtime.getURL().
function loadLottie(containerId, iconName, { loop = true, autoplay = true } = {}) {
  const container = $(containerId);
  if (!container || typeof lottie === 'undefined') return null;
  try {
    return lottie.loadAnimation({
      container,
      renderer: 'svg',
      loop,
      autoplay,
      path: chrome.runtime.getURL(`icons/lottie/${iconName}`),
    });
  } catch (e) {
    console.warn('[BlankStare] Lottie failed for', iconName, e);
    return null;
  }
}

// ── Init Lottie animations for the settings page ──────────────────────────────
function initLottie() {
  // Header / page logo
  loadLottie('lottie-header',   'icon-settings.json',  { loop: true });

  // Section icons
  loadLottie('lottie-lang',     'icon-eyes.json',       { loop: true });
  loadLottie('lottie-groq',     'icon-apikey.json',     { loop: true });
  loadLottie('lottie-youtube',  'icon-video.json',      { loop: true });
  loadLottie('lottie-search',   'icon-read.json',       { loop: true });
  loadLottie('lottie-trigger',  'icon-assign.json',     { loop: true });
  loadLottie('lottie-exclude',  'icon-hide.json',       { loop: true });

  // Model cards
  loadLottie('lottie-model-fast',    'icon-loading.json',    { loop: true });
  loadLottie('lottie-model-powerful','icon-powerhouse.json',  { loop: true });

  // About hero (plays once, then loops softly)
  loadLottie('lottie-about',    'icon-coding.json',     { loop: true });
}

// ── Test-button Lottie: testing → success or failure ──────────────────────────
const _testAnims = {};

function testAnimStart(field) {
  const label = $(`test-${field}`)?.querySelector('.test-btn-label');
  const anim  = $(`test-anim-${field}`);
  if (label) label.classList.add('hidden');
  if (anim)  anim.classList.remove('hidden');

  if (_testAnims[field]) { _testAnims[field].destroy(); }
  _testAnims[field] = loadLottie(`test-anim-${field}`, 'icon-test.json', { loop: true });
}

function testAnimResult(field, success) {
  if (_testAnims[field]) { _testAnims[field].destroy(); }
  _testAnims[field] = loadLottie(
    `test-anim-${field}`,
    success ? 'icon-success.json' : 'icon-empty.json',
    { loop: false, autoplay: true }
  );
  // After animation plays, show "Test" label again
  setTimeout(() => {
    const label = $(`test-${field}`)?.querySelector('.test-btn-label');
    const anim  = $(`test-anim-${field}`);
    if (label) label.classList.remove('hidden');
    if (anim)  anim.classList.add('hidden');
    if (_testAnims[field]) { _testAnims[field].destroy(); delete _testAnims[field]; }
  }, 2000);
}

// ── Tab switching ─────────────────────────────────────────────────────────────
document.querySelectorAll('.tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(t => {
      t.classList.remove('active');
      t.setAttribute('aria-selected', 'false');
    });
    document.querySelectorAll('.tab-content').forEach(c => c.classList.add('hidden'));
    tab.classList.add('active');
    tab.setAttribute('aria-selected', 'true');
    $(`tab-${tab.dataset.tab}`)?.classList.remove('hidden');
    sessionStorage.setItem('bs-active-tab', tab.dataset.tab);
  });
});

// Restore last active tab
const lastTab = sessionStorage.getItem('bs-active-tab');
if (lastTab) document.querySelector(`.tab[data-tab="${lastTab}"]`)?.click();

// ── Load saved settings ───────────────────────────────────────────────────────
async function loadForm() {
  const s = await getSettings();

  $('groq-key').value    = s.groqApiKey || '';
  $('youtube-key').value = s.youtubeKey  || '';
  $('searxng-url').value = s.searxngUrl  || '';

  const modelRadio = document.querySelector(`input[name="model"][value="${s.model}"]`);
  if (modelRadio) modelRadio.checked = true;

  $('trigger-floating').checked   = !!s.triggerFloating;
  $('trigger-rightclick').checked = !!s.triggerRightClick;
  $('trigger-alwayson').checked   = !!s.triggerAlwaysOn;

  setActiveLang(s.language || 'en');

  // Default reading level
  const rl = $('default-reading-level');
  if (rl) rl.value = s.readingLevel || 'standard';

  // Exclude list
  $('exclude-list').value = (s.excludeList || []).join('\n');

  // Auto-expand guides for empty required fields
  if (!s.groqApiKey) {
    $('groq-key')?.closest('.api-field')?.querySelector('.setup-guide')?.classList.add('guide-open');
  }
}

// ── Save ─────────────────────────────────────────────────────────────────────
async function saveForm() {
  const groqKey    = $('groq-key').value.trim();
  const youtubeKey = $('youtube-key').value.trim();
  const searxngUrl = $('searxng-url').value.trim();
  const model      = document.querySelector('input[name="model"]:checked')?.value;
  const lang       = document.querySelector('.lang-btn.active')?.dataset.lang || 'en';
  const readingLevel = $('default-reading-level')?.value || 'standard';

  if (groqKey && !groqKey.startsWith('gsk_')) {
    showError($('groq-key'), 'Groq keys start with "gsk_". Please check your key.');
    return;
  }

  const anyTrigger = $('trigger-floating').checked ||
                     $('trigger-rightclick').checked ||
                     $('trigger-alwayson').checked;
  if (!anyTrigger) {
    $('trigger-floating').checked = true;
    alert('At least one trigger mode must be enabled. Floating button re-enabled.');
  }

  const excludeList = ($('exclude-list').value || '')
    .split('\n')
    .map(s => s.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, ''))
    .filter(Boolean);

  await saveSettings({
    groqApiKey:       groqKey,
    youtubeKey,
    searxngUrl,
    model:            model || 'llama-3.1-8b-instant',
    language:         lang,
    readingLevel,
    triggerFloating:  $('trigger-floating').checked,
    triggerRightClick:$('trigger-rightclick').checked,
    triggerAlwaysOn:  $('trigger-alwayson').checked,
    excludeList,
  });

  chrome.runtime.sendMessage({ type: 'SETTINGS_CHANGED' }).catch(() => {});

  const fb = $('save-feedback');
  fb.classList.remove('hidden');
  setTimeout(() => fb.classList.add('hidden'), 3000);
}

function showError(inputEl, msg) {
  inputEl.focus();
  inputEl.setCustomValidity(msg);
  inputEl.reportValidity();
  inputEl.addEventListener('input', () => inputEl.setCustomValidity(''), { once: true });
}

// ── Language toggle ───────────────────────────────────────────────────────────
function setActiveLang(lang) {
  document.querySelectorAll('.lang-btn').forEach(btn =>
    btn.classList.toggle('active', btn.dataset.lang === lang));
}
document.querySelectorAll('.lang-btn').forEach(btn =>
  btn.addEventListener('click', () => setActiveLang(btn.dataset.lang)));

// ── Show / hide API key ───────────────────────────────────────────────────────
document.querySelectorAll('.visibility-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const input = $(btn.dataset.target);
    if (!input) return;
    input.type = input.type === 'password' ? 'text' : 'password';
    btn.textContent = input.type === 'password' ? '👁' : '🙈';
  });
});

// ── API Test buttons ──────────────────────────────────────────────────────────
async function runTest(field) {
  const btn    = $(`test-${field}`);
  const result = $(`test-result-${field}`);
  if (!btn || !result) return;

  btn.disabled = true;
  result.className = 'test-result testing';
  result.textContent = 'Testing…';
  testAnimStart(field);

  try {
    let ok = false, msg = '';

    if (field === 'groq') {
      const key = $('groq-key').value.trim();
      if (!key) { result.textContent = '⚠ Enter a key first'; result.className = 'test-result warn'; testAnimResult(field, false); btn.disabled = false; return; }
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: 'llama-3.1-8b-instant', messages: [{ role: 'user', content: 'Reply: OK' }], max_tokens: 5 }),
      });
      ok = res.ok;
      msg = ok ? '✅ Groq key is working!' : `❌ ${res.status}: ${await res.json().then(d => d.error?.message || 'Check your key').catch(() => 'Check your key')}`;
    }

    else if (field === 'youtube') {
      const key = $('youtube-key').value.trim();
      if (!key) { result.textContent = '⚠ Enter a key first'; result.className = 'test-result warn'; testAnimResult(field, false); btn.disabled = false; return; }
      const res = await fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&q=test&maxResults=1&key=${key}`);
      ok = res.ok;
      msg = ok ? '✅ YouTube key is working!' : `❌ Error ${res.status}${res.status === 403 ? ': Key invalid or YouTube API not enabled' : ''}`;
    }

    else if (field === 'searxng') {
      const url = $('searxng-url').value.trim();
      if (!url) { result.textContent = '⚠ Enter a URL first'; result.className = 'test-result warn'; testAnimResult(field, false); btn.disabled = false; return; }
      const res = await fetch(`${url.replace(/\/$/, '')}/search?q=test&format=json`, { headers: { Accept: 'application/json' } });
      ok = res.ok;
      msg = ok ? '✅ SearXNG is reachable and responding!' : `❌ Error ${res.status} — check URL and that CORS is enabled`;
    }

    result.textContent = msg;
    result.className = `test-result ${ok ? 'success' : 'error'}`;
    testAnimResult(field, ok);

  } catch (err) {
    result.textContent = `❌ ${err.message}`;
    result.className = 'test-result error';
    testAnimResult(field, false);
  } finally {
    // Re-enable after animation plays (2s)
    setTimeout(() => { btn.disabled = false; }, 2100);
  }
}

document.querySelectorAll('.test-btn').forEach(btn =>
  btn.addEventListener('click', () => runTest(btn.dataset.field)));

// ── Save button & Ctrl+S ──────────────────────────────────────────────────────
$('save-btn')?.addEventListener('click', saveForm);
document.addEventListener('keydown', e => {
  if ((e.ctrlKey || e.metaKey) && e.key === 's') { e.preventDefault(); saveForm(); }
});

// ── Init ──────────────────────────────────────────────────────────────────────
loadForm();
// Small delay so the DOM is settled before loading Lottie (avoids zero-size containers)
setTimeout(initLottie, 80);
