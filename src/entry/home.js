// The home page's script: everything every page does, then the two live sample boards on one sample day and the
// proof strip's count. Each step is guarded on its own, so one failing leaves the others (and the page) as they are.
import './site.js';
import { mountHomeLive } from '../demo/home-live.js';
import { initProofCount } from '../proof-count.js';

function start() {
  try {
    mountHomeLive({
      boardEl: document.querySelector('.hero [data-board]'),
      dashEl: document.querySelector('#live-board [data-dashboard]'),
    });
  } catch (err) {
    console.error(err); // both boards stay as served; nothing else on the page is affected
  }
  try {
    initProofCount();
  } catch (err) {
    console.error(err); // the strip stays as served: "40+" with everything showing
  }
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
else start();
