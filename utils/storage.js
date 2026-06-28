// utils/storage.js — v0.2
// All settings keys and defaults in one place.

const SETTINGS_DEFAULTS = {
  groqApiKey:         '',
  youtubeKey:         '',
  searxngUrl:         '',
  model:              'llama-3.1-8b-instant',
  // Trigger modes — now independent toggles (v0.2 migration from single triggerMode)
  triggerFloating:    true,
  triggerRightClick:  true,
  triggerAlwaysOn:    false,
  // Language: 'en' or 'el'
  language:           'en',
  // Reading level: 'eli5' | 'standard' | 'business' | 'design' | 'legal'
  readingLevel:       'standard',
  // Optional context the user provides ("I'm reading this because...")
  userContext:        '',
  // Jargon dictionary toggle
  jargonDictionary:   false,
  excludeList:        [],    // array of domain strings where BlankStare is silenced
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
