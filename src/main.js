import './styles/tokens.css';
import './styles/base.css';
import './styles/sections.css';
import './styles/hero.css';
import './styles/intro.css';
import './styles/forty.css';

import { initMotion } from './motion.js';
import { initNav } from './nav.js';
import { initIntro } from './intro.js';
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
  initIntro(ctx);
  initReveals(document, ctx);
  initHeroParallax(ctx);
  initCurtains(ctx);
  initPinnedForty(ctx);
  initHotspot();
  initMagnetic(ctx);
  initMarquee();
  initEmbers();
  initHeroCover();
});
