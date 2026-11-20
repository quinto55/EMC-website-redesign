// The fair services page's script: everything every page does, then the booth notes and the videos.
import './site.js';
import { initShowNotes } from '../show.js';
import { initVideos } from '../video.js';

// Each step runs on its own, so one failing cannot stop the other.
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
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
else start();
