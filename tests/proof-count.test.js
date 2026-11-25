import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { renderAll, ROOT } from './helpers/pages.js';
import { countFrames, initProofCount } from '../src/proof-count.js';

// The proof strip exactly as the home page serves it (renderAll leaves the scripts out).
const served = renderAll().find((r) => r.page.key === 'home').doc;
const STRIP = served.querySelector('.proof').outerHTML;

const text = (el) => el.textContent.replace(/\s+/g, ' ').trim();
/** What a screen reader gets: the text minus every aria-hidden subtree. */
const spoken = (el) => {
  const copy = el.cloneNode(true);
  copy.querySelectorAll('[aria-hidden="true"]').forEach((n) => n.remove());
  return text(copy);
};

let frames;
let frameId;
let clock;
let reduced;
let observers;
const realRaf = globalThis.requestAnimationFrame;
const realCaf = globalThis.cancelAnimationFrame;
const realMatch = globalThis.matchMedia;
const realIO = globalThis.IntersectionObserver;

/** An IntersectionObserver the test drives: view(ratio) reports how much of the strip is on screen. */
class FakeIO {
  constructor(cb, options) {
    this.cb = cb;
    this.options = options;
    this.els = [];
    observers.push(this);
  }
  observe(el) { this.els.push(el); }
  unobserve(el) { this.els = this.els.filter((e) => e !== el); }
  disconnect() { this.els = []; }
}
const view = (ratio) => {
  for (const o of observers) {
    for (const el of o.els) o.cb([{ target: el, isIntersecting: ratio > 0, intersectionRatio: ratio }], o);
  }
};
/** One animation frame: the page clock and the timers move on together, then the waiting frame callbacks run. */
const frame = (ms = 1000 / 60) => {
  clock += ms;
  vi.advanceTimersByTime(ms);
  const due = [...frames.values()];
  frames.clear();
  for (const cb of due) cb(clock);
};
const setHidden = (hidden) => {
  Object.defineProperty(document, 'hidden', { configurable: true, get: () => hidden });
  document.dispatchEvent(new Event('visibilitychange'));
};

const strip = () => document.querySelector('.proof');
const digits = () => document.querySelector('.proof [data-count-to]');
const armed = () => strip().classList.contains('is-armed');
/** The strip shows its final state: 40 in the figures, nothing hidden, no animation class left on it. */
const expectFinal = () => {
  expect(digits().textContent).toBe('40');
  expect(text(strip().querySelector('.yrs-num'))).toBe('40+');
  expect(strip().classList.contains('is-armed')).toBe(false);
  expect(strip().classList.contains('is-counted')).toBe(false);
};
const mount = (opts = {}) => {
  document.body.innerHTML = STRIP;
  return initProofCount(document, { reducedMotion: reduced, now: () => clock, ...opts });
};

beforeEach(() => {
  vi.useFakeTimers();
  frames = new Map();
  frameId = 0;
  clock = 1000;
  reduced = false;
  observers = [];
  globalThis.requestAnimationFrame = (cb) => { frames.set(++frameId, cb); return frameId; };
  globalThis.cancelAnimationFrame = (id) => { frames.delete(id); };
  globalThis.matchMedia = (q) => ({ matches: q.includes('prefers-reduced-motion') ? reduced : false, media: q, addEventListener() {}, removeEventListener() {} });
  globalThis.IntersectionObserver = FakeIO;
});
afterEach(() => {
  vi.useRealTimers();
  delete document.hidden;
  document.body.innerHTML = '';
  globalThis.requestAnimationFrame = realRaf;
  globalThis.cancelAnimationFrame = realCaf;
  globalThis.matchMedia = realMatch;
  globalThis.IntersectionObserver = realIO;
});

describe('countFrames', () => {
  it('counts from 0 to the target without ever passing it', () => {
    const f = countFrames(40, 72);
    expect(f[0]).toBe(0);
    expect(f.at(-1)).toBe(40);
    expect(f).toHaveLength(72);
    for (let i = 1; i < f.length; i++) {
      expect(f[i]).toBeGreaterThanOrEqual(f[i - 1]);
      expect(f[i]).toBeLessThanOrEqual(40);
    }
    expect(Number.isInteger(f[30])).toBe(true);
  });

  it('a single step goes straight to the target', () => {
    expect(countFrames(40, 1)).toEqual([40]);
  });

  it('eases out: fast at first, and each of the last few numbers holds longer than the one before', () => {
    const f = countFrames(40, 72);
    expect(f[Math.floor(f.length / 4)]).toBeGreaterThanOrEqual(20); // half the count in the first quarter
    const held = (n) => f.filter((v) => v === n).length;
    expect(held(37)).toBeGreaterThanOrEqual(4); // about 70 ms at 60 frames a second, long enough to read
    expect(held(38)).toBeGreaterThan(held(37));
    expect(held(39)).toBeGreaterThan(held(38));
  });
});

describe('the proof strip as served', () => {
  it('as served, the strip reads 40+ and nothing is hidden', () => {
    const proof = served.querySelector('.proof');
    expect(text(proof.querySelector('.yrs-num'))).toBe('40+');
    expect(text(proof)).toContain('years in the industry');
    for (const el of [proof, ...proof.querySelectorAll('*')]) {
      expect(el.hasAttribute('hidden'), el.outerHTML).toBe(false);
      expect(el.getAttribute('style') ?? '', el.outerHTML).not.toMatch(/opacity:\s*0|visibility:\s*hidden|display:\s*none/);
      expect(el.className, el.outerHTML).not.toMatch(/armed|counted/);
    }
  });

  it('a screen reader gets "40+" once: the animated digits are aria-hidden beside a visually hidden 40+', () => {
    const proof = served.querySelector('.proof');
    const yrs = proof.querySelector('.yrs');
    const figures = yrs.querySelector('[data-count-to]');
    expect(figures.closest('[aria-hidden="true"]')).not.toBeNull();
    expect(figures.closest('[aria-hidden="true"]').textContent).toBe('40+');
    const label = [...yrs.querySelectorAll('.visually-hidden')];
    expect(label.map(text)).toEqual(['40+']);
    expect(spoken(yrs)).toBe('40+ years in the industry');
    expect(proof.querySelector('[aria-live]')).toBeNull();
  });
});

describe('the reveal order (home.css)', () => {
  const css = readFileSync(resolve(ROOT, 'src/styles/home.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/\s+/g, ' ');
  const decls = (selector) => [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)]
    .filter(([, sel]) => sel.split(',').map((s) => s.trim()).includes(selector))
    .map(([, , d]) => d)
    .join('; ');
  /** [duration, delay] in seconds of the one animation a rule runs. */
  const timing = (selector) => {
    const anim = decls(selector).match(/animation: ?([^;]+)/)?.[1] ?? '';
    return [...anim.matchAll(/([\d.]+)s\b/g)].map((m) => Number(m[1]));
  };

  it('the logos fade in while the number counts, so the card is never just the number', () => {
    const [logosFor, logosAfter] = timing('.proof.is-armed .logos');
    expect(logosAfter).toBeGreaterThan(0);
    expect(logosAfter).toBeLessThanOrEqual(0.35);
    // fully in well before the count (1.2 s) lands
    expect(logosAfter + logosFor).toBeLessThanOrEqual(0.9);
  });

  it('"years in the industry" comes last, after the number lands, as the punchline', () => {
    expect(decls('.proof.is-armed .yrs-words')).toMatch(/opacity: 0/);
    expect(decls('.proof.is-armed .yrs-words')).not.toMatch(/animation/);
    expect(decls('.proof.is-counted .yrs-words')).toMatch(/transition:/);
  });
});

describe('initProofCount', () => {
  it('with reduced motion it shows the final state at once and never arms', () => {
    reduced = true;
    mount({ reducedMotion: undefined }); // read from the visitor's setting
    expectFinal();
    view(1);
    for (let i = 0; i < 200; i++) frame();
    expect(armed()).toBe(false);
    expectFinal();
  });

  it('with no IntersectionObserver it shows the final state at once', () => {
    delete globalThis.IntersectionObserver;
    mount();
    expectFinal();
    vi.advanceTimersByTime(5000);
    expect(frames.size).toBe(0);
    expectFinal();
  });

  it('waits until at least 60% of the strip is on screen', () => {
    mount();
    expect(observers).toHaveLength(1);
    expect([].concat(observers[0].options.threshold)).toContain(0.6);
    view(0.3); // the top of the strip shows at load: it stays in its final state
    vi.advanceTimersByTime(5000);
    expect(armed()).toBe(false);
    expectFinal();
    view(0.59);
    expect(armed()).toBe(false);
    view(0.6); // scrolled into view: arms and starts in the same task
    expect(armed()).toBe(true);
    expect(digits().textContent).toBe('0');
    expect(frames.size).toBe(1);
  });

  it('plays once when the strip comes into view and ends on exactly 40', () => {
    mount();
    view(0.2);
    view(1);
    expect(armed()).toBe(true);
    const seen = [Number(digits().textContent)];
    let n = 0;
    while (!strip().classList.contains('is-counted') && n++ < 500) {
      frame();
      seen.push(Number(digits().textContent));
    }
    // about 1.2 s of counting, never past 40 and never backwards, landing on 40 before the "+" comes
    expect(n).toBeGreaterThanOrEqual(70);
    expect(n).toBeLessThanOrEqual(75);
    for (let i = 1; i < seen.length; i++) {
      expect(seen[i]).toBeGreaterThanOrEqual(seen[i - 1]);
      expect(seen[i]).toBeLessThanOrEqual(40);
    }
    expect(new Set(seen).size).toBeGreaterThan(20);
    expect(seen.at(-1)).toBe(40);
    expect(armed()).toBe(true);
    expect(frames.size).toBe(0);
    expect(strip().classList.contains('is-done')).toBe(false);
    // then the "+", the marker and the words run (CSS), and the strip settles in its final state, all within 2.5 s
    let m = 0;
    while (!strip().classList.contains('is-done') && m++ < 500) frame();
    expect(m * (1000 / 60)).toBeGreaterThanOrEqual(650); // the words' rise ends 0.7 s after the number lands
    expect((n + m) * (1000 / 60)).toBeLessThanOrEqual(2100);
    expectFinal();
  });

  it('a strip already on screen at load plays after 300 ms', () => {
    mount();
    view(1); // the first report, at load
    expect(armed()).toBe(false);
    vi.advanceTimersByTime(299);
    expect(armed()).toBe(false);
    vi.advanceTimersByTime(1);
    expect(armed()).toBe(true);
    expect(digits().textContent).toBe('0');
  });

  it('does not play again when the strip leaves and re-enters the screen', () => {
    mount();
    view(0);
    view(1);
    for (let i = 0; i < 20; i++) frame();
    view(0); // leaves while counting: the count carries on to 40
    view(1);
    for (let i = 0; i < 200; i++) frame();
    expectFinal();
    expect(strip().classList.contains('is-done')).toBe(true);
    view(0);
    view(1);
    vi.advanceTimersByTime(5000);
    expect(armed()).toBe(false);
    expect(frames.size).toBe(0);
    expectFinal();
  });

  it('finishes on 40 if the tab is hidden while counting', () => {
    mount();
    view(0);
    view(1);
    for (let i = 0; i < 10; i++) frame();
    expect(Number(digits().textContent)).toBeLessThan(40);
    setHidden(true);
    expectFinal();
    expect(frames.size).toBe(0);
    setHidden(false);
    vi.advanceTimersByTime(5000);
    expectFinal();
  });

  it('the safety timer forces the final state 2.5 s after arming, even if no frame ever arrives', () => {
    // A strip that never reports being in view is never armed, so nothing in it is ever hidden.
    mount();
    view(0.1);
    vi.advanceTimersByTime(10000);
    expect(armed()).toBe(false);
    expectFinal();

    // Armed, and then the frames stall: 2.5 s after arming it shows the final state anyway.
    view(1);
    expect(armed()).toBe(true);
    vi.advanceTimersByTime(2499);
    expect(armed()).toBe(true);
    vi.advanceTimersByTime(1);
    expectFinal();
    expect(strip().classList.contains('is-done')).toBe(true);
    expect(frames.size).toBe(0);
  });

  it('the screen reader text stays "40+ years in the industry" while the figures count', () => {
    mount();
    view(0);
    view(1);
    for (let i = 0; i < 15; i++) frame();
    expect(Number(digits().textContent)).toBeLessThan(40);
    expect(spoken(strip().querySelector('.yrs'))).toBe('40+ years in the industry');
  });

  it('destroy() cancels frames, timers and the observer and leaves the final state', () => {
    const counter = mount();
    view(0);
    view(1);
    for (let i = 0; i < 10; i++) frame();
    counter.destroy();
    expectFinal();
    expect(frames.size).toBe(0);
    expect(vi.getTimerCount()).toBe(0);
    expect(observers[0].els).toHaveLength(0);
    setHidden(true);
    view(1);
    vi.advanceTimersByTime(5000);
    expectFinal();

    // destroyed before it ever played: the observer goes and nothing is armed later
    setHidden(false);
    const waiting = mount();
    view(1); // at load: the 300 ms wait starts
    waiting.destroy();
    vi.advanceTimersByTime(1000);
    expect(armed()).toBe(false);
    expect(vi.getTimerCount()).toBe(0);
    expectFinal();
  });

  it('a late observer callback after the strip has finished cannot replay or re-arm it', () => {
    mount();
    view(0);
    view(1);
    for (let i = 0; i < 200; i++) frame();
    expect(strip().classList.contains('is-done')).toBe(true);
    // a callback queued before the disconnect still arrives: the first one waits 300 ms, a later one plays at once
    const late = observers[0].cb;
    late([{ target: strip(), isIntersecting: true, intersectionRatio: 1 }], observers[0]);
    late([{ target: strip(), isIntersecting: true, intersectionRatio: 1 }], observers[0]);
    vi.advanceTimersByTime(5000);
    expect(armed()).toBe(false);
    expect(frames.size).toBe(0);
    expectFinal();
  });

  it('a late callback after destroy() cannot arm the strip', () => {
    const counter = mount();
    const cb = observers[0].cb;
    cb([{ target: strip(), isIntersecting: true, intersectionRatio: 1 }], observers[0]); // the 300 ms wait starts
    counter.destroy();
    cb([{ target: strip(), isIntersecting: true, intersectionRatio: 1 }], observers[0]);
    vi.advanceTimersByTime(5000);
    expect(armed()).toBe(false);
    expect(frames.size).toBe(0);
    expectFinal();
  });

  it('a throw after arming finishes at once, without waiting for the safety timer', () => {
    mount();
    view(0);
    const orig = globalThis.requestAnimationFrame;
    globalThis.requestAnimationFrame = () => { throw new Error('no frames today'); };
    expect(() => view(1)).not.toThrow();
    globalThis.requestAnimationFrame = orig;
    expectFinal();
    expect(strip().classList.contains('is-done')).toBe(true);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('a throw while counting finishes at once as well', () => {
    let broken = false;
    mount({ now: () => { if (broken) throw new Error('clock failed'); return clock; } });
    view(0);
    view(1);
    for (let i = 0; i < 5; i++) frame();
    expect(armed()).toBe(true);
    broken = true;
    expect(() => frame()).not.toThrow();
    expectFinal();
    expect(strip().classList.contains('is-done')).toBe(true);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('a data-count-to that is not a number leaves the served digits alone', () => {
    document.body.innerHTML = STRIP.replace(/data-count-to="[^"]*"/, 'data-count-to="forty"');
    const counter = initProofCount(document, { reducedMotion: false, now: () => clock });
    view(1);
    vi.advanceTimersByTime(5000);
    expect(digits().textContent).toBe('40');
    expect(digits().textContent).not.toContain('NaN');
    expect(armed()).toBe(false);
    expect(frames.size).toBe(0);
    expect(() => counter.destroy()).not.toThrow();
    expect(digits().textContent).toBe('40');
  });

  it('finish() resets the classes and the text even if disconnecting the observer throws', () => {
    mount();
    view(0);
    view(1);
    for (let i = 0; i < 10; i++) frame();
    expect(armed()).toBe(true);
    observers[0].disconnect = () => { throw new Error('disconnect failed'); };
    try { setHidden(true); } catch { /* the reset must already have happened */ }
    expectFinal();
  });

  it('does nothing on a page without the strip', () => {
    document.body.innerHTML = '<p>No strip here</p>';
    expect(() => initProofCount(document).destroy()).not.toThrow();
    expect(observers).toHaveLength(0);
  });
});
