// Every page's script. The pages work without it; it only adds the phone menu, the header that stays
// at the top of the window, the cookie banner and settings, and analytics once a visitor allows it.
import { initNav } from '../nav.js';
import { initPin } from '../pin.js';
import { initConsentBanner, openCookieSettings } from '../consent.js';
import { initAnalytics } from '../analytics.js';
import { captureUtm } from '../form/utm.js';
import { initAskForms } from '../form/ask-form.js';

// Each step runs on its own, so one failing cannot stop the menu or the form from starting.
function attempt(step) {
  try {
    step();
  } catch (err) {
    console.error(err);
  }
}

function start() {
  attempt(captureUtm);
  attempt(initNav);
  attempt(() => initPin()); // after initNav: it pins only a header whose menu works
  attempt(initConsentBanner);
  attempt(initAnalytics);
  attempt(initAskForms);
  attempt(() => {
    for (const button of document.querySelectorAll('[data-cookie-settings]')) {
      button.addEventListener('click', () => openCookieSettings());
    }
  });
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
else start();
