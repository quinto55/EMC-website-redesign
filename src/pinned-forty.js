import { positionMaskText, fortyFontSize } from './mask-text.js';
import { wireVideoReady } from './video-ready.js';

export function scrubToCount(progress, target = 40) {
  const p = Math.max(0, Math.min(1, progress));
  return Math.round(p * target);
}

export function captionIndex(progress, count = 4) {
  const p = Math.max(0, Math.min(1, progress));
  return Math.min(Math.floor(p * count), count - 1);
}

export function applyFortyProgress(progress, digitsEl, captionEls) {
  digitsEl.textContent = String(scrubToCount(progress));
  const idx = captionIndex(progress, captionEls.length);
  captionEls.forEach((c, i) => c.classList.toggle('is-active', i === idx));
}

function sizeDigits(root, digits) {
  const stage = root.querySelector('.forty__mask-stage');
  const w = stage.clientWidth;
  const h = stage.clientHeight;
  positionMaskText(digits, w, h, fortyFontSize(w, h));
}

export function initPinnedForty(ctx) {
  const root = document.querySelector('[data-forty]');
  if (!root) return;
  const digits = root.querySelector('.forty__digits');
  const captions = [...root.querySelectorAll('.forty__caption')];

  const staticFinal = () => {
    digits.textContent = '40';
    captions.forEach((c) => c.classList.add('is-active'));
  };

  if (!ctx || ctx.reduced) {
    staticFinal();
    return;
  }

  wireVideoReady(root.querySelector('.forty__video'));
  sizeDigits(root, digits);
  window.addEventListener('resize', () => sizeDigits(root, digits));

  const mm = ctx.gsap.matchMedia();

  // Desktop: pin for 1.5 viewport-heights; scrub is lerp-smoothed (scrub: 1).
  mm.add('(min-width: 769px)', () => {
    const state = { p: 0 };
    const tween = ctx.gsap.to(state, {
      p: 1,
      ease: 'none',
      onUpdate: () => applyFortyProgress(state.p, digits, captions),
      scrollTrigger: {
        trigger: root,
        start: 'top top',
        end: '+=150%',
        pin: true,
        scrub: 1,
      },
    });
    return () => tween.scrollTrigger && tween.scrollTrigger.kill();
  });

  // Mobile: no pin. Count once on entry, captions all visible (stacked).
  mm.add('(max-width: 768px)', () => {
    captions.forEach((c) => c.classList.add('is-active'));
    const state = { v: 0 };
    const st = ctx.ScrollTrigger.create({
      trigger: root,
      start: 'top 70%',
      once: true,
      onEnter: () =>
        ctx.gsap.to(state, {
          v: 40,
          duration: 1.4,
          ease: 'power3.out',
          onUpdate: () => { digits.textContent = String(Math.round(state.v)); },
        }),
    });
    return () => st.kill();
  });
}
