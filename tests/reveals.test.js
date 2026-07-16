import { describe, it, expect, vi } from 'vitest';
import { markVisible, revealBatch, REVEAL_TWEEN } from '../src/reveals.js';

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

describe('revealBatch', () => {
  it('tweens targets from hidden to visible with a 60ms stagger', () => {
    document.body.innerHTML = '<div data-reveal id="a"></div><div data-reveal id="b"></div>';
    const targets = [document.getElementById('a'), document.getElementById('b')];
    const gsap = { fromTo: vi.fn() };
    revealBatch(gsap, targets);
    expect(gsap.fromTo).toHaveBeenCalledOnce();
    const [passed, from, to] = gsap.fromTo.mock.calls[0];
    expect(passed).toBe(targets);
    expect(from).toEqual(REVEAL_TWEEN.from);
    expect(to.stagger).toBe(0.06);
    // class still applied so CSS state machines stay coherent
    expect(targets[0].classList.contains('is-visible')).toBe(true);
    expect(targets[1].classList.contains('is-visible')).toBe(true);
  });

  it('does nothing for an empty batch', () => {
    const gsap = { fromTo: vi.fn() };
    revealBatch(gsap, []);
    expect(gsap.fromTo).not.toHaveBeenCalled();
  });
});
