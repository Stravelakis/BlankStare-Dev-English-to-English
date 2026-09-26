// Vanilla port of React Bits "Dot Field" (MIT + Commons Clause, see NOTICE).
// Same option names and look as reactbits.dev/backgrounds/dot-field. The
// rendering is reworked so an idle page costs almost nothing: resting dots are
// painted once to a cached layer, each frame only repaints displaced dots and
// sparkles, and the loop sleeps when nothing moves or the field is off-screen.

export interface DotFieldOptions {
  dotRadius?: number;
  dotSpacing?: number;
  cursorRadius?: number;
  cursorForce?: number;
  bulgeOnly?: boolean;
  bulgeStrength?: number;
  glowRadius?: number;
  sparkle?: boolean;
  waveAmplitude?: number;
  gradientFrom?: string;
  gradientTo?: string;
  glowColor?: string;
  opacity?: number;
}

const DEFAULTS: Required<DotFieldOptions> = {
  dotRadius: 1.5,
  dotSpacing: 14,
  cursorRadius: 500,
  cursorForce: 0.1,
  bulgeOnly: true,
  bulgeStrength: 67,
  glowRadius: 160,
  sparkle: false,
  waveAmplitude: 0,
  gradientFrom: 'rgba(168, 85, 247, 0.35)',
  gradientTo: 'rgba(180, 151, 207, 0.25)',
  glowColor: '#120F17',
  opacity: 1,
};

const TWO_PI = Math.PI * 2;
const SVG_NS = 'http://www.w3.org/2000/svg';
const FRAME_MS = 1000 / 60;
// The original re-rolls sparkles every 8 frames at 60fps.
const SPARKLE_MS = FRAME_MS * 8;
const SPEED_SAMPLE_MS = 20;
const SETTLE = 0.01;

export function mountDotField(host: HTMLElement, options: DotFieldOptions = {}): () => void {
  const p = { ...DEFAULTS, ...options };
  const canvas = document.createElement('canvas');
  const base = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  const baseCtx = base.getContext('2d');
  if (!ctx || !baseCtx) return () => {};

  canvas.className = 'dot-field-canvas';
  if (p.opacity !== 1) host.style.opacity = String(p.opacity);
  const glow = createGlow(p.glowColor, p.glowRadius);
  host.append(canvas, glow.svg);

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const rad = p.dotRadius / 2;
  const sparkleRad = rad * 1.8;
  const step = p.dotRadius + p.dotSpacing;
  const hasForce = p.cursorRadius > 0 && (p.bulgeOnly ? p.bulgeStrength > 0 : p.cursorForce > 0);
  const waving = p.waveAmplitude > 0;
  const reach = Math.max(p.cursorRadius, p.glowRadius);

  let w = 0;
  let h = 0;
  let cols = 0;
  let rows = 0;
  let padX = 0;
  let padY = 0;
  let count = 0;
  let sx = new Float32Array(0);
  let sy = new Float32Array(0);
  let vx = new Float32Array(0);
  let vy = new Float32Array(0);
  let touched = new Uint32Array(0);
  let frameId = 0;
  const displaced = new Set<number>();
  let fill: CanvasGradient | string = p.gradientFrom;

  const pointer = { x: -9999, y: -9999, seen: false };
  let prevX = NaN;
  let prevY = NaN;
  let speed = 0;
  let lastSample = 0;
  let engagement = 0;
  let glowOpacity = 0;

  let sparkleSeed = -1;
  let sparkles: number[] = [];
  let sparkleSet = new Set<number>();

  let raf = 0;
  let timer = 0;
  let resizeTimer = 0;
  let lastTime = 0;
  let inView = true;

  const anchorX = (i: number) => padX + (i % cols) * step + step / 2;
  const anchorY = (i: number) => padY + Math.floor(i / cols) * step + step / 2;

  function gradientFor(c: CanvasRenderingContext2D) {
    const g = c.createLinearGradient(0, 0, w, h);
    g.addColorStop(0, p.gradientFrom);
    g.addColorStop(1, p.gradientTo);
    return g;
  }

  function build() {
    const rect = host.getBoundingClientRect();
    w = rect.width;
    h = rect.height;
    for (const c of [canvas, base]) {
      c.width = Math.max(1, Math.round(w * dpr));
      c.height = Math.max(1, Math.round(h * dpr));
    }
    ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
    baseCtx!.setTransform(dpr, 0, 0, dpr, 0, 0);

    cols = Math.max(0, Math.floor(w / step));
    rows = Math.max(0, Math.floor(h / step));
    padX = (w % step) / 2;
    padY = (h % step) / 2;
    count = cols * rows;
    sx = new Float32Array(count);
    sy = new Float32Array(count);
    vx = new Float32Array(count);
    vy = new Float32Array(count);
    touched = new Uint32Array(count);
    for (let i = 0; i < count; i++) {
      sx[i] = anchorX(i);
      sy[i] = anchorY(i);
    }
    displaced.clear();
    sparkleSeed = -1;
    engagement = 0;
    glowOpacity = 0;
    glow.circle.style.opacity = '0';

    fill = gradientFor(ctx!);
    paintBase();
    render(performance.now());
  }

  function paintBase() {
    baseCtx!.clearRect(0, 0, w, h);
    if (waving) return;
    baseCtx!.fillStyle = gradientFor(baseCtx!);
    baseCtx!.beginPath();
    for (let i = 0; i < count; i++) {
      const x = sx[i];
      const y = sy[i];
      baseCtx!.moveTo(x + rad, y);
      baseCtx!.arc(x, y, rad, 0, TWO_PI);
    }
    baseCtx!.fill();
  }

  function refreshSparkles(now: number) {
    const seed = Math.floor(now / SPARKLE_MS);
    if (seed === sparkleSeed) return;
    sparkleSeed = seed;
    sparkles = [];
    for (let i = 0; i < count; i++) {
      if ((((i * 2654435761) ^ seed) >>> 0) % 100 < 3) sparkles.push(i);
    }
    if (waving) sparkleSet = new Set(sparkles);
  }

  function render(now: number) {
    const animated = !reducedMotion.matches;
    ctx!.clearRect(0, 0, w, h);
    ctx!.fillStyle = fill;

    if (waving) {
      drawWaving(now, animated);
      return;
    }

    ctx!.drawImage(base, 0, 0, w, h);
    if (displaced.size) redrawDisplaced();
    if (p.sparkle && animated) {
      refreshSparkles(now);
      ctx!.beginPath();
      for (const i of sparkles) {
        const x = sx[i];
        const y = sy[i];
        ctx!.moveTo(x + sparkleRad, y);
        ctx!.arc(x, y, sparkleRad, 0, TWO_PI);
      }
      ctx!.fill();
    }
  }

  function drawWaving(now: number, animated: boolean) {
    const t = (now / FRAME_MS) * 0.02;
    const amp = animated ? p.waveAmplitude : 0;
    const sparkling = p.sparkle && animated;
    if (sparkling) refreshSparkles(now);
    ctx!.beginPath();
    for (let i = 0; i < count; i++) {
      const x = sx[i] + Math.cos(anchorY(i) * 0.03 + t * 0.7) * amp * 0.5;
      const y = sy[i] + Math.sin(anchorX(i) * 0.03 + t) * amp;
      const r = sparkling && sparkleSet.has(i) ? sparkleRad : rad;
      ctx!.moveTo(x + r, y);
      ctx!.arc(x, y, r, 0, TWO_PI);
    }
    ctx!.fill();
  }

  // Clear the box around every displaced dot and repaint that box's dots at
  // their current positions; everything else comes from the cached layer.
  function redrawDisplaced() {
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const i of displaced) {
      const ax = anchorX(i);
      const ay = anchorY(i);
      minX = Math.min(minX, ax, sx[i]);
      maxX = Math.max(maxX, ax, sx[i]);
      minY = Math.min(minY, ay, sy[i]);
      maxY = Math.max(maxY, ay, sy[i]);
    }
    const pad = sparkleRad + 1;
    minX = Math.max(0, minX - pad);
    minY = Math.max(0, minY - pad);
    maxX = Math.min(w, maxX + pad);
    maxY = Math.min(h, maxY + pad);
    if (maxX <= minX || maxY <= minY) return;

    const c0 = Math.max(0, Math.floor((minX - padX) / step) - 1);
    const c1 = Math.min(cols - 1, Math.floor((maxX - padX) / step) + 1);
    const r0 = Math.max(0, Math.floor((minY - padY) / step) - 1);
    const r1 = Math.min(rows - 1, Math.floor((maxY - padY) / step) + 1);

    ctx!.save();
    ctx!.beginPath();
    ctx!.rect(minX, minY, maxX - minX, maxY - minY);
    ctx!.clip();
    ctx!.clearRect(minX, minY, maxX - minX, maxY - minY);
    ctx!.beginPath();
    for (let r = r0; r <= r1; r++) {
      for (let c = c0; c <= c1; c++) {
        const i = r * cols + c;
        const x = sx[i];
        const y = sy[i];
        ctx!.moveTo(x + rad, y);
        ctx!.arc(x, y, rad, 0, TWO_PI);
      }
    }
    ctx!.fill();
    ctx!.restore();
  }

  function simulate(now: number, dt: number) {
    const rect = host.getBoundingClientRect();
    const mx = pointer.x - rect.left;
    const my = pointer.y - rect.top;
    const k = dt / FRAME_MS;
    const ease = (a: number) => 1 - Math.pow(1 - a, k);

    if (Number.isNaN(prevX)) {
      prevX = mx;
      prevY = my;
      lastSample = now;
    }
    let periods = Math.floor((now - lastSample) / SPEED_SAMPLE_MS);
    if (periods > 0) {
      if (periods > 10) {
        periods = 10;
        lastSample = now;
      } else {
        lastSample += periods * SPEED_SAMPLE_MS;
      }
      speed += (Math.hypot(prevX - mx, prevY - my) - speed) * 0.5;
      for (let n = 1; n < periods; n++) speed *= 0.5;
      if (speed < 0.001) speed = 0;
      prevX = mx;
      prevY = my;
    }

    engagement += (Math.min(speed / 5, 1) - engagement) * ease(0.06);
    if (engagement < 0.001) engagement = 0;
    glowOpacity += (engagement - glowOpacity) * ease(0.08);
    if (glowOpacity < 0.001) glowOpacity = 0;
    glow.circle.setAttribute('cx', mx.toFixed(1));
    glow.circle.setAttribute('cy', my.toFixed(1));
    glow.circle.style.opacity = glowOpacity.toFixed(3);

    frameId++;
    const pull = ease(0.15);
    const settle = ease(0.1);
    const damp = Math.pow(0.9, k);

    if (hasForce && engagement > 0.01 && cols > 0) {
      const cr = p.cursorRadius;
      const crSq = cr * cr;
      const c0 = Math.max(0, Math.floor((mx - cr - padX) / step));
      const c1 = Math.min(cols - 1, Math.ceil((mx + cr - padX) / step));
      const r0 = Math.max(0, Math.floor((my - cr - padY) / step));
      const r1 = Math.min(rows - 1, Math.ceil((my + cr - padY) / step));
      for (let r = r0; r <= r1; r++) {
        const ay = padY + r * step + step / 2;
        for (let c = c0; c <= c1; c++) {
          const ax = padX + c * step + step / 2;
          const dx = mx - ax;
          const dy = my - ay;
          const distSq = dx * dx + dy * dy;
          if (distSq >= crSq) continue;
          const i = r * cols + c;
          const dist = Math.sqrt(distSq);
          const ux = dist > 0 ? dx / dist : 1;
          const uy = dist > 0 ? dy / dist : 0;
          touched[i] = frameId;
          displaced.add(i);
          if (p.bulgeOnly) {
            const t = 1 - dist / cr;
            const push = t * t * p.bulgeStrength * engagement;
            sx[i] += (ax - ux * push - sx[i]) * pull;
            sy[i] += (ay - uy * push - sy[i]) * pull;
          } else {
            const move = (500 / Math.max(dist, 1)) * speed * p.cursorForce * k;
            vx[i] -= ux * move;
            vy[i] -= uy * move;
          }
        }
      }
    }

    for (const i of displaced) {
      const ax = anchorX(i);
      const ay = anchorY(i);
      const isTouched = touched[i] === frameId;
      if (p.bulgeOnly) {
        if (!isTouched) {
          sx[i] += (ax - sx[i]) * settle;
          sy[i] += (ay - sy[i]) * settle;
        }
      } else {
        vx[i] *= damp;
        vy[i] *= damp;
        sx[i] += (ax + vx[i] - sx[i]) * settle;
        sy[i] += (ay + vy[i] - sy[i]) * settle;
      }
      if (
        !isTouched &&
        Math.abs(sx[i] - ax) < SETTLE &&
        Math.abs(sy[i] - ay) < SETTLE &&
        Math.abs(vx[i]) < SETTLE &&
        Math.abs(vy[i]) < SETTLE
      ) {
        sx[i] = ax;
        sy[i] = ay;
        vx[i] = 0;
        vy[i] = 0;
        displaced.delete(i);
      }
    }
  }

  function busy() {
    return displaced.size > 0 || engagement > 0 || glowOpacity > 0 || (waving && !reducedMotion.matches);
  }

  function cancel() {
    if (raf) cancelAnimationFrame(raf);
    clearTimeout(timer);
    raf = 0;
    timer = 0;
    lastTime = 0;
  }

  function wake() {
    if (raf || !inView || document.hidden) return;
    clearTimeout(timer);
    timer = 0;
    raf = requestAnimationFrame(tick);
  }

  function tick(now: number) {
    raf = 0;
    const dt = Math.min(lastTime ? now - lastTime : FRAME_MS, 100);
    lastTime = now;
    if (!reducedMotion.matches) simulate(now, dt);
    render(now);

    if (!inView || document.hidden) {
      lastTime = 0;
    } else if (busy()) {
      raf = requestAnimationFrame(tick);
    } else {
      lastTime = 0;
      if (p.sparkle && !reducedMotion.matches) {
        timer = window.setTimeout(wake, SPARKLE_MS - (now % SPARKLE_MS) + 1);
      }
    }
  }

  function onPointerMove(e: PointerEvent) {
    if (!pointer.seen) {
      pointer.seen = true;
      prevX = NaN;
    }
    pointer.x = e.clientX;
    pointer.y = e.clientY;
    if (reducedMotion.matches) return;
    const r = host.getBoundingClientRect();
    if (
      e.clientX < r.left - reach ||
      e.clientX > r.right + reach ||
      e.clientY < r.top - reach ||
      e.clientY > r.bottom + reach
    ) {
      return;
    }
    wake();
  }

  function onVisibility() {
    if (document.hidden) cancel();
    else wake();
  }

  function onMotionPreference() {
    cancel();
    build();
    wake();
  }

  const resizeObserver = new ResizeObserver(([entry]) => {
    const { width, height } = entry.contentRect;
    if (width === w && height === h) return;
    clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(() => {
      cancel();
      build();
      wake();
    }, 100);
  });

  const viewObserver = new IntersectionObserver(([entry]) => {
    inView = entry.isIntersecting;
    if (inView) wake();
    else cancel();
  });

  build();
  resizeObserver.observe(host);
  viewObserver.observe(host);
  window.addEventListener('pointermove', onPointerMove, { passive: true });
  document.addEventListener('visibilitychange', onVisibility);
  reducedMotion.addEventListener('change', onMotionPreference);

  return () => {
    cancel();
    clearTimeout(resizeTimer);
    resizeObserver.disconnect();
    viewObserver.disconnect();
    window.removeEventListener('pointermove', onPointerMove);
    document.removeEventListener('visibilitychange', onVisibility);
    reducedMotion.removeEventListener('change', onMotionPreference);
    canvas.remove();
    glow.svg.remove();
  };
}

function createGlow(color: string, radius: number) {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('class', 'dot-field-glow');
  svg.setAttribute('aria-hidden', 'true');

  const id = `dot-field-glow-${Math.random().toString(36).slice(2, 9)}`;
  const gradient = document.createElementNS(SVG_NS, 'radialGradient');
  gradient.setAttribute('id', id);
  for (const [offset, stopColor] of [
    ['0%', color],
    ['100%', 'transparent'],
  ]) {
    const stop = document.createElementNS(SVG_NS, 'stop');
    stop.setAttribute('offset', offset);
    stop.setAttribute('stop-color', stopColor);
    gradient.append(stop);
  }
  const defs = document.createElementNS(SVG_NS, 'defs');
  defs.append(gradient);

  const circle = document.createElementNS(SVG_NS, 'circle');
  circle.setAttribute('cx', '-9999');
  circle.setAttribute('cy', '-9999');
  circle.setAttribute('r', String(radius));
  circle.setAttribute('fill', `url(#${id})`);
  circle.style.opacity = '0';

  svg.append(defs, circle);
  return { svg, circle };
}
