import { describe, it, expect } from 'vitest';
import { magneticOffset } from '../src/magnetic.js';

describe('magneticOffset', () => {
  // Button: 100x40 centered at (200, 100)
  const rect = { left: 150, top: 80, width: 100, height: 40 };

  it('returns zero offset at the button center', () => {
    expect(magneticOffset(rect, 200, 100)).toEqual({ x: 0, y: 0 });
  });

  it('pulls toward the pointer inside the field', () => {
    const o = magneticOffset(rect, 240, 110);
    expect(o.x).toBeGreaterThan(0);
    expect(o.y).toBeGreaterThan(0);
    expect(o.x).toBeLessThanOrEqual(8);
    expect(o.y).toBeLessThanOrEqual(8);
  });

  it('never exceeds the max shift', () => {
    const o = magneticOffset(rect, 259, 139); // near the field edge
    expect(Math.abs(o.x)).toBeLessThanOrEqual(8);
    expect(Math.abs(o.y)).toBeLessThanOrEqual(8);
  });

  it('returns null beyond the 60px radius', () => {
    expect(magneticOffset(rect, 400, 100)).toBeNull(); // 150px past right edge
    expect(magneticOffset(rect, 200, 250)).toBeNull(); // 130px below bottom edge
  });

  it('honors custom radius and shift', () => {
    expect(magneticOffset(rect, 320, 100, { radius: 10, maxShift: 4 })).toBeNull();
    const o = magneticOffset(rect, 210, 100, { radius: 10, maxShift: 4 });
    expect(Math.abs(o.x)).toBeLessThanOrEqual(4);
  });
});
