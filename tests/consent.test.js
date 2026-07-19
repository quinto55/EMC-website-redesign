import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getConsent, setConsent, initConsentBanner } from '../src/consent.js';

beforeEach(() => {
  localStorage.clear();
  document.body.innerHTML = '';
});

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
  });
});

describe('banner', () => {
  it('renders only when undecided', () => {
    initConsentBanner();
    expect(document.querySelector('.cookie-banner')).not.toBeNull();
    document.body.innerHTML = '';
    setConsent('declined');
    expect(initConsentBanner()).toBeNull();
    expect(document.querySelector('.cookie-banner')).toBeNull();
  });

  it('Accept stores, dispatches, and removes the banner', () => {
    const spy = vi.fn();
    document.addEventListener('emc:consent-accepted', spy);
    initConsentBanner();
    document.querySelector('[data-consent="accepted"]').click();
    expect(getConsent()).toBe('accepted');
    expect(spy).toHaveBeenCalledTimes(1);
    expect(document.querySelector('.cookie-banner')).toBeNull();
  });

  it('Decline stores and removes without dispatching', () => {
    const spy = vi.fn();
    document.addEventListener('emc:consent-accepted', spy);
    initConsentBanner();
    document.querySelector('[data-consent="declined"]').click();
    expect(getConsent()).toBe('declined');
    expect(spy).not.toHaveBeenCalled();
    expect(document.querySelector('.cookie-banner')).toBeNull();
  });

  it('links to the privacy policy', () => {
    initConsentBanner();
    expect(document.querySelector('.cookie-banner a[href="/privacy.html"]')).not.toBeNull();
  });
});
