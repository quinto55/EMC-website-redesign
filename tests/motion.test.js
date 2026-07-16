import { describe, it, expect } from 'vitest';
import {
  prefersReducedMotion,
  hasSeenIntro,
  markIntroSeen,
  INTRO_SEEN_KEY,
} from '../src/motion.js';

function fakeStorage(initial = {}) {
  const map = { ...initial };
  return {
    getItem: (k) => (k in map ? map[k] : null),
    setItem: (k, v) => { map[k] = String(v); },
  };
}

describe('prefersReducedMotion', () => {
  it('reads the reduce media query', () => {
    const mq = (q) => ({ matches: q === '(prefers-reduced-motion: reduce)' });
    expect(prefersReducedMotion(mq)).toBe(true);
    expect(prefersReducedMotion(() => ({ matches: false }))).toBe(false);
  });
});

describe('session gate', () => {
  it('is unseen on fresh storage', () => {
    expect(hasSeenIntro(fakeStorage())).toBe(false);
  });

  it('is seen after markIntroSeen', () => {
    const s = fakeStorage();
    markIntroSeen(s);
    expect(s.getItem(INTRO_SEEN_KEY)).toBe('1');
    expect(hasSeenIntro(s)).toBe(true);
  });

  it('treats a throwing storage as already seen (fail-safe: no intro)', () => {
    const broken = {
      getItem: () => { throw new Error('denied'); },
      setItem: () => { throw new Error('denied'); },
    };
    expect(hasSeenIntro(broken)).toBe(true);
    expect(() => markIntroSeen(broken)).not.toThrow();
  });
});
