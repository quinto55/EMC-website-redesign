export const EMBER_COUNT = 40;
const GOLD = ['255, 214, 107', '255, 156, 61', '255, 200, 120'];

export function createEmber(rand = Math.random) {
  return {
    x: rand(),
    y: rand() * 0.85, // keep the horizon band clear
    r: 0.6 + rand() * 1.6,
    vx: (rand() - 0.5) * 0.012,
    vy: -(0.004 + rand() * 0.01),
    phase: rand() * Math.PI * 2,
    twinkle: 2 + rand() * 3,
    tint: GOLD[Math.floor(rand() * GOLD.length) % GOLD.length],
  };
}

export function stepEmber(p, dt) {
  p.x += p.vx * dt;
  p.y += p.vy * dt;
  p.phase += dt / p.twinkle;
  if (p.y < -0.02) p.y = 1.02;
  if (p.x < -0.02) p.x = 1.02;
  else if (p.x > 1.02) p.x = -0.02;
  return p;
}

export function emberAlpha(p) {
  return 0.25 + 0.275 * (1 + Math.sin(p.phase * Math.PI * 2));
}

export function initEmbers() {
  const canvas = document.querySelector('.hero__embers');
  const hero = document.querySelector('.hero');
  if (!canvas || !hero) return;
  const ctx2d = canvas.getContext('2d');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const embers = Array.from({ length: EMBER_COUNT }, () => createEmber());

  let w = 0;
  let h = 0;

  const draw = () => {
    ctx2d.clearRect(0, 0, w, h);
    for (const p of embers) {
      ctx2d.beginPath();
      ctx2d.arc(p.x * w, p.y * h, p.r, 0, Math.PI * 2);
      ctx2d.fillStyle = `rgba(${p.tint}, ${emberAlpha(p)})`;
      ctx2d.fill();
    }
  };

  const resize = () => {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = canvas.clientWidth;
    h = canvas.clientHeight;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    ctx2d.setTransform(dpr, 0, 0, dpr, 0, 0);
    // Setting canvas dimensions clears the bitmap; repaint the static frame
    // for reduced-motion users (the rAF loop repaints for everyone else).
    if (reduced) draw();
  };
  resize();
  window.addEventListener('resize', resize);

  if (reduced) return; // resize() above already painted the single static frame

  let intersecting = true;
  let visible = !document.hidden;
  let running = false;
  let rafId = 0;
  let last = performance.now();

  const loop = (now) => {
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    for (const p of embers) stepEmber(p, dt);
    draw();
    if (running) rafId = requestAnimationFrame(loop);
  };

  // Run only while the hero is on-screen AND the tab is visible. The two
  // signals are tracked separately so one resuming can never override the
  // other's pause (IO only fires on threshold crossings, so a stale shared
  // boolean would keep the loop running off-screen after a tab round-trip).
  const sync = () => {
    const shouldRun = intersecting && visible;
    if (shouldRun && !running) {
      running = true;
      last = performance.now();
      rafId = requestAnimationFrame(loop);
    } else if (!shouldRun && running) {
      running = false;
      cancelAnimationFrame(rafId);
    }
  };

  new IntersectionObserver(([entry]) => {
    intersecting = entry.isIntersecting;
    sync();
  }).observe(hero);
  document.addEventListener('visibilitychange', () => {
    visible = !document.hidden;
    sync();
  });

  sync();
}
