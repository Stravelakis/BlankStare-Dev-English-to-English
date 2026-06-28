// sidepanel.js — BlankStare v0.2
// ─────────────────────────────────────────────────────────────────────────────

// ══ TRANSLATIONS ══════════════════════════════════════════════════════════════
const I18N = {
  en: {
    welcomeTitle:'Select any tech text',
    welcomeDesc:'Highlight docs, error messages, terminal output, or any jargon — click <strong>Explain</strong>.',
    nokeyTitle:'API key needed',
    nokeyDesc:"BlankStare uses Groq's free AI API. You need a free key to get started — takes 2 minutes.",
    openSettings:'Open Settings →',
    translating:'Translating…',
    youSelected:'You selected:',
    goDeeper:'↓ Go deeper',
    rephrase:'↺ Different wording',
    fullPage:'📄 Full page',
    jargonToggle:'📖 Jargon dictionary',
    readMoreOn:'📚 Read more on:',
    ytSection:'📺 YouTube explanation',
    webSearch:'🔍 Web search',
    customQ:'💬 Ask your own question',
    customQPlaceholder:'Ask anything about the selected text…',
    ask:'Ask',search:'Search',tryAgain:'Try again',
  },
  el: {
    welcomeTitle:'Επίλεξε οποιοδήποτε τεχνικό κείμενο',
    welcomeDesc:'Επίλεξε docs, μηνύματα σφάλματος, terminal output ή ορολογία — πάτα <strong>Εξήγηση</strong>.',
    nokeyTitle:'Χρειάζεσαι κλειδί API',
    nokeyDesc:'Το BlankStare χρησιμοποιεί το Groq AI API δωρεάν. Χρειάζεσαι ένα κλειδί για να ξεκινήσεις.',
    openSettings:'Άνοιγμα Ρυθμίσεων →',
    translating:'Μεταφράζω…',
    youSelected:'Επίλεξες:',
    goDeeper:'↓ Πιο βαθιά',
    rephrase:'↺ Διαφορετική διατύπωση',
    fullPage:'📄 Ολόκληρη σελίδα',
    jargonToggle:'📖 Λεξικό ορολογίας',
    readMoreOn:'📚 Διάβασε περισσότερα:',
    ytSection:'📺 Εξήγηση YouTube',
    webSearch:'🔍 Αναζήτηση στο web',
    customQ:'💬 Κάνε τη δική σου ερώτηση',
    customQPlaceholder:'Ρώτησε οτιδήποτε για το επιλεγμένο κείμενο…',
    ask:'Ρώτα',search:'Αναζήτηση',tryAgain:'Δοκίμασε ξανά',
  },
};

// ══ SYSTEM PROMPTS ════════════════════════════════════════════════════════════
const LEVEL_LABELS = {
  eli5:     { en:'complete beginner (ELI5 level)', el:'απόλυτο αρχάριο (ELI5)' },
  standard: { en:'intelligent non-developer',      el:'έξυπνο μη-προγραμματιστή' },
  business: { en:'business professional (focus on business impact, ROI, and risk)',    el:'επαγγελματία (εστίαση σε επιπτώσεις, ROI, ρίσκο)' },
  design:   { en:'designer or creative professional (use visual and spatial analogies)', el:'σχεδιαστή (χρησιμοποίησε οπτικές αναλογίες)' },
  legal:    { en:'legal or compliance professional (be precise and formal)',            el:'νομικό ή compliance επαγγελματία (ακριβής και επίσημος)' },
};

function buildSystemPrompt(lang, level, userContext) {
  const levelLabel = LEVEL_LABELS[level]?.[lang] || LEVEL_LABELS.standard[lang];
  const langInstr  = lang === 'el' ? 'Respond ONLY in Greek (Ελληνικά).' : 'Respond in English.';
  const ctxLine    = userContext ? `Context: the user is reading this because: "${userContext}".` : '';

  return `You explain developer documentation, terminal output, error messages, and technical jargon to a ${levelLabel}. Be concise. No code unless asked. Use analogies. State common names clearly. ${ctxLine} ${langInstr}`;
}

// ══ DOM REFS ══════════════════════════════════════════════════════════════════
const $ = id => document.getElementById(id);
const states = {
  welcome: $('state-welcome'), nokey: $('state-nokey'),
  loading: $('state-loading'), result: $('state-result'), error: $('state-error'),
};
const el = {
  settingsBtn:    $('settings-btn'),
  gotoSettings:   $('goto-settings-btn'),
  langToggle:     $('lang-toggle'),
  historyBtn:     $('history-btn'),
  historyPanel:   $('history-panel'),
  historyClose:   $('history-close'),
  historyList:    $('history-list'),
  historyEmpty:   $('history-empty'),
  contextToggle:  $('context-toggle'),
  contextArea:    $('context-input-area'),
  userContext:    $('user-context'),
  readingLevel:   $('reading-level'),
  selectedText:   $('selected-text'),
  explanationText:$('explanation-text'),
  explanationCursor: $('explanation-cursor'),
  explanationActions:$('explanation-actions'),
  clearBtn:       $('clear-btn'),
  copyBtn:        $('copy-btn'),
  voiceBtn:       $('voice-btn'),
  deeperBtn:      $('deeper-btn'),
  rephraseBtn:    $('rephrase-btn'),
  fullpageBtn:    $('fullpage-btn'),
  jargonCb:       $('jargon-toggle-cb'),
  jargonResults:  $('jargon-results'),
  linkMdn:        $('link-mdn'),
  linkW3s:        $('link-w3s'),
  linkDevdocs:    $('link-devdocs'),
  ytSearchBtn:    $('yt-search-btn'),
  ytResults:      $('yt-results'),
  ytEmbed:        $('yt-embed'),
  webSearchBtn:   $('web-search-btn'),
  webResults:     $('web-results'),
  customQInput:   $('custom-q-input'),
  customQBtn:     $('custom-q-btn'),
  customQResult:  $('custom-q-result'),
  errorMessage:   $('error-message'),
  errorRetryBtn:  $('error-retry-btn'),
};

// ══ APP STATE ══════════════════════════════════════════════════════════════════
let settings        = {};
let currentText     = '';
let currentExplain  = '';
let currentQuery    = '';
let currentLang     = 'en';
let lastTimestamp   = 0;
let voiceActive     = false;
const sessionHistory = []; // in-session only, max 20

// ══ STATE SWITCHER ════════════════════════════════════════════════════════════
function showState(name) {
  Object.values(states).forEach(s => s?.classList.add('hidden'));
  states[name]?.classList.remove('hidden');
}

// ══ i18n ══════════════════════════════════════════════════════════════════════
function applyI18n(lang) {
  currentLang = lang;
  const t = I18N[lang] || I18N.en;
  document.querySelectorAll('[data-i18n]').forEach(node => {
    const key = node.dataset.i18n;
    if (t[key] !== undefined) node.innerHTML = t[key];
  });
  document.querySelectorAll('[data-i18n-placeholder]').forEach(node => {
    const key = node.dataset.i18nPlaceholder;
    if (t[key] !== undefined) node.placeholder = t[key];
  });
  el.langToggle.textContent = lang.toUpperCase();
  el.langToggle.classList.toggle('active', true);
  document.documentElement.lang = lang;
}

// ══ LOTTIE ANIMATIONS ════════════════════════════════════════════════════════
function loadLottie(containerId, iconName, loop = true) {
  const container = $(containerId);
  if (!container || typeof lottie === 'undefined') return null;
  try {
    return lottie.loadAnimation({
      container, renderer: 'svg', loop, autoplay: true,
      path: chrome.runtime.getURL(`icons/lottie/${iconName}`),
    });
  } catch (_) { return null; }
}

function initLottie() {
  loadLottie('logo-anim',    'icon-coding.json',  true);
  loadLottie('welcome-anim', 'icon-read.json',    true);
  loadLottie('nokey-anim',   'icon-apikey.json',  true);
  loadLottie('loading-anim', 'icon-loading.json', true);
  loadLottie('error-anim',   'icon-empty.json',   true);
  // Settings icon: plays on hover only
  const settingsAnim = loadLottie('settings-anim', 'icon-settings.json', false);
  if (settingsAnim) {
    el.settingsBtn.addEventListener('mouseenter', () => { settingsAnim.stop(); settingsAnim.play(); });
  }
}

// ══ STARTUP ══════════════════════════════════════════════════════════════════
async function init() {
  settings = await getSettings();
  currentLang = settings.language || 'en';
  applyI18n(currentLang);

  // Reading level
  if (el.readingLevel) el.readingLevel.value = settings.readingLevel || 'standard';

  // User context input
  if (el.userContext && settings.userContext) {
    el.userContext.value = settings.userContext;
    el.contextArea.classList.remove('hidden');
    el.contextToggle.textContent = '− Context';
  }

  // Jargon toggle state
  if (el.jargonCb) el.jargonCb.checked = !!settings.jargonDictionary;

  initLottie();

  if (!settings.groqApiKey) { showState('nokey'); return; }

  await checkForPendingText();
  setInterval(checkForPendingText, 500);
}

async function checkForPendingText() {
  const pending = await getPendingText();
  if (!pending || pending.timestamp <= lastTimestamp) return;
  lastTimestamp = pending.timestamp;
  await clearPendingText();
  explainText(pending.text);
}

// ══ EXPLAIN ══════════════════════════════════════════════════════════════════
async function explainText(text, mode = 'normal') {
  if (!text) return;
  settings = await getSettings();
  if (!settings.groqApiKey) { showState('nokey'); return; }

  currentText = text;
  currentQuery = text.length > 60 ? text.slice(0, 60).replace(/\s\S*$/, '').trim() : text.trim();

  const level   = el.readingLevel?.value || settings.readingLevel || 'standard';
  const context = el.userContext?.value.trim() || settings.userContext || '';
  const lang    = currentLang;

  let systemPrompt = buildSystemPrompt(lang, level, context);
  let userPrompt   = `Please explain this:\n\n${text}`;

  if (mode === 'deeper') {
    userPrompt = `Go deeper on this, with more detail and nuance, still in plain language. Original text:\n\n${text}\n\nPrevious explanation:\n${currentExplain}`;
  } else if (mode === 'rephrase') {
    userPrompt = `Explain the same thing using completely different wording and a fresh analogy. Do not repeat the previous explanation. Original text:\n\n${text}`;
  } else if (mode === 'fullpage') {
    systemPrompt = buildSystemPrompt(lang, level, context) + ' Summarise the whole page in 3-5 clear points.';
    userPrompt   = `What is this page about and what is it asking me to do or understand? Content:\n\n${text}`;
  }

  el.selectedText.textContent = text.length > 200 ? text.slice(0, 200) + '…' : text;
  showState('loading');
  el.explanationText.textContent = '';
  el.explanationCursor.classList.remove('hidden');
  el.explanationActions.classList.add('hidden');
  el.jargonResults.classList.add('hidden');
  resetSecondary();
  updateResourceLinks(text);

  currentExplain = '';

  explainWithGroq(
    text, settings.groqApiKey, settings.model,
    systemPrompt, userPrompt,
    (_delta, full) => {
      if (states.result.classList.contains('hidden')) showState('result');
      el.explanationText.textContent = full;
      currentExplain = full;
    },
    (full) => {
      currentExplain = full;
      el.explanationCursor.classList.add('hidden');
      el.explanationActions.classList.remove('hidden');
      // Auto-run jargon if toggle is on
      if (el.jargonCb?.checked) runJargonDictionary(full);
      // Add to session history
      addToHistory({ query: currentQuery, text, explanation: full, lang, timestamp: Date.now() });
    },
    (err) => {
      el.explanationCursor.classList.add('hidden');
      el.errorMessage.textContent = err.message || 'Something went wrong.';
      showState('error');
    },
  );
}

// ══ RESOURCE LINKS ════════════════════════════════════════════════════════════
function updateResourceLinks(text) {
  const links = buildResourceLinks(text);
  el.linkMdn.href     = links.mdn;
  el.linkW3s.href     = links.w3s;
  el.linkDevdocs.href = links.devdocs;
}

// ══ COPY ═════════════════════════════════════════════════════════════════════
async function copyExplanation() {
  if (!currentExplain) return;
  try {
    await navigator.clipboard.writeText(currentExplain);
    const orig = el.copyBtn.textContent;
    el.copyBtn.textContent = '✅';
    setTimeout(() => { el.copyBtn.textContent = orig; }, 1500);
  } catch (_) {}
}

// ══ VOICE ════════════════════════════════════════════════════════════════════
function toggleVoice() {
  if (voiceActive) {
    speechSynthesis.cancel();
    voiceActive = false;
    el.voiceBtn.classList.remove('active');
    el.voiceBtn.title = 'Read aloud';
  } else {
    const u = new SpeechSynthesisUtterance(currentExplain);
    u.lang = currentLang === 'el' ? 'el-GR' : 'en-US';
    u.onend = () => { voiceActive = false; el.voiceBtn.classList.remove('active'); };
    speechSynthesis.speak(u);
    voiceActive = true;
    el.voiceBtn.classList.add('active');
    el.voiceBtn.title = 'Stop reading';
  }
}

// ══ JARGON DICTIONARY ════════════════════════════════════════════════════════
async function runJargonDictionary(explanationText) {
  el.jargonResults.innerHTML = `<div class="jargon-loading">Looking up jargon…</div>`;
  el.jargonResults.classList.remove('hidden');

  const prompt = `List every technical term, acronym, and jargon word in this text that a non-developer might not know. Return ONLY valid JSON (no markdown, no backticks): [{"term":"word","def":"2-10 word plain definition"}]. If none, return []. Text:\n${explanationText}`;

  try {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${settings.groqApiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant', // always use fast model for jargon
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 400, temperature: 0.2,
      }),
    });
    const data  = await res.json();
    const raw   = data.choices?.[0]?.message?.content || '[]';
    const clean = raw.replace(/```json|```/g, '').trim();
    const terms = JSON.parse(clean);

    if (!terms.length) {
      el.jargonResults.innerHTML = `<div class="jargon-loading">No jargon detected.</div>`;
      return;
    }

    el.jargonResults.innerHTML = terms.map(t =>
      `<div class="jargon-item">
         <span class="jargon-term-text">${esc(t.term)}</span>
         <span class="jargon-def-text">${esc(t.def)}</span>
       </div>`
    ).join('');

  } catch (err) {
    el.jargonResults.innerHTML = `<div class="jargon-loading">Jargon lookup failed.</div>`;
  }
}

// ══ FULL PAGE SUMMARY ════════════════════════════════════════════════════════
async function handleFullPage() {
  // Ask the active tab's content script for the page text
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) return;
    const res = await chrome.tabs.sendMessage(tab.id, { type: 'GET_PAGE_CONTENT' });
    const pageText = (res?.text || '').slice(0, 4000); // keep under token limit
    if (!pageText) return;
    explainText(pageText, 'fullpage');
  } catch (_) {
    el.errorMessage.textContent = 'Could not read page content. Try selecting specific text instead.';
    showState('error');
  }
}

// ══ YOUTUBE ══════════════════════════════════════════════════════════════════
async function handleYouTubeSearch() {
  if (!settings.youtubeKey) {
    el.ytResults.innerHTML = `<p style="padding:10px 12px;font-size:12px;color:var(--text-muted);">No YouTube API key. <a href="#" id="yt-settings-link" style="color:var(--accent);">Add in Settings →</a></p>`;
    el.ytResults.classList.remove('hidden');
    $('yt-settings-link')?.addEventListener('click', openSettings);
    return;
  }
  setLoading(el.ytSearchBtn, true);
  el.ytResults.innerHTML = '';
  el.ytEmbed.classList.add('hidden');
  el.ytResults.classList.add('hidden');

  try {
    const videos = await searchYouTube(currentQuery, settings.youtubeKey);
    if (!videos.length) {
      el.ytResults.innerHTML = `<p style="padding:10px 12px;font-size:12px;color:var(--text-muted);">No videos found.</p>`;
    } else {
      el.ytResults.innerHTML = videos.map(v => `
        <div class="yt-card" data-id="${v.videoId}" role="button" tabindex="0">
          <img class="yt-thumb" src="${v.thumbnail}" alt="" loading="lazy">
          <div class="yt-card-info">
            <div class="yt-card-title">${esc(v.title)}</div>
            <div class="yt-card-channel">${esc(v.channelName)}</div>
          </div>
        </div>`).join('');
      el.ytResults.querySelectorAll('.yt-card').forEach(c => {
        c.addEventListener('click', () => embedVideo(c.dataset.id));
        c.addEventListener('keydown', e => { if (e.key==='Enter'||e.key===' ') embedVideo(c.dataset.id); });
      });
    }
    el.ytResults.classList.remove('hidden');
  } catch (err) {
    el.ytResults.innerHTML = `<p style="padding:10px 12px;font-size:12px;color:var(--error);">${esc(err.message)}</p>`;
    el.ytResults.classList.remove('hidden');
  } finally { setLoading(el.ytSearchBtn, false); }
}

function embedVideo(videoId) {
  el.ytEmbed.innerHTML = `<iframe src="https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0" allow="accelerometer;autoplay;clipboard-write;encrypted-media;gyroscope;picture-in-picture" allowfullscreen title="YouTube video"></iframe>`;
  el.ytEmbed.classList.remove('hidden');
  el.ytEmbed.scrollIntoView({ behavior:'smooth', block:'nearest' });
}

// ══ WEB SEARCH ════════════════════════════════════════════════════════════════
async function handleWebSearch() {
  setLoading(el.webSearchBtn, true);
  el.webResults.innerHTML = '';
  el.webResults.classList.add('hidden');
  try {
    const results = await searchWeb(currentQuery, settings.searxngUrl);
    if (!results) {
      el.webResults.innerHTML = `<div class="ddg-fallback"><a href="${duckDuckGoUrl(currentQuery)}" target="_blank" rel="noopener">🔍 Search DuckDuckGo for "${esc(currentQuery)}" ↗</a><br><span style="font-size:11px;color:var(--text-faint);">Add a SearXNG URL in Settings for inline results.</span></div>`;
    } else if (!results.length) {
      el.webResults.innerHTML = `<p style="padding:10px 12px;font-size:12px;color:var(--text-muted);">No results found.</p>`;
    } else {
      el.webResults.innerHTML = results.map(r => `
        <div class="search-card">
          <a class="search-card-title" href="${r.url}" target="_blank" rel="noopener">${esc(r.title)}</a>
          <div class="search-card-url">${esc(r.url)}</div>
          <div class="search-card-snippet">${esc(r.snippet)}</div>
        </div>`).join('');
    }
    el.webResults.classList.remove('hidden');
  } catch (err) {
    el.webResults.innerHTML = `<p style="padding:10px 12px;font-size:12px;color:var(--error);">${esc(err.message)}</p>`;
    el.webResults.classList.remove('hidden');
  } finally { setLoading(el.webSearchBtn, false); }
}

// ══ CUSTOM QUESTION ════════════════════════════════════════════════════════════
async function handleCustomQuestion() {
  const q = el.customQInput?.value.trim();
  if (!q || !currentText) return;
  setLoading(el.customQBtn, true);
  el.customQResult.classList.add('hidden');
  el.customQResult.textContent = '';

  const systemPrompt = buildSystemPrompt(currentLang, el.readingLevel?.value || 'standard', '');
  const userPrompt   = `Context (the text the user is reading):\n${currentText}\n\nUser question: ${q}`;

  let answer = '';
  explainWithGroq(
    currentText, settings.groqApiKey, settings.model,
    systemPrompt, userPrompt,
    (_delta, full) => {
      el.customQResult.textContent = full;
      el.customQResult.classList.remove('hidden');
      answer = full;
    },
    () => { setLoading(el.customQBtn, false); },
    (err) => { el.customQResult.textContent = '❌ ' + err.message; el.customQResult.classList.remove('hidden'); setLoading(el.customQBtn, false); },
  );
}

// ══ HISTORY ══════════════════════════════════════════════════════════════════
function addToHistory(entry) {
  sessionHistory.unshift(entry);
  if (sessionHistory.length > 20) sessionHistory.pop();
  renderHistory();
}

function renderHistory() {
  if (!sessionHistory.length) {
    el.historyEmpty?.classList.remove('hidden');
    el.historyList.innerHTML = '';
    return;
  }
  el.historyEmpty?.classList.add('hidden');
  el.historyList.innerHTML = sessionHistory.map((h, i) => `
    <div class="history-item" data-index="${i}" role="button" tabindex="0">
      <div class="history-item-query">${esc(h.query)}</div>
      <div class="history-item-time">${formatTime(h.timestamp)}</div>
    </div>`).join('');
  el.historyList.querySelectorAll('.history-item').forEach(item => {
    item.addEventListener('click', () => {
      const h = sessionHistory[+item.dataset.index];
      if (!h) return;
      el.historyPanel.classList.add('hidden');
      currentText     = h.text;
      currentExplain  = h.explanation;
      currentQuery    = h.query;
      el.selectedText.textContent = h.text.length > 200 ? h.text.slice(0,200)+'…' : h.text;
      el.explanationText.textContent = h.explanation;
      el.explanationCursor.classList.add('hidden');
      el.explanationActions.classList.remove('hidden');
      updateResourceLinks(h.text);
      resetSecondary();
      showState('result');
    });
  });
}

function formatTime(ts) {
  const d = new Date(ts);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// ══ HELPERS ══════════════════════════════════════════════════════════════════
function resetSecondary() {
  el.ytResults.classList.add('hidden');
  el.ytEmbed.classList.add('hidden');
  el.webResults.classList.add('hidden');
  el.customQResult.classList.add('hidden');
  el.jargonResults.classList.add('hidden');
  el.ytResults.innerHTML = '';
  el.ytEmbed.innerHTML = '';
  el.webResults.innerHTML = '';
  el.customQResult.textContent = '';
}

function setLoading(btn, on) {
  if (!btn) return;
  btn.dataset.loading = on ? 'true' : 'false';
  btn.disabled = on;
}

function openSettings(e) { e?.preventDefault(); chrome.runtime.openOptionsPage(); }

function esc(s = '') {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ══ EVENT LISTENERS ═══════════════════════════════════════════════════════════
el.settingsBtn?.addEventListener('click', openSettings);
el.gotoSettings?.addEventListener('click', openSettings);
el.clearBtn?.addEventListener('click', () => { speechSynthesis.cancel(); showState('welcome'); });
el.errorRetryBtn?.addEventListener('click', () => { if (currentText) explainText(currentText); });

el.langToggle?.addEventListener('click', () => {
  const next = currentLang === 'en' ? 'el' : 'en';
  applyI18n(next);
  saveSettings({ language: next }).catch(() => {});
});

el.contextToggle?.addEventListener('click', () => {
  const hidden = el.contextArea.classList.toggle('hidden');
  el.contextToggle.textContent = hidden ? '+ Context' : '− Context';
  el.contextToggle.setAttribute('aria-expanded', String(!hidden));
});

el.historyBtn?.addEventListener('click', () => {
  renderHistory();
  el.historyPanel.classList.toggle('hidden');
});
el.historyClose?.addEventListener('click', () => el.historyPanel.classList.add('hidden'));

el.copyBtn?.addEventListener('click', copyExplanation);
el.voiceBtn?.addEventListener('click', toggleVoice);
el.deeperBtn?.addEventListener('click', () => explainText(currentText, 'deeper'));
el.rephraseBtn?.addEventListener('click', () => explainText(currentText, 'rephrase'));
el.fullpageBtn?.addEventListener('click', handleFullPage);

el.jargonCb?.addEventListener('change', () => {
  saveSettings({ jargonDictionary: el.jargonCb.checked }).catch(() => {});
  if (el.jargonCb.checked && currentExplain) runJargonDictionary(currentExplain);
  else el.jargonResults.classList.add('hidden');
});

el.ytSearchBtn?.addEventListener('click', handleYouTubeSearch);
el.webSearchBtn?.addEventListener('click', handleWebSearch);
el.customQBtn?.addEventListener('click', handleCustomQuestion);
el.customQInput?.addEventListener('keydown', e => { if (e.key === 'Enter') handleCustomQuestion(); });

el.readingLevel?.addEventListener('change', () => {
  saveSettings({ readingLevel: el.readingLevel.value }).catch(() => {});
});

el.userContext?.addEventListener('change', () => {
  saveSettings({ userContext: el.userContext.value.trim() }).catch(() => {});
});

// Refresh settings when panel comes back into focus
document.addEventListener('visibilitychange', async () => {
  if (document.visibilityState !== 'visible') return;
  settings = await getSettings();
  if (settings.groqApiKey && !states.nokey.classList.contains('hidden')) showState('welcome');
  currentLang = settings.language || 'en';
  applyI18n(currentLang);
  if (el.readingLevel) el.readingLevel.value = settings.readingLevel || 'standard';
});

// ══ KICK OFF ══════════════════════════════════════════════════════════════════
init();
