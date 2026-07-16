import { describe, it, expect } from 'vitest';
import { pointerVars } from '../src/hotspot.js';

describe('pointerVars', () => {
  const rect = { left: 100, top: 50, width: 200, height: 100 };

  it('maps the pointer to percentage coordinates inside the card', () => {
    expect(pointerVars(rect, 100, 50)).toEqual({ x: 0, y: 0 });
    expect(pointerVars(rect, 200, 100)).toEqual({ x: 50, y: 50 });
    expect(pointerVars(rect, 300, 150)).toEqual({ x: 100, y: 100 });
  });

  it('does not clamp — the glow may trail just outside during exit', () => {
    expect(pointerVars(rect, 320, 160).x).toBeGreaterThan(100);
  });
});
