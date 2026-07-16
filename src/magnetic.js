export function magneticOffset(rect, clientX, clientY, { radius = 60, maxShift = 8 } = {}) {
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;
  const dx = clientX - cx;
  const dy = clientY - cy;
  const halfW = rect.width / 2;
  const halfH = rect.height / 2;
  // Distance from the button's edge (0 when inside the button).
  const edgeDist = Math.max(Math.abs(dx) - halfW, Math.abs(dy) - halfH, 0);
  if (edgeDist > radius) return null;
  const nx = Math.max(-1, Math.min(1, dx / (halfW + radius)));
  const ny = Math.max(-1, Math.min(1, dy / (halfH + radius)));
  return { x: nx * maxShift, y: ny * maxShift };
}

export function initMagnetic(ctx, root = document) {
  if (!ctx || ctx.reduced) return;
  if (matchMedia('(hover: none)').matches) return;
  const buttons = [...root.querySelectorAll('[data-magnetic]')];
  if (!buttons.length) return;

  const attached = new Set();
  let ticking = false;
  let lastEvent = null;

  const update = () => {
    ticking = false;
    for (const btn of buttons) {
      const offset = magneticOffset(
        btn.getBoundingClientRect(),
        lastEvent.clientX,
        lastEvent.clientY
      );
      if (offset) {
        attached.add(btn);
        ctx.gsap.to(btn, { x: offset.x, y: offset.y, duration: 0.3, ease: 'power3.out' });
      } else if (attached.has(btn)) {
        attached.delete(btn);
        ctx.gsap.to(btn, { x: 0, y: 0, duration: 0.5, ease: 'elastic.out(1, 0.45)' });
      }
    }
  };

  document.addEventListener('mousemove', (ev) => {
    lastEvent = ev;
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(update);
    }
  });
}
