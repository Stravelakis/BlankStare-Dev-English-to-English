// content.js — BlankStare
// Injected into every web page. isDomainExcluded lives in utils/pure.js, which
// the manifest loads immediately before this file.

let floatingHost = null;   // the element in the page
let floatingBtn  = null;   // the button inside its shadow root
let currentSelectedText = '';
let listenersAttached = false;

// ── The floating button's styles ──────────────────────────────────────────────
// Deco Noir is NOT loaded into the page. It is a full identity stylesheet and
// this script runs on every site on the web; loading it here would restyle the
// host page, and the host page's own CSS would reach back into the button.
//
// So the identity is reproduced by hand for this one control — the chamfer on
// two opposing corners, the brass bezel, the lit legend — and the whole thing
// lives in a shadow root so neither side can touch the other. Page styles
// cannot leak in, which is also why none of the !important flags the old
// stylesheet needed survive here.
const BUTTON_STYLES = `
  .bs-btn {
    display: none;
    align-items: center;
    gap: 6px;
    padding: 6px 13px 6px 11px;
    transform: translateX(-50%);

    /* The signature: top-left and bottom-right only. Never four corners. */
    clip-path: polygon(7px 0, 100% 0, 100% calc(100% - 7px),
                       calc(100% - 7px) 100%, 0 100%, 0 7px);

    /* A clipped box cannot carry a border — the chamfer shears it off — so the
       bezel is an inset shadow instead. */
    background: linear-gradient(180deg, #26251F, #131210);
    box-shadow: inset 0 0 0 1px #C9A227,
                0 4px 16px rgba(0, 0, 0, .5),
                0 0 14px rgba(201, 162, 39, .22);

    font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
    font-size: 12px;
    font-weight: 600;
    letter-spacing: .04em;
    color: #C9A227;
    white-space: nowrap;
    cursor: pointer;
    user-select: none;
    transition: box-shadow .12s cubic-bezier(.2,.8,.2,1);
  }
  .bs-btn.bs-visible { display: flex; animation: bs-in .15s ease forwards; }
  .bs-btn.bs-hidden  { display: none; }

  .bs-btn:hover {
    box-shadow: inset 0 0 0 1px #F2DCA0,
                0 6px 20px rgba(0, 0, 0, .55),
                0 0 20px rgba(201, 162, 39, .38);
  }
  .bs-btn:focus-visible { outline: 1px solid #F2DCA0; outline-offset: 2px; }

  .bs-icon  { font-size: 11px; line-height: 1; flex-shrink: 0; }
  .bs-label { font-size: 12px; line-height: 1; }

  /* The bezel stays brass and only the legend changes colour. A green-framed
     button beside a brass one reads as two different products. */
  .bs-btn[data-mode="greek"] { cursor: default; color: #D9A441; }

  @keyframes bs-in {
    from { opacity: 0; transform: translateX(-50%) translateY(4px); }
    to   { opacity: 1; transform: translateX(-50%) translateY(0); }
  }
  @media (prefers-reduced-motion: reduce) {
    .bs-btn.bs-visible { animation: none; }
  }
`;

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
  // Test the host, not the button: events inside a closed shadow root are
  // retargeted to the host by the time the page sees them, so the inner
  // element never appears as e.target.
  if (floatingHost && !floatingHost.contains(e.target)) hideButton();
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

// The host element is NOT protected by the shadow root — it is an ordinary div
// in the page's own DOM, so the page's `div { … }` rules match it. A `:host`
// rule inside the root does not help: by spec the outer document wins over
// :host, and plenty of sites reach for !important on top of that.
//
// So every property that decides where the button sits and whether it draws
// anything of its own is pinned inline at !important priority. The host becomes
// a bare positioned box; everything visible is drawn inside the root, where the
// page cannot reach at all.
const HOST_LOCK = {
  position:      'absolute',
  'z-index':     '2147483647',
  display:       'block',
  margin:        '0',
  padding:       '0',
  border:        'none',
  'border-radius': '0',
  background:    'none',
  'box-shadow':  'none',
  filter:        'none',
  opacity:       '1',
  transform:     'none',
  width:         'auto',
  height:        'auto',
  'max-width':   'none',
  'min-width':   '0',
  float:         'none',
  visibility:    'visible',
  'pointer-events': 'auto',
};

function buildButton() {
  floatingHost = document.createElement('div');
  floatingHost.id = 'blankstare-floating-btn';
  for (const [prop, value] of Object.entries(HOST_LOCK)) {
    floatingHost.style.setProperty(prop, value, 'important');
  }

  // Closed: nothing on the page can reach in and read or restyle the button.
  const root = floatingHost.attachShadow({ mode: 'closed' });

  const style = document.createElement('style');
  style.textContent = BUTTON_STYLES;

  floatingBtn = document.createElement('div');
  floatingBtn.className = 'bs-btn';
  floatingBtn.setAttribute('role', 'button');
  floatingBtn.setAttribute('tabindex', '0');
  floatingBtn.setAttribute('aria-label', 'Explain with BlankStare');
  floatingBtn.innerHTML = `<span class="bs-icon">⚡</span><span class="bs-label">Explain</span>`;
  floatingBtn.addEventListener('click', onButtonClick);
  floatingBtn.addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onButtonClick(e); }
  });

  root.append(style, floatingBtn);
  document.body.appendChild(floatingHost);
}

function showButton(rect, text, mode = 'normal') {
  if (!floatingBtn) buildButton();

  const greek = mode === 'greek';
  floatingBtn.dataset.mode = mode;
  floatingBtn.querySelector('.bs-icon').textContent  = greek ? '🇬🇷' : '⚡';
  floatingBtn.querySelector('.bs-label').textContent = greek ? 'Select English dev text' : 'Explain';

  // Positioning belongs to the host, which lives in page coordinates. Set at
  // !important for the same reason as HOST_LOCK — a page rule offsetting every
  // div would otherwise drag the button away from the selection.
  floatingHost.style.setProperty('left', `${rect.left + window.scrollX + rect.width / 2}px`, 'important');
  floatingHost.style.setProperty('top',  `${rect.top  + window.scrollY - 46}px`, 'important');
  floatingHost.style.setProperty('right',  'auto', 'important');
  floatingHost.style.setProperty('bottom', 'auto', 'important');

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
  floatingHost?.remove();
  floatingHost = null;
  floatingBtn  = null;
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
