import './styles/tokens.css';
import './styles/base.css';
import './styles/sections.css';

import { initNav } from './nav.js';
import { initReveals } from './reveals.js';
import { initHotspot } from './hotspot.js';
import { initAutoplayVideos } from './video-ready.js';
import { initConsentBanner } from './consent.js';
import { initAnalytics } from './analytics.js';

document.addEventListener('DOMContentLoaded', () => {
  initNav();
  initReveals();
  initHotspot();
  initAutoplayVideos('video.subhero__video-el');
  initConsentBanner();
  initAnalytics();
});
