// sidepanel.js — BlankStare v0.5

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
  },
};

// ══ READING LEVELS — meaningfully different system prompts ════════════════════
// The key insight: Standard uses everyday analogies, Vibecoder uses AI/API
// concepts as bridges since they already know those.
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

// ══ SYSTEM PROMPT — TRANSLATION PHILOSOPHY ════════════════════════════════════
// The core fix: we are TRANSLATING, not explaining. The output replaces the
// original — the reader should never need to go back and read the dev text.
function buildSystemPrompt(lang, level, userContext) {
  const who     = LEVEL_DESC[level]?.[lang] || LEVEL_DESC.standard[lang];
  const langInstr = lang === 'el'
    ? 'Write your translation in Greek (Ελληνικά). All output must be Greek.'
    : 'Write in plain English.';
  const ctx = userContext
    ? `\nReader context: "${userContext}"`
    : '';

  return `You are a translator from Dev English (technical developer jargon) into plain language. Your reader is: ${who}.${ctx}

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
  warningBox:        $('lang-warning-box'),
};

// ══ APP STATE ═════════════════════════════════════════════════════════════════
let settings       = {};
let currentText    = '';
let currentExplain = '';
let currentQuery   = '';
let currentLang    = 'en';
let lastTimestamp  = 0;
let voiceActive    = false;
let rerunPending   = false;
let currentAudio   = null; // for Orpheus audio element
const sessionHistory = [];

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
  document.documentElement.lang = lang;
}

// ══ LOTTIE ════════════════════════════════════════════════════════════════════
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
  const sa = loadLottie('settings-anim', 'icon-settings.json', false);
  if (sa) el.settingsBtn?.addEventListener('mouseenter', () => { sa.stop(); sa.play(); });
}

// ══ STARTUP ═══════════════════════════════════════════════════════════════════
async function init() {
  settings = await getSettings();
  currentLang = settings.language || 'en';
  applyI18n(currentLang);

  const validLevels = ['eli5', 'newbie', 'standard', 'vibecoder'];
  const savedLevel  = validLevels.includes(settings.readingLevel) ? settings.readingLevel : 'standard';
  if (el.readingLevel) el.readingLevel.value = savedLevel;

  if (el.userContext && settings.userContext) {
    el.userContext.value = settings.userContext;
    el.contextArea?.classList.remove('hidden');
    if (el.contextToggle) el.contextToggle.textContent = '− Context';
  }

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

// ══ GREEK DETECTION ═══════════════════════════════════════════════════════════
function isLikelyGreek(text) {
  const greekChars = (text.match(/[\u0370-\u03FF\u1F00-\u1FFF]/g) || []).length;
  return greekChars / text.length > 0.2;
}

// ══ EXPLAIN — TRANSLATION MODE ════════════════════════════════════════════════
async function explainText(text, mode = 'normal') {
  if (!text) return;

  settings = await getSettings();
  if (!settings.groqApiKey) { showState('nokey'); return; }

  // Greek text guard: if the selected text is mostly Greek, warn the user
  if (isLikelyGreek(text) && mode === 'normal') {
    showState('result');
    el.selectedText.textContent = text.length > 200 ? text.slice(0, 200) + '…' : text;
    el.explanationText.innerHTML = `<div class="lang-warning-inline">${I18N[currentLang].greekWarning}</div>`;
    el.explanationCursor.classList.add('hidden');
    el.explanationActions.classList.add('hidden');
    return;
  }

  currentText  = text;
  currentQuery = text.length > 60
    ? text.slice(0, 60).replace(/\s\S*$/, '').trim()
    : text.trim();

  const level      = el.readingLevel?.value || settings.readingLevel || 'standard';
  const context    = el.userContext?.value.trim() || settings.userContext || '';
  const sysPrompt  = buildSystemPrompt(currentLang, level, context);

  let userPrompt;
  if (mode === 'deeper') {
    userPrompt = `The reader wants more detail. Expand on this translation — go deeper while staying in plain language. Do not repeat what you already said, just add depth.\n\nOriginal dev text:\n${text}\n\nYour previous translation:\n${currentExplain}`;
  } else if (mode === 'rephrase') {
    userPrompt = `Translate the same dev text again, using completely different wording and a fresh approach. Do not repeat any phrases from the previous translation.\n\nDev text:\n${text}`;
  } else if (mode === 'fullpage') {
    userPrompt = `Translate this entire page's content into plain language. Give a clear 3-5 point summary of what this page is about and what it's asking the reader to understand or do.\n\nPage content:\n${text}`;
  } else {
    userPrompt = `Translate this dev text into plain language:\n\n${text}`;
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
    text,
    settings.groqApiKey,
    settings.model,
    sysPrompt,
    userPrompt,
    (_delta, full) => {
      if (states.result.classList.contains('hidden')) showState('result');
      el.explanationText.textContent = full;
      currentExplain = full;
    },
    (full) => {
      currentExplain = full;
      el.explanationCursor.classList.add('hidden');
      el.explanationActions.classList.remove('hidden');
      clearRerunPending();
      if (el.jargonCb?.checked) runJargonDictionary(full);
      addToHistory({ query: currentQuery, text, explanation: full, lang: currentLang, timestamp: Date.now() });
    },
    (err) => {
      el.explanationCursor.classList.add('hidden');
      el.errorMessage.textContent = err.message || 'Something went wrong.';
      showState('error');
    },
    !!settings.autoFallback,
  );
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

// ══ VOICE — ORPHEUS + BROWSER FALLBACK ═══════════════════════════════════════
async function toggleVoice() {
  if (voiceActive) {
    stopVoice();
    return;
  }
  if (!currentExplain) return;

  const mode  = settings.ttsMode || 'browser';
  const key   = settings.groqApiKey;
  const voice = settings.orpheusVoice || 'tara';

  if (mode === 'orpheus' && key) {
    try {
      setVoiceActive(true, 'Orpheus');
      const url   = await speakWithOrpheus(currentExplain, key, voice);
      currentAudio = new Audio(url);
      currentAudio.onended = () => {
        URL.revokeObjectURL(url);
        setVoiceActive(false);
      };
      currentAudio.play();
      return;
    } catch (err) {
      console.warn('[BlankStare] Orpheus failed, falling back to browser voice:', err.message);
      // Fall through to browser TTS
    }
  }

  // Browser Web Speech API
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
    speechSynthesis.onvoiceschanged = () => { speechSynthesis.speak(u); };
  } else {
    speechSynthesis.speak(u);
  }
  setVoiceActive(true, 'Browser');
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

function setVoiceActive(active, _source) {
  voiceActive = active;
  el.voiceBtn?.classList.toggle('active', active);
  el.voiceBtn.title = active ? 'Stop reading' : 'Read aloud';
}

function stopVoice() {
  speechSynthesis.cancel();
  if (currentAudio) { currentAudio.pause(); currentAudio = null; }
  setVoiceActive(false);
}

// ══ JARGON DICTIONARY — now a glossary, not the main output ══════════════════
// This runs AFTER the translation is shown, as a supplementary reference.
async function runJargonDictionary(translationText) {
  el.jargonResults.innerHTML = `<div class="jargon-loading">Building glossary…</div>`;
  el.jargonResults.classList.remove('hidden');

  const prompt = `From this plain-English translation, identify any technical terms or acronyms that still appear (the ones the translator couldn't fully avoid). Return ONLY valid JSON (no markdown, no backticks): [{"term":"word","def":"5-10 word plain definition"}]. If none remain, return []. Translation:\n${translationText}`;

  try {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${settings.groqApiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 400, temperature: 0.2,
      }),
    });
    const data  = await res.json();
    const raw   = data.choices?.[0]?.message?.content || '[]';
    const terms = JSON.parse(raw.replace(/```json|```/g, '').trim());
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
  } catch (_) {
    el.jargonResults.innerHTML = `<div class="jargon-loading">Glossary unavailable.</div>`;
  }
}

// ══ FULL PAGE SUMMARY ═════════════════════════════════════════════════════════
async function handleFullPage() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) return;
    const res = await chrome.tabs.sendMessage(tab.id, { type: 'GET_PAGE_CONTENT' });
    const txt = (res?.text || '').slice(0, 4000);
    if (!txt) return;
    explainText(txt, 'fullpage');
  } catch (_) {
    el.errorMessage.textContent = 'Could not read page content. Try selecting specific text instead.';
    showState('error');
  }
}

// ══ YOUTUBE ═══════════════════════════════════════════════════════════════════
async function handleYouTubeSearch() {
  if (!settings.youtubeKey) {
    el.ytResults.innerHTML = `<p style="padding:10px 12px;font-size:12px;color:var(--text-muted);">No YouTube API key. <a href="#" id="yt-sl" style="color:var(--accent);">Add in Settings →</a></p>`;
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
        c.addEventListener('keydown', e => { if (e.key==='Enter') embedVideo(c.dataset.id); });
      });
    }
    el.ytResults.classList.remove('hidden');
  } catch (err) {
    el.ytResults.innerHTML = `<p style="padding:10px 12px;font-size:12px;color:var(--error);">${esc(err.message)}</p>`;
    el.ytResults.classList.remove('hidden');
  } finally { setLoading(el.ytSearchBtn, false); }
}

function embedVideo(id) {
  el.ytEmbed.innerHTML = `<iframe src="https://www.youtube.com/embed/${id}?autoplay=1&rel=0" allow="accelerometer;autoplay;clipboard-write;encrypted-media;gyroscope;picture-in-picture" allowfullscreen title="YouTube"></iframe>`;
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
      el.webResults.innerHTML = `<p style="padding:10px 12px;font-size:12px;color:var(--text-muted);">No results.</p>`;
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
  const sys  = buildSystemPrompt(currentLang, el.readingLevel?.value || 'standard', '');
  const user = `Context (dev text the reader selected):\n${currentText}\n\nQuestion: ${q}`;
  explainWithGroq(currentText, settings.groqApiKey, settings.model, sys, user,
    (_d, full) => { el.customQResult.textContent = full; el.customQResult.classList.remove('hidden'); },
    () => { setLoading(el.customQBtn, false); },
    err => { el.customQResult.textContent = '❌ ' + err.message; el.customQResult.classList.remove('hidden'); setLoading(el.customQBtn, false); },
    !!settings.autoFallback,
  );
}

// ══ HISTORY ═══════════════════════════════════════════════════════════════════
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
      <div class="history-item-time">${new Date(h.timestamp).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}</div>
    </div>`).join('');
  el.historyList.querySelectorAll('.history-item').forEach(item => {
    item.addEventListener('click', () => {
      const h = sessionHistory[+item.dataset.index];
      if (!h) return;
      el.historyPanel.classList.add('hidden');
      currentText = h.text; currentExplain = h.explanation; currentQuery = h.query;
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

// ══ RERUN BUTTON ══════════════════════════════════════════════════════════════
function markRerunPending() {
  if (!currentText) return;
  rerunPending = true;
  el.rerunBtn?.removeAttribute('disabled');
  el.rerunBtn?.classList.add('rerun-active');
}
function clearRerunPending() {
  rerunPending = false;
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
function openSettings(e) { e?.preventDefault(); chrome.runtime.openOptionsPage(); }
function esc(s = '') {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ══ EVENT LISTENERS ════════════════════════════════════════════════════════════
el.settingsBtn?.addEventListener('click', openSettings);
el.gotoSettings?.addEventListener('click', openSettings);
el.clearBtn?.addEventListener('click', () => { stopVoice(); clearRerunPending(); showState('welcome'); });
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
el.rerunBtn?.addEventListener('click', () => { if (!currentText) return; clearRerunPending(); explainText(currentText, 'normal'); });

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

document.addEventListener('visibilitychange', async () => {
  if (document.visibilityState !== 'visible') return;
  settings = await getSettings();
  const validLevels2 = ['eli5', 'newbie', 'standard', 'vibecoder'];
  if (el.readingLevel) el.readingLevel.value = validLevels2.includes(settings.readingLevel) ? settings.readingLevel : 'standard';
  currentLang = settings.language || 'en';
  applyI18n(currentLang);
  if (settings.groqApiKey && !states.nokey.classList.contains('hidden')) showState('welcome');
});

// ══ KICK OFF ══════════════════════════════════════════════════════════════════
init();
