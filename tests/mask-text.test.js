import { describe, it, expect } from 'vitest';
import { positionMaskText, introFontSize, fortyFontSize } from '../src/mask-text.js';

describe('positionMaskText', () => {
  it('centers the text element and applies font size', () => {
    const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    positionMaskText(text, 1200, 800, 300);
    expect(text.getAttribute('x')).toBe('600');
    expect(text.getAttribute('y')).toBe('400');
    expect(text.style.fontSize).toBe('300px');
  });
});

describe('font sizing', () => {
  it('intro letters scale with viewport width, capped by height', () => {
    expect(introFontSize(1000, 1000)).toBe(280); // 0.28 * width
    expect(introFontSize(2000, 500)).toBe(250);  // capped at 0.5 * height
  });

  it('forty digits fill 70% of stage height', () => {
    expect(fortyFontSize(1200, 700)).toBe(490);
  });
});
