import './styles/tokens.css';
import './styles/base.css';
import './styles/sections.css';
import './styles/hero.css';

import { initNav } from './nav.js';
import { initReveals } from './reveals.js';
import { initTilt } from './tilt.js';
import { initCountUp } from './count-up.js';
import { createConstellation } from './hero/constellation.js';

document.addEventListener('DOMContentLoaded', () => {
  initNav();
  initReveals();
  initTilt();
  initCountUp();

  const canvas = document.querySelector('.hero__canvas');
  if (canvas) createConstellation(canvas);
});
