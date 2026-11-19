// analytics.js imports getConsent from here as well; the cycle is safe because neither
// module calls the other while loading, only from functions run later.
import { anyTrackerConfigured } from './analytics.js';

const KEY = 'emc-cookie-consent';
const PRIVACY_LINK = '<a href="/privacy/">Privacy Policy</a>';

const CHOICE = `
  <p class="cookie-banner__text">We use cookies to understand how visitors use the site and to measure our advertising. See our ${PRIVACY_LINK}.</p>
  <div class="cookie-banner__actions">
    <button type="button" class="btn ghost" data-consent="declined">Decline</button>
    <button type="button" class="btn" data-consent="accepted">Accept</button>
  </div>`;

const NOTHING_TRACKED = `
  <p class="cookie-banner__text">This site is not using any tracking cookies right now. See our ${PRIVACY_LINK}.</p>
  <div class="cookie-banner__actions">
    <button type="button" class="btn" data-cookie-close>Close</button>
  </div>`;

export function getConsent() {
  try {
    const v = localStorage.getItem(KEY);
    return v === 'accepted' || v === 'declined' ? v : null;
  } catch {
    return null;
  }
}

export function setConsent(value) {
  try {
    localStorage.setItem(KEY, value);
  } catch {
    /* storage unavailable (private mode): the choice lasts for this page only */
  }
  if (value === 'accepted') {
    document.dispatchEvent(new CustomEvent('emc:consent-accepted'));
  }
}

/** One panel at a time, pinned to the bottom of the screen. */
function showPanel(doc, { label, html, takeFocus }) {
  doc.querySelectorAll('.cookie-banner').forEach((n) => n.remove());
  const opener = takeFocus ? doc.activeElement : null;
  const panel = doc.createElement('div');
  panel.className = 'cookie-banner';
  panel.setAttribute('role', 'region');
  panel.setAttribute('aria-label', label);
  panel.innerHTML = html;
  panel.addEventListener('click', (ev) => {
    const btn = ev.target.closest('[data-consent], [data-cookie-close]');
    if (!btn) return;
    if (btn.dataset.consent) setConsent(btn.dataset.consent);
    panel.remove();
    if (opener && opener !== doc.body && typeof opener.focus === 'function') opener.focus();
  });
  doc.body.appendChild(panel);
  if (takeFocus) panel.querySelector('button')?.focus();
  return panel;
}

/** The first-visit banner: only when a tracker is switched on and the visitor has not chosen yet. */
export function initConsentBanner(doc = document) {
  if (!anyTrackerConfigured() || getConsent() !== null) return null;
  return showPanel(doc, { label: 'Cookie consent', html: CHOICE, takeFocus: false });
}

/** The footer's "Cookie settings": lets a visitor change their choice, or says nothing is tracked. */
export function openCookieSettings(doc = document) {
  const html = anyTrackerConfigured() ? CHOICE : NOTHING_TRACKED;
  return showPanel(doc, { label: 'Cookie settings', html, takeFocus: true });
}
