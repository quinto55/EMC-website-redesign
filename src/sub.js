import './styles/tokens.css';
import './styles/base.css';
import './styles/sections.css';

import { initNav } from './nav.js';
import { initReveals } from './reveals.js';
import { mountRotatingTicket } from './motifs/rotating-ticket.js';

document.addEventListener('DOMContentLoaded', () => {
  initNav();
  initReveals();
  document.querySelectorAll('canvas[data-motif="rotating-ticket"]').forEach((c) => mountRotatingTicket(c));
});
