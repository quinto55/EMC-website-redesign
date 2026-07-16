export function pointerVars(rect, clientX, clientY) {
  return {
    x: ((clientX - rect.left) / rect.width) * 100,
    y: ((clientY - rect.top) / rect.height) * 100,
  };
}

export function initHotspot(root = document) {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (matchMedia('(hover: none)').matches) return;
  root.querySelectorAll('[data-hotspot]').forEach((card) => {
    card.addEventListener('pointermove', (ev) => {
      const { x, y } = pointerVars(card.getBoundingClientRect(), ev.clientX, ev.clientY);
      card.style.setProperty('--hx', `${x}%`);
      card.style.setProperty('--hy', `${y}%`);
    });
  });
}
