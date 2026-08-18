// sidepanel.js — BlankStare
//
// Reading levels, the system prompt and the Greek heuristic live in
// utils/pure.js so they can be tested outside Chrome.

// ══ TRANSLATIONS (UI strings) ═════════════════════════════════════════════════
const I18N = {
  en: {
    welcomeTitle:'Select any dev text',
    welcomeDesc:'Highlight an error message, README, terminal output, docs, or any jargon. BlankStare rewrites it in plain English you can read <strong>instead of</strong> the original.',
    nokeyTitle:'API key needed',
    nokeyDesc:"BlankStare uses Groq's free AI API. You need a free key — takes 2 minutes.",
    openSettings:'Open Settings →',
    translating:'Translating…',
    youSelected:'You selected:',
    goDeeper:'↓ More detail',
    rephrase:'↺ Different wording',
    fullPage:'📄 Full page',
    jargonToggle:'📖 Term glossary',
    readMoreOn:'📚 Read more on:',
    ytSection:'📺 YouTube explanation',
    webSearch:'🔍 Web search',
    customQ:'💬 Ask a follow-up',
    customQPlaceholder:'Ask anything about the selected text…',
    ask:'Ask', search:'Search', tryAgain:'Try again',
    greekWarning:'This looks like Greek text. BlankStare translates <strong>English developer content</strong> into plain English. Select an English error message, README, or code snippet. To receive the translation <em>in Greek</em>, use the EN→EL toggle above — but keep selecting English dev text.',
    voiceShortened:'Read aloud was shortened to fit the voice limit.',
  },
  el: {
    welcomeTitle:'Επίλεξε οποιοδήποτε dev κείμενο',
    welcomeDesc:'Επίλεξε μήνυμα σφάλματος, README, terminal output ή ορολογία. Το BlankStare το ξαναγράφει σε απλά Ελληνικά που μπορείς να διαβάσεις <strong>αντί</strong> για το πρωτότυπο.',
    nokeyTitle:'Χρειάζεσαι κλειδί API',
    nokeyDesc:'Το BlankStare χρησιμοποιεί το δωρεάν Groq API. Χρειάζεσαι ένα κλειδί — 2 λεπτά διαδικασία.',
    openSettings:'Άνοιγμα Ρυθμίσεων →',
    translating:'Μεταφράζω…',
    youSelected:'Επίλεξες:',
    goDeeper:'↓ Περισσότερη λεπτομέρεια',
    rephrase:'↺ Διαφορετική διατύπωση',
    fullPage:'📄 Ολόκληρη σελίδα',
    jargonToggle:'📖 Γλωσσάρι όρων',
    readMoreOn:'📚 Διάβασε περισσότερα:',
    ytSection:'📺 Εξήγηση YouTube',
    webSearch:'🔍 Αναζήτηση στο web',
    customQ:'💬 Κάνε ερώτηση',
    customQPlaceholder:'Ρώτησε οτιδήποτε για το επιλεγμένο κείμενο…',
    ask:'Ρώτα', search:'Αναζήτηση', tryAgain:'Δοκίμασε ξανά',
    greekWarning:'Αυτό μοιάζει με ελληνικό κείμενο. Το BlankStare μεταφράζει <strong>αγγλικό developer περιεχόμενο</strong> σε απλά λόγια. Επίλεξε αγγλικό μήνυμα σφάλματος, κώδικα ή τεκμηρίωση.',
    voiceShortened:'Η ανάγνωση συντομεύτηκε για να χωρέσει στο όριο της φωνής.',
  },
};

// Longer budget for modes that are explicitly asking for more words. Sharing
// the default budget is why "More detail" used to truncate mid-sentence.
const MAX_TOKENS = { normal: 700, rephrase: 700, deeper: 1400, fullpage: 1400 };

// ══ DOM REFS ══════════════════════════════════════════════════════════════════
const $ = id => document.getElementById(id);
const states = {
  welcome: $('state-welcome'), nokey: $('state-nokey'),
  loading: $('state-loading'), result: $('state-result'), error: $('state-error'),
};
const el = {
  settingsBtn:       $('settings-btn'),
  gotoSettings:      $('goto-settings-btn'),
  langToggle:        $('lang-toggle'),
  historyBtn:        $('history-btn'),
  historyPanel:      $('history-panel'),
  historyClose:      $('history-close'),
  historyList:       $('history-list'),
  historyEmpty:      $('history-empty'),
  contextToggle:     $('context-toggle'),
  contextArea:       $('context-input-area'),
  userContext:       $('user-context'),
  readingLevel:      $('reading-level'),
  selectedText:      $('selected-text'),
  explanationText:   $('explanation-text'),
  explanationCursor: $('explanation-cursor'),
  explanationActions:$('explanation-actions'),
  streamStatus:      $('stream-status'),
  clearBtn:          $('clear-btn'),
  copyBtn:           $('copy-btn'),
  voiceBtn:          $('voice-btn'),
  deeperBtn:         $('deeper-btn'),
  rephraseBtn:       $('rephrase-btn'),
  fullpageBtn:       $('fullpage-btn'),
  rerunBtn:          $('rerun-btn'),
  jargonCb:          $('jargon-toggle-cb'),
  jargonResults:     $('jargon-results'),
  linkMdn:           $('link-mdn'),
  linkW3s:           $('link-w3s'),
  linkDevdocs:       $('link-devdocs'),
  ytSearchBtn:       $('yt-search-btn'),
  ytResults:         $('yt-results'),
  ytEmbed:           $('yt-embed'),
  webSearchBtn:      $('web-search-btn'),
  webResults:        $('web-results'),
  customQInput:      $('custom-q-input'),
  customQBtn:        $('custom-q-btn'),
  customQResult:     $('custom-q-result'),
  errorMessage:      $('error-message'),
  errorRetryBtn:     $('error-retry-btn'),
};

// ══ APP STATE ═════════════════════════════════════════════════════════════════
let settings       = {};
let currentText    = '';
let currentExplain = '';
let currentQuery   = '';
let currentLang    = 'en';
let lastTimestamp  = 0;
let voiceActive    = false;
let currentAudio   = null;   // Orpheus audio element
let currentAudioUrl = null;  // object URL awaiting revocation
let sessionHistory = [];

// One in-flight request per lane. Starting a second used to leave the first
// still writing into the same node, interleaving two answers.
//
// Three lanes rather than one: the glossary and a follow-up question target
// their own elements, so a new one should replace its predecessor without
// cancelling the translation the reader is still watching.
let currentController  = null;   // the translation
let glossaryController = null;
let customQController  = null;

function beginRequest() {
  currentController?.abort();
  currentController = new AbortController();
  return currentController.signal;
}

function endRequest(controller) {
  if (currentController === controller) currentController = null;
}

function abortAll() {
  currentController?.abort();
  glossaryController?.abort();
  customQController?.abort();
  currentController = glossaryController = customQController = null;
}

// ══ STATE SWITCHER ════════════════════════════════════════════════════════════
function showState(name) {
  Object.values(states).forEach(s => s?.classList.add('hidden'));
  states[name]?.classList.remove('hidden');
}

function setStatus(msg) {
  if (!el.streamStatus) return;
  el.streamStatus.textContent = msg || '';
  el.streamStatus.classList.toggle('hidden', !msg);
}

function setStreaming(on) {
  el.explanationCursor?.classList.toggle('hidden', !on);
  el.explanationText?.setAttribute('aria-busy', String(on));
}

// ══ i18n ══════════════════════════════════════════════════════════════════════
function applyI18n(lang) {
  currentLang = lang;
  const t = I18N[lang] || I18N.en;
  // Static, authored strings — innerHTML is intentional, they carry markup.
  document.querySelectorAll('[data-i18n]').forEach(node => {
    const key = node.dataset.i18n;
    if (t[key] !== undefined) node.innerHTML = t[key];
  });
  document.querySelectorAll('[data-i18n-placeholder]').forEach(node => {
    const key = node.dataset.i18nPlaceholder;
    if (t[key] !== undefined) node.placeholder = t[key];
  });
  el.langToggle.textContent = lang.toUpperCase();
  document.documentElement.lang = lang;
}

// ══ LOTTIE ════════════════════════════════════════════════════════════════════
// Six of these loop forever in a panel that stays open all day. Under
// prefers-reduced-motion they load and hold on their first frame instead: the
// icon still reads, nothing moves, and nothing spins the CPU. Deco Noir's rule 8
// requires this and the animations were bypassing it.
const REDUCED_MOTION = (() => {
  try { return matchMedia('(prefers-reduced-motion: reduce)').matches; }
  catch (_) { return false; }
})();

function loadLottie(containerId, iconName, loop = true) {
  const container = $(containerId);
  if (!container || typeof lottie === 'undefined') return null;
  try {
    const anim = lottie.loadAnimation({
      container,
      renderer: 'svg',
      loop:     REDUCED_MOTION ? false : loop,
      autoplay: !REDUCED_MOTION,
      path:     chrome.runtime.getURL(`icons/lottie/${iconName}`),
    });
    // autoplay:false leaves the container blank until a frame is drawn, so hold
    // the first one deliberately once the JSON has parsed.
    if (REDUCED_MOTION) anim.addEventListener('DOMLoaded', () => anim.goToAndStop(0, true));
    return anim;
  } catch (_) { return null; }
}

function initLottie() {
  loadLottie('logo-anim',    'icon-coding.json',  true);
  loadLottie('welcome-anim', 'icon-read.json',    true);
  loadLottie('nokey-anim',   'icon-apikey.json',  true);
  loadLottie('loading-anim', 'icon-loading.json', true);
  loadLottie('error-anim',   'icon-empty.json',   true);
  // Hover-to-play is a deliberate motion the user triggered, but it still has
  // no business running when they have asked for reduced motion.
  const sa = loadLottie('settings-anim', 'icon-settings.json', false);
  if (sa && !REDUCED_MOTION) {
    el.settingsBtn?.addEventListener('mouseenter', () => { sa.stop(); sa.play(); });
  }
}

// ══ STARTUP ═══════════════════════════════════════════════════════════════════
async function init() {
  settings    = await getSettings();
  currentLang = settings.language || 'en';
  applyI18n(currentLang);

  const savedLevel = VALID_LEVELS.includes(settings.readingLevel) ? settings.readingLevel : 'standard';
  if (el.readingLevel) el.readingLevel.value = savedLevel;

  if (el.userContext && settings.userContext) {
    el.userContext.value = settings.userContext;
    el.contextArea?.classList.remove('hidden');
    if (el.contextToggle) el.contextToggle.textContent = '− Context';
  }

  if (el.jargonCb) el.jargonCb.checked = !!settings.jargonDictionary;

  initLottie();

  // Survives the panel being closed and reopened.
  sessionHistory = await getHistory();
  renderHistory();

  if (!settings.groqApiKey) { showState('nokey'); return; }

  // Text queued before this document existed.
  await checkForPendingText();
}

// Event-driven. This used to be a 500ms setInterval, i.e. two storage reads a
// second for as long as the panel stayed open.
chrome.storage.session.onChanged.addListener(changes => {
  if (changes.pendingText?.newValue) checkForPendingText();
});

async function checkForPendingText() {
  const pending = await getPendingText();
  if (!pending || pending.timestamp <= lastTimestamp) return;
  lastTimestamp = pending.timestamp;
  await clearPendingText();
  explainText(pending.text);
}

// ══ EXPLAIN — TRANSLATION MODE ════════════════════════════════════════════════
async function explainText(text, mode = 'normal') {
  if (!text) return;

  settings = await getSettings();
  if (!settings.groqApiKey) { showState('nokey'); return; }

  // Greek input is nearly always a mis-selection: BlankStare translates English
  // dev text, in either output language.
  if (isLikelyGreek(text) && mode === 'normal') {
    showState('result');
    el.selectedText.textContent = truncate(text, 200);
    el.explanationText.innerHTML = `<div class="lang-warning-inline">${I18N[currentLang].greekWarning}</div>`;
    setStreaming(false);
    setStatus('');
    el.explanationActions.classList.add('hidden');
    return;
  }

  currentText  = text;
  currentQuery = text.length > 60
    ? text.slice(0, 60).replace(/\s\S*$/, '').trim()
    : text.trim();

  const level     = el.readingLevel?.value || settings.readingLevel || 'standard';
  const context   = el.userContext?.value.trim() || settings.userContext || '';
  const sysPrompt = buildSystemPrompt(currentLang, level, context);
  const userPrompt = buildUserPrompt(mode, text);

  el.selectedText.textContent = truncate(text, 200);
  showState('loading');
  el.explanationText.textContent = '';
  setStreaming(true);
  setStatus('');
  el.explanationActions.classList.add('hidden');
  el.jargonResults.classList.add('hidden');
  resetSecondary();
  updateResourceLinks(text);
  currentExplain = '';

  const signal     = beginRequest();
  const controller = currentController;

  await explainWithGroq({
    apiKey:       settings.groqApiKey,
    model:        settings.model,
    systemPrompt: sysPrompt,
    userPrompt,
    maxTokens:    MAX_TOKENS[mode] ?? MAX_TOKENS.normal,
    autoFallback: !!settings.autoFallback,
    signal,

    onChunk: (_delta, full) => {
      if (states.result.classList.contains('hidden')) showState('result');
      el.explanationText.textContent = full;
      currentExplain = full;
    },

    onStatus: setStatus,

    onDone: async (full) => {
      endRequest(controller);
      currentExplain = full;
      setStreaming(false);
      el.explanationActions.classList.remove('hidden');
      clearRerunPending();
      if (el.jargonCb?.checked) runGlossary(full);
      sessionHistory = await pushHistory({
        query: currentQuery, text, explanation: full,
        lang: currentLang, timestamp: Date.now(),
      });
      renderHistory();
    },

    onError: (err) => {
      endRequest(controller);
      setStreaming(false);

      // A connection that dropped part-way still produced something useful.
      // Keep it on screen and explain the gap rather than blanking the panel.
      if (err.partial) {
        currentExplain = err.partial;
        el.explanationText.textContent = err.partial;
        el.explanationActions.classList.remove('hidden');
        setStatus(err.message);
        return;
      }

      el.errorMessage.textContent = err.message || 'Something went wrong.';
      showState('error');
    },
  });
}

function buildUserPrompt(mode, text) {
  switch (mode) {
    case 'deeper':
      return `The reader wants more detail. Expand on this translation — go deeper while staying in plain language. Do not repeat what you already said, just add depth.\n\nOriginal dev text:\n${text}\n\nYour previous translation:\n${currentExplain}`;
    case 'rephrase':
      return `Translate the same dev text again, using completely different wording and a fresh approach. Do not repeat any phrases from the previous translation.\n\nDev text:\n${text}`;
    case 'fullpage':
      return `Translate this entire page's content into plain language. Give a clear 3-5 point summary of what this page is about and what it's asking the reader to understand or do.\n\nPage content:\n${text}`;
    default:
      return `Translate this dev text into plain language:\n\n${text}`;
  }
}

// ══ RESOURCE LINKS ════════════════════════════════════════════════════════════
function updateResourceLinks(text) {
  const links = buildResourceLinks(text);
  if (el.linkMdn)     el.linkMdn.href     = links.mdn;
  if (el.linkW3s)     el.linkW3s.href     = links.w3s;
  if (el.linkDevdocs) el.linkDevdocs.href = links.devdocs;
}

// ══ COPY ══════════════════════════════════════════════════════════════════════
async function copyExplanation() {
  if (!currentExplain) return;
  try {
    await navigator.clipboard.writeText(currentExplain);
    const orig = el.copyBtn.textContent;
    el.copyBtn.textContent = '✅';
    setTimeout(() => { el.copyBtn.textContent = orig; }, 1500);
  } catch (_) {}
}

// ══ VOICE — ORPHEUS + BROWSER FALLBACK ════════════════════════════════════════
async function toggleVoice() {
  if (voiceActive) { stopVoice(); return; }
  if (!currentExplain) return;

  const mode  = settings.ttsMode || 'browser';
  const key   = settings.groqApiKey;
  const voice = settings.orpheusVoice || 'tara';

  if (mode === 'orpheus' && key) {
    try {
      setVoiceActive(true);
      const { url, truncated } = await speakWithOrpheus(currentExplain, key, voice);
      currentAudioUrl = url;
      currentAudio    = new Audio(url);
      currentAudio.onended = stopVoice;
      currentAudio.onerror = stopVoice;
      await currentAudio.play();
      // The endpoint has an input ceiling; say so rather than just stopping.
      if (truncated) setStatus(I18N[currentLang].voiceShortened);
      return;
    } catch (err) {
      console.warn('[BlankStare] Orpheus failed, falling back to browser voice:', err.message);
      setStatus(err.message);
      releaseAudio();
    }
  }

  useBrowserVoice();
}

function useBrowserVoice() {
  const u = new SpeechSynthesisUtterance(currentExplain);
  const bestVoice = getBestSystemVoice(currentLang);
  if (bestVoice) u.voice = bestVoice;
  u.lang  = currentLang === 'el' ? 'el-GR' : 'en-US';
  u.rate  = 0.93;
  u.pitch = 1.05;
  u.onend = () => setVoiceActive(false);

  if (!speechSynthesis.getVoices().length) {
    speechSynthesis.onvoiceschanged = () => speechSynthesis.speak(u);
  } else {
    speechSynthesis.speak(u);
  }
  setVoiceActive(true);
}

function getBestSystemVoice(lang) {
  const voices   = speechSynthesis.getVoices();
  const langCode = lang === 'el' ? 'el' : 'en';
  const score    = v => {
    const n = v.name.toLowerCase();
    if (n.includes('premium') || n.includes('enhanced')) return 3;
    if (n.includes('neural')  || n.includes('natural'))  return 2;
    if (v.localService) return 1;
    return 0;
  };
  return voices.filter(v => v.lang.startsWith(langCode)).sort((a, b) => score(b) - score(a))[0] || null;
}

function setVoiceActive(active) {
  voiceActive = active;
  el.voiceBtn?.classList.toggle('active', active);
  if (el.voiceBtn) el.voiceBtn.title = active ? 'Stop reading' : 'Read aloud';
}

function releaseAudio() {
  if (currentAudio) { currentAudio.pause(); currentAudio = null; }
  if (currentAudioUrl) { URL.revokeObjectURL(currentAudioUrl); currentAudioUrl = null; }
}

function stopVoice() {
  speechSynthesis.cancel();
  releaseAudio();
  setVoiceActive(false);
}

// ══ GLOSSARY ══════════════════════════════════════════════════════════════════
// Supplementary reference, shown after the translation. The request itself
// lives in utils/api.js so it shares key handling with everything else.
async function runGlossary(translationText) {
  // Its own lane: a re-run replaces the previous glossary, but the glossary
  // must not cancel the translation, which has already finished by now anyway.
  glossaryController?.abort();
  glossaryController = new AbortController();
  const controller = glossaryController;

  el.jargonResults.innerHTML = `<div class="jargon-loading">Building glossary…</div>`;
  el.jargonResults.classList.remove('hidden');

  try {
    const terms = await fetchGlossary({
      translation: translationText,
      apiKey:      settings.groqApiKey,
      signal:      controller.signal,
    });

    if (!terms.length) {
      el.jargonResults.innerHTML = `<div class="jargon-loading">✓ No remaining jargon detected.</div>`;
      return;
    }

    el.jargonResults.innerHTML = terms.map(t =>
      `<div class="jargon-item">
         <span class="jargon-term-text">${esc(t.term)}</span>
         <span class="jargon-def-text">${esc(t.def)}</span>
       </div>`
    ).join('');
  } catch (err) {
    if (err?.name === 'AbortError') return;
    el.jargonResults.innerHTML = `<div class="jargon-loading">${esc(err.message)}</div>`;
  }
}

// ══ FULL PAGE SUMMARY ═════════════════════════════════════════════════════════
async function handleFullPage() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) return;
    // The content script already trims to MAX_PAGE_CHARS after stripping the
    // page furniture; slicing again here would only re-apply the same limit.
    const res = await chrome.tabs.sendMessage(tab.id, { type: 'GET_PAGE_CONTENT' });
    const txt = (res?.text || '').slice(0, MAX_PAGE_CHARS);
    if (!txt) {
      el.errorMessage.textContent = 'There was no readable text on this page. Try selecting the part you want instead.';
      showState('error');
      return;
    }
    explainText(txt, 'fullpage');
  } catch (_) {
    el.errorMessage.textContent = 'Could not read page content. Try selecting specific text instead.';
    showState('error');
  }
}

// ══ YOUTUBE ═══════════════════════════════════════════════════════════════════
async function handleYouTubeSearch() {
  if (!settings.youtubeKey) {
    el.ytResults.innerHTML = `<p class="inline-note">No YouTube API key. <a href="#" id="yt-sl">Add in Settings →</a></p>`;
    el.ytResults.classList.remove('hidden');
    $('yt-sl')?.addEventListener('click', e => { e.preventDefault(); openSettings(); });
    return;
  }

  setLoading(el.ytSearchBtn, true);
  el.ytResults.innerHTML = '';
  el.ytEmbed.classList.add('hidden');
  el.ytResults.classList.add('hidden');

  try {
    const videos = await searchYouTube(currentQuery, settings.youtubeKey);
    if (!videos.length) {
      el.ytResults.innerHTML = `<p class="inline-note">No videos found.</p>`;
    } else {
      // v.thumbnail already passed safeUrl() in api.js.
      el.ytResults.innerHTML = videos.map(v => `
        <div class="yt-card" data-id="${esc(v.videoId)}" role="button" tabindex="0">
          <img class="yt-thumb" src="${esc(v.thumbnail)}" alt="" loading="lazy">
          <div class="yt-card-info">
            <div class="yt-card-title">${esc(v.title)}</div>
            <div class="yt-card-channel">${esc(v.channelName)}</div>
          </div>
        </div>`).join('');
      el.ytResults.querySelectorAll('.yt-card').forEach(c => {
        activate(c, () => embedVideo(c.dataset.id));
      });
    }
    el.ytResults.classList.remove('hidden');
  } catch (err) {
    el.ytResults.innerHTML = `<p class="inline-error">${esc(err.message)}</p>`;
    el.ytResults.classList.remove('hidden');
  } finally {
    setLoading(el.ytSearchBtn, false);
  }
}

function embedVideo(id) {
  // id comes from the YouTube API and is placed in a URL path — allow only the
  // documented video-id alphabet rather than trusting it.
  if (!/^[\w-]{5,20}$/.test(id)) return;
  el.ytEmbed.innerHTML = `<iframe src="https://www.youtube.com/embed/${id}?autoplay=1&rel=0" allow="accelerometer;autoplay;clipboard-write;encrypted-media;gyroscope;picture-in-picture" allowfullscreen title="YouTube"></iframe>`;
  el.ytEmbed.classList.remove('hidden');
  el.ytEmbed.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// ══ WEB SEARCH ════════════════════════════════════════════════════════════════
async function handleWebSearch() {
  setLoading(el.webSearchBtn, true);
  el.webResults.innerHTML = '';
  el.webResults.classList.add('hidden');

  try {
    const results = await searchWeb(currentQuery, settings.searxngUrl);

    if (!results) {
      el.webResults.innerHTML =
        `<div class="ddg-fallback">
           <a href="${esc(duckDuckGoUrl(currentQuery))}" target="_blank" rel="noopener">🔍 Search DuckDuckGo for "${esc(currentQuery)}" ↗</a>
           <br><span class="inline-hint">Add a SearXNG URL in Settings for inline results.</span>
         </div>`;
    } else if (!results.length) {
      el.webResults.innerHTML = `<p class="inline-note">No results.</p>`;
    } else {
      // r.url already passed safeUrl() in api.js — results with a rejected
      // scheme were dropped there rather than rendered inert here.
      el.webResults.innerHTML = results.map(r => `
        <div class="search-card">
          <a class="search-card-title" href="${esc(r.url)}" target="_blank" rel="noopener">${esc(r.title)}</a>
          <div class="search-card-url">${esc(r.url)}</div>
          <div class="search-card-snippet">${esc(r.snippet)}</div>
        </div>`).join('');
    }
    el.webResults.classList.remove('hidden');
  } catch (err) {
    el.webResults.innerHTML = `<p class="inline-error">${esc(err.message)}</p>`;
    el.webResults.classList.remove('hidden');
  } finally {
    setLoading(el.webSearchBtn, false);
  }
}

// ══ CUSTOM QUESTION ═══════════════════════════════════════════════════════════
async function handleCustomQuestion() {
  const q = el.customQInput?.value.trim();
  if (!q || !currentText) return;

  // Asking a second question replaces the first, without disturbing the
  // translation above it.
  customQController?.abort();
  customQController = new AbortController();

  setLoading(el.customQBtn, true);
  el.customQResult.classList.add('hidden');
  el.customQResult.textContent = '';

  const level = el.readingLevel?.value || settings.readingLevel || 'standard';

  await explainWithGroq({
    apiKey:       settings.groqApiKey,
    model:        settings.model,
    systemPrompt: buildSystemPrompt(currentLang, level, ''),
    userPrompt:   `Context (dev text the reader selected):\n${currentText}\n\nQuestion: ${q}`,
    autoFallback: !!settings.autoFallback,
    signal:       customQController.signal,

    onChunk: (_d, full) => {
      el.customQResult.textContent = full;
      el.customQResult.classList.remove('hidden');
    },
    onDone:  () => setLoading(el.customQBtn, false),
    onError: err => {
      el.customQResult.textContent = '❌ ' + err.message;
      el.customQResult.classList.remove('hidden');
      setLoading(el.customQBtn, false);
    },
  });
}

// ══ HISTORY ═══════════════════════════════════════════════════════════════════
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
      <div class="history-item-time">${new Date(h.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
    </div>`).join('');

  el.historyList.querySelectorAll('.history-item').forEach(item => {
    activate(item, () => restoreFromHistory(+item.dataset.index));
  });
}

function restoreFromHistory(index) {
  const h = sessionHistory[index];
  if (!h) return;

  // Viewing an old entry must not leave a live stream writing over it, and
  // resetSecondary() below wipes the glossary and follow-up targets too.
  abortAll();

  el.historyPanel.classList.add('hidden');
  currentText = h.text; currentExplain = h.explanation; currentQuery = h.query;
  el.selectedText.textContent = truncate(h.text, 200);
  el.explanationText.textContent = h.explanation;
  setStreaming(false);
  setStatus('');
  el.explanationActions.classList.remove('hidden');
  updateResourceLinks(h.text);
  resetSecondary();
  showState('result');
}

// ══ RERUN BUTTON ══════════════════════════════════════════════════════════════
function markRerunPending() {
  if (!currentText) return;
  el.rerunBtn?.removeAttribute('disabled');
  el.rerunBtn?.classList.add('rerun-active');
}

function clearRerunPending() {
  el.rerunBtn?.setAttribute('disabled', '');
  el.rerunBtn?.classList.remove('rerun-active');
}

// ══ HELPERS ═══════════════════════════════════════════════════════════════════
function resetSecondary() {
  [el.ytResults, el.ytEmbed, el.webResults, el.customQResult, el.jargonResults]
    .forEach(e => { e?.classList.add('hidden'); if (e) e.innerHTML = ''; });
}

function setLoading(btn, on) {
  if (!btn) return;
  btn.dataset.loading = on ? 'true' : 'false';
  btn.disabled = on;
}

// Keyboard parity for elements given role="button": Space must work too.
function activate(node, fn) {
  node.addEventListener('click', fn);
  node.addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fn(); }
  });
}

function truncate(s, n) {
  return s.length > n ? s.slice(0, n) + '…' : s;
}

function openSettings(e) { e?.preventDefault(); chrome.runtime.openOptionsPage(); }

function esc(s = '') {
  return String(s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

// ══ EVENT LISTENERS ═══════════════════════════════════════════════════════════
el.settingsBtn?.addEventListener('click', openSettings);
el.gotoSettings?.addEventListener('click', openSettings);

el.clearBtn?.addEventListener('click', () => {
  abortAll();
  stopVoice();
  clearRerunPending();
  setStatus('');
  showState('welcome');
});

el.errorRetryBtn?.addEventListener('click', () => { if (currentText) explainText(currentText); });

el.langToggle?.addEventListener('click', () => {
  const next = currentLang === 'en' ? 'el' : 'en';
  applyI18n(next);
  saveSettings({ language: next }).catch(() => {});
  markRerunPending();
});

el.contextToggle?.addEventListener('click', () => {
  const hidden = el.contextArea.classList.toggle('hidden');
  el.contextToggle.textContent = hidden ? '+ Context' : '− Context';
  el.contextToggle.setAttribute('aria-expanded', String(!hidden));
});

el.historyBtn?.addEventListener('click', () => { renderHistory(); el.historyPanel.classList.toggle('hidden'); });
el.historyClose?.addEventListener('click', () => el.historyPanel.classList.add('hidden'));

el.copyBtn?.addEventListener('click', copyExplanation);
el.voiceBtn?.addEventListener('click', toggleVoice);
el.deeperBtn?.addEventListener('click',   () => explainText(currentText, 'deeper'));
el.rephraseBtn?.addEventListener('click', () => explainText(currentText, 'rephrase'));
el.fullpageBtn?.addEventListener('click', handleFullPage);
el.rerunBtn?.addEventListener('click', () => {
  if (!currentText) return;
  clearRerunPending();
  explainText(currentText, 'normal');
});

el.jargonCb?.addEventListener('change', () => {
  saveSettings({ jargonDictionary: el.jargonCb.checked }).catch(() => {});
  if (el.jargonCb.checked && currentExplain) runGlossary(currentExplain);
  else el.jargonResults.classList.add('hidden');
});

el.ytSearchBtn?.addEventListener('click', handleYouTubeSearch);
el.webSearchBtn?.addEventListener('click', handleWebSearch);
el.customQBtn?.addEventListener('click', handleCustomQuestion);
el.customQInput?.addEventListener('keydown', e => { if (e.key === 'Enter') handleCustomQuestion(); });

el.readingLevel?.addEventListener('change', () => {
  saveSettings({ readingLevel: el.readingLevel.value }).catch(() => {});
  markRerunPending();
});
el.userContext?.addEventListener('change', () => {
  saveSettings({ userContext: el.userContext.value.trim() }).catch(() => {});
  markRerunPending();
});
el.userContext?.addEventListener('input', markRerunPending);

// IS_PANEL_OPEN — answers content script pings
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'IS_PANEL_OPEN') { sendResponse({ open: true }); return true; }
});

// Settings may have changed in the options tab while the panel was hidden.
document.addEventListener('visibilitychange', async () => {
  if (document.visibilityState !== 'visible') return;
  settings    = await getSettings();
  currentLang = settings.language || 'en';
  applyI18n(currentLang);
  if (el.readingLevel) {
    el.readingLevel.value = VALID_LEVELS.includes(settings.readingLevel) ? settings.readingLevel : 'standard';
  }
  if (settings.groqApiKey && !states.nokey.classList.contains('hidden')) showState('welcome');
  checkForPendingText();
});

// Nothing should keep streaming or speaking into a panel that is going away.
window.addEventListener('pagehide', () => {
  abortAll();
  releaseAudio();
});

// ══ KICK OFF ══════════════════════════════════════════════════════════════════
init();
