import { describe, it, expect } from 'vitest';
import {
  frameIndexFor,
  nearestLoaded,
  coverRect,
  beatRangesFrom,
  initFlightScrub,
} from '../src/flight-scrub.js';

describe('frameIndexFor', () => {
  it('maps progress across the frame range with clamping', () => {
    expect(frameIndexFor(0, 200)).toBe(0);
    expect(frameIndexFor(0.5, 200)).toBe(100);
    expect(frameIndexFor(1, 200)).toBe(199);
    expect(frameIndexFor(-0.5, 200)).toBe(0);
    expect(frameIndexFor(1.5, 200)).toBe(199);
  });
});

describe('nearestLoaded', () => {
  const flags = [false, true, false, false, true, false];
  it('returns the index itself when loaded', () => {
    expect(nearestLoaded(4, flags)).toBe(4);
  });
  it('falls back to the nearest loaded neighbour', () => {
    expect(nearestLoaded(2, flags)).toBe(1);
    expect(nearestLoaded(5, flags)).toBe(4);
  });
  it('returns -1 when nothing is loaded', () => {
    expect(nearestLoaded(1, [false, false])).toBe(-1);
  });
});

describe('coverRect', () => {
  it('covers a wide canvas with a tall image by width', () => {
    const r = coverRect(200, 100, 100, 100);
    expect(r.w).toBe(200);
    expect(r.h).toBe(200);
    expect(r.x).toBe(0);
    expect(r.y).toBe(-50);
  });
  it('is identity when aspect matches', () => {
    expect(coverRect(160, 90, 1280, 720)).toEqual({ x: 0, y: 0, w: 160, h: 90 });
  });
});

describe('beatRangesFrom', () => {
  it('parses data-start/data-end from beat elements', () => {
    document.body.innerHTML = `
      <div class="flight__beat" data-start="0" data-end="0.08"></div>
      <div class="flight__beat" data-start="0.85" data-end="1"></div>`;
    const beats = beatRangesFrom(document.querySelectorAll('.flight__beat'));
    expect(beats).toHaveLength(2);
    expect(beats[0].start).toBe(0);
    expect(beats[0].end).toBe(0.08);
    expect(beats[1].end).toBe(1);
  });
});

describe('initFlightScrub reduced-motion branch', () => {
  it('renders the static state without fetch or GSAP', async () => {
    document.body.innerHTML = `
      <section class="flight" data-flight>
        <div class="flight__beat" data-start="0" data-end="0.08"></div>
        <div class="flight__beat" data-start="0.85" data-end="1"></div>
      </section>`;
    await initFlightScrub({ reduced: true, gsap: null, ScrollTrigger: null });
    const stage = document.querySelector('[data-flight]');
    expect(stage.classList.contains('flight--static')).toBe(true);
    const beats = [...document.querySelectorAll('.flight__beat')];
    expect(beats.every((b) => b.classList.contains('is-active'))).toBe(true);
  });
});
