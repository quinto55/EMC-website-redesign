// The home page's script: everything every page does, then the curtain (computers only), the two live sample boards
// on one sample day and the proof strip's count. Each step is guarded on its own, so one failing leaves the others (and
// the page) as they are.
import './site.js';
import { mountHomeLive } from '../demo/home-live.js';
import { initProofCount } from '../proof-count.js';

/** The page as served: no curtain marks on <html>. */
const clearCurtain = () => document.documentElement.classList.remove('curtain-pending', 'curtain-closed');

function start() {
  // The head script marks the page only when the curtain will show (a computer, first view this session), so phones and
  // repeat views never fetch the curtain's code. If it fails to arrive or to start, the visitor gets the page.
  if (document.documentElement.classList.contains('curtain-pending')) {
    import('../curtain/curtain.js')
      .then(({ mountCurtain }) => mountCurtain())
      .catch((err) => {
        console.error(err);
        clearCurtain();
      });
  }
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
