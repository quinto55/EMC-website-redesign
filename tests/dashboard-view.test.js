import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderDashboardHTML } from '../src/demo/dashboard-markup.js';
import { createDashState, advance, dashSnapshot } from '../src/demo/dashboard-engine.js';
import { mulberry32, count } from '../src/demo/board-engine.js';
import { mountDashboard } from '../src/demo/dashboard-view.js';

const html = () => renderDashboardHTML(dashSnapshot(createDashState()));
const PANELS = ['feed', 'pace', 'gates', 'money', 'fraud', 'types', 'registers'];

function boardEl() {
  document.body.innerHTML = `<div id="host">${html()}</div>`;
  return document.querySelector('[data-dashboard]');
}
const tile = (el, k) => el.querySelector(`[data-tile="${k}"] [data-f="${k}"]`).textContent;
const setHidden = (hidden) => {
  Object.defineProperty(document, 'hidden', { configurable: true, get: () => hidden });
  document.dispatchEvent(new Event('visibilitychange'));
};

// Animation frames under the test's control (happy-dom's own never cancel).
let frames;
let frameId;
let clockMs;
const flushFrames = (stepMs = 1000 / 60, max = 200) => {
  for (let n = 0; n < max && frames.size; n++) {
    clockMs += stepMs;
    const due = [...frames.values()];
    frames.clear();
    for (const cb of due) cb(clockMs);
  }
};
let reduced;
const realRaf = globalThis.requestAnimationFrame;
const realCaf = globalThis.cancelAnimationFrame;
const realMatch = globalThis.matchMedia;

beforeEach(() => {
  vi.useFakeTimers();
  frames = new Map();
  frameId = 0;
  clockMs = 1000;
  reduced = false;
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
});

describe('the dashboard markup', () => {
  it('holds the real board\'s labels, panels and the sample marks', () => {
    const h = html();
    for (const s of ['Demo County Fair', 'LIVE', 'Sample data', 'SAMPLE · simulated crowd',
      'Tickets today', 'Gross today', 'Orders', 'Admitted',
      'Latest sales', 'Gates', 'Money', 'Fraud watch', 'Ticket types today', 'Registers',
      'Sold so far', 'Expected at this pace', 'Forecast range',
      'Presented again', 'Voided', 'Wrong event', 'Wrong day', 'AI brief',
      'Online card', 'Box-office card', 'Cash', 'Average order $40.53', '4 refunds, $96.00',
      'Main Gate', 'North Gate', 'Midway Gate', 'Sam', 'Riley', 'Jordan', 'Reader', 'Printer',
      '3,947', '$61,284', '1,512', '2,618']) expect(h, s).toContain(s);
    expect(h).toMatch(/On pace for 6,150 today/);
    expect(h).toContain('(5,900 to 6,400)');
    expect(h).toMatch(/\+\d[\d,]* since 6:30 PM/);
    expect(h).toMatch(/\d+ a minute at the gates/);
  });

  it('is one sample board, labelled, with a heading on every panel', () => {
    const el = boardEl();
    expect(el.matches('[data-sample][data-dashboard]')).toBe(true);
    expect(el.getAttribute('role')).toBe('group');
    expect(el.getAttribute('aria-label')).toMatch(/sample/i);
    const headings = Object.fromEntries(PANELS.map((p) => [p, el.querySelector(`[data-panel="${p}"] h3`)?.textContent.replace(/\s+/g, ' ').trim()]));
    expect(headings).toEqual({
      feed: 'Latest sales', pace: 'On pace for 6,150 today (5,900 to 6,400)', gates: 'Gates', money: 'Money',
      fraud: 'Fraud watch', types: 'Ticket types today', registers: 'Registers',
    });
    expect(el.querySelectorAll('h1, h2')).toHaveLength(0);
    expect(el.querySelectorAll('[data-panel="feed"] li')).toHaveLength(4);
    expect(el.querySelectorAll('[data-panel="gates"] li')).toHaveLength(3);
    expect(el.querySelectorAll('[data-panel="types"] li')).toHaveLength(5);
    expect(el.querySelectorAll('[data-panel="registers"] li')).toHaveLength(3);
  });

  it('is never announced continuously: no aria-live, one rarely changing status row, charts hidden', () => {
    const h = html();
    expect(h).not.toContain('aria-live');
    const el = boardEl();
    const status = el.querySelectorAll('[role="status"]');
    expect(status).toHaveLength(1);
    expect(status[0].classList.contains('db-alerts')).toBe(true);
    expect(status[0].textContent.trim()).toBe('');
    for (const svg of el.querySelectorAll('svg')) expect(svg.getAttribute('aria-hidden')).toBe('true');
    expect(el.querySelectorAll('svg').length).toBeGreaterThanOrEqual(4); // the pace chart and three sparklines
  });

  it('writes ranges with "to" and has no dash characters or fee lines', () => {
    const h = html();
    expect(h).not.toMatch(/[–—]|&mdash;|&ndash;/);
    expect(h).not.toMatch(/\bfees?\b/i);
  });

  it('has no controls but a Full screen button that waits for the browser to say it can', () => {
    const el = boardEl();
    const buttons = el.querySelectorAll('button, a, input, select, textarea, [tabindex]');
    expect(buttons).toHaveLength(1);
    expect(buttons[0].textContent.trim()).toBe('Full screen');
    expect(buttons[0].hasAttribute('hidden')).toBe(true);
  });
});

describe('the live dashboard', () => {
  it('leaves the served board alone when it mounts', () => {
    const el = boardEl();
    const firstStub = el.querySelector('[data-panel="feed"] li');
    const board = mountDashboard(el);
    expect(el.querySelector('[data-panel="feed"] li')).toBe(firstStub);
    expect(tile(el, 'tickets')).toBe('3,947');
    board.destroy();
  });

  it('tick() changes the figures in place, never replacing the board or a panel', () => {
    const el = boardEl();
    const host = el.parentElement;
    const panels = PANELS.map((p) => el.querySelector(`[data-panel="${p}"]`));
    const tiles = [...el.querySelectorAll('[data-tile]')];
    const chart = el.querySelector('[data-panel="pace"] svg');
    const board = mountDashboard(el, { rng: mulberry32(9) });
    const before = { tickets: tile(el, 'tickets'), orders: tile(el, 'orders') };
    board.tick();
    flushFrames();
    expect(tile(el, 'tickets')).not.toBe(before.tickets);
    expect(tile(el, 'orders')).toBe('1,513');
    expect(host.querySelector('[data-dashboard]')).toBe(el);
    PANELS.forEach((p, i) => expect(el.querySelector(`[data-panel="${p}"]`), p).toBe(panels[i]));
    [...el.querySelectorAll('[data-tile]')].forEach((t, i) => expect(t).toBe(tiles[i]));
    expect(el.querySelector('[data-panel="pace"] svg')).toBe(chart);
    expect(el.querySelectorAll('[data-panel="feed"] li')).toHaveLength(4);
    board.destroy();
  });

  it('shows exactly what the engine says after each tick', () => {
    const el = boardEl();
    const board = mountDashboard(el, { rng: mulberry32(12) });
    const rng = mulberry32(12);
    let state = createDashState();
    for (let i = 0; i < 30; i++) {
      board.tick();
      flushFrames();
      state = advance(state, rng);
    }
    const s = dashSnapshot(state);
    expect(tile(el, 'tickets')).toBe(count(s.totals.tickets));
    expect(tile(el, 'gross')).toBe(count(s.totals.gross));
    expect(tile(el, 'admitted')).toBe(count(s.totals.admitted));
    const fresh = new DOMParser().parseFromString(renderDashboardHTML(s), 'text/html').querySelector('[data-dashboard]');
    const words = (n) => n.textContent.replace(/\s+/g, ' ').trim();
    for (const p of PANELS) expect(words(el.querySelector(`[data-panel="${p}"]`)), p).toBe(words(fresh.querySelector(`[data-panel="${p}"]`)));
    expect(words(el.querySelector('.db-brief'))).toBe(words(fresh.querySelector('.db-brief')));
    expect(words(el.querySelector('.db-bar'))).toBe(words(fresh.querySelector('.db-bar')));
    board.destroy();
  });

  it('counts the tile figures up over about 800 ms, then stops asking for frames', () => {
    const el = boardEl();
    const board = mountDashboard(el, { rng: mulberry32(9) });
    expect(frames.size).toBe(0);
    board.tick();
    const target = el.querySelector('[data-tile="tickets"]');
    expect(target.hasAttribute('data-counting')).toBe(true);
    flushFrames(100, 4); // 400 ms in: on the way
    expect(target.hasAttribute('data-counting')).toBe(true);
    flushFrames(100);
    expect(target.hasAttribute('data-counting')).toBe(false);
    expect(frames.size).toBe(0);
    board.destroy();
  });

  it('jumps straight to the new figures under reduced motion', () => {
    reduced = true;
    const el = boardEl();
    const board = mountDashboard(el, { rng: mulberry32(9) });
    board.tick();
    expect(frames.size).toBe(0);
    expect(tile(el, 'orders')).toBe('1,513');
    board.destroy();
  });

  it('ticks once per interval while visible', () => {
    reduced = true;
    const el = boardEl();
    const board = mountDashboard(el, { intervalMs: 1700, rng: mulberry32(4) });
    vi.advanceTimersByTime(1700 * 5);
    expect(tile(el, 'orders')).toBe('1,517');
    vi.advanceTimersByTime(1700);
    expect(tile(el, 'orders')).toBe('1,518');
    board.destroy();
  });

  it('stops while the tab is hidden and does not catch up afterwards', () => {
    reduced = true;
    const el = boardEl();
    const board = mountDashboard(el, { intervalMs: 1000, rng: mulberry32(6) });
    setHidden(true);
    vi.advanceTimersByTime(60000);
    expect(tile(el, 'orders')).toBe('1,512');
    setHidden(false);
    expect(tile(el, 'orders')).toBe('1,512');
    vi.advanceTimersByTime(1000);
    expect(tile(el, 'orders')).toBe('1,513');
    expect(tile(el, 'tickets')).toBe(count(dashSnapshot(advance(createDashState(), mulberry32(6))).totals.tickets));
    board.destroy();
  });

  it('stops when the board leaves the screen', () => {
    reduced = true;
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
      const board = mountDashboard(el, { intervalMs: 1000, rng: mulberry32(8) });
      observers[0].fire(false);
      vi.advanceTimersByTime(10000);
      expect(tile(el, 'orders')).toBe('1,512');
      observers[0].fire(true);
      vi.advanceTimersByTime(1000);
      expect(tile(el, 'orders')).toBe('1,513');
      board.destroy();
    } finally {
      globalThis.IntersectionObserver = real;
    }
  });

  it('a count-up in progress is finished, not left running, when the board stops', () => {
    const el = boardEl();
    const board = mountDashboard(el, { intervalMs: 1000, rng: mulberry32(8) });
    vi.advanceTimersByTime(1000);
    expect(frames.size).toBe(1);
    setHidden(true);
    expect(frames.size).toBe(0);
    expect(tile(el, 'orders')).toBe('1,513');
    expect(el.querySelector('[data-counting]')).toBeNull();
    board.destroy();
  });

  it('destroy() stops everything, and a later tick() does nothing', () => {
    const el = boardEl();
    const board = mountDashboard(el, { intervalMs: 1000, rng: mulberry32(2) });
    vi.advanceTimersByTime(1000);
    board.destroy();
    expect(frames.size).toBe(0);
    const after = el.innerHTML;
    vi.advanceTimersByTime(10000);
    setHidden(false);
    vi.advanceTimersByTime(10000);
    board.tick();
    flushFrames();
    expect(el.innerHTML).toBe(after);
    expect(tile(el, 'orders')).toBe('1,513');
  });

  it('a new sale goes on top of Latest sales, which keeps four', () => {
    reduced = true;
    const el = boardEl();
    const board = mountDashboard(el, { rng: mulberry32(9) });
    const oldFirst = el.querySelector('[data-panel="feed"] li');
    board.tick();
    const items = [...el.querySelectorAll('[data-panel="feed"] li')];
    expect(items).toHaveLength(4);
    expect(items[1]).toBe(oldFirst);
    expect(items[0]).not.toBe(oldFirst);
    expect(items[0].textContent).toMatch(/just now/);
    board.destroy();
  });

  it('raises the slow-gate alert from the same numbers as the Gates panel', () => {
    reduced = true;
    const el = boardEl();
    const board = mountDashboard(el, { rng: mulberry32(1) });
    const alerts = el.querySelector('.db-alerts');
    const flag = el.querySelector('[data-gate="north"] .db-flag');
    expect(flag.hasAttribute('hidden')).toBe(true);
    const rng = mulberry32(1);
    let state = createDashState();
    let shown = false;
    for (let i = 0; i < 80; i++) {
      board.tick();
      state = advance(state, rng);
      const s = dashSnapshot(state);
      expect([...alerts.querySelectorAll('.db-alert__text')].map((n) => n.textContent)).toEqual(s.alerts.map((a) => a.text));
      for (const g of s.gates) {
        const f = el.querySelector(`[data-gate="${g.id}"] .db-flag`);
        expect(f.hasAttribute('hidden'), g.id).toBe(!g.slow);
      }
      if (s.alerts.length) {
        shown = true;
        expect(flag.getAttribute('title')).toBe(s.alerts[0].text);
      }
    }
    expect(shown).toBe(true);
    expect(el.querySelectorAll('[role="status"]')).toHaveLength(1);
    board.destroy();
  });

  it('shows Full screen only where the browser has the Fullscreen API', () => {
    const el = boardEl();
    Object.defineProperty(document, 'fullscreenEnabled', { configurable: true, get: () => true });
    const screen = el.querySelector('.db-screen');
    screen.requestFullscreen = vi.fn(() => Promise.resolve());
    try {
      const board = mountDashboard(el);
      const button = el.querySelector('button');
      expect(button.hasAttribute('hidden')).toBe(false);
      button.click();
      expect(screen.requestFullscreen).toHaveBeenCalledTimes(1);
      board.destroy();
      expect(button.hasAttribute('hidden')).toBe(true);
    } finally {
      delete document.fullscreenEnabled;
    }
  });
});
