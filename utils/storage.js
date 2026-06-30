// utils/storage.js — BlankStare v0.5

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

const VALID_LEVELS = ['eli5', 'newbie', 'standard', 'vibecoder'];

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
