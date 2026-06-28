// background.js — BlankStare v0.3 (gesture fix)
// ─────────────────────────────────────────────────────────────────────────────
// CRITICAL RULE: sidePanel.open() must be called SYNCHRONOUSLY inside a user-
// gesture handler. Using `async` on the listener causes Chrome to expire the
// gesture token during the first `await`, making sidePanel.open() throw:
//   "may only be called in response to a user gesture"
//
// Pattern: open the panel first (sync), then do async work in a fire-and-forget
// IIFE that runs AFTER the panel is already opening.
// ─────────────────────────────────────────────────────────────────────────────

// ══ INSTALL ══════════════════════════════════════════════════════════════════
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'blankstare-explain',
    title: 'Explain with BlankStare',
    contexts: ['selection'],
  });
  chrome.runtime.openOptionsPage();
  console.log('[BlankStare] v0.3 installed.');
});

// ══ TOOLBAR CLICK ════════════════════════════════════════════════════════════
// NOT async — gesture token must be alive when sidePanel.open() is called.
chrome.action.onClicked.addListener((tab) => {
  // ✅ Step 1 — SYNC: open the panel immediately while gesture is still valid
  chrome.sidePanel.open({ tabId: tab.id });
  chrome.action.setBadgeText({ text: '', tabId: tab.id });

  // ✅ Step 2 — ASYNC (fire-and-forget): grab selection if nothing is queued
  // The panel polls for pendingText on a 500ms timer, so this races it safely.
  ;(async () => {
    try {
      const { pendingText } = await chrome.storage.session.get(['pendingText']);
      if (!pendingText) {
        const res = await chrome.tabs.sendMessage(tab.id, { type: 'GET_SELECTION' });
        if (res?.text) {
          await chrome.storage.session.set({
            pendingText:      res.text,
            pendingTimestamp: Date.now(),
          });
        }
      }
    } catch (_) {}
  })();
});

// ══ RIGHT-CLICK CONTEXT MENU ══════════════════════════════════════════════════
// Also NOT async — same reason.
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId !== 'blankstare-explain' || !info.selectionText) return;

  // ✅ Open panel FIRST while the context-menu gesture is still valid
  chrome.sidePanel.open({ tabId: tab.id });
  chrome.action.setBadgeText({ text: '', tabId: tab.id });

  // ✅ Store text asynchronously after — panel will pick it up within 500ms
  chrome.storage.session.set({
    pendingText:      info.selectionText.trim(),
    pendingTimestamp: Date.now(),
  });
});

// ══ KEYBOARD SHORTCUT — Alt+Shift+E ══════════════════════════════════════════
// Queues selected text and sets badge. User then clicks toolbar icon to open.
chrome.commands.onCommand.addListener(async (command) => {
  if (command !== 'explain-selection') return;
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) return;
  try {
    const res = await chrome.tabs.sendMessage(tab.id, { type: 'GET_SELECTION' });
    if (res?.text) {
      await chrome.storage.session.set({
        pendingText:      res.text,
        pendingTimestamp: Date.now(),
      });
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
    chrome.storage.session.set({
      pendingText:      message.text,
      pendingTimestamp: Date.now(),
    }).then(() => {
      chrome.action.setBadgeText({ text: '!', tabId });
      chrome.action.setBadgeBackgroundColor({ color: '#e8a838', tabId });
      sendResponse({ ok: true });
    });
    return true;
  }
  if (message.type === 'SETTINGS_CHANGED') {
    sendResponse({ ok: true });
  }
});
