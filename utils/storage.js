// utils/storage.js — BlankStare
// chrome.storage helpers and the settings defaults.
//
// VALID_LEVELS lives in utils/pure.js — load that first.

const SETTINGS_DEFAULTS = {
  // API keys
  groqApiKey:       '',
  youtubeKey:       '',
  searxngUrl:       '',

  // AI model
  model:            'llama-3.1-8b-instant',
  autoFallback:     true,   // automatically try next model when rate-limited

  // Text-to-speech
  ttsMode:          'orpheus',  // 'browser' | 'orpheus'
  orpheusVoice:     'zoe',      // tara | leah | leo | jess | zac | zoe | mia | julia

  // Language & reading
  language:         'en',
  readingLevel:     'standard',
  userContext:      '',

  // Trigger modes
  triggerFloating:  true,
  triggerRightClick:true,
  triggerAlwaysOn:  false,

  // Features
  jargonDictionary: false,
  excludeList:      [],
};

async function getSettings() {
  return await chrome.storage.sync.get(SETTINGS_DEFAULTS);
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
