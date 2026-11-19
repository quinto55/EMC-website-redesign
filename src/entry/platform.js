// The platform page's script: everything every page does, then the booth notes, the videos, the live dashboard and
// the gate scan demo.
import './site.js';
import { initShowNotes } from '../show.js';
import { initVideos } from '../video.js';
import { mountDashboard } from '../demo/dashboard-view.js';
import { mountGateScan } from '../demo/gate-scan-view.js';

// Each step runs on its own, so one failing cannot stop the others.
function attempt(step) {
  try {
    step();
  } catch (err) {
    console.error(err);
  }
}

function start() {
  attempt(() => initShowNotes());
  attempt(() => initVideos());
  // A dashboard that fails to start stays as served; nothing else on the page is affected.
  attempt(() => document.querySelectorAll('[data-dashboard]').forEach((el) => mountDashboard(el)));
  // A scan demo that fails to start keeps its ticket and shows no buttons.
  attempt(() => document.querySelectorAll('[data-demo="gate-scanning"]').forEach((el) => mountGateScan(el)));
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
else start();
