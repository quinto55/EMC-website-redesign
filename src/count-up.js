export const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);

export function computeFrameValue(start, target, progress) {
  const p = Math.max(0, Math.min(1, progress));
  return Math.round(start + (target - start) * easeOutCubic(p));
}

export function runCountUp(el, target, duration = 1600) {
  const start = 0;
  const startTime = performance.now();
  function frame(now) {
    const progress = (now - startTime) / duration;
    el.textContent = String(computeFrameValue(start, target, progress));
    if (progress < 1) requestAnimationFrame(frame);
    else el.textContent = String(target);
  }
  requestAnimationFrame(frame);
}

export function initCountUp(root = document) {
  const els = root.querySelectorAll('[data-countup]');
  if (!els.length) return;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduced || !('IntersectionObserver' in window)) {
    els.forEach((el) => (el.textContent = el.dataset.countup));
    return;
  }
  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        const target = parseInt(e.target.dataset.countup, 10);
        runCountUp(e.target, target);
        io.unobserve(e.target);
      }
    },
    { threshold: 0.5 }
  );
  els.forEach((el) => io.observe(el));
}
