import { describe, it, expect } from 'vitest';
import { prefersReducedMotion } from '../src/motion.js';

describe('prefersReducedMotion', () => {
  it('reads the reduce media query', () => {
    const mq = (q) => ({ matches: q === '(prefers-reduced-motion: reduce)' });
    expect(prefersReducedMotion(mq)).toBe(true);
    expect(prefersReducedMotion(() => ({ matches: false }))).toBe(false);
  });
});
