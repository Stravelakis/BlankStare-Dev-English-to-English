/* =============================================================================
   Deco Noir — behaviour layer
   -----------------------------------------------------------------------------
   Vanilla. No dependencies, no build step, no framework. Everything here is
   the part of the identity that CSS genuinely cannot do on its own:

     · the brushed-metal ground and its film grain
     · the border glow, which needs the cursor's bearing and edge proximity
     · rotary dials, which need pointer drag
     · click sparks
     · runtime accent, which must write four tokens from one source

   Everything else — shape, colour, type, dress levels — is pure CSS and works
   with this file absent. That is deliberate: a WordPress settings page or a
   Chrome popup can ship the stylesheet alone and still be unmistakably the
   same product.

   Usage:  DecoNoir.init();
           DecoNoir.init({ ground:'off', grain:false, spark:false });
           DecoNoir.setAccent('#c9a227');
   ============================================================================= */

(function (global) {
  'use strict';

  var reduce = false;
  try { reduce = matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) {}

  var DEFAULTS = {
    /** 'on' | 'off' — the brushed ground behind everything. Its colour is
        derived from the accent in CSS; there are no named grounds any more. */
    ground: 'on',
    /** Animated film grain over the whole page. */
    grain: true,
    /** Border glow on `.btn`. */
    glow: true,
    /** Sparks on pointerdown. */
    spark: true,
    /** Reveal `.reveal` elements as they scroll in. */
    reveal: true,
    /** Below this edge-proximity a key's rim stays dark, 0–1. */
    glowSensitivity: 0.34
  };

  function init(opts) {
    var o = {}, k;
    for (k in DEFAULTS) o[k] = DEFAULTS[k];
    for (k in (opts || {})) o[k] = opts[k];

    ground(o);
    if (o.grain && !reduce) grain();
    if (o.glow) borderGlow(o.glowSensitivity);
    if (o.spark && !reduce) sparks();
    if (o.reveal) reveal();
    dials();
    return o;
  }

  /* ---- ground -------------------------------------------------------------
     Injects the field element. Everything about how it LOOKS is CSS, driven by
     --ground-tint / --ground-tooth / --ground-lamp / --ground-wash, so a
     custom accent retints the surface with no work here.                   */
  function ground(o) {
    var body = document.body;
    if (!document.getElementById('dn-field')) {
      var f = document.createElement('div');
      f.id = 'dn-field';
      body.insertBefore(f, body.firstChild);
    }
    body.dataset.bg = normaliseGround(o.ground);
    body.dataset.tex = o.grain ? 'on' : 'off';
  }

  var warnedGround = false;
  function normaliseGround(name) {
    if (name === 'steel' || name === 'gold') {
      if (!warnedGround && global.console) {
        warnedGround = true;
        console.warn('[DecoNoir] ground:"' + name + '" was removed in 1.0 — the ground ' +
                     'is now derived from the accent. Using "on". Set --ground-tint to ' +
                     'change how much accent bleeds into the metal.');
      }
      return 'on';
    }
    return name === 'off' ? 'off' : 'on';
  }

  /* ---- runtime accent -----------------------------------------------------
     One source colour in, four tokens out, written together so they cannot
     drift. --accent-rgb is SPACE-separated so it composes with the
     rgb(var(--x) / <alpha>) convention Tailwind also uses.

     The ground follows for free: its three metal stops are color-mix()es of
     --accent, resolved in CSS.                                            */
  function setAccent(hex, opts) {
    var rgb = hexToRgb(hex);
    if (!rgb) return null;
    var o = opts || {};
    var hi = o.hi || rgbToHex(mix(rgb, [255, 255, 255], 0.55));
    var lo = o.lo || rgbToHex(mix(rgb, [0, 0, 0], 0.45));
    var el = (o.target || document.documentElement);
    el.style.setProperty('--accent', hex);
    el.style.setProperty('--accent-rgb', rgb.join(' '));
    el.style.setProperty('--accent-hi', hi);
    el.style.setProperty('--accent-lo', lo);
    if (o.accent2) el.style.setProperty('--accent-2', o.accent2);
    return { accent: hex, rgb: rgb, hi: hi, lo: lo };
  }

  function clearAccent(target) {
    var el = target || document.documentElement;
    ['--accent', '--accent-rgb', '--accent-hi', '--accent-lo', '--accent-2']
      .forEach(function (p) { el.style.removeProperty(p); });
  }

  function hexToRgb(h) {
    if (typeof h !== 'string') return null;
    h = h.trim().replace(/^#/, '');
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    if (!/^[0-9a-f]{6}$/i.test(h)) return null;
    var n = parseInt(h, 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  function mix(a, b, amt) {
    return a.map(function (c, i) { return Math.round(c + (b[i] - c) * amt); });
  }
  function rgbToHex(c) {
    return '#' + c.map(function (v) { return ('0' + v.toString(16)).slice(-2); }).join('');
  }

  /* ---- film grain ---------------------------------------------------------
     Rendered at a third of the viewport and scaled up with pixelated
     smoothing. Full-resolution noise is both expensive and WRONG — real film
     grain is coarser than a screen pixel, and generating it per-pixel makes a
     fine sandy haze rather than grain. Redrawn at ~18fps, not 60: grain that
     updates every frame reads as video noise.                              */
  function grain() {
    var c = document.getElementById('dn-grain');
    if (!c) {
      c = document.createElement('canvas');
      c.id = 'dn-grain';
      document.body.insertBefore(c, document.body.firstChild);
    }
    var x = c.getContext('2d', { willReadFrequently: true });
    var img = null, last = 0;

    function size() {
      c.width = Math.max(1, Math.ceil(innerWidth / 3));
      c.height = Math.max(1, Math.ceil(innerHeight / 3));
      img = null;
    }
    function draw(t) {
      if (t - last >= 55) {
        last = t;
        if (!img || img.width !== c.width) img = x.createImageData(c.width, c.height);
        var d = img.data, i;
        for (i = 0; i < d.length; i += 4) {
          d[i] = d[i + 1] = d[i + 2] = 110 + (Math.random() * 90 | 0);
          d[i + 3] = 46;
        }
        x.putImageData(img, 0, 0);
      }
      requestAnimationFrame(draw);
    }
    addEventListener('resize', size, { passive: true });
    size();
    requestAnimationFrame(draw);
  }

  /* ---- border glow --------------------------------------------------------
     Two numbers per key: the bearing from its centre to the cursor, which
     rotates the cone mask, and how close the cursor is to an EDGE, which sets
     opacity. Tracked document-wide so the rim fades up as you approach rather
     than snapping on at the boundary.

     Rects are measured in bulk and cached. Reading one per key per pointermove
     forces a synchronous reflow every time, which is what turns a nice effect
     into a janky one on a dense panel.                                     */
  function borderGlow(sens) {
    var keys = [], rects = [], pending = false, px = 0, py = 0;

    function measure() {
      keys = [].slice.call(document.querySelectorAll('.btn'));
      rects = keys.map(function (el) { return el.getBoundingClientRect(); });
    }
    function paint() {
      pending = false;
      for (var i = 0; i < keys.length; i++) {
        var r = rects[i], el = keys[i];
        var dx = px - (r.left + r.width / 2), dy = py - (r.top + r.height / 2);
        // 1 = exactly on the edge, <1 inside, >1 outside.
        var p = Math.max(Math.abs(dx) / (r.width / 2), Math.abs(dy) / (r.height / 2));
        var near = p > 2 ? 0 : Math.max(0, 1 - Math.abs(1 - p));
        var prox = Math.max(0, (near - sens) / (1 - sens));
        el.style.setProperty('--prox', prox.toFixed(3));
        if (prox > 0) el.style.setProperty('--ca', (Math.atan2(dy, dx) * 180 / Math.PI - 90) + 'deg');
      }
    }
    measure();
    addEventListener('resize', measure, { passive: true });
    addEventListener('scroll', measure, { passive: true });
    addEventListener('pointermove', function (e) {
      px = e.clientX; py = e.clientY;
      if (!pending) { pending = true; requestAnimationFrame(paint); }
    }, { passive: true });

    // Keys added later (a dialog, a re-render) still light up.
    if (global.MutationObserver) {
      new MutationObserver(measure).observe(document.body, { childList: true, subtree: true });
    }
    return measure;
  }

  /* ---- rotary dials -------------------------------------------------------
     Vertical drag, not click-and-rotate: rotating with a mouse is fiddly and
     nobody can do it accurately. Markup contract:

       <div class="dialwrap" data-val="62">
         <svg …><circle class="ring" …/></svg>
         <div class="dial"></div>
       </div>
       <div class="dialval"></div>   ← optional readout, a sibling of .dialwrap
  */
  function dials() {
    [].forEach.call(document.querySelectorAll('.dialwrap'), function (wrap) {
      if (wrap.dataset.dnBound) return;
      wrap.dataset.dnBound = '1';

      var dial = wrap.querySelector('.dial');
      var ring = wrap.querySelector('.ring');
      var out = wrap.parentElement && wrap.parentElement.querySelector('.dialval');
      var val = parseFloat(wrap.dataset.val || '0');
      var LEN = 214, SWEEP = 270;   // 270° sweep, the usual instrument range

      function paint() {
        dial.style.setProperty('--deg', (-135 + val / 100 * SWEEP) + 'deg');
        if (ring) ring.style.strokeDashoffset = LEN - (val / 100) * LEN * (SWEEP / 360);
        if (out) out.textContent = (val / 100).toFixed(2);
        wrap.dataset.val = val.toFixed(1);
        wrap.dispatchEvent(new CustomEvent('dn:change', { bubbles: true, detail: { value: val / 100 } }));
      }
      paint();

      dial.addEventListener('pointerdown', function (e) {
        dial.setPointerCapture(e.pointerId);
        var y0 = e.clientY, v0 = val;
        function move(ev) {
          val = Math.max(0, Math.min(100, v0 + (y0 - ev.clientY) * 0.7));
          paint();
        }
        function up() {
          dial.removeEventListener('pointermove', move);
          dial.removeEventListener('pointerup', up);
        }
        dial.addEventListener('pointermove', move);
        dial.addEventListener('pointerup', up);
      });

      // Keyboard: a drag-only control is unusable without this.
      dial.tabIndex = 0;
      dial.setAttribute('role', 'slider');
      dial.addEventListener('keydown', function (e) {
        var step = e.shiftKey ? 10 : 2;
        if (e.key === 'ArrowUp' || e.key === 'ArrowRight') { val = Math.min(100, val + step); paint(); e.preventDefault(); }
        if (e.key === 'ArrowDown' || e.key === 'ArrowLeft') { val = Math.max(0, val - step); paint(); e.preventDefault(); }
      });
    });
  }

  /* ---- click spark -------------------------------------------------------- */
  function sparks() {
    addEventListener('pointerdown', function (e) {
      for (var i = 0; i < 8; i++) {
        var s = document.createElement('span');
        s.className = 'spark';
        s.style.left = e.clientX + 'px';
        s.style.top = e.clientY + 'px';
        s.style.rotate = (i * 45) + 'deg';
        document.body.appendChild(s);
        s.addEventListener('animationend', function () { this.remove(); });
      }
    }, { passive: true });
  }

  /* ---- reveal on scroll --------------------------------------------------- */
  function reveal() {
    if (!global.IntersectionObserver) return;
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
      });
    }, { threshold: 0.1 });
    [].forEach.call(document.querySelectorAll('.reveal'), function (el) { io.observe(el); });
  }

  /* ---- theme helpers ------------------------------------------------------ */
  function setColorway(name) { document.documentElement.dataset.way = name; clearAccent(); }
  function setDress(name) { document.documentElement.dataset.dress = name; }
  function setGround(name) { document.body.dataset.bg = normaliseGround(name); }

  global.DecoNoir = {
    init: init,
    dials: dials,
    setColorway: setColorway,
    setDress: setDress,
    setGround: setGround,
    setAccent: setAccent,
    clearAccent: clearAccent
  };
})(window);
