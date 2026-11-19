import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as realConfig from '../src/site-config.js';
import { getConsent, setConsent } from '../src/consent.js';

const NO_TRACKERS = { ...realConfig, POSTHOG_KEY: '', CLARITY_ID: '', LINKEDIN_PARTNER_ID: '', META_PIXEL_ID: '' };
const ONE_TRACKER = { ...NO_TRACKERS, CLARITY_ID: 'clarity_test' };

/** consent.js loaded against a given site config. */
async function consentWith(config) {
  vi.resetModules();
  vi.doMock('../src/site-config.js', () => config);
  return import('../src/consent.js');
}

beforeEach(() => {
  localStorage.clear();
  document.body.innerHTML = '';
});
afterEach(() => vi.doUnmock('../src/site-config.js'));

describe('consent state', () => {
  it('is null before any decision', () => {
    expect(getConsent()).toBeNull();
  });

  it('round-trips accepted and declined', () => {
    setConsent('accepted');
    expect(getConsent()).toBe('accepted');
    setConsent('declined');
    expect(getConsent()).toBe('declined');
  });

  it('treats garbage storage values as undecided', () => {
    localStorage.setItem('emc-cookie-consent', 'maybe');
    expect(getConsent()).toBeNull();
  });

  it('dispatches emc:consent-accepted only on accept', () => {
    const spy = vi.fn();
    document.addEventListener('emc:consent-accepted', spy);
    setConsent('declined');
    expect(spy).not.toHaveBeenCalled();
    setConsent('accepted');
    expect(spy).toHaveBeenCalledTimes(1);
    document.removeEventListener('emc:consent-accepted', spy);
  });
});

describe('banner', () => {
  it('shows no banner when no tracker ID is set', async () => {
    const { initConsentBanner } = await consentWith(NO_TRACKERS);
    expect(initConsentBanner()).toBeNull();
    expect(document.querySelector('.cookie-banner')).toBeNull();
  });

  it('shows the banner when a tracker is set and no choice is stored', async () => {
    const { initConsentBanner } = await consentWith(ONE_TRACKER);
    expect(initConsentBanner()).not.toBeNull();
    expect(document.querySelector('.cookie-banner')).not.toBeNull();
  });

  it('shows no banner once a choice is stored', async () => {
    const { initConsentBanner, setConsent: set } = await consentWith(ONE_TRACKER);
    set('declined');
    expect(initConsentBanner()).toBeNull();
    expect(document.querySelector('.cookie-banner')).toBeNull();
  });

  it('Accept stores, dispatches, and removes the banner', async () => {
    const { initConsentBanner, getConsent: get } = await consentWith(ONE_TRACKER);
    const spy = vi.fn();
    document.addEventListener('emc:consent-accepted', spy);
    initConsentBanner();
    document.querySelector('[data-consent="accepted"]').click();
    expect(get()).toBe('accepted');
    expect(spy).toHaveBeenCalledTimes(1);
    expect(document.querySelector('.cookie-banner')).toBeNull();
    document.removeEventListener('emc:consent-accepted', spy);
  });

  it('Decline stores and removes without dispatching', async () => {
    const { initConsentBanner, getConsent: get } = await consentWith(ONE_TRACKER);
    const spy = vi.fn();
    document.addEventListener('emc:consent-accepted', spy);
    initConsentBanner();
    document.querySelector('[data-consent="declined"]').click();
    expect(get()).toBe('declined');
    expect(spy).not.toHaveBeenCalled();
    expect(document.querySelector('.cookie-banner')).toBeNull();
    document.removeEventListener('emc:consent-accepted', spy);
  });

  it('links to the privacy policy at /privacy/', async () => {
    const { initConsentBanner } = await consentWith(ONE_TRACKER);
    initConsentBanner();
    expect(document.querySelector('.cookie-banner a[href="/privacy/"]')).not.toBeNull();
  });

  it('has no em dash in its text', async () => {
    const { initConsentBanner } = await consentWith(ONE_TRACKER);
    initConsentBanner();
    expect(document.querySelector('.cookie-banner').textContent).not.toContain('—');
  });
});

describe('cookie settings', () => {
  it('with no tracker, says none is in use and offers Close', async () => {
    const { openCookieSettings } = await consentWith(NO_TRACKERS);
    openCookieSettings();
    const panel = document.querySelector('.cookie-banner');
    expect(panel.textContent).toContain('This site is not using any tracking cookies right now.');
    expect(panel.querySelector('[data-consent]')).toBeNull();
    const close = [...panel.querySelectorAll('button')].find((b) => b.textContent.trim() === 'Close');
    expect(close).toBeTruthy();
    close.click();
    expect(document.querySelector('.cookie-banner')).toBeNull();
  });

  it('with a tracker, offers Accept and Decline even when a choice is stored', async () => {
    const { openCookieSettings, setConsent: set, getConsent: get } = await consentWith(ONE_TRACKER);
    set('declined');
    openCookieSettings();
    const panel = document.querySelector('.cookie-banner');
    expect(panel.querySelector('[data-consent="accepted"]')).not.toBeNull();
    expect(panel.querySelector('[data-consent="declined"]')).not.toBeNull();
    expect(panel.querySelector('a[href="/privacy/"]')).not.toBeNull();
    panel.querySelector('[data-consent="accepted"]').click();
    expect(get()).toBe('accepted');
    expect(document.querySelector('.cookie-banner')).toBeNull();
  });

  it('replaces an open banner instead of stacking a second one', async () => {
    const { initConsentBanner, openCookieSettings } = await consentWith(ONE_TRACKER);
    initConsentBanner();
    openCookieSettings();
    expect(document.querySelectorAll('.cookie-banner')).toHaveLength(1);
  });

  it('moves focus into the panel so keyboard users land on it', async () => {
    const { openCookieSettings } = await consentWith(NO_TRACKERS);
    openCookieSettings();
    expect(document.querySelector('.cookie-banner').contains(document.activeElement)).toBe(true);
  });
});
