// background.js — BlankStare
// ─────────────────────────────────────────────────────────────────────────────
// CRITICAL: sidePanel.open() MUST be called synchronously inside a user-gesture
// handler. Never use async/await before it — the gesture token expires.
// Valid gesture sources: chrome.action.onClicked, chrome.contextMenus.onClicked.
// Content-script messages do NOT count. This is a Chrome hard limit.
// ─────────────────────────────────────────────────────────────────────────────

// ══ ONE PANEL PER TAB ═════════════════════════════════════════════════════════
// The manifest has no default panel, so a panel only exists in the tabs it was
// opened in, and each of those tabs has its own. Both calls are synchronous
// and in this order: setOptions is queued before open, and open still runs
// inside the gesture.
function openPanel(tabId) {
  chrome.sidePanel.setOptions({ tabId, path: `sidepanel/sidepanel.html?tab=${tabId}`, enabled: true }).catch(() => {});
  chrome.sidePanel.open({ tabId }).catch(() => {});
  chrome.action.setBadgeText({ text: '', tabId });
}
const queue = (text, tabId) =>
  chrome.storage.session.set({ pendingText: text, pendingTimestamp: Date.now(), pendingTabId: tabId });

// ══ INSTALL ══════════════════════════════════════════════════════════════════
chrome.runtime.onInstalled.addListener(async ({ reason, previousVersion }) => {
  // "Keep open" was removed in v0.7.0 (it was saved but never used).
  chrome.storage.sync.remove('triggerAlwaysOn');

  // Build context menu based on saved setting (default: enabled)
  const { triggerRightClick = true } = await chrome.storage.sync.get('triggerRightClick');
  if (triggerRightClick) createContextMenu();
  // Settings opens on a fresh install, and once for people coming from a
  // version before 0.8 (new providers, new setup). Not on every reload.
  const before08 = reason === 'update' && /^0\.[0-7]\./.test(previousVersion || '');
  if (before08) {
    // v0.7's voice default was 'orpheus'; 'auto' is a strict superset of it.
    const { ttsMode } = await chrome.storage.sync.get('ttsMode');
    if (ttsMode === 'orpheus') await chrome.storage.sync.set({ ttsMode: 'auto' });
  }
  if (reason === 'install' || before08) chrome.runtime.openOptionsPage();
  console.log(`[BlankStare] v${chrome.runtime.getManifest().version} installed.`);
});

function createContextMenu() {
  chrome.contextMenus.create({
    id: 'blankstare-explain',
    title: 'Explain with BlankStare',
    contexts: ['selection'],
  }, () => chrome.runtime.lastError); // suppress "already exists" error
}

function removeContextMenu() {
  chrome.contextMenus.remove('blankstare-explain', () => chrome.runtime.lastError);
}

// ══ TOOLBAR CLICK — open panel SYNCHRONOUSLY ══════════════════════════════════
chrome.action.onClicked.addListener((tab) => {
  // ✅ SYNC: open the panel while the gesture token is still alive
  openPanel(tab.id);

  // ✅ ASYNC after: grab selection if nothing queued
  ;(async () => {
    try {
      const { pendingText } = await chrome.storage.session.get(['pendingText']);
      if (!pendingText) {
        const res = await chrome.tabs.sendMessage(tab.id, { type: 'GET_SELECTION' });
        if (res?.text) await queue(res.text, tab.id);
      }
    } catch (_) {}
  })();
});

// ══ RIGHT-CLICK CONTEXT MENU ══════════════════════════════════════════════════
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId !== 'blankstare-explain' || !info.selectionText) return;
  // ✅ SYNC: open panel first
  openPanel(tab.id);
  // ✅ ASYNC after: store the text
  queue(info.selectionText.trim(), tab.id);
});

// ══ KEYBOARD SHORTCUT — Alt+Shift+E ══════════════════════════════════════════
chrome.commands.onCommand.addListener(async (command) => {
  if (command !== 'explain-selection') return;
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) return;
  try {
    const res = await chrome.tabs.sendMessage(tab.id, { type: 'GET_SELECTION' });
    if (res?.text) {
      await queue(res.text, tab.id);
      chrome.action.setBadgeText({ text: '!', tabId: tab.id });
      chrome.action.setBadgeBackgroundColor({ color: '#e8a838', tabId: tab.id });
    }
  } catch (_) {}
});

// ══ MESSAGES FROM CONTENT SCRIPT ══════════════════════════════════════════════
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {

  if (message.type === 'EXPLAIN_TEXT') {
    const tabId = sender.tab?.id;
    if (!tabId) { sendResponse({ ok: false }); return; }
    queue(message.text, tabId)
      .then(() => {
        chrome.action.setBadgeText({ text: '!', tabId });
        chrome.action.setBadgeBackgroundColor({ color: '#e8a838', tabId });
        sendResponse({ ok: true });
      });
    return true;
  }

  if (message.type === 'SETTINGS_CHANGED') {
    // ── Sync context menu with the triggerRightClick toggle ──────────────────
    // This is what makes turning right-click off actually work.
    chrome.storage.sync.get({ triggerRightClick: true }, ({ triggerRightClick }) => {
      if (triggerRightClick) {
        createContextMenu(); // no-op if already exists (error suppressed)
      } else {
        removeContextMenu();
      }
    });
    sendResponse({ ok: true });
  }
});
