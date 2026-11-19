// The IAFE page's script: everything every page does, then the booth notes, the card variant and the card tag in the email subject.
// Nothing else: no board, no dashboard, no video. This page opens on a phone on weak signal.
import './site.js';
import { initShowNotes } from '../show.js';
import { iafeVariant, applyIafeVariant, applyBoothHeading, applyCardSubject } from '../iafe/variant.js';

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
  attempt(() => applyBoothHeading(document));
  attempt(() => applyIafeVariant(document, iafeVariant()));
  attempt(() => applyCardSubject(document));
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
else start();
