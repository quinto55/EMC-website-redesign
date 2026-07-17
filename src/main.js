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

document.addEventListener('DOMContentLoaded', () => {
  const ctx = initMotion();
  initNav();
  initReveals(document, ctx);
  initHeroParallax(ctx);
  initCurtains(ctx);
  initPinnedForty(ctx);
  initHotspot();
  initMagnetic(ctx);
  initMarquee();
  initEmbers();
  initFlightScrub(ctx);
  initHeroCover();
});
