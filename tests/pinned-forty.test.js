import { describe, it, expect } from 'vitest';
import { scrubToCount, captionIndex, applyFortyProgress, initPinnedForty } from '../src/pinned-forty.js';

describe('scrubToCount', () => {
  it('maps scroll progress to 0..40', () => {
    expect(scrubToCount(0)).toBe(0);
    expect(scrubToCount(0.5)).toBe(20);
    expect(scrubToCount(1)).toBe(40);
  });

  it('clamps out-of-range progress', () => {
    expect(scrubToCount(-0.2)).toBe(0);
    expect(scrubToCount(1.7)).toBe(40);
  });
});

describe('captionIndex', () => {
  it('cycles four captions across progress quarters', () => {
    expect(captionIndex(0)).toBe(0);
    expect(captionIndex(0.24)).toBe(0);
    expect(captionIndex(0.26)).toBe(1);
    expect(captionIndex(0.51)).toBe(2);
    expect(captionIndex(0.76)).toBe(3);
    expect(captionIndex(1)).toBe(3);
  });
});

describe('applyFortyProgress', () => {
  it('writes the count and activates exactly one caption', () => {
    document.body.innerHTML = `
      <div id="d">0</div>
      <p class="forty__caption">a</p><p class="forty__caption">b</p>
      <p class="forty__caption">c</p><p class="forty__caption">d</p>`;
    const digits = document.getElementById('d');
    const captions = [...document.querySelectorAll('.forty__caption')];
    applyFortyProgress(0.6, digits, captions);
    expect(digits.textContent).toBe('24');
    expect(captions.map((c) => c.classList.contains('is-active'))).toEqual([
      false, false, true, false,
    ]);
  });
});

describe('initPinnedForty reduced-motion branch', () => {
  it('renders the final static state without touching GSAP', () => {
    document.body.innerHTML = `
      <div data-forty>
        <div class="forty__digits">0</div>
        <p class="forty__caption">a</p><p class="forty__caption">b</p>
      </div>`;
    initPinnedForty({ reduced: true, gsap: null, ScrollTrigger: null });
    expect(document.querySelector('.forty__digits').textContent).toBe('40');
    const captions = [...document.querySelectorAll('.forty__caption')];
    expect(captions.every((c) => c.classList.contains('is-active'))).toBe(true);
  });
});
