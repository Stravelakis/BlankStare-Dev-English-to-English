// content.js — BlankStare v0.5
// Injected into every web page.

let floatingBtn = null;
let currentSelectedText = '';

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

// ── Startup ────────────────────────────────────────────────────────────────────
(async function init() {
  const s = await chrome.storage.sync.get({
    triggerFloating:  true,
    triggerRightClick:true,
    excludeList:      [],
  });
  if (isDomainExcluded(window.location.hostname, s.excludeList)) return;
  if (s.triggerFloating) setupFloatingButton();
})();

function isDomainExcluded(hostname, list) {
  if (!list?.length) return false;
  return list.some(p => {
    if (!p) return false;
    const pat = p.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '');
    const h   = hostname.toLowerCase();
    return h === pat || h.endsWith('.' + pat);
  });
}

// ── Floating button — only shown when the panel is already open ────────────────
// This guarantees 100% reliability: when the panel is open it polls for text
// every 500ms, so clicking the button always works immediately.
function setupFloatingButton() {
  document.addEventListener('mouseup',  onSelectionChange);
  document.addEventListener('keyup',    onSelectionChange);
  document.addEventListener('mousedown', e => {
    if (floatingBtn && !floatingBtn.contains(e.target)) hideButton();
  });
  document.addEventListener('scroll', hideButton, { passive: true });
}

async function onSelectionChange() {
  const text = window.getSelection()?.toString().trim() ?? '';
  if (text.length < 4) { hideButton(); return; }

  // Only show the button if the panel is open — if it's not, right-click is
  // the trigger to use (it works regardless of panel state).
  const open = await isPanelOpen();
  if (!open) { hideButton(); return; }

  currentSelectedText = text;

  // Greek text warning: if selection is mostly Greek and we're in EN mode
  const greekRatio = (text.match(/[\u0370-\u03FF\u1F00-\u1FFF]/g) || []).length / text.length;
  if (greekRatio > 0.2) {
    showButton(window.getSelection().getRangeAt(0).getBoundingClientRect(), text, 'greek');
    return;
  }

  try {
    const range = window.getSelection().getRangeAt(0);
    const rect  = range.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) { hideButton(); return; }
    showButton(rect, text, 'normal');
  } catch (_) { hideButton(); }
}

function showButton(rect, text, mode = 'normal') {
  if (!floatingBtn) {
    floatingBtn = document.createElement('div');
    floatingBtn.id = 'blankstare-floating-btn';
    floatingBtn.setAttribute('role', 'button');
    floatingBtn.setAttribute('aria-label', 'Explain with BlankStare');
    floatingBtn.innerHTML = `<span class="bs-icon">⚡</span><span class="bs-label">Explain</span>`;
    document.body.appendChild(floatingBtn);
    floatingBtn.addEventListener('click', onButtonClick);
  }

  if (mode === 'greek') {
    floatingBtn.dataset.mode = 'greek';
    floatingBtn.querySelector('.bs-icon').textContent = '🇬🇷';
    floatingBtn.querySelector('.bs-label').textContent = 'Select English dev text';
    floatingBtn.style.cursor = 'default';
  } else {
    floatingBtn.dataset.mode = 'normal';
    floatingBtn.querySelector('.bs-icon').textContent = '⚡';
    floatingBtn.querySelector('.bs-label').textContent = 'Explain';
    floatingBtn.style.cursor = 'pointer';
  }

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

async function onButtonClick(e) {
  e.stopPropagation();
  if (floatingBtn?.dataset.mode === 'greek') return; // don't send Greek text
  if (!currentSelectedText) return;

  // Panel is open (we only show this button if it is) — just queue the text.
  // The panel's 500ms polling loop picks it up and explains it automatically.
  try {
    const res = await chrome.runtime.sendMessage({ type: 'EXPLAIN_TEXT', text: currentSelectedText });
    if (res?.ok) {
      // Brief "sending…" confirmation then hide
      const label = floatingBtn?.querySelector('.bs-label');
      if (label) label.textContent = '✓ Sending…';
      setTimeout(hideButton, 600);
      // Invalidate cache so the next check re-pings the panel
      _panelCacheTime = 0;
    }
  } catch (err) {
    console.warn('[BlankStare] sendMessage failed:', err);
  }
}

// ── Message handlers ────────────────────────────────────────────────────────
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
