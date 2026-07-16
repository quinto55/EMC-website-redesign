import { describe, it, expect, vi } from 'vitest';
import { shouldPlayIntro, buildIntroTimeline, wireIntroSkip } from '../src/intro.js';

describe('shouldPlayIntro', () => {
  it('plays only when motion is allowed and intro is unseen', () => {
    expect(shouldPlayIntro({ reduced: false, seen: false })).toBe(true);
    expect(shouldPlayIntro({ reduced: true, seen: false })).toBe(false);
    expect(shouldPlayIntro({ reduced: false, seen: true })).toBe(false);
    expect(shouldPlayIntro({ reduced: true, seen: true })).toBe(false);
  });
});

function fakeGsap() {
  const calls = [];
  const tl = {
    fromTo: (...a) => { calls.push(['fromTo', ...a]); return tl; },
    to: (...a) => { calls.push(['to', ...a]); return tl; },
    progress: vi.fn(() => tl),
  };
  return {
    calls,
    timeline: vi.fn((opts) => { tl.opts = opts; return tl; }),
    set: vi.fn(),
  };
}

describe('buildIntroTimeline', () => {
  it('builds the four-phase timeline and wires completion', () => {
    const g = fakeGsap();
    const els = {
      root: {}, stage: {}, letters: {}, underline: {}, eyebrow: {}, heroItems: [{}],
    };
    const onDone = vi.fn();
    const tl = buildIntroTimeline(g, els, onDone);
    expect(g.timeline).toHaveBeenCalledOnce();
    expect(g.timeline.mock.calls[0][0].onComplete).toBe(onDone);
    // letters scale to 8 at the 1.6s handoff
    const scaleUp = g.calls.find(
      (c) => c[0] === 'to' && c[1] === els.letters && c[2].scale === 8
    );
    expect(scaleUp).toBeTruthy();
    expect(scaleUp[3]).toBe(1.6);
    // hero content staggers in at 2.2s
    const heroIn = g.calls.find((c) => c[0] === 'fromTo' && c[1] === els.heroItems);
    expect(heroIn[3].stagger).toBe(0.08);
    expect(heroIn[4]).toBe(2.2);
    expect(tl).toBeTruthy();
  });
});

describe('wireIntroSkip', () => {
  it('fires once for the first skip event then disposes', () => {
    const onSkip = vi.fn();
    wireIntroSkip(window, onSkip);
    window.dispatchEvent(new Event('wheel'));
    window.dispatchEvent(new Event('pointerdown'));
    window.dispatchEvent(new Event('keydown'));
    expect(onSkip).toHaveBeenCalledTimes(1);
  });

  it('returns a dispose that prevents any firing', () => {
    const onSkip = vi.fn();
    const dispose = wireIntroSkip(window, onSkip);
    dispose();
    window.dispatchEvent(new Event('pointerdown'));
    expect(onSkip).not.toHaveBeenCalled();
  });
});
