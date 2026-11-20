// utils/fx.js — BlankStare motion effects
//
// Hand-written, dependency-free versions of the effects Ak picked from
// reactbits.dev as references (Gradient Blinds, Beams, Letter Glitch, Prompt
// Bar sparks, a text decode). Extensions cannot load code from a CDN, and the
// originals are React components, so these are written from scratch.
//
// Every effect:
//   - takes its colours from the caller, so the brass palette stays the palette
//   - pauses when its canvas is off-screen or the tab is hidden
//   - draws one still frame and stops under prefers-reduced-motion
//   - returns { stop(), setColors?() } so a page can tear it down
//
// Nothing here touches chrome.* — it also runs in lab/ previews.

const BSFX = (() => {
  const REDUCED = (() => { try { return matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (_) { return false; } })();

  const hexToRgb = hex => {
    const h = hex.replace('#', '');
    const n = parseInt(h.length === 3 ? h.split('').map(c => c + c).join('') : h, 16);
    return [(n >> 16 & 255) / 255, (n >> 8 & 255) / 255, (n & 255) / 255];
  };

  // Runs `frame(t, dt)` on animation frames while the canvas is visible.
  function loop(canvas, frame) {
    let raf = 0, last = performance.now(), visible = true, stopped = false, t = 0;
    const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible) kick(); }, { threshold: 0 });
    io.observe(canvas);
    const onVis = () => { if (!document.hidden) kick(); };
    document.addEventListener('visibilitychange', onVis);
    function tick(now) {
      raf = 0;
      if (stopped || !visible || document.hidden) return;
      const dt = Math.min(0.05, (now - last) / 1000); last = now; t += dt;
      frame(t, dt);
      raf = requestAnimationFrame(tick);
    }
    function kick() { if (!raf && !stopped) { last = performance.now(); raf = requestAnimationFrame(tick); } }
    if (REDUCED) frame(4, 0); else kick();
    return { stop() { stopped = true; cancelAnimationFrame(raf); io.disconnect(); document.removeEventListener('visibilitychange', onVis); } };
  }

  function fit(canvas, scale = Math.min(2, devicePixelRatio || 1)) {
    const r = canvas.getBoundingClientRect();
    const w = Math.max(1, Math.round(r.width * scale)), h = Math.max(1, Math.round(r.height * scale));
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; return true; }
    return false;
  }

  function pointer(canvas, damp = 0.12) {
    const p = { x: 0.5, y: 0.35, tx: 0.5, ty: 0.35, active: 0, tactive: 0 };
    const host = canvas.parentElement || canvas;
    host.addEventListener('pointermove', e => {
      const r = canvas.getBoundingClientRect();
      p.tx = (e.clientX - r.left) / r.width; p.ty = (e.clientY - r.top) / r.height; p.tactive = 1;
    });
    host.addEventListener('pointerleave', () => { p.tactive = 0; });
    p.step = () => { p.x += (p.tx - p.x) * damp; p.y += (p.ty - p.y) * damp; p.active += (p.tactive - p.active) * 0.05; };
    return p;
  }

  // ══ GRADIENT BLINDS (WebGL) ═════════════════════════════════════════════════
  // Angled slats, each a two-colour gradient with a rounded relief, a drifting
  // sheen, film grain, and a soft spotlight that follows the pointer.
  function blinds(canvas, o = {}) {
    const opt = { colors: ['#0d0c0a', '#C9A227'], light: '#ffe4c4', angle: -14, count: 14, noise: 0.09,
                  relief: 0.58, shine: 0.35, spot: 1.5, spotSoft: 0.3, spotOpacity: 1.1, glow: 0.25, speed: 0.55, ...o };
    const gl = canvas.getContext('webgl', { premultipliedAlpha: false, antialias: false });
    if (!gl) return { stop() {} };
    const vs = 'attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}';
    const fs = `precision mediump float;
      uniform vec2 R; uniform float T; uniform vec3 A; uniform vec3 B; uniform vec3 L; uniform vec3 M;
      uniform float ANG, N, NOISE, RELIEF, SHINE, SPOT, SOFT, SPOTO, GLOW;
      float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
      void main(){
        vec2 uv=gl_FragCoord.xy/R; vec2 c=uv-.5; c.x*=R.x/R.y;
        float a=radians(ANG); mat2 rot=mat2(cos(a),-sin(a),sin(a),cos(a)); vec2 q=rot*c;
        float asp=R.x/R.y;
        float s=fract((q.x/asp+.5)*N); float id=floor((q.x/asp+.5)*N);
        float drift=.5+.5*sin(T*.35+id*.6);
        // Light falls from the top: brass up there, near-black lower down,
        // so text placed over the middle stays readable.
        float g=clamp(uv.y*1.1-.35+drift*.22+(s-.5)*.1,0.,1.);
        vec3 col=mix(A,B*.62,pow(smoothstep(0.,1.,g),1.7));
        float bump=sin(s*3.14159); col*=mix(1.,.5+.5*bump,RELIEF);
        col+=L*pow(bump,28.)*SHINE*.45*g*(.6+.4*sin(T*.8+id));
        vec2 m=M.xy-.5; m.x*=asp; float d=length(c-m);
        float sp=1.-smoothstep(0.,SPOT*.45,d+SOFT*.2); col+=mix(B,L,.4)*sp*sp*.22*SPOTO*M.z*(.5+.5*bump);
        col+=B*GLOW*.08*(1.-length(c));
        col+=(h(gl_FragCoord.xy+T)-.5)*NOISE*.6;
        col*=1.-.6*pow(length(c*vec2(.7,1.)),1.5);
        gl_FragColor=vec4(col,1.);
      }`;
    const sh = (t, s) => { const x = gl.createShader(t); gl.shaderSource(x, s); gl.compileShader(x); return x; };
    const pr = gl.createProgram();
    gl.attachShader(pr, sh(gl.VERTEX_SHADER, vs)); gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, fs)); gl.linkProgram(pr); gl.useProgram(pr);
    const b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(pr, 'p'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    const U = n => gl.getUniformLocation(pr, n);
    const ptr = pointer(canvas, 0.2);
    let cols = { a: hexToRgb(opt.colors[0]), b: hexToRgb(opt.colors[1]), l: hexToRgb(opt.light) };
    const run = loop(canvas, t => {
      fit(canvas, 1); ptr.step();
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.uniform2f(U('R'), canvas.width, canvas.height); gl.uniform1f(U('T'), t * opt.speed);
      gl.uniform3fv(U('A'), cols.a); gl.uniform3fv(U('B'), cols.b); gl.uniform3fv(U('L'), cols.l);
      gl.uniform3f(U('M'), ptr.x, 1 - ptr.y, 0.35 + ptr.active * 0.65);
      gl.uniform1f(U('ANG'), opt.angle); gl.uniform1f(U('N'), opt.count); gl.uniform1f(U('NOISE'), opt.noise);
      gl.uniform1f(U('RELIEF'), opt.relief); gl.uniform1f(U('SHINE'), opt.shine); gl.uniform1f(U('SPOT'), opt.spot);
      gl.uniform1f(U('SOFT'), opt.spotSoft); gl.uniform1f(U('SPOTO'), opt.spotOpacity); gl.uniform1f(U('GLOW'), opt.glow);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    });
    return { stop: run.stop, setColors(c) { cols = { a: hexToRgb(c.colors[0]), b: hexToRgb(c.colors[1]), l: hexToRgb(c.light || opt.light) }; } };
  }

  // ══ BEAMS (canvas) ══════════════════════════════════════════════════════════
  // Tall soft light shafts that drift and breathe, like light through a
  // louvred ceiling. Additive, so overlaps bloom.
  function beams(canvas, o = {}) {
    const opt = { color: '#C9A227', count: 11, angle: 22, speed: 1, ...o };
    const ctx = canvas.getContext('2d');
    let rgb = hexToRgb(opt.color).map(v => Math.round(v * 255));
    const shafts = Array.from({ length: opt.count }, (_, i) => ({
      x: i / (opt.count - 1), w: 0.04 + Math.random() * 0.07, ph: Math.random() * 6.28, sp: 0.15 + Math.random() * 0.25, a: 0.25 + Math.random() * 0.45,
    }));
    const run = loop(canvas, t => {
      fit(canvas);
      const { width: W, height: H } = canvas;
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = '#0b0a08'; ctx.fillRect(0, 0, W, H);
      ctx.save();
      ctx.translate(W / 2, H / 2); ctx.rotate(opt.angle * Math.PI / 180); ctx.translate(-W * 0.75, -H);
      ctx.globalCompositeOperation = 'lighter';
      for (const s of shafts) {
        const x = (s.x + 0.04 * Math.sin(t * s.sp * opt.speed + s.ph)) * W * 1.5;
        const w = s.w * W * (0.8 + 0.2 * Math.sin(t * 0.7 + s.ph));
        const a = s.a * (0.55 + 0.45 * Math.sin(t * s.sp * 1.3 * opt.speed + s.ph * 2));
        const g = ctx.createLinearGradient(x - w, 0, x + w, 0);
        g.addColorStop(0, `rgba(${rgb},0)`); g.addColorStop(0.5, `rgba(${rgb},${a * 0.46})`); g.addColorStop(1, `rgba(${rgb},0)`);
        ctx.fillStyle = g; ctx.fillRect(x - w, 0, w * 2, H * 2);
        const core = ctx.createLinearGradient(x - w * 0.15, 0, x + w * 0.15, 0);
        core.addColorStop(0, `rgba(255,240,210,0)`); core.addColorStop(0.5, `rgba(255,240,210,${a * 0.08})`); core.addColorStop(1, `rgba(255,240,210,0)`);
        ctx.fillStyle = core; ctx.fillRect(x - w * 0.15, 0, w * 0.3, H * 2);
      }
      ctx.restore();
      const v = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.2, W / 2, H / 2, Math.max(W, H) * 0.75);
      v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,.7)');
      ctx.globalCompositeOperation = 'source-over'; ctx.fillStyle = v; ctx.fillRect(0, 0, W, H);
    });
    return { stop: run.stop, setColors(c) { rgb = hexToRgb(c.color).map(v => Math.round(v * 255)); } };
  }

  // ══ LETTER GLITCH (canvas) ══════════════════════════════════════════════════
  // A field of symbols that flicker and re-roll — the "Dev English" BlankStare
  // exists to turn into words. `storm(on)` turns the flicker up for a moment,
  // e.g. while a key is being tested.
  const SYMBOLS = '!@#$%^&*()_+-=[]{};:<>?/\\|~`01{}</>=>$_#λ∑≠≈∞';
  function glitch(canvas, o = {}) {
    const opt = { colors: ['#7A5A1E', '#C9A227', '#F2DCA0'], baseOpacity: 0.22, amount: 1, speed: 1.8, flow: 0.8, size: 16, ...o };
    const ctx = canvas.getContext('2d');
    let grid = [], cols = 0, rows = 0, storm = 0, acc = 0;
    const pick = () => SYMBOLS[(Math.random() * SYMBOLS.length) | 0];
    const run = loop(canvas, (t, dt) => {
      if (fit(canvas) || !grid.length) {
        const s = opt.size * Math.min(2, devicePixelRatio || 1);
        cols = Math.ceil(canvas.width / (s * 0.62)); rows = Math.ceil(canvas.height / s);
        grid = Array.from({ length: cols * rows }, () => ({ c: pick(), k: (Math.random() * opt.colors.length) | 0, a: Math.random() }));
      }
      const s = opt.size * Math.min(2, devicePixelRatio || 1);
      acc += dt * opt.speed * (1 + storm * 6);
      const changes = Math.floor(acc * grid.length * 0.05 * opt.amount); if (changes) acc = 0;
      for (let i = 0; i < changes; i++) {
        const g = grid[(Math.random() * grid.length) | 0]; g.c = pick(); g.k = (Math.random() * opt.colors.length) | 0; g.a = 1;
      }
      ctx.fillStyle = '#0b0a08'; ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.font = `${s * 0.8}px ui-monospace, Consolas, monospace`; ctx.textBaseline = 'top';
      const flowY = (t * opt.flow * 6) % s;
      for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
        const g = grid[y * cols + x];
        g.a = Math.max(0, g.a - dt * 0.6);
        ctx.globalAlpha = opt.baseOpacity * (0.35 + 0.65 * g.a) * (1 + storm * 1.6);
        ctx.fillStyle = opt.colors[g.k];
        ctx.fillText(g.c, x * s * 0.62, y * s + flowY - s);
      }
      ctx.globalAlpha = 1;
      storm += ((storm > 0 ? 0 : 0) - storm) * 0.02;
      const v = ctx.createRadialGradient(canvas.width / 2, canvas.height / 2, 0, canvas.width / 2, canvas.height / 2, Math.max(canvas.width, canvas.height) * 0.7);
      v.addColorStop(0, 'rgba(11,10,8,0)'); v.addColorStop(1, 'rgba(11,10,8,.9)');
      ctx.fillStyle = v; ctx.fillRect(0, 0, canvas.width, canvas.height);
    });
    return { stop: run.stop, storm(level = 1) { storm = level; }, setColors(c) { opt.colors = c.colors; grid.forEach(g => { g.k = g.k % opt.colors.length; }); } };
  }

  // ══ DECODE — symbols resolve into the real text ═════════════════════════════
  // Left to right, each letter flickers through symbols before it settles.
  function decode(el, text, { duration = 900, symbols = SYMBOLS } = {}) {
    if (REDUCED || !text) { el.textContent = text; return Promise.resolve(); }
    return new Promise(done => {
      const start = performance.now();
      const chars = [...text];
      function step(now) {
        const p = Math.min(1, (now - start) / duration);
        const settled = Math.floor(p * chars.length * 1.15);
        let out = '';
        for (let i = 0; i < chars.length; i++) {
          if (i < settled || chars[i] === ' ' || chars[i] === '\n') out += chars[i];
          else out += symbols[(Math.random() * symbols.length) | 0];
        }
        el.textContent = out;
        if (p < 1) requestAnimationFrame(step); else { el.textContent = text; done(); }
      }
      requestAnimationFrame(step);
    });
  }

  // ══ SPARKS — a burst from a point ═══════════════════════════════════════════
  // Lays a temporary canvas over `host`, throws particles from (x, y) in page
  // coordinates relative to the host, removes itself when they fade.
  function sparks(host, x, y, { color = '#F2DCA0', count = 22, boost = 2 } = {}) {
    if (REDUCED) return;
    const c = document.createElement('canvas');
    Object.assign(c.style, { position: 'absolute', inset: '0', width: '100%', height: '100%', pointerEvents: 'none', zIndex: 5 });
    if (getComputedStyle(host).position === 'static') host.style.position = 'relative';
    host.appendChild(c); fit(c);
    const ctx = c.getContext('2d'); const k = c.width / c.getBoundingClientRect().width;
    const ps = Array.from({ length: count }, () => {
      const a = Math.random() * Math.PI * 2, v = (60 + Math.random() * 140) * boost;
      return { x: x * k, y: y * k, vx: Math.cos(a) * v * k, vy: Math.sin(a) * v * k - 40 * k, life: 1, len: 6 + Math.random() * 10 };
    });
    let last = performance.now();
    (function step(now) {
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      ctx.clearRect(0, 0, c.width, c.height);
      let alive = 0;
      for (const p of ps) {
        if (p.life <= 0) continue; alive++;
        p.vy += 380 * k * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt * 1.6;
        const sp = Math.hypot(p.vx, p.vy) || 1;
        ctx.strokeStyle = color; ctx.globalAlpha = Math.max(0, p.life); ctx.lineWidth = 2 * k; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x - p.vx / sp * p.len * k, p.y - p.vy / sp * p.len * k); ctx.stroke();
      }
      if (alive) requestAnimationFrame(step); else c.remove();
    })(last);
  }

  return { blinds, beams, glitch, decode, sparks, REDUCED, SYMBOLS };
})();

if (typeof module !== 'undefined' && module.exports) module.exports = { BSFX };
