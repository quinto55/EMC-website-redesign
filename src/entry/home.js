// The home page's script: everything every page does, then the two live sample boards on one sample day.
import './site.js';
import { mountHomeLive } from '../demo/home-live.js';

function start() {
  try {
    mountHomeLive({
      boardEl: document.querySelector('.hero [data-board]'),
      dashEl: document.querySelector('#live-board [data-dashboard]'),
    });
  } catch (err) {
    console.error(err); // both boards stay as served; nothing else on the page is affected
  }
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
else start();
