// utils/storage.js — BlankStare
// chrome.storage helpers and the settings defaults.
//
// VALID_LEVELS lives in utils/pure.js — load that first.

const SETTINGS_DEFAULTS = {
  // Keys. None are required: OVHcloud answers with no key at all.
  geminiApiKey:     '',
  groqApiKey:       '',
  youtubeKey:       '',

  // AI model. '' = automatic (today's best free model, checked daily).
  // Otherwise 'provider:model', tried first, then automatic.
  pinnedModel:      '',

  // Text-to-speech. 'auto' = Gemini Live's own voice when the answer came
  // from it, otherwise Orpheus (needs a Groq key) or the browser voice.
  ttsMode:          'auto',     // 'auto' | 'orpheus' | 'browser'
  orpheusVoice:     'zoe',

  // Language & reading
  language:         'en',
  readingLevel:     'standard',
  userContext:      '',

  // Trigger modes
  triggerFloating:  true,
  triggerRightClick:true,

  // Features
  jargonDictionary: false,
  excludeList:      [],

  // First-run setup finished
  onboarded:        false,
};

// Settings from v0.7 that no longer exist. Removed on first load so they do
// not linger in sync storage forever.
const RETIRED_SETTINGS = ['model', 'autoFallback', 'searxngUrl'];

async function getSettings() {
  const s = await chrome.storage.sync.get(SETTINGS_DEFAULTS);
  // v0.7 → v0.8: 'orpheus' was the old default; 'auto' is a strict superset.
  if (s.ttsMode === 'orpheus' && !s._ttsMigrated) {
    s.ttsMode = 'auto';
    chrome.storage.sync.set({ ttsMode: 'auto', _ttsMigrated: true }).catch(() => {});
  }
  return s;
}

async function cleanRetiredSettings() {
  await chrome.storage.sync.remove(RETIRED_SETTINGS).catch(() => {});
}

async function saveSettings(partial) {
  await chrome.storage.sync.set(partial);
}

async function getSetting(key) {
  const r = await chrome.storage.sync.get({ [key]: SETTINGS_DEFAULTS[key] });
  return r[key];
}

// ══ PENDING TEXT ══════════════════════════════════════════════════════════════
// Session storage is the hand-off between the background worker (which has the
// user gesture) and the panel (which does the work).

async function getPendingText() {
  const { pendingText, pendingTimestamp } = await chrome.storage.session.get(
    ['pendingText', 'pendingTimestamp']
  );
  if (!pendingText) return null;
  return { text: pendingText, timestamp: pendingTimestamp };
}

async function clearPendingText() {
  await chrome.storage.session.remove(['pendingText', 'pendingTimestamp']);
}

// ══ HISTORY ═══════════════════════════════════════════════════════════════════
// Chrome destroys the side panel document every time the panel closes, so an
// in-memory array cannot deliver the "last 20" the UI promises. Session storage
// survives the panel and dies with the browser — nothing reaches disk.

const HISTORY_KEY   = 'sessionHistory';
const HISTORY_LIMIT = 20;

async function getHistory() {
  const { [HISTORY_KEY]: history } = await chrome.storage.session.get(HISTORY_KEY);
  return Array.isArray(history) ? history : [];
}

async function pushHistory(entry) {
  const history = await getHistory();
  history.unshift(entry);
  const trimmed = history.slice(0, HISTORY_LIMIT);
  await chrome.storage.session.set({ [HISTORY_KEY]: trimmed });
  return trimmed;
}

async function clearHistory() {
  await chrome.storage.session.remove(HISTORY_KEY);
}
