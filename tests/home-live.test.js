import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join, dirname } from 'node:path';
import { renderPage } from '../build/render.js';
import { pageByKey } from '../build/pages.js';
import { createDashState, advance } from '../src/demo/dashboard-engine.js';
import { mulberry32, snapshot } from '../src/demo/board-engine.js';
import { mountHomeLive } from '../src/demo/home-live.js';

// The home page as served: rendered from its source, its scripts left out (happy-dom would try to fetch them).
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const HOME = renderPage(readFileSync(join(ROOT, 'index.html'), 'utf8'), pageByKey('home'));
const BODY = HOME.slice(HOME.indexOf('<body>') + '<body>'.length, HOME.indexOf('</body>'))
  .replace(/<script\b[^>]*>[\s\S]*?<\/script>/g, '');

function loadHome() {
  document.body.innerHTML = BODY;
  return {
    boardEl: document.querySelector('.hero [data-board]'),
    dashEl: document.querySelector('#live-board [data-dashboard]'),
  };
}

const num = (s) => Number(s.replace(/[^\d]/g, ''));
/** "2 × Adult admission" (the compact feed) and "2× Adult admission" (Latest sales) name the same sale. */
const saleName = (s) => {
  const m = s.trim().match(/^(\d+)\s*×\s*(.+)$/);
  return m ? `${m[1]} × ${m[2]}` : null;
};
/** What the compact board shows, as numbers. */
function compact(el) {
  const k = (key) => num(el.querySelector(`[data-k="${key}"]`).textContent);
  const shares = [...el.querySelectorAll('.ch em')].map((n) => num(n.textContent));
  return {
    sold: k('sold'), scanned: k('scanned'), sales: k('money'), online: shares[0], box: shares[1],
    sale: saleName(el.querySelector('.feed li b').textContent), rows: el.querySelectorAll('.feed li').length,
  };
}
/** What the dashboard shows, as numbers. */
function dashboard(el) {
  const tile = (key) => num(el.querySelector(`[data-tile="${key}"] [data-f="${key}"]`).textContent);
  const share = (id) => num(el.querySelector(`[data-f="tender-${id}-share"]`).textContent);
  return {
    tickets: tile('tickets'), gross: tile('gross'), orders: tile('orders'), admitted: tile('admitted'),
    online: share('card_online'), boxCard: share('card_present'), cash: share('cash'),
    sale: saleName(el.querySelector('[data-panel="feed"] .db-stub__lines').textContent),
  };
}
const feedRows = (el) => [...el.querySelectorAll('.feed li')];
const setHidden = (hidden) => {
  Object.defineProperty(document, 'hidden', { configurable: true, get: () => hidden });
  document.dispatchEvent(new Event('visibilitychange'));
};

// Animation frames under the test's control (happy-dom's own never cancel), and the reduced-motion setting.
let frames;
let frameId;
let clockMs;
let reduced;
const flushFrames = (stepMs = 1000 / 60, max = 200) => {
  for (let n = 0; n < max && frames.size; n++) {
    clockMs += stepMs;
    const due = [...frames.values()];
    frames.clear();
    for (const cb of due) cb(clockMs);
  }
};
const realRaf = globalThis.requestAnimationFrame;
const realCaf = globalThis.cancelAnimationFrame;
const realMatch = globalThis.matchMedia;
const realIO = globalThis.IntersectionObserver;

/** An IntersectionObserver the test drives: fire(el, onScreen) reports one element entering or leaving the screen. */
let observers;
class FakeIO {
  constructor(cb) {
    this.cb = cb;
    this.els = [];
    observers.push(this);
  }
  observe(el) { this.els.push(el); }
  disconnect() { this.els = []; }
}
const fire = (el, isIntersecting) => {
  for (const o of observers.filter((x) => x.els.includes(el))) o.cb([{ target: el, isIntersecting }]);
};

beforeEach(() => {
  vi.useFakeTimers();
  frames = new Map();
  frameId = 0;
  clockMs = 1000;
  reduced = false;
  observers = [];
  globalThis.requestAnimationFrame = (cb) => { frames.set(++frameId, cb); return frameId; };
  globalThis.cancelAnimationFrame = (id) => { frames.delete(id); };
  globalThis.matchMedia = (q) => ({ matches: q.includes('prefers-reduced-motion') ? reduced : false, media: q, addEventListener() {}, removeEventListener() {} });
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

describe('the home page boards on one sample day', () => {
  it('one tick moves both boards and their figures agree', () => {
    reduced = true; // the dashboard's figures jump instead of counting up
    const { boardEl, dashEl } = loadHome();
    expect(boardEl).not.toBeNull();
    expect(dashEl).not.toBeNull();
    const live = mountHomeLive({ boardEl, dashEl, rng: mulberry32(5) });
    const before = { c: compact(boardEl), d: dashboard(dashEl) };
    expect(before.c.sold).toBe(before.d.tickets);

    live.tick();
    expect(compact(boardEl).sold).not.toBe(before.c.sold);
    expect(dashboard(dashEl).orders).toBe(before.d.orders + 1);
    for (let i = 1; i < 25; i++) live.tick();

    // Both show the one shared day, exactly as the engine has it after 25 advances.
    let state = createDashState();
    const rng = mulberry32(5);
    for (let i = 0; i < 25; i++) state = advance(state, rng, { seconds: 1.7 });
    const expected = snapshot(state.board);

    const c = compact(boardEl);
    const d = dashboard(dashEl);
    expect(c.sold).toBe(expected.tickets);
    expect(c.sold).toBe(d.tickets);
    expect(c.scanned).toBe(d.admitted);
    expect(c.sales).toBe(d.gross);
    expect(boardEl.querySelector('[data-k="money"]').textContent).toMatch(/^\$\d{1,3}(,\d{3})+$/); // whole dollars
    expect(c.online).toBe(d.online);
    expect(c.box).toBe(d.boxCard + d.cash);
    expect(c.sale).not.toBeNull();
    expect(c.sale).toBe(d.sale);
    expect(c.rows).toBe(3);
    live.destroy();
  });

  it('there is one timer: a tick interval produces exactly one sale on both boards', () => {
    reduced = true;
    const { boardEl, dashEl } = loadHome();
    const live = mountHomeLive({ boardEl, dashEl, intervalMs: 1700, rng: mulberry32(4) });
    expect(vi.getTimerCount()).toBe(1);
    const rows = feedRows(boardEl);
    const stubs = [...dashEl.querySelectorAll('[data-panel="feed"] li')];

    vi.advanceTimersByTime(1700);
    expect(dashboard(dashEl).orders).toBe(1513);
    expect(feedRows(boardEl).filter((li) => !rows.includes(li))).toHaveLength(1);
    expect([...dashEl.querySelectorAll('[data-panel="feed"] li')].filter((li) => !stubs.includes(li))).toHaveLength(1);
    expect(compact(boardEl).sold).toBe(dashboard(dashEl).tickets);

    vi.advanceTimersByTime(1700 * 4);
    expect(dashboard(dashEl).orders).toBe(1517);
    expect(compact(boardEl).sold).toBe(dashboard(dashEl).tickets);
    expect(vi.getTimerCount()).toBe(1);
    live.destroy();
  });

  it('keeps ticking while either board is on screen, stops when neither is, and does not catch up', () => {
    reduced = true;
    globalThis.IntersectionObserver = FakeIO;
    const { boardEl, dashEl } = loadHome();
    const live = mountHomeLive({ boardEl, dashEl, intervalMs: 1000, rng: mulberry32(8) });

    fire(boardEl, true);
    fire(dashEl, false);
    vi.advanceTimersByTime(1000);
    expect(dashboard(dashEl).orders).toBe(1513);
    expect(compact(boardEl).sold).toBe(dashboard(dashEl).tickets);

    fire(boardEl, false);
    vi.advanceTimersByTime(60000);
    expect(dashboard(dashEl).orders).toBe(1513);
    expect(vi.getTimerCount()).toBe(0);

    fire(dashEl, true);
    expect(dashboard(dashEl).orders).toBe(1513);
    vi.advanceTimersByTime(1000);
    expect(dashboard(dashEl).orders).toBe(1514);
    vi.advanceTimersByTime(1000);
    expect(dashboard(dashEl).orders).toBe(1515);
    expect(compact(boardEl).sold).toBe(dashboard(dashEl).tickets);
    live.destroy();
  });

  it('an off-screen dashboard takes each sale at once: no count-up, no animation frames', () => {
    globalThis.IntersectionObserver = FakeIO;
    const { boardEl, dashEl } = loadHome();
    const live = mountHomeLive({ boardEl, dashEl, intervalMs: 1000, rng: mulberry32(3) });
    fire(boardEl, true);
    fire(dashEl, false);
    vi.advanceTimersByTime(1000);
    expect(frames.size).toBe(0);
    expect(dashEl.querySelector('[data-counting]')).toBeNull();
    expect(dashboard(dashEl).tickets).toBe(compact(boardEl).sold);

    // On screen it counts up again; leaving the screen mid-count finishes the count at once.
    fire(dashEl, true);
    vi.advanceTimersByTime(1000);
    expect(frames.size).toBe(1);
    expect(dashEl.querySelector('[data-tile="tickets"]').hasAttribute('data-counting')).toBe(true);
    fire(dashEl, false);
    expect(frames.size).toBe(0);
    expect(dashEl.querySelector('[data-counting]')).toBeNull();
    expect(dashboard(dashEl).tickets).toBe(compact(boardEl).sold);
    expect(dashboard(dashEl).orders).toBe(1514);
    live.destroy();
  });

  it('stops while the tab is hidden and does not catch up afterwards', () => {
    reduced = true;
    const { boardEl, dashEl } = loadHome();
    const live = mountHomeLive({ boardEl, dashEl, intervalMs: 1000, rng: mulberry32(6) });
    setHidden(true);
    vi.advanceTimersByTime(60000);
    expect(dashboard(dashEl).orders).toBe(1512);
    expect(compact(boardEl).sold).toBe(3947);
    setHidden(false);
    expect(dashboard(dashEl).orders).toBe(1512);
    vi.advanceTimersByTime(1000);
    expect(dashboard(dashEl).orders).toBe(1513);
    const oneSale = advance(createDashState(), mulberry32(6), { seconds: 1 });
    expect(compact(boardEl).sold).toBe(snapshot(oneSale.board).tickets);
    expect(dashboard(dashEl).tickets).toBe(snapshot(oneSale.board).tickets);
    live.destroy();
  });

  it('a missing dashboard element still leaves a working compact board, and the reverse', () => {
    reduced = true;
    let { boardEl, dashEl } = loadHome();
    const boardOnly = mountHomeLive({ boardEl, dashEl: null, intervalMs: 1000, rng: mulberry32(3) });
    vi.advanceTimersByTime(1000);
    expect(compact(boardEl).sold).not.toBe(3947);
    expect(dashboard(dashEl).orders).toBe(1512); // left as served
    boardOnly.destroy();

    ({ boardEl, dashEl } = loadHome());
    const dashOnly = mountHomeLive({ boardEl: null, dashEl, intervalMs: 1000, rng: mulberry32(3) });
    vi.advanceTimersByTime(1000);
    expect(dashboard(dashEl).orders).toBe(1513);
    expect(compact(boardEl).sold).toBe(3947); // left as served
    dashOnly.destroy();
  });

  it('destroy() stops everything; a later tick() does nothing', () => {
    const { boardEl, dashEl } = loadHome();
    const live = mountHomeLive({ boardEl, dashEl, intervalMs: 1000, rng: mulberry32(2) });
    vi.advanceTimersByTime(1000);
    live.destroy();
    expect(frames.size).toBe(0);
    expect(vi.getTimerCount()).toBe(0);
    const after = { board: boardEl.innerHTML, dash: dashEl.innerHTML };
    vi.advanceTimersByTime(10000);
    setHidden(false);
    vi.advanceTimersByTime(10000);
    live.tick();
    flushFrames();
    expect(boardEl.innerHTML).toBe(after.board);
    expect(dashEl.innerHTML).toBe(after.dash);
    expect(dashboard(dashEl).orders).toBe(1513);
  });

  it('a tick with no sale leaves the compact board alone', () => {
    reduced = true;
    const { boardEl, dashEl } = loadHome();
    // Always the same draw: three ride wristbands online, until wristbands sell out and nothing else is drawn.
    const live = mountHomeLive({ boardEl, dashEl, rng: () => 0.5 });
    let quiet = 0;
    for (let i = 0; i < 200; i++) {
      const rows = feedRows(boardEl);
      const html = boardEl.innerHTML;
      const orders = dashboard(dashEl).orders;
      live.tick();
      if (dashboard(dashEl).orders !== orders) continue;
      quiet += 1;
      expect(boardEl.innerHTML).toBe(html);
      feedRows(boardEl).forEach((li, k) => expect(li).toBe(rows[k]));
    }
    expect(quiet).toBeGreaterThan(0);
    expect(compact(boardEl).sold).toBe(dashboard(dashEl).tickets);
    live.destroy();
  });

  it('when the sample day starts again at 11 PM, both boards show the opening figures and feed again', () => {
    reduced = true;
    const { boardEl, dashEl } = loadHome();
    const served = { rows: feedRows(boardEl).map((li) => li.outerHTML), stubs: dashEl.querySelector('.db-feed__list').innerHTML };
    // An hour a tick: 7:42, 8:42, 9:42 and 10:42 PM sell; the next would pass 11 PM, so the day starts again.
    const live = mountHomeLive({ boardEl, dashEl, intervalMs: 3600 * 1000, rng: mulberry32(7) });
    vi.advanceTimersByTime(3600 * 1000 * 4);
    expect(dashboard(dashEl).orders).toBe(1516);
    expect(compact(boardEl).sold).not.toBe(3947);
    vi.advanceTimersByTime(3600 * 1000);
    expect(dashboard(dashEl).orders).toBe(1512);
    expect(compact(boardEl)).toMatchObject({ sold: 3947, scanned: 2618, sales: 61284, rows: 3 });
    expect(feedRows(boardEl).map((li) => li.outerHTML)).toEqual(served.rows);
    expect(dashboard(dashEl)).toMatchObject({ tickets: 3947, admitted: 2618, gross: 61284 });
    expect(dashEl.querySelectorAll('[data-panel="feed"] li')).toHaveLength(4);
    expect(compact(boardEl).sale).toBe(dashboard(dashEl).sale);
    live.destroy();
  });

  it('the dashboard keeps its Full screen button', () => {
    const { boardEl, dashEl } = loadHome();
    Object.defineProperty(document, 'fullscreenEnabled', { configurable: true, get: () => true });
    const screen = dashEl.querySelector('.db-screen');
    screen.requestFullscreen = vi.fn(() => Promise.resolve());
    try {
      const live = mountHomeLive({ boardEl, dashEl });
      const button = dashEl.querySelector('[data-fullscreen]');
      expect(button.hasAttribute('hidden')).toBe(false);
      button.click();
      expect(screen.requestFullscreen).toHaveBeenCalledTimes(1);
      live.destroy();
      expect(button.hasAttribute('hidden')).toBe(true);
    } finally {
      delete document.fullscreenEnabled;
    }
  });
});
