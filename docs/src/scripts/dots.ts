// The hub's drifting dots (docs.stravelakis.com): a quiet field that leans
// toward the pointer. It only draws while something is moving, stops in a
// background tab, and stays still for "reduce motion".
export function startDots(canvas: HTMLCanvasElement | null) {
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches;

  type Pt = { x: number; y: number; ox: number; oy: number };
  let w = 0;
  let h = 0;
  let dpr = 1;
  let pts: Pt[] = [];
  let mx = -1e4;
  let my = -1e4;
  let raf = 0;

  const size = () => {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = canvas.width = innerWidth * dpr;
    h = canvas.height = innerHeight * dpr;
    pts = [];
    const gap = 34 * dpr;
    for (let y = gap / 2; y < h; y += gap) for (let x = gap / 2; x < w; x += gap) pts.push({ x, y, ox: x, oy: y });
  };

  // Returns true while any dot is still travelling or the pointer is near.
  const draw = () => {
    ctx.clearRect(0, 0, w, h);
    let moving = false;
    const r = 160 * dpr;
    for (const p of pts) {
      const dx = mx - p.ox;
      const dy = my - p.oy;
      const d = Math.hypot(dx, dy);
      const k = d < r ? 1 - d / r : 0;
      const tx = p.ox + dx * k * 0.18;
      const ty = p.oy + dy * k * 0.18;
      if (Math.abs(tx - p.x) > 0.05 || Math.abs(ty - p.y) > 0.05) moving = true;
      p.x += (tx - p.x) * 0.12;
      p.y += (ty - p.y) * 0.12;
      ctx.fillStyle = k ? `rgba(130,216,183,${0.18 + k * 0.6})` : 'rgba(125,137,214,0.14)';
      ctx.beginPath();
      ctx.arc(p.x, p.y, (1.1 + k * 1.6) * dpr, 0, Math.PI * 2);
      ctx.fill();
    }
    return moving || mx > -1e3;
  };

  const loop = () => {
    raf = 0;
    if (document.hidden) return;
    if (draw()) raf = requestAnimationFrame(loop);
  };
  const wake = () => {
    if (!raf && !still && !document.hidden) raf = requestAnimationFrame(loop);
  };

  addEventListener('resize', () => {
    size();
    draw();
    wake();
  });
  addEventListener('pointermove', (e) => {
    mx = e.clientX * dpr;
    my = e.clientY * dpr;
    wake();
  });
  document.addEventListener('pointerleave', () => {
    mx = my = -1e4;
    wake();
  });
  document.addEventListener('visibilitychange', () => {
    cancelAnimationFrame(raf);
    raf = 0;
    wake();
  });

  size();
  draw();
}
