import { describe, it, expect } from 'vitest';
import { EMBER_COUNT, createEmber, stepEmber, emberAlpha } from '../src/particles.js';

describe('createEmber', () => {
  it('spawns inside the sky band with upward drift', () => {
    const p = createEmber(() => 0.5);
    expect(p.x).toBe(0.5);
    expect(p.y).toBeLessThanOrEqual(0.85);
    expect(p.vy).toBeLessThan(0); // drifts upward
    expect(p.r).toBeGreaterThan(0);
  });

  it('exposes the spec count', () => {
    expect(EMBER_COUNT).toBe(40);
  });
});

describe('stepEmber', () => {
  it('advances position by velocity * dt', () => {
    const p = { x: 0.5, y: 0.5, vx: 0.1, vy: -0.1, phase: 0, twinkle: 3, r: 1 };
    stepEmber(p, 0.1);
    expect(p.x).toBeCloseTo(0.51);
    expect(p.y).toBeCloseTo(0.49);
    expect(p.phase).toBeCloseTo(0.1 / 3);
  });

  it('wraps vertically and horizontally', () => {
    const up = { x: 0.5, y: -0.03, vx: 0, vy: 0, phase: 0, twinkle: 3, r: 1 };
    stepEmber(up, 0);
    expect(up.y).toBe(1.02);
    const right = { x: 1.03, y: 0.5, vx: 0, vy: 0, phase: 0, twinkle: 3, r: 1 };
    stepEmber(right, 0);
    expect(right.x).toBe(-0.02);
  });
});

describe('emberAlpha', () => {
  it('stays within the visible twinkle band', () => {
    for (const phase of [0, 0.25, 0.5, 0.75, 1, 2.3]) {
      const a = emberAlpha({ phase });
      expect(a).toBeGreaterThanOrEqual(0.25);
      expect(a).toBeLessThanOrEqual(0.8);
    }
  });
});
