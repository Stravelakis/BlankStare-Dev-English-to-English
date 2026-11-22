// Small behaviours every docs page shares. Safe to call more than once.
//   1. Give every heading in a reading-level panel its own id (the same
//      heading often exists at all three levels, and ids must be unique).
//   2. Turn blockquotes into coloured callouts and ordered lists into steps.
//   3. Copy buttons on code blocks.
//   4. Scroll reveal and the progress bar.

let prepared = false;

const CALLOUTS: Array<[RegExp, string]> = [
  [/^(watch out|careful|warning|don.t|never)/i, 'c-warn'],
  [/^(why|how come|the reason)/i, 'c-why'],
  [/^(try it|tip|trick|shortcut|you can)/i, 'c-tip'],
];

export function prepareDocs() {
  if (prepared) return;
  prepared = true;

  // 1. Unique heading ids per panel.
  document.querySelectorAll<HTMLElement>('.tab-panel').forEach((panel) => {
    const level = panel.dataset.panel ?? 'x';
    panel.querySelectorAll<HTMLElement>('h2, h3').forEach((h) => {
      if (h.id && !h.id.startsWith(`${level}--`)) h.id = `${level}--${h.id}`;
    });
    // Stagger the rise-in when the level changes.
    Array.from(panel.children).forEach((child, i) => (child as HTMLElement).style.setProperty('--k', String(i)));
  });

  // 2. Callouts and steps.
  document.querySelectorAll<HTMLElement>('.doc-body blockquote').forEach((bq) => {
    const label = bq.querySelector(':scope > p:first-child > strong:first-child');
    if (!label) return;
    label.classList.add('callout-label');
    const text = label.textContent ?? '';
    for (const [re, cls] of CALLOUTS) if (re.test(text)) bq.classList.add(cls);
  });
  document.querySelectorAll<HTMLElement>('.doc-body ol').forEach((ol) => {
    if (ol.children.length >= 3 && !ol.closest('li, blockquote, table')) ol.classList.add('steps');
  });

  // 3. Copy buttons.
  document.querySelectorAll<HTMLPreElement>('.doc-body pre').forEach((pre) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'copy-btn';
    btn.textContent = 'Copy';
    btn.setAttribute('aria-label', 'Copy this code');
    btn.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(pre.querySelector('code')?.textContent ?? pre.textContent ?? '');
        btn.textContent = 'Copied';
        btn.classList.add('done');
        setTimeout(() => {
          btn.textContent = 'Copy';
          btn.classList.remove('done');
        }, 1400);
      } catch {
        btn.textContent = 'Press Ctrl+C';
      }
    });
    pre.append(btn);
  });

  // 4. Reveal blocks as they scroll into view. Observes small blocks, never
  // whole sections (a tall section never reaches a 12% threshold; found on
  // Video Forge, 18 Nov 2026).
  const pane = document.querySelector<HTMLElement>('.content');
  const reveal = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        e.target.classList.add('in-view');
        reveal.unobserve(e.target);
      });
    },
    { root: null, rootMargin: '0px 0px -8% 0px', threshold: 0 }
  );
  document
    .querySelectorAll('.reveal, .doc-body h2, .doc-body blockquote, .doc-body ol.steps > li')
    .forEach((el) => reveal.observe(el));

  // Progress bar in the top bar: how far down whichever pane scrolls.
  const bar = document.querySelector<HTMLElement>('.progress');
  if (bar) {
    let queued = false;
    const update = () => {
      queued = false;
      const el = pane && pane.scrollHeight > pane.clientHeight ? pane : document.scrollingElement;
      if (!el) return;
      const max = el.scrollHeight - el.clientHeight;
      bar.style.setProperty('--p', max > 0 ? String(Math.min(1, el.scrollTop / max)) : '0');
    };
    const onScroll = () => {
      if (queued) return;
      queued = true;
      requestAnimationFrame(update);
    };
    pane?.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('scroll', onScroll, { passive: true });
    update();
  }
}
