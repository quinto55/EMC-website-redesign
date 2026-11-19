import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderDashboardHTML } from '../src/demo/dashboard-markup.js';
import { createDashState, advance, dashSnapshot } from '../src/demo/dashboard-engine.js';
import { mulberry32, count } from '../src/demo/board-engine.js';
import { mountDashboard } from '../src/demo/dashboard-view.js';
import { addOnsLine } from '../src/demo/sample-fair.js';

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
      'Admission tickets sold so far', 'Expected at this pace', 'Forecast range',
      'Presented again', 'Voided', 'Wrong event', 'Wrong day', 'AI brief',
      'Online card', 'Box-office card', 'Cash', 'Average order $40.53', '4 refunds, $96.00',
      'Main Gate', 'North Gate', 'Midway Gate', 'Sam', 'Riley', 'Jordan', 'Reader', 'Printer',
      '2,880', 'plus 279 parking and 788 rides', '$61,284', '1,512', '2,618']) expect(h, s).toContain(s);
    expect(h).toMatch(/On pace for 4,490 today/);
    expect(h).toContain('(4,290 to 4,690)');
    expect(h).toMatch(/\d+ a minute at the gates/);
  });

  it('the dashboard tile reads Tickets today 2,880 with the add-ons line under it, and the legend says what the chart counts', () => {
    const el = boardEl();
    const ticketsTile = el.querySelector('[data-tile="tickets"]');
    expect(ticketsTile.querySelector('.db-tile__label').textContent).toBe('Tickets today');
    expect(tile(el, 'tickets')).toBe('2,880');
    // The line under it names the add-ons, in place of the quarter hour's count (as on the real board with add-ons sold).
    expect(ticketsTile.querySelector('[data-f="tickets-sub"]').textContent).toBe('plus 279 parking and 788 rides');
    expect(el.textContent).not.toMatch(/ since /);
    // The chart counts Admission only: the legend's first label is the real board's ADMISSION_SOLD, the line ends at
    // 2,880 and the forecast is projected from it.
    const legend = [...el.querySelectorAll('.db-legend li')].map((li) => li.textContent);
    expect(legend).toEqual(['Admission tickets sold so far', 'Expected at this pace', 'Forecast range']);
    expect(el.querySelector('[data-c="sold-label"]').textContent).toBe('2,880');
    expect(el.querySelector('[data-c="proj-label"]').textContent).toBe('4,490');
    expect(el.querySelector('[data-f="pace-head"]').textContent).toBe('On pace for 4,490 today');
    // Gross, orders and admitted are as before.
    expect([tile(el, 'gross'), tile(el, 'orders'), tile(el, 'admitted')]).toEqual(['61,284', '1,512', '2,618']);
  });

  it('each ticket type row names its kind, and the sell-out note uses the real words', () => {
    const el = boardEl();
    const rows = [...el.querySelectorAll('[data-panel="types"] .db-type')].map((li) => ({
      name: li.querySelector('.db-type__name > span:first-child').textContent,
      kind: li.querySelector('.db-type__kind').textContent,
      status: li.querySelector('.db-type__status').textContent,
    }));
    expect(rows).toEqual([
      { name: 'Adult admission', kind: 'Admission', status: "Won't sell out today" },
      { name: 'Child admission', kind: 'Admission', status: "Won't sell out today" },
      { name: 'Ride wristband', kind: 'Rides', status: 'Sells out ~9:29 PM' },
      { name: 'Family 4-pack', kind: 'Admission', status: "Won't sell out today" },
      { name: 'Parking pass', kind: 'Parking', status: "Won't sell out today" },
    ]);
  });

  it('is one sample board, labelled, with a heading on every panel', () => {
    const el = boardEl();
    expect(el.matches('[data-sample][data-dashboard]')).toBe(true);
    expect(el.getAttribute('role')).toBe('group');
    expect(el.getAttribute('aria-label')).toMatch(/sample/i);
    const headings = Object.fromEntries(PANELS.map((p) => [p, el.querySelector(`[data-panel="${p}"] h3`)?.textContent.replace(/\s+/g, ' ').trim()]));
    expect(headings).toEqual({
      feed: 'Latest sales', pace: 'On pace for 4,490 today (4,290 to 4,690)', gates: 'Gates', money: 'Money',
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

  it('has no controls but a Pause button and a Full screen button that wait for the script and the browser', () => {
    const el = boardEl();
    const buttons = [...el.querySelectorAll('button, a, input, select, textarea, [tabindex]')];
    expect(buttons).toHaveLength(2);
    expect(buttons.map((b) => b.tagName)).toEqual(['BUTTON', 'BUTTON']);
    expect(buttons[0].matches('[data-pause]')).toBe(true);
    expect(buttons[1].textContent.trim()).toBe('Full screen');
    for (const b of buttons) expect(b.hasAttribute('hidden')).toBe(true);
  });
});

describe('the live dashboard', () => {
  it('leaves the served board alone when it mounts', () => {
    const el = boardEl();
    const firstStub = el.querySelector('[data-panel="feed"] li');
    const board = mountDashboard(el);
    expect(el.querySelector('[data-panel="feed"] li')).toBe(firstStub);
    expect(tile(el, 'tickets')).toBe('2,880');
    board.destroy();
  });

  it('tick() changes the figures in place, never replacing the board or a panel', () => {
    const el = boardEl();
    const host = el.parentElement;
    const panels = PANELS.map((p) => el.querySelector(`[data-panel="${p}"]`));
    const tiles = [...el.querySelectorAll('[data-tile]')];
    const chart = el.querySelector('[data-panel="pace"] svg');
    const board = mountDashboard(el, { rng: mulberry32(9) });
    // Every sale moves the gross (an add-on sale leaves Tickets today as it was).
    const before = { gross: tile(el, 'gross'), orders: tile(el, 'orders') };
    board.tick();
    flushFrames();
    expect(tile(el, 'gross')).not.toBe(before.gross);
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
    expect(el.querySelector('[data-f="tickets-sub"]').textContent).toBe(addOnsLine(s.totals.addOns));
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
    // Every sale moves the gross (an add-on sale leaves Tickets today as it was).
    const target = el.querySelector('[data-tile="gross"]');
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
      const button = el.querySelector('[data-fullscreen]');
      expect(button.hasAttribute('hidden')).toBe(false);
      button.click();
      expect(screen.requestFullscreen).toHaveBeenCalledTimes(1);
      board.destroy();
      expect(button.hasAttribute('hidden')).toBe(true);
    } finally {
      delete document.fullscreenEnabled;
    }
  });

  it('if the first render throws, the Full screen setup is undone and the error is raised', () => {
    const el = boardEl();
    Object.defineProperty(document, 'fullscreenEnabled', { configurable: true, get: () => true });
    const screen = el.querySelector('.db-screen');
    screen.requestFullscreen = vi.fn(() => Promise.resolve());
    // The chart's svg fails the first time it is drawn.
    el.querySelector('.db-chart svg').querySelector = () => { throw new Error('chart failed'); };
    const removed = vi.spyOn(document, 'removeEventListener');
    try {
      expect(() => mountDashboard(el)).toThrow('chart failed');
      const button = el.querySelector('[data-fullscreen]');
      expect(button.hasAttribute('hidden')).toBe(true);
      button.click();
      expect(screen.requestFullscreen).not.toHaveBeenCalled();
      expect(removed.mock.calls.map((c) => c[0])).toEqual(expect.arrayContaining(['fullscreenchange', 'webkitfullscreenchange']));
      expect(frames.size).toBe(0);
      expect(vi.getTimerCount()).toBe(0);
    } finally {
      removed.mockRestore();
      delete document.fullscreenEnabled;
    }
  });

  describe('the pause button (WCAG 2.2.2)', () => {
    const pauseBtn = (el) => el.querySelector('button[data-pause]');
    const word = (btn) => btn.querySelector('[data-pause-label]').textContent;
    const shown = (el) => el.innerHTML.replace(/\shidden=""/g, '');

    it('is one real button in the top bar, hidden as served, "Pause" with a visually hidden suffix naming the board', () => {
      const el = boardEl();
      const btn = pauseBtn(el);
      expect(btn).not.toBeNull();
      expect(btn.closest('.db-bar')).not.toBeNull();
      expect(btn.getAttribute('type')).toBe('button');
      expect(btn.hasAttribute('hidden')).toBe(true);
      expect(word(btn)).toBe('Pause');
      expect(btn.querySelector('.visually-hidden').textContent).toMatch(/dashboard/i);
      expect(el.querySelectorAll('[data-pause]')).toHaveLength(1);
    });

    it('is shown when the dashboard mounts and hidden again by destroy()', () => {
      const el = boardEl();
      const board = mountDashboard(el);
      expect(pauseBtn(el).hasAttribute('hidden')).toBe(false);
      board.destroy();
      expect(pauseBtn(el).hasAttribute('hidden')).toBe(true);
    });

    it('stops the ticking, the clock and the count-up, keeps every figure, and Resume makes the next sale land', () => {
      reduced = true; // the tiles jump, so the orders figure shows the new sale at once
      const el = boardEl();
      const board = mountDashboard(el, { intervalMs: 1000, rng: mulberry32(6) });
      vi.advanceTimersByTime(3000);
      const btn = pauseBtn(el);
      btn.click();
      expect(word(btn)).toBe('Resume');
      expect(vi.getTimerCount()).toBe(0);
      expect(frames.size).toBe(0);
      expect(el.querySelector('[data-counting]')).toBeNull();
      const frozen = shown(el);
      vi.advanceTimersByTime(3 * 60 * 60 * 1000);
      board.tick();
      flushFrames();
      expect(shown(el)).toBe(frozen);

      btn.click();
      expect(word(btn)).toBe('Pause');
      const orders = tile(el, 'orders');
      vi.advanceTimersByTime(999);
      expect(tile(el, 'orders')).toBe(orders);
      vi.advanceTimersByTime(1);
      expect(Number(tile(el, 'orders').replace(/\D/g, ''))).toBe(Number(orders.replace(/\D/g, '')) + 1);
      board.destroy();
    });

    it('stays paused when the tab is hidden and shown, and under reduced motion', () => {
      reduced = true;
      const el = boardEl();
      const board = mountDashboard(el, { intervalMs: 1000, rng: mulberry32(6) });
      pauseBtn(el).click();
      const frozen = shown(el);
      setHidden(true);
      setHidden(false);
      vi.advanceTimersByTime(60000);
      expect(vi.getTimerCount()).toBe(0);
      expect(shown(el)).toBe(frozen);
      board.destroy();
    });

    it('destroy() removes its listener', () => {
      const el = boardEl();
      const board = mountDashboard(el, { intervalMs: 1000 });
      const btn = pauseBtn(el);
      board.destroy();
      btn.click();
      expect(word(btn)).toBe('Pause');
      expect(vi.getTimerCount()).toBe(0);
    });
  });
});
