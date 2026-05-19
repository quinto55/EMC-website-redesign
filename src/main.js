import './styles/tokens.css';
import './styles/base.css';
import './styles/sections.css';
import './styles/hero.css';

import { initNav } from './nav.js';
import { initReveals } from './reveals.js';

document.addEventListener('DOMContentLoaded', () => {
  initNav();
  initReveals();
});
