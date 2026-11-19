import { describe, it, expect, vi } from 'vitest';
import { captureUtm, readUtm } from '../src/form/utm.js';

function fakeStorage() {
  const m = new Map();
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)) };
}
const EMPTY = { utm_source: '', utm_medium: '', utm_campaign: '', utm_content: '' };

describe('campaign tags', () => {
  it('stores the four tags from the first page view', () => {
    const s = fakeStorage();
    captureUtm('?utm_source=iafe&utm_medium=handout&utm_campaign=iafe2026&utm_content=walgreens-card', s);
    expect(readUtm(s)).toEqual({ utm_source: 'iafe', utm_medium: 'handout', utm_campaign: 'iafe2026', utm_content: 'walgreens-card' });
  });

  it('does not overwrite them on a later page view', () => {
    const s = fakeStorage();
    captureUtm('?utm_source=iafe', s);
    captureUtm('?utm_source=other', s);
    expect(readUtm(s).utm_source).toBe('iafe');
  });

  it('returns empty strings when there are none', () => {
    const s = fakeStorage();
    captureUtm('', s);
    expect(readUtm(s)).toEqual(EMPTY);
  });

  it('keeps only letters, digits, dot, dash and underscore, 80 characters at most', () => {
    const s = fakeStorage();
    captureUtm('?utm_source=' + encodeURIComponent('<b>x</b>') + '&utm_campaign=' + 'a'.repeat(200), s);
    expect(readUtm(s).utm_source).toBe('bxb');
    expect(readUtm(s).utm_campaign).toHaveLength(80);
  });

  it('survives storage that throws', () => {
    const bad = { getItem() { throw new Error('no'); }, setItem() { throw new Error('no'); } };
    expect(() => captureUtm('?utm_source=zz', bad)).not.toThrow();
    expect(() => readUtm(bad)).not.toThrow();
  });
});

describe('when reading sessionStorage itself throws', () => {
  it('captureUtm and readUtm with no storage argument do not throw and keep the tags in memory', async () => {
    vi.resetModules(); // a fresh module, so the in-memory copy starts empty
    const { captureUtm, readUtm } = await import('../src/form/utm.js');
    const real = Object.getOwnPropertyDescriptor(globalThis, 'sessionStorage');
    Object.defineProperty(globalThis, 'sessionStorage', { configurable: true, get() { throw new Error('SecurityError'); } });
    try {
      expect(() => captureUtm('?utm_source=blocked')).not.toThrow();
      expect(() => readUtm()).not.toThrow();
      expect(readUtm().utm_source).toBe('blocked');
    } finally {
      if (real) Object.defineProperty(globalThis, 'sessionStorage', real);
      else delete globalThis.sessionStorage;
    }
  });
});
