// content.js — BlankStare
// Injected into every web page. isDomainExcluded lives in utils/pure.js, which
// the manifest loads immediately before this file.

let floatingBtn = null;
let currentSelectedText = '';
let listenersAttached = false;

// Live copies of the two settings that govern this script. Previously read once
// at injection, so toggling either required reloading every open tab.
let triggerFloating = true;
let excludeList     = [];

// Cached panel-open state so we're not making a round-trip on every mouseup
let _panelOpenCache = false;
let _panelCacheTime = 0;
const PANEL_CACHE_TTL = 2500; // ms

async function isPanelOpen() {
  const now = Date.now();
  if (now - _panelCacheTime < PANEL_CACHE_TTL) return _panelOpenCache;
  _panelCacheTime = now;
  _panelOpenCache = await new Promise(resolve => {
    const t = setTimeout(() => resolve(false), 250);
    chrome.runtime.sendMessage({ type: 'IS_PANEL_OPEN' }, res => {
      clearTimeout(t);
      resolve(!chrome.runtime.lastError && res?.open === true);
    });
  });
  return _panelOpenCache;
}

// ── Startup ───────────────────────────────────────────────────────────────────
(async function init() {
  const s = await chrome.storage.sync.get({ triggerFloating: true, excludeList: [] });
  triggerFloating = s.triggerFloating;
  excludeList     = s.excludeList;
  reconcile();
})();

// ── Settings sync ─────────────────────────────────────────────────────────────
// The context menu already tracked its setting via SETTINGS_CHANGED; the
// floating button did not, so turning it off appeared to do nothing until the
// page was reloaded.
chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== 'sync') return;
  let touched = false;

  if (changes.triggerFloating) { triggerFloating = changes.triggerFloating.newValue !== false; touched = true; }
  if (changes.excludeList)     { excludeList     = changes.excludeList.newValue || [];         touched = true; }

  if (touched) reconcile();
});

// Attach or detach according to the current settings. Safe to call repeatedly.
function reconcile() {
  const active = triggerFloating && !isDomainExcluded(window.location.hostname, excludeList);
  if (active) attachListeners();
  else        detachListeners();
}

// ── Floating button — only shown when the panel is already open ────────────────
// This guarantees reliability: when the panel is open it is listening for
// queued text, so clicking the button always works immediately.
function attachListeners() {
  if (listenersAttached) return;
  document.addEventListener('mouseup',   onSelectionChange);
  document.addEventListener('keyup',     onSelectionChange);
  document.addEventListener('mousedown', onDocumentMouseDown);
  document.addEventListener('scroll',    hideButton, { passive: true });
  listenersAttached = true;
}

function detachListeners() {
  if (!listenersAttached) return;
  document.removeEventListener('mouseup',   onSelectionChange);
  document.removeEventListener('keyup',     onSelectionChange);
  document.removeEventListener('mousedown', onDocumentMouseDown);
  document.removeEventListener('scroll',    hideButton);
  listenersAttached = false;
  removeButton();   // a button already on screen must go with the setting
}

function onDocumentMouseDown(e) {
  if (floatingBtn && !floatingBtn.contains(e.target)) hideButton();
}

async function onSelectionChange() {
  const text = window.getSelection()?.toString().trim() ?? '';
  if (text.length < 4) { hideButton(); return; }

  // Only show the button if the panel is open — if it is not, right-click is
  // the trigger to use (it works regardless of panel state).
  if (!await isPanelOpen()) { hideButton(); return; }

  currentSelectedText = text;

  try {
    const range = window.getSelection().getRangeAt(0);
    const rect  = range.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) { hideButton(); return; }
    showButton(rect, text, isLikelyGreek(text) ? 'greek' : 'normal');
  } catch (_) {
    hideButton();
  }
}

function showButton(rect, text, mode = 'normal') {
  if (!floatingBtn) {
    floatingBtn = document.createElement('div');
    floatingBtn.id = 'blankstare-floating-btn';
    floatingBtn.setAttribute('role', 'button');
    floatingBtn.setAttribute('tabindex', '0');
    floatingBtn.setAttribute('aria-label', 'Explain with BlankStare');
    floatingBtn.innerHTML = `<span class="bs-icon">⚡</span><span class="bs-label">Explain</span>`;
    document.body.appendChild(floatingBtn);
    floatingBtn.addEventListener('click', onButtonClick);
    floatingBtn.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onButtonClick(e); }
    });
  }

  const greek = mode === 'greek';
  floatingBtn.dataset.mode = mode;
  floatingBtn.querySelector('.bs-icon').textContent  = greek ? '🇬🇷' : '⚡';
  floatingBtn.querySelector('.bs-label').textContent = greek ? 'Select English dev text' : 'Explain';
  floatingBtn.style.cursor = greek ? 'default' : 'pointer';

  floatingBtn.dataset.state = 'default';
  floatingBtn.style.left = `${rect.left + window.scrollX + rect.width / 2}px`;
  floatingBtn.style.top  = `${rect.top  + window.scrollY - 46}px`;
  floatingBtn.classList.add('bs-visible');
  floatingBtn.classList.remove('bs-hidden');
  currentSelectedText = text;
}

function hideButton() {
  floatingBtn?.classList.remove('bs-visible');
  floatingBtn?.classList.add('bs-hidden');
  _panelCacheTime = 0; // force re-check on next selection
}

function removeButton() {
  floatingBtn?.remove();
  floatingBtn = null;
  currentSelectedText = '';
}

async function onButtonClick(e) {
  e.stopPropagation();
  if (floatingBtn?.dataset.mode === 'greek') return; // don't send Greek text
  if (!currentSelectedText) return;

  // The panel is open (we only show this button if it is), so queueing the
  // text is enough — the panel picks it up from session storage.
  try {
    const res = await chrome.runtime.sendMessage({ type: 'EXPLAIN_TEXT', text: currentSelectedText });
    if (res?.ok) {
      const label = floatingBtn?.querySelector('.bs-label');
      if (label) label.textContent = '✓ Sending…';
      setTimeout(hideButton, 600);
      _panelCacheTime = 0;
    }
  } catch (err) {
    console.warn('[BlankStare] sendMessage failed:', err);
  }
}

// ── Message handlers ──────────────────────────────────────────────────────────
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'GET_SELECTION') {
    sendResponse({ text: window.getSelection()?.toString().trim() || '' });
    return true;
  }
  if (message.type === 'GET_PAGE_CONTENT') {
    const text = document.body?.innerText?.replace(/\s+/g, ' ').trim().slice(0, 4000) || '';
    sendResponse({ text });
    return true;
  }
});
