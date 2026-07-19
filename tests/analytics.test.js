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

beforeEach(() => {
  localStorage.clear();
  document.head.querySelectorAll('script[src]').forEach((s) => s.remove());
  delete window.fbq; delete window._fbq; delete window.posthog;
  delete window.clarity; delete window._linkedin_partner_id;
  vi.resetModules();
});
afterEach(() => vi.doUnmock('../src/site-config.js'));

describe('with real (empty) config — installed dark', () => {
  it('injects nothing even with consent on prod host', async () => {
    const { setConsent } = await import('../src/consent.js');
    const { loadVendors } = await import('../src/analytics.js');
    setConsent('accepted');
    loadVendors(document);
    expect(scriptSrcs()).toEqual([]);
  });
});

describe('with test IDs', () => {
  beforeEach(() => vi.doMock('../src/site-config.js', () => IDS));

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
});
