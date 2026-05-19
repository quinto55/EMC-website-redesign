import { describe, it, expect } from 'vitest';
import { easeOutCubic, computeFrameValue } from '../src/count-up.js';

describe('easeOutCubic', () => {
  it('is 0 at t=0', () => expect(easeOutCubic(0)).toBe(0));
  it('is 1 at t=1', () => expect(easeOutCubic(1)).toBe(1));
  it('is monotonic-increasing between 0 and 1', () => {
    expect(easeOutCubic(0.5)).toBeGreaterThan(easeOutCubic(0.25));
    expect(easeOutCubic(0.75)).toBeGreaterThan(easeOutCubic(0.5));
  });
});

describe('computeFrameValue', () => {
  it('returns target at full progress', () => {
    expect(computeFrameValue(0, 40, 1)).toBe(40);
  });
  it('returns start at zero progress', () => {
    expect(computeFrameValue(0, 40, 0)).toBe(0);
  });
  it('returns an integer mid-flight', () => {
    const v = computeFrameValue(0, 40, 0.5);
    expect(Number.isInteger(v)).toBe(true);
    expect(v).toBeGreaterThan(0);
    expect(v).toBeLessThan(40);
  });
});
