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
    const live = mountHomeLive({ paused: false, boardEl, dashEl, rng: mulberry32(5) });
    const before = { c: compact(boardEl), d: dashboard(dashEl) };
    expect(before.c.sold).toBe(before.d.tickets);

    live.tick();
    expect(compact(boardEl).sales).not.toBe(before.c.sales); // every sale moves the money; an add-on leaves the tickets
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
    expect(c.sale).not.toBeNull();
    expect(c.sale).toBe(d.sale);
    expect(c.rows).toBe(3);
    live.destroy();
  });

  it('the compact board\'s two shares are the Money panel\'s, on every tick of 3,000', () => {
    reduced = true;
    const { boardEl, dashEl } = loadHome();
    const live = mountHomeLive({ paused: false, boardEl, dashEl, rng: mulberry32(1) });
    const widths = () => [...boardEl.querySelectorAll('.ch i')].map((i) => i.style.getPropertyValue('--w'));
    for (let tick = 1; tick <= 3000; tick++) {
      live.tick();
      const c = compact(boardEl);
      const d = dashboard(dashEl);
      // Online = Online card; Box office = Box-office card + Cash; the two sum to 100. The bars show the same two.
      expect([c.online, c.box, c.online + c.box], `tick ${tick}`).toEqual([d.online, d.boxCard + d.cash, 100]);
      expect(widths(), `tick ${tick}`).toEqual([`${c.online}%`, `${c.box}%`]);
    }
    live.destroy();
  }, 120000);

  it('the hero board and the dashboard still agree on every figure after 3,000 ticks', () => {
    reduced = true;
    const { boardEl, dashEl } = loadHome();
    const live = mountHomeLive({ paused: false, boardEl, dashEl, rng: mulberry32(13) });
    // The same day kept alongside, to count Admission tickets and add-ons independently of the boards.
    const rng = mulberry32(13);
    let state = createDashState();
    const sold = (id) => state.board.sold[id].online + state.board.sold[id].box;
    const fmt = (n) => n.toLocaleString('en-US');
    const addOnsSub = () => dashEl.querySelector('[data-f="tickets-sub"]').textContent;
    let addOnOnly = 0;
    for (let tick = 1; tick <= 3000; tick++) {
      const ticketsBefore = compact(boardEl).sold;
      live.tick();
      state = advance(state, rng, { seconds: 1.7 });
      const c = compact(boardEl);
      const d = dashboard(dashEl);
      const admission = sold('adult') + sold('child') + sold('family');
      const at = `tick ${tick}`;
      expect([c.sold, d.tickets], at).toEqual([admission, admission]);
      expect(c.scanned, at).toBe(d.admitted);
      expect(d.admitted, at).toBeLessThanOrEqual(admission);
      expect(c.sales, at).toBe(d.gross);
      expect(c.sale, at).toBe(d.sale);
      expect(addOnsSub(), at).toBe(`plus ${fmt(sold('parking'))} parking and ${fmt(sold('wristband'))} rides`);
      if (state.applied && !['adult', 'child', 'family'].includes(state.applied.sale.typeId)) {
        addOnOnly += 1;
        expect(c.sold, `${at}: an add-on sale leaves the tickets`).toBe(ticketsBefore);
      }
    }
    expect(addOnOnly).toBeGreaterThan(300); // add-on sales were exercised
    live.destroy();
  }, 180000);

  it('there is one timer: a tick interval produces exactly one sale on both boards', () => {
    reduced = true;
    const { boardEl, dashEl } = loadHome();
    const live = mountHomeLive({ paused: false, boardEl, dashEl, intervalMs: 1700, rng: mulberry32(4) });
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
    const live = mountHomeLive({ paused: false, boardEl, dashEl, intervalMs: 1000, rng: mulberry32(8) });

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
    const live = mountHomeLive({ paused: false, boardEl, dashEl, intervalMs: 1000, rng: mulberry32(3) });
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
    // Every sale moves the gross (an add-on sale leaves Tickets today as it was).
    expect(dashEl.querySelector('[data-tile="gross"]').hasAttribute('data-counting')).toBe(true);
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
    const live = mountHomeLive({ paused: false, boardEl, dashEl, intervalMs: 1000, rng: mulberry32(6) });
    setHidden(true);
    vi.advanceTimersByTime(60000);
    expect(dashboard(dashEl).orders).toBe(1512);
    expect(compact(boardEl).sold).toBe(2880);
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
    const boardOnly = mountHomeLive({ paused: false, boardEl, dashEl: null, intervalMs: 1000, rng: mulberry32(3) });
    vi.advanceTimersByTime(1000);
    expect(compact(boardEl).sales).not.toBe(61284); // every sale moves the money
    expect(dashboard(dashEl).orders).toBe(1512); // left as served
    boardOnly.destroy();

    ({ boardEl, dashEl } = loadHome());
    const dashOnly = mountHomeLive({ paused: false, boardEl: null, dashEl, intervalMs: 1000, rng: mulberry32(3) });
    vi.advanceTimersByTime(1000);
    expect(dashboard(dashEl).orders).toBe(1513);
    expect(compact(boardEl).sold).toBe(2880); // left as served
    dashOnly.destroy();
  });

  it('destroy() stops everything; a later tick() does nothing', () => {
    const { boardEl, dashEl } = loadHome();
    const live = mountHomeLive({ paused: false, boardEl, dashEl, intervalMs: 1000, rng: mulberry32(2) });
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
    const live = mountHomeLive({ paused: false, boardEl, dashEl, rng: () => 0.5 });
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
    const live = mountHomeLive({ paused: false, boardEl, dashEl, intervalMs: 3600 * 1000, rng: mulberry32(7) });
    vi.advanceTimersByTime(3600 * 1000 * 4);
    expect(dashboard(dashEl).orders).toBe(1516);
    expect(compact(boardEl).sales).not.toBe(61284);
    vi.advanceTimersByTime(3600 * 1000);
    expect(dashboard(dashEl).orders).toBe(1512);
    expect(compact(boardEl)).toMatchObject({ sold: 2880, scanned: 2618, sales: 61284, rows: 3 });
    expect(feedRows(boardEl).map((li) => li.outerHTML)).toEqual(served.rows);
    expect(dashboard(dashEl)).toMatchObject({ tickets: 2880, admitted: 2618, gross: 61284 });
    expect(dashEl.querySelector('[data-f="tickets-sub"]').textContent).toBe('plus 279 parking and 788 rides');
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
      const live = mountHomeLive({ paused: false, boardEl, dashEl });
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

  describe('one board failing cannot stop the other', () => {
    let errors;
    beforeEach(() => { errors = vi.spyOn(console, 'error').mockImplementation(() => {}); });
    afterEach(() => errors.mockRestore());

    it('a compact board that throws on a tick still lets the dashboard take the sale', () => {
      reduced = true;
      const { boardEl, dashEl } = loadHome();
      const live = mountHomeLive({ paused: false, boardEl, dashEl, intervalMs: 1000, rng: mulberry32(6) });
      boardEl.querySelector = () => { throw new Error('board failed'); };
      expect(() => vi.advanceTimersByTime(1000)).not.toThrow();
      expect(dashboard(dashEl).orders).toBe(1513);
      vi.advanceTimersByTime(1000);
      expect(dashboard(dashEl).orders).toBe(1514);
      expect(errors).toHaveBeenCalled();
      live.destroy();
    });

    it('a dashboard that throws on a tick still lets the compact board take the sale', () => {
      reduced = true;
      const { boardEl, dashEl } = loadHome();
      const live = mountHomeLive({ paused: false, boardEl, dashEl, intervalMs: 1000, rng: mulberry32(6) });
      const sales = compact(boardEl).sales;
      dashEl.querySelector = () => { throw new Error('dashboard failed'); };
      expect(() => vi.advanceTimersByTime(1000)).not.toThrow();
      expect(compact(boardEl).sales).not.toBe(sales);
      expect(errors).toHaveBeenCalled();
      live.destroy();
    });

    it('a dashboard whose first render throws is undone and the compact board keeps ticking', () => {
      reduced = true;
      const { boardEl, dashEl } = loadHome();
      Object.defineProperty(document, 'fullscreenEnabled', { configurable: true, get: () => true });
      dashEl.querySelector('.db-screen').requestFullscreen = vi.fn(() => Promise.resolve());
      dashEl.querySelector('.db-chart svg').querySelector = () => { throw new Error('chart failed'); };
      try {
        const live = mountHomeLive({ paused: false, boardEl, dashEl, intervalMs: 1000, rng: mulberry32(6) });
        expect(errors).toHaveBeenCalled();
        expect(dashEl.querySelector('[data-fullscreen]').hasAttribute('hidden')).toBe(true);
        const sales = compact(boardEl).sales;
        vi.advanceTimersByTime(1000);
        expect(compact(boardEl).sales).not.toBe(sales);
        expect(dashboard(dashEl).orders).toBe(1512); // left as served
        live.destroy();
        expect(vi.getTimerCount()).toBe(0);
      } finally {
        delete document.fullscreenEnabled;
      }
    });

    it('a dashboard that fails while it is being set up is left as served; the compact board ticks and its Pause works', () => {
      reduced = true;
      const { boardEl, dashEl } = loadHome();
      dashEl.querySelector('.db-chart').remove(); // the dashboard view cannot be built without its chart
      const live = mountHomeLive({ paused: false, boardEl, dashEl, intervalMs: 1000, rng: mulberry32(6) });
      expect(errors).toHaveBeenCalled();
      expect(dashEl.querySelector('button[data-pause]').hasAttribute('hidden')).toBe(true); // left as served
      const sales = compact(boardEl).sales;
      vi.advanceTimersByTime(1000);
      expect(compact(boardEl).sales).not.toBe(sales);
      expect(dashboard(dashEl).orders).toBe(1512); // left as served
      // The hero board's Pause button pauses it, and Resume starts it again.
      const pause = boardEl.querySelector('button[data-pause]');
      expect(pause.hasAttribute('hidden')).toBe(false);
      pause.click();
      expect(pause.querySelector('[data-pause-label]').textContent).toBe('Resume');
      const paused = compact(boardEl);
      vi.advanceTimersByTime(10000);
      expect(compact(boardEl)).toEqual(paused);
      expect(vi.getTimerCount()).toBe(0);
      pause.click();
      expect(pause.querySelector('[data-pause-label]').textContent).toBe('Pause');
      vi.advanceTimersByTime(1000);
      expect(compact(boardEl).sales).not.toBe(paused.sales);
      live.destroy();
      expect(vi.getTimerCount()).toBe(0);
    });
  });

  describe('the pause buttons (WCAG 2.2.2)', () => {
    const buttons = (boardEl, dashEl) => [boardEl.querySelector('button[data-pause]'), dashEl.querySelector('button[data-pause]')];
    const word = (btn) => btn.querySelector('[data-pause-label]').textContent;
    const figures = (boardEl, dashEl) => ({ board: boardEl.innerHTML.replace(/\shidden=""/g, ''), dash: dashEl.innerHTML.replace(/\shidden=""/g, '') });

    it('each board has one real button, hidden as served; mounting shows both and destroy() hides them again', () => {
      const { boardEl, dashEl } = loadHome();
      const [a, b] = buttons(boardEl, dashEl);
      for (const btn of [a, b]) {
        expect(btn).not.toBeNull();
        expect(btn.getAttribute('type')).toBe('button');
        expect(btn.hasAttribute('hidden')).toBe(true);
        expect(word(btn)).toBe('Pause');
        expect(btn.querySelector('.visually-hidden').textContent.trim().length).toBeGreaterThan(0);
      }
      expect(boardEl.querySelectorAll('button')).toHaveLength(1);
      expect(a.textContent).not.toBe(b.textContent); // each says which board it pauses
      const live = mountHomeLive({ paused: false, boardEl, dashEl });
      expect(a.hasAttribute('hidden')).toBe(false);
      expect(b.hasAttribute('hidden')).toBe(false);
      live.destroy();
      expect(a.hasAttribute('hidden')).toBe(true);
      expect(b.hasAttribute('hidden')).toBe(true);
    });

    it('one press on either button pauses both boards: nothing ticks, no figure changes, both buttons read Resume', () => {
      for (const which of [0, 1]) {
        const { boardEl, dashEl } = loadHome();
        const live = mountHomeLive({ paused: false, boardEl, dashEl, intervalMs: 1700, rng: mulberry32(9) });
        vi.advanceTimersByTime(1700 * 3);
        const btns = buttons(boardEl, dashEl);
        btns[which].click();
        expect(btns.map(word)).toEqual(['Resume', 'Resume']);
        expect(vi.getTimerCount()).toBe(0);
        expect(frames.size).toBe(0);
        const frozen = figures(boardEl, dashEl);
        vi.advanceTimersByTime(3 * 60 * 60 * 1000); // three hours
        live.tick();
        flushFrames();
        expect(figures(boardEl, dashEl)).toEqual(frozen);
        live.destroy();
      }
    });

    it('a press mid count-up settles the dashboard on the figures it was heading to, and nothing runs after', () => {
      const { boardEl, dashEl } = loadHome();
      const live = mountHomeLive({ paused: false, boardEl, dashEl, intervalMs: 1000, rng: mulberry32(3) });
      vi.advanceTimersByTime(1000);
      expect(frames.size).toBe(1); // counting up
      buttons(boardEl, dashEl)[0].click();
      expect(frames.size).toBe(0);
      expect(dashEl.querySelector('[data-counting]')).toBeNull();
      expect(dashboard(dashEl).tickets).toBe(compact(boardEl).sold);
      live.destroy();
    });

    it('stays paused when the tab is hidden and shown, when the boards scroll away and back, and under reduced motion', () => {
      reduced = true;
      globalThis.IntersectionObserver = FakeIO;
      const { boardEl, dashEl } = loadHome();
      const live = mountHomeLive({ paused: false, boardEl, dashEl, intervalMs: 1000, rng: mulberry32(6) });
      fire(boardEl, true);
      fire(dashEl, true);
      buttons(boardEl, dashEl)[1].click();
      const frozen = figures(boardEl, dashEl);
      setHidden(true);
      setHidden(false);
      fire(boardEl, false);
      fire(dashEl, false);
      fire(boardEl, true);
      fire(dashEl, true);
      vi.advanceTimersByTime(60000);
      expect(vi.getTimerCount()).toBe(0);
      expect(figures(boardEl, dashEl)).toEqual(frozen);
      expect(buttons(boardEl, dashEl).map(word)).toEqual(['Resume', 'Resume']);
      live.destroy();
    });

    it('both boards start paused for a visitor who asks for less motion, and their dots stop', () => {
      reduced = true;
      globalThis.IntersectionObserver = FakeIO;
      const { boardEl, dashEl } = loadHome();
      const live = mountHomeLive({ boardEl, dashEl, intervalMs: 1000, rng: mulberry32(6) });
      fire(boardEl, true);
      fire(dashEl, true);
      const frozen = figures(boardEl, dashEl);
      vi.advanceTimersByTime(60000);
      expect(figures(boardEl, dashEl)).toEqual(frozen);
      expect(buttons(boardEl, dashEl).map(word)).toEqual(['Resume', 'Resume']);
      expect([boardEl, dashEl].map((el) => el.hasAttribute('data-paused'))).toEqual([true, true]);
      buttons(boardEl, dashEl)[0].click();
      expect([boardEl, dashEl].map((el) => el.hasAttribute('data-paused'))).toEqual([false, false]);
      vi.advanceTimersByTime(5000);
      expect(figures(boardEl, dashEl)).not.toEqual(frozen);
      live.destroy();
    });

    it('Resume continues from the same figures: the next sale lands on both boards and they agree', () => {
      reduced = true;
      const { boardEl, dashEl } = loadHome();
      const live = mountHomeLive({ paused: false, boardEl, dashEl, intervalMs: 1000, rng: mulberry32(6) });
      vi.advanceTimersByTime(2000);
      const btns = buttons(boardEl, dashEl);
      btns[0].click();
      const frozen = { c: compact(boardEl), d: dashboard(dashEl) };
      vi.advanceTimersByTime(30000);
      btns[1].click();
      expect(btns.map(word)).toEqual(['Pause', 'Pause']);
      vi.advanceTimersByTime(999);
      expect(dashboard(dashEl).orders).toBe(frozen.d.orders);
      vi.advanceTimersByTime(1);
      expect(dashboard(dashEl).orders).toBe(frozen.d.orders + 1);
      expect(compact(boardEl).sales).not.toBe(frozen.c.sales);
      expect(compact(boardEl).sold).toBe(dashboard(dashEl).tickets);
      expect(compact(boardEl).sales).toBe(dashboard(dashEl).gross);
      live.destroy();
    });

    it('destroy() removes both listeners', () => {
      const { boardEl, dashEl } = loadHome();
      const live = mountHomeLive({ paused: false, boardEl, dashEl, intervalMs: 1000 });
      const btns = buttons(boardEl, dashEl);
      live.destroy();
      btns.forEach((btn) => btn.click());
      expect(btns.map(word)).toEqual(['Pause', 'Pause']);
      expect(vi.getTimerCount()).toBe(0);
    });

    it('a missing dashboard still leaves a compact board whose button pauses it', () => {
      reduced = true;
      const { boardEl } = loadHome();
      const live = mountHomeLive({ paused: false, boardEl, dashEl: null, intervalMs: 1000, rng: mulberry32(3) });
      boardEl.querySelector('button[data-pause]').click();
      const frozen = boardEl.innerHTML;
      vi.advanceTimersByTime(10000);
      expect(boardEl.innerHTML).toBe(frozen);
      live.destroy();
    });
  });
});
