import { describe, it, expect } from 'vitest';
import { markVisible } from '../src/reveals.js';

describe('markVisible', () => {
  it('toggles is-visible on intersecting entries', () => {
    document.body.innerHTML = `
      <div data-reveal id="a"></div>
      <div data-reveal id="b"></div>
    `;
    const a = document.getElementById('a');
    const b = document.getElementById('b');
    markVisible([
      { target: a, isIntersecting: true },
      { target: b, isIntersecting: false },
    ]);
    expect(a.classList.contains('is-visible')).toBe(true);
    expect(b.classList.contains('is-visible')).toBe(false);
  });
});
