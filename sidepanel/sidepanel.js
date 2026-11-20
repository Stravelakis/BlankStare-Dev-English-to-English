// sidepanel.js — BlankStare
//
// Reading levels, the system prompt and the Greek heuristic live in
// utils/pure.js so they can be tested outside Chrome.

// ══ TRANSLATIONS (UI strings) ═════════════════════════════════════════════════
const I18N = {
  en: {
    welcomeTitle:'Select any dev text',
    welcomeDesc:'Highlight an error message, README, terminal output, docs, or any jargon. BlankStare rewrites it in plain English you can read <strong>instead of</strong> the original.',
    pasteHint:'📸 Paste a screenshot (Ctrl+V)',
    prereq:'🧭 What do I need first?',
    checklist:'✅ Do it with me',
    via:'via',
    usage:n => `${n} translation${n === 1 ? '' : 's'} today, all free.`,
    usageNone:'Works right away — no key needed. Add a free Gemini or Groq key in Settings for more.',
    imageReading:'Reading your screenshot…',
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
    recent:'Recent explanations',
    chips:['Is this safe to do?', 'Where do I type this?', 'What could go wrong?', 'Explain it like I’m five'],
  },
  el: {
    welcomeTitle:'Επίλεξε οποιοδήποτε dev κείμενο',
    welcomeDesc:'Επίλεξε μήνυμα σφάλματος, README, terminal output ή ορολογία. Το BlankStare το ξαναγράφει σε απλά Ελληνικά που μπορείς να διαβάσεις <strong>αντί</strong> για το πρωτότυπο.',
    pasteHint:'📸 Επικόλλησε στιγμιότυπο (Ctrl+V)',
    prereq:'🧭 Τι χρειάζομαι πρώτα;',
    checklist:'✅ Κάν’ το μαζί μου',
    via:'μέσω',
    usage:n => `${n} ${n === 1 ? 'μετάφραση' : 'μεταφράσεις'} σήμερα, όλες δωρεάν.`,
    usageNone:'Δουλεύει αμέσως — χωρίς κλειδί. Πρόσθεσε δωρεάν κλειδί Gemini ή Groq στις Ρυθμίσεις για περισσότερα.',
    imageReading:'Διαβάζω το στιγμιότυπο…',
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
    recent:'Πρόσφατες εξηγήσεις',
    chips:['Είναι ασφαλές;', 'Πού το πληκτρολογώ;', 'Τι μπορεί να πάει στραβά;', 'Εξήγησέ το σαν να είμαι πέντε'],
  },
};

// Budgets include room for thinking: several free models think before they
// answer, and at v0.7's 700 tokens some spent the lot thinking and returned
// nothing (seen live on OVH, 19/11/2026).
const MAX_TOKENS = { normal: 4096, rephrase: 4096, deeper: 8192, fullpage: 8192, followup: 4096, prereq: 3072, checklist: 6144, image: 4096 };

// ══ DOM REFS ══════════════════════════════════════════════════════════════════
const $ = id => document.getElementById(id);
const states = {
  welcome: $('state-welcome'),
  loading: $('state-loading'), result: $('state-result'), error: $('state-error'),
};
const el = {
  settingsBtn:       $('settings-btn'),
  welcomeUsage:      $('welcome-usage'),
  modelLine:         $('model-line'),
  pastedImage:       $('pasted-image'),
  prereqBtn:         $('prereq-btn'),
  checklistBtn:      $('checklist-btn'),
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
  webSearchLink:     $('web-search-link'),
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
let liveAudio      = null;   // PCM chunks: the Gemini Live voice of the current answer
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
  // generate() calls nothing back after an abort, so release the Ask button here.
  setLoading(el.customQBtn, false);
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
  el.explanationText?.closest('.explanation-box')?.classList.toggle('live', on);
  if (!on) stopWaiting();
}

// ══ WAITING: symbols resolving into words ════════════════════════════════════
// Before the first word arrives, the answer box shows "Dev English" symbols
// settling into a plain label. It is the product in one picture, and it stops
// the moment real text arrives.
let waiting = null;
function startWaiting(label) {
  stopWaiting();
  const box = document.createElement('div');
  box.className = 'decoding';
  box.innerHTML = '<div class="decoding-label"></div><div class="decoding-noise" aria-hidden="true"></div>';
  el.explanationText.replaceChildren(box);
  const lab = box.firstChild, noise = box.lastChild;
  const w = { alive: true, timer: 0 };
  waiting = w;
  const S = BSFX.SYMBOLS;
  const scramble = n => Array.from({ length: n }, () => S[(Math.random() * S.length) | 0]).join('');
  if (BSFX.REDUCED) { lab.textContent = label; noise.textContent = scramble(34); return; }
  w.timer = setInterval(() => { noise.textContent = scramble(34); }, 90);
  (async () => {
    while (w.alive) {
      await BSFX.decode(lab, label, { duration: 900 });
      await new Promise(r => setTimeout(r, 1300));
    }
  })();
}
function stopWaiting() {
  if (!waiting) return;
  waiting.alive = false;
  clearInterval(waiting.timer);
  waiting = null;
}

// ══ i18n ══════════════════════════════════════════════════════════════════════
function applyI18n(lang) {
  currentLang = lang;
  const t = I18N[lang] || I18N.en;
  // Static, authored strings — innerHTML is intentional, they carry markup.
  document.querySelectorAll('[data-i18n]').forEach(node => {
    const key = node.dataset.i18n;
    if (typeof t[key] === 'string') node.innerHTML = t[key];
  });
  document.querySelectorAll('[data-i18n-placeholder]').forEach(node => {
    const key = node.dataset.i18nPlaceholder;
    if (t[key] !== undefined) node.placeholder = t[key];
  });
  el.langToggle.textContent = lang.toUpperCase();
  document.documentElement.lang = lang;
  if (typeof renderChips === 'function') renderChips();
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
  cleanRetiredSettings();
  showUsage();

  // No key gate any more: OVHcloud answers with no key at all.
  // Text queued before this document existed.
  await checkForPendingText();
}

async function showUsage() {
  if (!el.welcomeUsage) return;
  const t = I18N[currentLang] || I18N.en;
  const u = await getUsage().catch(() => null);
  el.welcomeUsage.textContent = u?.total ? t.usage(u.total)
    : (settings.geminiApiKey || settings.groqApiKey) ? '' : t.usageNone;
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
// Repainting markdown on every token is wasteful; once per frame is plenty.
//
// Each new block (paragraph, list item, code box) fades in once. The whole
// answer is re-rendered every frame, so each block remembers when it first
// appeared and its animation resumes where it was instead of restarting.
const paintPending = new Map();
const FADE_MS = 420;
function paint(node, text) {
  const prev = paintPending.get(node);
  if (prev) cancelAnimationFrame(prev);
  paintPending.set(node, requestAnimationFrame(() => {
    paintPending.delete(node);
    if (node === el.explanationText) stopWaiting();
    node.innerHTML = renderMarkdown(text);   // renderMarkdown escapes everything first
    if (BSFX.REDUCED) return;
    const born = node._born || (node._born = []);
    const now = performance.now();
    const blocks = node.querySelectorAll(':scope > *, :scope > ol > li, :scope > ul > li');
    blocks.forEach((b, i) => {
      if (born[i] === undefined) born[i] = now;
      const age = now - born[i];
      if (age < FADE_MS) { b.classList.add('fresh'); b.style.animationDelay = `-${Math.round(age)}ms`; }
    });
    born.length = Math.min(born.length, blocks.length);
  }));
}
function resetPaint(node) { node._born = []; }

function showModel(entry) {
  if (!el.modelLine) return;
  const t = I18N[currentLang] || I18N.en;
  el.modelLine.textContent = entry ? `${t.via} ${entry.model.split('/').pop()} · ${PROVIDERS[entry.provider].label.replace(/ \(.*\)$/, '')}` : '';
}

async function explainText(text, mode = 'normal', image = null) {
  if (!text && !image) return;

  settings = await getSettings();

  // Greek input is nearly always a mis-selection: BlankStare translates English
  // dev text, in either output language.
  if (text && !image && isLikelyGreek(text) && mode === 'normal') {
    showState('result');
    el.selectedText.textContent = truncate(text, 200);
    el.explanationText.innerHTML = `<div class="lang-warning-inline">${I18N[currentLang].greekWarning}</div>`;
    setStreaming(false);
    setStatus('');
    el.explanationActions.classList.add('hidden');
    return;
  }

  // Prerequisites and checklists are about the same selection; they replace
  // the answer but keep the selection.
  const previous = (mode === 'deeper' || mode === 'rephrase') ? currentExplain : '';

  if (!image) {
    currentText  = text;
    currentQuery = text.length > 60 ? text.slice(0, 60).replace(/\s\S*$/, '').trim() : text.trim();
  }

  const level      = el.readingLevel?.value || settings.readingLevel || 'standard';
  const context    = el.userContext?.value.trim() || settings.userContext || '';
  const sysPrompt  = buildSystemPrompt(currentLang, level, context);
  const userPrompt = buildUserPrompt(image ? 'image' : mode, text || '', previous);

  el.selectedText.textContent = image ? '📸' : truncate(text, 200);
  el.pastedImage?.classList.toggle('hidden', !image);
  if (image && el.pastedImage) el.pastedImage.src = image.dataUrl;
  showState('result');
  resetPaint(el.explanationText);
  setStreaming(true);
  startWaiting(image ? I18N[currentLang].imageReading : I18N[currentLang].translating);
  setStatus('');
  showModel(null);
  el.explanationActions.classList.add('hidden');
  el.jargonResults.classList.add('hidden');
  resetSecondary();
  if (!image) updateResourceLinks(text);
  currentExplain = '';
  liveAudio = null;
  stopVoice();

  const signal     = beginRequest();
  const controller = currentController;

  await generate({
    settings, mode, image,
    systemPrompt: sysPrompt,
    userPrompt,
    maxTokens:    MAX_TOKENS[image ? 'image' : mode] ?? MAX_TOKENS.normal,
    temperature:  mode === 'rephrase' ? 0.6 : 0.3,
    signal,

    onModel: showModel,

    onChunk: (_delta, full) => {
      if (states.result.classList.contains('hidden')) showState('result');
      paint(el.explanationText, full);
      currentExplain = full;
    },

    onStatus: setStatus,

    onDone: async (full, meta) => {
      endRequest(controller);
      currentExplain = full;
      liveAudio = meta?.audio || null;
      if (states.result.classList.contains('hidden')) showState('result');
      paint(el.explanationText, full);
      setStreaming(false);
      el.explanationActions.classList.remove('hidden');
      if (el.modelLine?.textContent) BSFX.decode(el.modelLine, el.modelLine.textContent, { duration: 700 });
      clearRerunPending();
      if (el.jargonCb?.checked && !image) runGlossary(full);
      sessionHistory = await pushHistory({
        query: image ? '📸 Screenshot' : currentQuery, text: text || '', explanation: full,
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
        if (states.result.classList.contains('hidden')) showState('result');
        paint(el.explanationText, err.partial);
        el.explanationActions.classList.remove('hidden');
        setStatus(err.message);
        return;
      }

      el.errorMessage.textContent = err.message || 'Something went wrong.';
      showState('error');
    },
  });
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

  const mode  = settings.ttsMode || 'auto';
  const key   = settings.groqApiKey;
  const voice = settings.orpheusVoice || 'tara';

  // An answer from Gemini Live arrived already spoken. Playing that voice costs
  // nothing and speaks Greek properly too.
  if (liveAudio && mode === 'auto') {
    try {
      setVoiceActive(true);
      currentAudioUrl = liveAudioUrl(liveAudio);
      currentAudio    = new Audio(currentAudioUrl);
      currentAudio.onended = stopVoice;
      currentAudio.onerror = stopVoice;
      await currentAudio.play();
      return;
    } catch (_) { releaseAudio(); }
  }

  // Orpheus is English-only: handed Greek text it reads it with English
  // phonetics. Greek always goes to the system's Greek voice.
  if (mode !== 'browser' && key && currentLang !== 'el') {
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
  // Read the words, not the markdown symbols around them.
  const spoken = currentExplain.replace(/```[^\n]*\n?/g, '').replace(/[`*#]/g, '').replace(/^\s*- \[[ xX]\]\s*/gm, '');
  const u = new SpeechSynthesisUtterance(spoken);
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
      settings,
      translation: translationText,
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

// ══ PASTED SCREENSHOT ═════════════════════════════════════════════════════════
// Ctrl+V anywhere in the panel (outside a text field). Read by a free model
// that can see images. Large screenshots are scaled down first: free tiers cap
// request size, and text stays readable at 1600px.
async function handlePaste(e) {
  if (e.target.closest('input, textarea')) return;
  const item = [...(e.clipboardData?.items || [])].find(i => i.type.startsWith('image/'));
  if (!item) return;
  e.preventDefault();
  try {
    const image = await shrinkImage(item.getAsFile(), 1600);
    explainText('', 'normal', image);
  } catch (_) {
    el.errorMessage.textContent = 'That image could not be read. Try a PNG or JPG screenshot.';
    showState('error');
  }
}

async function shrinkImage(file, maxSide) {
  const bmp   = await createImageBitmap(file);
  const scale = Math.min(1, maxSide / Math.max(bmp.width, bmp.height));
  const canvas = new OffscreenCanvas(Math.round(bmp.width * scale), Math.round(bmp.height * scale));
  canvas.getContext('2d').drawImage(bmp, 0, 0, canvas.width, canvas.height);
  const blob = await canvas.convertToBlob({ type: 'image/jpeg', quality: 0.88 });
  const dataUrl = await new Promise(res => { const r = new FileReader(); r.onload = () => res(r.result); r.readAsDataURL(blob); });
  return { mime: 'image/jpeg', base64: String(dataUrl).split(',')[1], dataUrl };
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
  sparkFrom(el.customQBtn);
  el.customQInput.value = '';
  sizeAsk();
  el.customQResult.classList.add('hidden');
  el.customQResult.textContent = '';
  resetPaint(el.customQResult);

  const level = el.readingLevel?.value || settings.readingLevel || 'standard';

  await generate({
    settings, mode: 'followup',
    systemPrompt: buildSystemPrompt(currentLang, level, ''),
    userPrompt:   buildUserPrompt('followup', currentText, currentExplain, q),
    maxTokens:    MAX_TOKENS.followup,
    signal:       customQController.signal,

    onChunk: (_d, full) => {
      paint(el.customQResult, full);
      el.customQResult.classList.remove('hidden');
    },
    onDone:  full => { paint(el.customQResult, full); setLoading(el.customQBtn, false); },
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
  el.selectedText.textContent = h.text ? truncate(h.text, 200) : h.query;
  el.explanationText.innerHTML = renderMarkdown(h.explanation);
  el.pastedImage?.classList.add('hidden');
  showModel(null);
  liveAudio = null;
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
  [el.ytResults, el.ytEmbed, el.customQResult, el.jargonResults]
    .forEach(e => { e?.classList.add('hidden'); if (e) e.innerHTML = ''; });
  if (el.webSearchLink && currentQuery) el.webSearchLink.href = duckDuckGoUrl(currentQuery);
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
document.addEventListener('paste', handlePaste);

// Copy buttons on command blocks. Delegated: the blocks are re-rendered on
// every streamed token.
document.addEventListener('click', async e => {
  const btn = e.target.closest('.md-copy');
  if (!btn) return;
  try {
    await navigator.clipboard.writeText(btn.dataset.copy || '');
    btn.textContent = '✓ Copied';
    btn.classList.add('copied');
    setTimeout(() => { btn.textContent = 'Copy'; btn.classList.remove('copied'); }, 1600);
  } catch (_) {}
});

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
el.prereqBtn?.addEventListener('click',    () => explainText(currentText, 'prereq'));
el.checklistBtn?.addEventListener('click', () => explainText(currentText, 'checklist'));
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
el.customQBtn?.addEventListener('click', handleCustomQuestion);
el.customQInput?.addEventListener('keydown', e => {
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleCustomQuestion(); }
});
el.customQInput?.addEventListener('input', sizeAsk);

function sizeAsk() {
  const ta = el.customQInput; if (!ta) return;
  ta.style.height = 'auto';
  ta.style.height = `${Math.min(110, ta.scrollHeight)}px`;
}
function sparkFrom(btn) {
  const host = btn.closest('.collapsible-section') || document.body;
  const r = btn.getBoundingClientRect(), h = host.getBoundingClientRect();
  BSFX.sparks(host, r.left - h.left + r.width / 2, r.top - h.top + r.height / 2, { color: '#F2DCA0', count: 24, boost: 1.3 });
}
function renderChips() {
  const box = $('q-chips'); if (!box) return;
  box.replaceChildren(...(I18N[currentLang] || I18N.en).chips.map(c => {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'q-chip'; b.textContent = c;
    b.addEventListener('click', () => { el.customQInput.value = c; sizeAsk(); handleCustomQuestion(); });
    return b;
  }));
}

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
  showUsage();
  checkForPendingText();
});

// Nothing should keep streaming or speaking into a panel that is going away.
window.addEventListener('pagehide', () => {
  abortAll();
  releaseAudio();
});

// ══ KICK OFF ══════════════════════════════════════════════════════════════════
init();
