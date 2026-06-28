// content.js — BlankStare v0.3
// Injected into every web page. Handles floating button, text selection,
// page content retrieval, and the exclude list.

let floatingBtn = null;
let currentSelectedText = '';

(async function init() {
  const s = await chrome.storage.sync.get({
    triggerFloating:  true,
    triggerRightClick:true,
    excludeList:      [],
  });

  // Exclude list check — if current domain is excluded, do nothing at all
  if (isDomainExcluded(window.location.hostname, s.excludeList)) {
    console.log('[BlankStare] Excluded on this domain — standing by.');
    return;
  }

  if (s.triggerFloating) setupFloatingButton();
})();

// ── Exclude list matching ─────────────────────────────────────────────────────
function isDomainExcluded(hostname, list) {
  if (!list || !list.length) return false;
  return list.some(pattern => {
    if (!pattern) return false;
    const p = pattern.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '');
    const h = hostname.toLowerCase();
    // Match exact or as suffix (so "example.com" also matches "www.example.com")
    return h === p || h.endsWith('.' + p);
  });
}

// ── Floating button setup ─────────────────────────────────────────────────────
function setupFloatingButton() {
  document.addEventListener('mouseup',  onSelectionChange);
  document.addEventListener('keyup',    onSelectionChange);
  document.addEventListener('mousedown', e => {
    if (floatingBtn && !floatingBtn.contains(e.target)) hideButton();
  });
  document.addEventListener('scroll', hideButton, { passive: true });
}

function onSelectionChange() {
  const text = window.getSelection()?.toString().trim() ?? '';
  if (text.length < 4) { hideButton(); return; }
  currentSelectedText = text;
  try {
    const range = window.getSelection().getRangeAt(0);
    const rect  = range.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) { hideButton(); return; }
    showButton(rect);
  } catch (_) { hideButton(); }
}

function showButton(rect) {
  if (!floatingBtn) {
    floatingBtn = document.createElement('div');
    floatingBtn.id = 'blankstare-floating-btn';
    floatingBtn.setAttribute('role', 'button');
    floatingBtn.setAttribute('aria-label', 'Explain with BlankStare');
    floatingBtn.innerHTML = `<span class="bs-icon">⚡</span><span class="bs-label">Explain</span>`;
    document.body.appendChild(floatingBtn);
    floatingBtn.addEventListener('click', onButtonClick);
  }
  setButtonState('default');
  floatingBtn.style.left = `${rect.left + window.scrollX + rect.width / 2}px`;
  floatingBtn.style.top  = `${rect.top  + window.scrollY - 46}px`;
  floatingBtn.classList.add('bs-visible');
  floatingBtn.classList.remove('bs-hidden');
}

function hideButton() {
  floatingBtn?.classList.remove('bs-visible');
  floatingBtn?.classList.add('bs-hidden');
}

function setButtonState(state) {
  if (!floatingBtn) return;
  const icon  = floatingBtn.querySelector('.bs-icon');
  const label = floatingBtn.querySelector('.bs-label');
  floatingBtn.dataset.state = state;
  if (state === 'default') {
    if (icon)  icon.textContent  = '⚡';
    if (label) label.textContent = 'Explain';
  } else if (state === 'ready') {
    if (icon)  icon.textContent  = '✓';
    if (label) label.textContent = 'Ready — click ↑';
    setTimeout(() => {
      if (floatingBtn?.dataset.state === 'ready') setButtonState('default');
    }, 4000);
  }
}

async function onButtonClick(e) {
  e.stopPropagation();
  if (!currentSelectedText) return;
  try {
    const res = await chrome.runtime.sendMessage({ type: 'EXPLAIN_TEXT', text: currentSelectedText });
    if (res?.ok) setButtonState('ready');
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
