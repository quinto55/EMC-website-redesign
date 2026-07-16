import { hasSeenIntro, markIntroSeen } from './motion.js';
import { positionMaskText, introFontSize } from './mask-text.js';
import { wireVideoReady } from './video-ready.js';

const HERO_ITEMS = '.hero__eyebrow, .hero__brand, .hero__tagline, .hero__pillars, .hero__bottom';
const SKIP_EVENTS = ['pointerdown', 'keydown', 'wheel', 'touchstart'];

export function shouldPlayIntro({ reduced, seen }) {
  return !reduced && !seen;
}

export function wireIntroSkip(target, onSkip) {
  let fired = false;
  const handler = () => {
    if (fired) return;
    fired = true;
    dispose();
    onSkip();
  };
  const dispose = () =>
    SKIP_EVENTS.forEach((e) => target.removeEventListener(e, handler));
  SKIP_EVENTS.forEach((e) => target.addEventListener(e, handler, { passive: true }));
  return dispose;
}

// Timeline phases (seconds): 0 letters+underline in · 0.8 breathe+eyebrow ·
// 1.6 letters scale 8x (mask expands past viewport) · 2.15 overlay fades ·
// 2.2 hero content staggers in.
export function buildIntroTimeline(gsap, els, onDone) {
  const tl = gsap.timeline({ defaults: { ease: 'power3.out' }, onComplete: onDone });
  tl.fromTo(els.stage, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.6 }, 0)
    .fromTo(els.underline, { scaleX: 0 }, { scaleX: 1, duration: 0.7 }, 0.15)
    .fromTo(els.letters, { scale: 1 }, { scale: 1.04, duration: 0.8, ease: 'sine.inOut' }, 0.8)
    .fromTo(els.eyebrow, { autoAlpha: 0, y: 12 }, { autoAlpha: 1, y: 0, duration: 0.5 }, 0.9)
    .to(els.letters, { scale: 8, duration: 0.9, ease: 'power4.inOut' }, 1.6)
    .to([els.underline, els.eyebrow], { autoAlpha: 0, duration: 0.3 }, 1.6)
    .to(els.root, { autoAlpha: 0, duration: 0.45 }, 2.15)
    .fromTo(
      els.heroItems,
      { autoAlpha: 0, y: 24 },
      { autoAlpha: 1, y: 0, duration: 0.6, stagger: 0.08 },
      2.2
    );
  return tl;
}

function sizeLetters(letters) {
  const w = window.innerWidth;
  const h = window.innerHeight;
  positionMaskText(letters, w, h, introFontSize(w, h));
}

export function initIntro(ctx) {
  const root = document.getElementById('intro');
  if (!root) return;

  const finish = () => {
    root.classList.add('is-done');
    document.body.classList.remove('intro-lock');
  };

  if (!shouldPlayIntro({ reduced: ctx.reduced, seen: hasSeenIntro() })) {
    if (ctx.reduced) {
      finish();
    } else {
      // Repeat visit this session: quick 400ms fade instead of the full intro.
      ctx.gsap.to(root, { autoAlpha: 0, duration: 0.4, onComplete: finish });
    }
    return;
  }

  const els = {
    root,
    stage: root.querySelector('.intro__stage'),
    letters: root.querySelector('.intro__letters'),
    underline: root.querySelector('.intro__underline'),
    eyebrow: root.querySelector('.intro__eyebrow'),
    heroItems: document.querySelectorAll(HERO_ITEMS),
  };

  document.body.classList.add('intro-lock');
  markIntroSeen();
  wireVideoReady(root.querySelector('.intro__video'));
  sizeLetters(els.letters);
  const onResize = () => sizeLetters(els.letters);
  window.addEventListener('resize', onResize);

  ctx.gsap.set(els.letters, { transformOrigin: '50% 50%' });

  let disposeSkip = () => {};
  const tl = buildIntroTimeline(ctx.gsap, els, () => {
    disposeSkip();
    window.removeEventListener('resize', onResize);
    finish();
  });
  disposeSkip = wireIntroSkip(window, () => tl.progress(1));
}
