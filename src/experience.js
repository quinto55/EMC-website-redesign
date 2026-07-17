import './styles/tokens.css';
import './styles/base.css';
import './styles/sections.css';
import './styles/experience.css';

import { initMotion } from './motion.js';
import { initNav } from './nav.js';
import { initMagnetic } from './magnetic.js';
import { initReveals } from './reveals.js';
import { initFlightScrub } from './flight-scrub.js';

document.addEventListener('DOMContentLoaded', () => {
  const ctx = initMotion();
  initNav();
  initMagnetic(ctx);
  initReveals(document, ctx);
  initFlightScrub(ctx);
});
