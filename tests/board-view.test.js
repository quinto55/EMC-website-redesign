import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderBoardHTML } from '../src/demo/board-markup.js';
import { createBoardState, nextSale, snapshot, mulberry32, count } from '../src/demo/board-engine.js';
import { mountBoard } from '../src/demo/board-view.js';
import { runWhileVisible } from '../src/demo/lifecycle.js';

const html = () => renderBoardHTML(snapshot(createBoardState()));

function boardEl() {
  document.body.innerHTML = `<div id="host">${html()}</div>`;
  return document.querySelector('[data-board]');
}
const kpi = (el, k) => el.querySelector(`[data-k="${k}"]`).textContent;
const setHidden = (hidden) => {
  Object.defineProperty(document, 'hidden', { configurable: true, get: () => hidden });
  document.dispatchEvent(new Event('visibilitychange'));
};

beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  vi.useRealTimers();
  delete document.hidden;
  document.body.innerHTML = '';
});

describe('the board markup', () => {
  it('shows the fair, both labels and the baseline figures', () => {
    const h = html();
    for (const s of ['Demo County Fair, Friday', 'Live', 'Sample data', 'Tickets sold today', 'Scanned in', 'Sales today',
      '2,880', '2,618', '$61,284', 'Online', 'Box office', '62%', '38%']) expect(h, s).toContain(s);
    const el = boardEl();
    expect(el.matches('[data-sample][data-board]')).toBe(true);
    expect(el.getAttribute('role')).toBe('group');
    expect(el.querySelectorAll('.feed li').length).toBe(3);
    expect(el.querySelectorAll('.ch').length).toBe(2);
  });

  it('is not announced continuously by screen readers', () => {
    expect(html()).not.toContain('aria-live');
  });
});

describe('the live board', () => {
  it('never shows store sales', () => {
    const el = boardEl();
    const board = mountBoard(el, { paused: false, rng: mulberry32(2) });
    for (let i = 0; i < 200; i++) board.tick();
    for (const w of ['Retail', 'Walgreens', 'Circle K', 'Menards']) expect(el.textContent).not.toContain(w);
    board.destroy();
  });

  it('tick() updates the figures and puts the new sale first in the feed', () => {
    const el = boardEl();
    const board = mountBoard(el, { paused: false, rng: mulberry32(9) });
    // Every sale moves the money (an add-on sale leaves Tickets sold today as it was).
    const before = kpi(el, 'money');
    const firstBefore = el.querySelector('.feed li').textContent;
    board.tick();
    expect(kpi(el, 'money')).not.toBe(before);
    expect(el.querySelector('.feed li').textContent).not.toBe(firstBefore);
    expect(el.querySelectorAll('.feed li').length).toBe(3);
    expect(el.querySelector('.feed li b').textContent).toMatch(/^[1-4] × /);
    board.destroy();
  });

  it('tick() changes the text in place: the same figures and bars, one new row at the top, the oldest gone', () => {
    const el = boardEl();
    const board = mountBoard(el, { paused: false, rng: mulberry32(9) });
    const figures = [...el.querySelectorAll('[data-k]')];
    const bars = [...el.querySelectorAll('.ch')];
    const rows = [...el.querySelectorAll('.feed li')];
    board.tick();
    expect([...el.querySelectorAll('[data-k]')]).toHaveLength(3);
    [...el.querySelectorAll('[data-k]')].forEach((f, i) => expect(f).toBe(figures[i]));
    [...el.querySelectorAll('.ch')].forEach((c, i) => expect(c).toBe(bars[i]));
    const after = [...el.querySelectorAll('.feed li')];
    expect(after).toHaveLength(3);
    expect(rows).not.toContain(after[0]); // the new sale is a new row
    expect(after.slice(1)).toEqual(rows.slice(0, 2)); // the two newest old rows move down, the oldest is gone
    expect(after[1]).toBe(rows[0]);
    expect(after[2]).toBe(rows[1]);
    board.destroy();
  });

  it('after many sales the board reads exactly as a fresh drawing of the same sales', () => {
    const el = boardEl();
    const board = mountBoard(el, { paused: false, rng: mulberry32(11) });
    let state = createBoardState();
    const rng = mulberry32(11);
    for (let i = 0; i < 40; i++) {
      board.tick();
      state = nextSale(state, rng).state;
    }
    const fresh = document.createElement('div');
    fresh.innerHTML = renderBoardHTML(snapshot(state));
    const drawn = fresh.querySelector('[data-board]');
    const norm = (n) => n.textContent.replace(/\s+/g, ' ').trim();
    expect(norm(el)).toBe(norm(drawn));
    const widths = (n) => [...n.querySelectorAll('.ch i')].map((i) => i.style.getPropertyValue('--w'));
    expect(widths(el)).toEqual(widths(drawn));
    expect(widths(el).every((w) => /^\d+%$/.test(w))).toBe(true);
    const rowsHtml = (n) => [...n.querySelectorAll('.feed li')].map((li) => li.outerHTML);
    expect(rowsHtml(el)).toEqual(rowsHtml(drawn));
    board.destroy();
  });

  it('leaves the served markup alone when it mounts', () => {
    const el = boardEl();
    const first = el.querySelector('.feed li');
    const board = mountBoard(el, { paused: false });
    expect(el.querySelector('.feed li')).toBe(first);
    expect(kpi(el, 'sold')).toBe('2,880');
    board.destroy();
  });

  it('ticks once per interval while visible', () => {
    const el = boardEl();
    const board = mountBoard(el, { paused: false, intervalMs: 1700, rng: mulberry32(4) });
    expect(kpi(el, 'sold')).toBe('2,880');
    // Every sale moves the money (an add-on sale leaves Tickets sold today as it was).
    vi.advanceTimersByTime(1700 * 5);
    const after5 = kpi(el, 'money');
    expect(after5).not.toBe('$61,284');
    vi.advanceTimersByTime(1700);
    expect(kpi(el, 'money')).not.toBe(after5);
    board.destroy();
  });

  it('stops while the tab is hidden and does not catch up afterwards', () => {
    const el = boardEl();
    const board = mountBoard(el, { paused: false, intervalMs: 1000, rng: mulberry32(6) });
    setHidden(true);
    vi.advanceTimersByTime(60000);
    expect(kpi(el, 'sold')).toBe('2,880');
    setHidden(false);
    expect(kpi(el, 'sold')).toBe('2,880');
    vi.advanceTimersByTime(1000);
    const oneSale = nextSale(createBoardState(), mulberry32(6)).state;
    expect(kpi(el, 'sold')).toBe(count(snapshot(oneSale).tickets));
    board.destroy();
  });

  it('stops when the board leaves the screen', () => {
    const real = globalThis.IntersectionObserver;
    const observers = [];
    globalThis.IntersectionObserver = class {
      constructor(cb) { this.cb = cb; observers.push(this); }
      observe() {}
      disconnect() {}
      fire(isIntersecting) { this.cb([{ isIntersecting }]); }
    };
    try {
      const el = boardEl();
      const board = mountBoard(el, { paused: false, intervalMs: 1000, rng: mulberry32(8) });
      observers[0].fire(false);
      vi.advanceTimersByTime(10000);
      expect(kpi(el, 'money')).toBe('$61,284');
      observers[0].fire(true);
      vi.advanceTimersByTime(1000);
      expect(kpi(el, 'money')).not.toBe('$61,284'); // every sale moves the money
      board.destroy();
    } finally {
      globalThis.IntersectionObserver = real;
    }
  });

  it('destroy() stops everything', () => {
    const el = boardEl();
    const board = mountBoard(el, { paused: false, intervalMs: 1000 });
    board.destroy();
    vi.advanceTimersByTime(10000);
    setHidden(false);
    vi.advanceTimersByTime(10000);
    expect(kpi(el, 'sold')).toBe('2,880');
  });
});

const pauseButton = (el) => el.querySelector('button[data-pause]');
const label = (btn) => btn.querySelector('[data-pause-label]').textContent;

describe('the board\'s pause button (WCAG 2.2.2)', () => {
  it('is one real button, hidden as served, whose visible text is "Pause" and whose name says what it pauses', () => {
    const el = boardEl();
    const buttons = el.querySelectorAll('button');
    expect(buttons).toHaveLength(1);
    const btn = pauseButton(el);
    expect(btn).toBe(buttons[0]);
    expect(btn.getAttribute('type')).toBe('button');
    expect(btn.hasAttribute('hidden')).toBe(true);
    expect(label(btn)).toBe('Pause');
    expect(btn.querySelector('.visually-hidden').textContent).toMatch(/board/i);
    expect(btn.textContent.replace(/\s+/g, ' ').trim()).toMatch(/^Pause \w.*board$/);
  });

  it('is shown when the board mounts and hidden again by destroy()', () => {
    const el = boardEl();
    const board = mountBoard(el, { paused: false });
    expect(pauseButton(el).hasAttribute('hidden')).toBe(false);
    board.destroy();
    expect(pauseButton(el).hasAttribute('hidden')).toBe(true);
  });

  it('stops the ticking itself and keeps the figures; Resume makes the next sale land', () => {
    const el = boardEl();
    const board = mountBoard(el, { paused: false, intervalMs: 1000, rng: mulberry32(6) });
    vi.advanceTimersByTime(3000);
    const btn = pauseButton(el);
    btn.click();
    expect(label(btn)).toBe('Resume');
    expect(btn.querySelector('.visually-hidden').textContent).toMatch(/board/i);
    expect(vi.getTimerCount()).toBe(0);
    const frozen = el.innerHTML.replace(/\shidden=""/g, '');
    vi.advanceTimersByTime(60 * 60 * 1000);
    board.tick(); // even a direct tick lands no sale while paused
    expect(el.innerHTML.replace(/\shidden=""/g, '')).toBe(frozen);

    btn.click();
    expect(label(btn)).toBe('Pause');
    const money = kpi(el, 'money');
    vi.advanceTimersByTime(999);
    expect(kpi(el, 'money')).toBe(money);
    vi.advanceTimersByTime(1);
    expect(kpi(el, 'money')).not.toBe(money);
    board.destroy();
  });

  it('stays paused when the tab is hidden and shown, and when the board scrolls off screen and back', () => {
    const real = globalThis.IntersectionObserver;
    const observers = [];
    globalThis.IntersectionObserver = class {
      constructor(cb) { this.cb = cb; observers.push(this); }
      observe() {}
      disconnect() {}
      fire(isIntersecting) { this.cb([{ isIntersecting }]); }
    };
    try {
      const el = boardEl();
      const board = mountBoard(el, { paused: false, intervalMs: 1000, rng: mulberry32(8) });
      observers[0].fire(true);
      pauseButton(el).click();
      const frozen = kpi(el, 'money');
      setHidden(true);
      setHidden(false);
      observers[0].fire(false);
      observers[0].fire(true);
      vi.advanceTimersByTime(30000);
      expect(vi.getTimerCount()).toBe(0);
      expect(kpi(el, 'money')).toBe(frozen);
      expect(label(pauseButton(el))).toBe('Resume');
      pauseButton(el).click();
      vi.advanceTimersByTime(1000);
      expect(kpi(el, 'money')).not.toBe(frozen);
      board.destroy();
    } finally {
      globalThis.IntersectionObserver = real;
    }
  });

  it('stays paused under reduced motion', () => {
    const realMatch = globalThis.matchMedia;
    globalThis.matchMedia = (q) => ({ matches: q.includes('prefers-reduced-motion'), media: q, addEventListener() {}, removeEventListener() {} });
    try {
      const el = boardEl();
      const board = mountBoard(el, { paused: false, intervalMs: 1000, rng: mulberry32(6) });
      pauseButton(el).click();
      const frozen = kpi(el, 'money');
      setHidden(true);
      setHidden(false);
      vi.advanceTimersByTime(60000);
      expect(kpi(el, 'money')).toBe(frozen);
      board.destroy();
    } finally {
      globalThis.matchMedia = realMatch;
    }
  });

  it('starts paused for a visitor who asks for less motion; Resume starts the day', () => {
    const realMatch = globalThis.matchMedia;
    globalThis.matchMedia = (q) => ({ matches: q.includes('prefers-reduced-motion'), media: q, addEventListener() {}, removeEventListener() {} });
    try {
      const el = boardEl();
      const board = mountBoard(el, { intervalMs: 1000, rng: mulberry32(6) });
      const frozen = kpi(el, 'money');
      expect(label(pauseButton(el))).toBe('Resume');
      expect(el.hasAttribute('data-paused')).toBe(true); // its live dots stop too (base.css)
      vi.advanceTimersByTime(60000);
      expect(kpi(el, 'money')).toBe(frozen);
      pauseButton(el).click();
      expect(el.hasAttribute('data-paused')).toBe(false);
      vi.advanceTimersByTime(5000);
      expect(kpi(el, 'money')).not.toBe(frozen);
      board.destroy();
    } finally {
      globalThis.matchMedia = realMatch;
    }
  });

  it('destroy() removes the button\'s listener', () => {
    const el = boardEl();
    const board = mountBoard(el, { paused: false, intervalMs: 1000 });
    const btn = pauseButton(el);
    board.destroy();
    btn.click();
    expect(label(btn)).toBe('Pause');
    expect(vi.getTimerCount()).toBe(0);
  });
});

describe('runWhileVisible', () => {
  it('treats the element as visible when there is no IntersectionObserver', () => {
    const real = globalThis.IntersectionObserver;
    delete globalThis.IntersectionObserver;
    try {
      const start = vi.fn();
      const stop = vi.fn();
      const cleanup = runWhileVisible(document.createElement('div'), { start, stop });
      expect(start).toHaveBeenCalledTimes(1);
      setHidden(true);
      expect(stop).toHaveBeenCalledTimes(1);
      cleanup();
    } finally {
      if (real) globalThis.IntersectionObserver = real;
    }
  });
});
