// Hero z-space: as the hero scrolls away, layers separate in depth.
// Values are the "fully scrolled away" end state, scrubbed with scroll.
export const HERO_PARALLAX = [
  ['.hero__video', { scale: 1.12, filter: 'blur(5px)' }],
  ['.hero__headline', { y: -60 }],
  ['.hero__embers', { y: -20 }],
];

export const CURTAIN_SECTIONS = ['.partners', '#what-we-do', '#industry-leader', '.intake'];

export function buildCurtain(section) {
  const curtain = document.createElement('div');
  curtain.className = 'curtain';
  curtain.setAttribute('aria-hidden', 'true');
  section.prepend(curtain);
  return curtain;
}

export function initHeroParallax(ctx) {
  if (!ctx || ctx.reduced) return;
  const hero = document.querySelector('.hero');
  if (!hero) return;
  for (const [sel, to] of HERO_PARALLAX) {
    const el = hero.querySelector(sel);
    if (!el) continue;
    ctx.gsap.to(el, {
      ...to,
      ease: 'none',
      scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: true },
    });
  }
}

export function initCurtains(ctx) {
  if (!ctx || ctx.reduced) return;
  for (const sel of CURTAIN_SECTIONS) {
    const section = document.querySelector(sel);
    if (!section) continue;
    section.classList.add('has-curtain');
    const curtain = buildCurtain(section);
    ctx.gsap.to(curtain, {
      scaleY: 0,
      duration: 0.9,
      ease: 'power2.inOut',
      scrollTrigger: { trigger: section, start: 'top 70%', once: true },
    });
  }
}
