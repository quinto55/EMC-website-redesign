const MAX_DEG = 6;

function onMove(card, ev) {
  const rect = card.getBoundingClientRect();
  const x = (ev.clientX - rect.left) / rect.width - 0.5;
  const y = (ev.clientY - rect.top) / rect.height - 0.5;
  const rx = -y * MAX_DEG;
  const ry = x * MAX_DEG;
  card.style.transform = `perspective(900px) rotateX(${rx}deg) rotateY(${ry}deg) translateZ(0)`;
}

function onLeave(card) {
  card.style.transform = '';
}

export function initTilt(root = document) {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (matchMedia('(hover: none)').matches) return;
  root.querySelectorAll('[data-tilt]').forEach((card) => {
    card.addEventListener('mousemove', (ev) => onMove(card, ev));
    card.addEventListener('mouseleave', () => onLeave(card));
  });
}
