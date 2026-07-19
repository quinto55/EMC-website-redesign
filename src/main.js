import './styles/tokens.css';
import './styles/base.css';
import './styles/sections.css';
import './styles/hero.css';
import './styles/experience.css';
import './styles/forty.css';

import { initMotion } from './motion.js';
import { initNav } from './nav.js';
import { initFlightScrub } from './flight-scrub.js';
import { initReveals } from './reveals.js';
import { initHeroParallax, initCurtains } from './parallax.js';
import { initHotspot } from './hotspot.js';
import { initPinnedForty } from './pinned-forty.js';
import { initEmbers } from './particles.js';
import { initHeroCover } from './hero/cover.js';
import { initMagnetic } from './magnetic.js';
import { initMarquee } from './marquee.js';
import { initConsentBanner } from './consent.js';
import { initAnalytics } from './analytics.js';

document.addEventListener('DOMContentLoaded', () => {
  const ctx = initMotion();
  initNav();
  initReveals(document, ctx);
  initHotspot();
  initMagnetic(ctx);
  initMarquee();
  initEmbers();
  initHeroCover();
  // Scroll-position-dependent triggers (pins, curtains, parallax) must be
  // created AFTER the flight pin inserts its ~250vh runway — measuring the
  // page before that leaves every trigger start stale by the runway height
  // (the forty scene then pins mid-page over other content).
  initFlightScrub(ctx).then(() => {
    initHeroParallax(ctx);
    initCurtains(ctx);
    initPinnedForty(ctx);
  });
  initConsentBanner();
  initAnalytics();
});
