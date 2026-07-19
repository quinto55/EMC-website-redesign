const KEY = 'emc-cookie-consent';

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
    /* storage unavailable (private mode) — treat as session-only choice */
  }
  if (value === 'accepted') {
    document.dispatchEvent(new CustomEvent('emc:consent-accepted'));
  }
}

export function initConsentBanner(doc = document) {
  if (getConsent() !== null) return null;
  const banner = doc.createElement('div');
  banner.className = 'cookie-banner';
  banner.setAttribute('role', 'region');
  banner.setAttribute('aria-label', 'Cookie consent');
  banner.innerHTML = `
    <p class="cookie-banner__text">We use cookies to understand how visitors use the site and to measure our advertising. See our <a href="/privacy.html">Privacy Policy</a>.</p>
    <div class="cookie-banner__actions">
      <button type="button" class="cookie-banner__btn" data-consent="declined">Decline</button>
      <button type="button" class="cookie-banner__btn cookie-banner__btn--accept" data-consent="accepted">Accept</button>
    </div>`;
  banner.addEventListener('click', (ev) => {
    const btn = ev.target.closest('[data-consent]');
    if (!btn) return;
    setConsent(btn.dataset.consent);
    banner.remove();
  });
  doc.body.appendChild(banner);
  return banner;
}
