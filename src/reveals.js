export function markVisible(entries) {
  for (const entry of entries) {
    if (entry.isIntersecting) entry.target.classList.add('is-visible');
  }
}

export const REVEAL_TWEEN = {
  from: { autoAlpha: 0, y: 24, scale: 0.985 },
  to: { autoAlpha: 1, y: 0, scale: 1, duration: 0.7, ease: 'power3.out', stagger: 0.06, overwrite: true },
};

export function revealBatch(gsap, targets) {
  if (!targets.length) return;
  gsap.fromTo(targets, REVEAL_TWEEN.from, { ...REVEAL_TWEEN.to });
  targets.forEach((el) => el.classList.add('is-visible'));
}

export function initReveals(root = document, ctx = null) {
  const els = root.querySelectorAll('[data-reveal]');
  if (!els.length) return;
  const gsapMode = !!(ctx && ctx.gsap && !ctx.reduced);
  if (gsapMode) document.documentElement.classList.add('gsap-motion');
  if (!('IntersectionObserver' in window)) {
    els.forEach((el) => el.classList.add('is-visible'));
    return;
  }
  const io = new IntersectionObserver(
    (entries) => {
      if (gsapMode) {
        revealBatch(ctx.gsap, entries.filter((e) => e.isIntersecting).map((e) => e.target));
      } else {
        markVisible(entries);
      }
      entries.forEach((e) => e.isIntersecting && io.unobserve(e.target));
    },
    { rootMargin: '0px 0px -10% 0px', threshold: 0.05 }
  );
  els.forEach((el) => io.observe(el));
}
