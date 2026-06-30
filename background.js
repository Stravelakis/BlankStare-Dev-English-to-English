// background.js — BlankStare v0.5
// ─────────────────────────────────────────────────────────────────────────────
// CRITICAL: sidePanel.open() MUST be called synchronously inside a user-gesture
// handler. Never use async/await before it — the gesture token expires.
// Valid gesture sources: chrome.action.onClicked, chrome.contextMenus.onClicked.
// Content-script messages do NOT count. This is a Chrome hard limit.
// ─────────────────────────────────────────────────────────────────────────────

// ══ INSTALL ══════════════════════════════════════════════════════════════════
chrome.runtime.onInstalled.addListener(async () => {
  // Build context menu based on saved setting (default: enabled)
  const { triggerRightClick = true } = await chrome.storage.sync.get('triggerRightClick');
  if (triggerRightClick) createContextMenu();
  chrome.runtime.openOptionsPage();
  console.log('[BlankStare] v0.5 installed.');
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
  chrome.sidePanel.open({ tabId: tab.id });
  chrome.action.setBadgeText({ text: '', tabId: tab.id });

  // ✅ ASYNC after: grab selection if nothing queued
  ;(async () => {
    try {
      const { pendingText } = await chrome.storage.session.get(['pendingText']);
      if (!pendingText) {
        const res = await chrome.tabs.sendMessage(tab.id, { type: 'GET_SELECTION' });
        if (res?.text) {
          await chrome.storage.session.set({ pendingText: res.text, pendingTimestamp: Date.now() });
        }
      }
    } catch (_) {}
  })();
});

// ══ RIGHT-CLICK CONTEXT MENU ══════════════════════════════════════════════════
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId !== 'blankstare-explain' || !info.selectionText) return;
  // ✅ SYNC: open panel first
  chrome.sidePanel.open({ tabId: tab.id });
  chrome.action.setBadgeText({ text: '', tabId: tab.id });
  // ✅ ASYNC after: store the text
  chrome.storage.session.set({ pendingText: info.selectionText.trim(), pendingTimestamp: Date.now() });
});

// ══ KEYBOARD SHORTCUT — Alt+Shift+E ══════════════════════════════════════════
chrome.commands.onCommand.addListener(async (command) => {
  if (command !== 'explain-selection') return;
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) return;
  try {
    const res = await chrome.tabs.sendMessage(tab.id, { type: 'GET_SELECTION' });
    if (res?.text) {
      await chrome.storage.session.set({ pendingText: res.text, pendingTimestamp: Date.now() });
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
    chrome.storage.session.set({ pendingText: message.text, pendingTimestamp: Date.now() })
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
