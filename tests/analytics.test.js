import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

const IDS = {
  SITE_URL: 'https://emctickets.com',
  PROD_HOSTNAMES: ['emctickets.com', 'www.emctickets.com'],
  CONTACT_EMAIL: 'info@emctickets.com',
  POSTHOG_KEY: 'phc_test',
  POSTHOG_HOST: 'https://us.i.posthog.com',
  CLARITY_ID: 'clarity_test',
  LINKEDIN_PARTNER_ID: '12345',
  META_PIXEL_ID: '67890',
};

function scriptSrcs() {
  return [...document.head.querySelectorAll('script[src]')].map((s) => s.src);
}

// Injected vendor <script src> elements stay in the DOM (so tests can read
// their URLs) but happy-dom must never fetch or run them: no real network.
const savedSettings = {};
beforeEach(() => {
  const st = window.happyDOM.settings;
  savedSettings.file = st.disableJavaScriptFileLoading;
  savedSettings.evalJs = st.disableJavaScriptEvaluation;
  st.disableJavaScriptFileLoading = true;
  st.disableJavaScriptEvaluation = true;
  localStorage.clear();
  document.head.querySelectorAll('script[src]').forEach((s) => s.remove());
  delete window.fbq; delete window._fbq; delete window.posthog;
  delete window.clarity; delete window._linkedin_partner_id;
  vi.resetModules();
});
afterEach(() => {
  vi.doUnmock('../src/site-config.js');
  window.happyDOM.settings.disableJavaScriptFileLoading = savedSettings.file;
  window.happyDOM.settings.disableJavaScriptEvaluation = savedSettings.evalJs;
});

describe('with real (empty) config — installed dark', () => {
  it('injects nothing even with consent on prod host', async () => {
    const { setConsent } = await import('../src/consent.js');
    const { loadVendors } = await import('../src/analytics.js');
    setConsent('accepted');
    loadVendors(document);
    expect(scriptSrcs()).toEqual([]);
  });

  it('reports that no tracker is configured', async () => {
    const { anyTrackerConfigured } = await import('../src/analytics.js');
    expect(anyTrackerConfigured()).toBe(false);
  });
});

describe('with test IDs', () => {
  beforeEach(() => vi.doMock('../src/site-config.js', () => IDS));

  it('reports that a tracker is configured', async () => {
    const { anyTrackerConfigured } = await import('../src/analytics.js');
    expect(anyTrackerConfigured()).toBe(true);
  });

  it('trackingAllowed needs prod host AND acceptance', async () => {
    const { setConsent } = await import('../src/consent.js');
    const { trackingAllowed } = await import('../src/analytics.js');
    expect(trackingAllowed('emctickets.com')).toBe(false);
    setConsent('accepted');
    expect(trackingAllowed('emctickets.com')).toBe(true);
    expect(trackingAllowed('www.emctickets.com')).toBe(true);
    expect(trackingAllowed('localhost')).toBe(false);
  });

  it('declined consent injects nothing regardless of IDs', async () => {
    const { setConsent } = await import('../src/consent.js');
    const { initAnalytics } = await import('../src/analytics.js');
    setConsent('declined');
    initAnalytics(document, 'emctickets.com');
    expect(scriptSrcs()).toEqual([]);
  });

  it('accepted consent on prod host injects all four vendors', async () => {
    const { setConsent } = await import('../src/consent.js');
    const { initAnalytics } = await import('../src/analytics.js');
    setConsent('accepted');
    initAnalytics(document, 'emctickets.com');
    const srcs = scriptSrcs().join(' ');
    expect(srcs).toContain('us.i.posthog.com/static/array.js');
    expect(srcs).toContain('clarity.ms/tag/clarity_test');
    expect(srcs).toContain('snap.licdn.com');
    expect(srcs).toContain('connect.facebook.net');
    expect(window.fbq).toBeTypeOf('function');
  });

  it('undecided visitors get vendors only after accepting', async () => {
    const { setConsent } = await import('../src/consent.js');
    const { initAnalytics } = await import('../src/analytics.js');
    initAnalytics(document, 'emctickets.com');
    expect(scriptSrcs()).toEqual([]);
    setConsent('accepted');
    expect(scriptSrcs().length).toBe(4);
  });

  it('loadVendors is idempotent — a second call injects nothing new', async () => {
    const { setConsent } = await import('../src/consent.js');
    const { loadVendors } = await import('../src/analytics.js');
    setConsent('accepted');
    loadVendors(document);
    const after = scriptSrcs().length;
    loadVendors(document);
    expect(scriptSrcs().length).toBe(after);
  });

  it('accepted consent off prod host injects nothing via initAnalytics', async () => {
    const { setConsent } = await import('../src/consent.js');
    const { initAnalytics } = await import('../src/analytics.js');
    setConsent('accepted');
    initAnalytics(document, 'localhost');
    expect(scriptSrcs()).toEqual([]);
  });

  it('declined visitors stay inert even if the event later fires', async () => {
    const { setConsent } = await import('../src/consent.js');
    const { initAnalytics } = await import('../src/analytics.js');
    setConsent('declined');
    initAnalytics(document, 'emctickets.com');
    document.dispatchEvent(new CustomEvent('emc:consent-accepted'));
    expect(scriptSrcs()).toEqual([]);
  });
});

describe('trackEvent', () => {
  beforeEach(() => vi.doMock('../src/site-config.js', () => IDS));

  it('does nothing off the live hostnames or without accepted consent', async () => {
    const { trackEvent } = await import('../src/analytics.js');
    const capture = vi.fn();
    window.posthog = { capture };
    localStorage.setItem('emc-cookie-consent', 'accepted'); // not setConsent: its event would load vendors
    trackEvent('lead_submitted', { request: 'talk' }, 'localhost');
    localStorage.clear();
    trackEvent('lead_submitted', { request: 'talk' }, 'emctickets.com');
    expect(capture).not.toHaveBeenCalled();
  });

  it('with consent on a live hostname it calls posthog.capture when that exists', async () => {
    const { trackEvent } = await import('../src/analytics.js');
    const capture = vi.fn();
    window.posthog = { capture };
    localStorage.setItem('emc-cookie-consent', 'accepted'); // not setConsent: its event would load vendors
    trackEvent('lead_submitted', { request: 'talk' }, 'emctickets.com');
    expect(capture).toHaveBeenCalledWith('lead_submitted', { request: 'talk' });
  });

  it('never throws when posthog is missing or throws', async () => {
    const { trackEvent } = await import('../src/analytics.js');
    localStorage.setItem('emc-cookie-consent', 'accepted'); // not setConsent: its event would load vendors
    expect(() => trackEvent('lead_submitted', {}, 'emctickets.com')).not.toThrow();
    window.posthog = { capture() { throw new Error('x'); } };
    expect(() => trackEvent('lead_submitted', {}, 'emctickets.com')).not.toThrow();
  });
});
