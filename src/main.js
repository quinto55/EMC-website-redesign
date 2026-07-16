import './styles/tokens.css';
import './styles/base.css';
import './styles/sections.css';
import './styles/hero.css';
import './styles/intro.css';

import { initMotion } from './motion.js';
import { initNav } from './nav.js';
import { initIntro } from './intro.js';
import { initReveals } from './reveals.js';
import { initTilt } from './tilt.js';
import { initCountUp } from './count-up.js';
import { initHeroCover } from './hero/cover.js';

document.addEventListener('DOMContentLoaded', () => {
  const ctx = initMotion();
  initNav();
  initIntro(ctx);
  initReveals(document, ctx);
  initTilt();
  initCountUp();
  initHeroCover();
});
