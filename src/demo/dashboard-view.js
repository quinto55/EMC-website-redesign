// Brings the served dashboard to life. Browser only.
import { createDashState, advance, dashSnapshot } from './dashboard-engine.js';
import {
  renderDashboardInner, dashFields, TILES, TRIES_SHOWN, CHART_SIZE, paceChartParts, sparkParts, sparkMax, meterFill,
  feedItemHTML, tryItemHTML, alertHTML,
} from './dashboard-markup.js';
import { count } from './board-engine.js';
import { runWhileVisible } from './lifecycle.js';
import { createPause, bindPauseButton } from './pause.js';

const COUNT_UP_MS = 800;
const COUNT_UP_FRAMES = 48;

/**
 * The values a tile shows on its way from `from` to `to`, one per frame: ease-out cubic, whole numbers, the last
 * exactly `to` (the real board's counter).
 */
function counterFrames(from, to, steps) {
  const n = Math.max(1, Math.floor(steps));
  return Array.from({ length: n }, (_, i) => (i === n - 1 ? to : Math.round(from + (to - from) * (1 - (1 - (i + 1) / n) ** 3))));
}

const reducedMotion = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches === true;
const setText = (node, text) => {
  if (node && node.textContent !== text) node.textContent = text;
};
const setAttr = (node, name, value) => {
  if (!node) return;
  if (value === null || value === undefined || value === false) node.removeAttribute(name);
  else if (node.getAttribute(name) !== String(value === true ? '' : value)) node.setAttribute(name, value === true ? '' : value);
};
const byId = (list, id) => [...list.children].find((n) => n.getAttribute('data-id') === id) ?? null;

/**
 * Keeps a list's rows in step with `items` (newest first): rows that left are removed, new ones inserted in place,
 * the rest kept (their age updated). Returns the rows it inserted.
 */
function syncRows(list, items, html) {
  const wanted = new Set(items.map((x) => x.id));
  for (const row of [...list.children]) if (!wanted.has(row.getAttribute('data-id'))) row.remove();
  const added = [];
  items.forEach((x, i) => {
    const row = byId(list, x.id);
    if (row) {
      setText(row.querySelector('[data-age]'), x.ageLabel ?? x.timeLabel);
      return;
    }
    const ref = list.children[i] ?? null;
    if (ref) ref.insertAdjacentHTML('beforebegin', html(x));
    else list.insertAdjacentHTML('beforeend', html(x));
    added.push(ref ? ref.previousElementSibling : list.lastElementChild);
  });
  return added;
}

/**
 * Shows dashboard snapshots on the dashboard the page was served with (`el` is its [data-dashboard] root), changing
 * text and attributes in place, never the board or a panel. The four tiles count up to each new figure over about
 * 800 ms (reduced motion jumps), asking for animation frames only while they are counting; settle() finishes a count
 * at once. Until its first render() the view knows only the figures the markup shows, so render what the board was
 * served with first: that draws the pace chart at its box's own size. `pause` (src/demo/pause.js) is the pause state
 * the board's Pause button toggles; the view shows the button and keeps its word in step. After destroy() nothing
 * runs, the Pause and Full screen buttons are hidden again and their listeners are gone.
 */
export function createDashboardView(el, { pause = createPause() } = {}) {
  const screen = el.querySelector('.db-screen');
  const fields = new Map([...el.querySelectorAll('[data-f]')].map((n) => [n.getAttribute('data-f'), n]));
  const tiles = TILES.map(([key, , value]) => {
    const out = fields.get(key);
    const shown = Number(out.textContent.replace(/\D/g, ''));
    return { key, value, box: el.querySelector(`[data-tile="${key}"]`), out, shown, target: shown, frames: null };
  });
  const feedList = el.querySelector('.db-feed__list');
  const tryList = el.querySelector('.db-fraud__list');
  const alertsRow = el.querySelector('.db-alerts');
  const clockTime = el.querySelector('[data-a="clock"]');
  const chartBox = el.querySelector('.db-chart');
  const chartSvg = chartBox.querySelector('svg');
  const chartParts = new Map([...chartSvg.querySelectorAll('[data-c]')].map((n) => [n.getAttribute('data-c'), n]));
  const sparks = new Map([...el.querySelectorAll('[data-gate]')].map((li) => [li.getAttribute('data-gate'), {
    li, flag: li.querySelector('.db-flag'), parts: new Map([...li.querySelectorAll('svg [data-c]')].map((n) => [n.getAttribute('data-c'), n])),
  }]));
  const unbindPause = bindPauseButton(el.querySelector('[data-pause]'), pause);
  let chartSize = { ...CHART_SIZE };
  let snap = null;
  let destroyed = false;

  const applyParts = (map, parts) => {
    for (const p of parts) {
      const node = map.get(p.c);
      if (!node) continue;
      for (const [k, v] of Object.entries(p.attrs)) setAttr(node, k, String(v));
      if (p.text !== undefined) setText(node, p.text);
    }
  };

  function drawChart() {
    if (!snap) return;
    const model = paceChartParts(snap.pace, chartSize);
    setAttr(chartSvg, 'viewBox', model.viewBox);
    const gold = chartSvg.querySelector('#db-gold');
    setAttr(gold, 'x1', String(model.defs.goldX1));
    setAttr(gold, 'x2', String(model.defs.goldX2));
    const glow = chartSvg.querySelector('#db-glow');
    setAttr(glow, 'width', String(model.defs.w));
    setAttr(glow, 'height', String(model.defs.h));
    applyParts(chartParts, model.parts);
  }

  /** The chart is drawn at its box's own size, so its labels stay the size of the board's small text. */
  function measureChart() {
    const r = chartBox.getBoundingClientRect();
    const size = { w: Math.round(r.width), h: Math.round(r.height) };
    if (size.w > 0 && size.h > 0 && (size.w !== chartSize.w || size.h !== chartSize.h)) {
      chartSize = size;
      drawChart();
    }
  }

  // ── The tiles count up over about 800 ms; reduced motion jumps. ──
  let raf = null;
  function finishCount() {
    if (raf !== null) {
      cancelAnimationFrame(raf);
      raf = null;
    }
    for (const t of tiles) {
      t.shown = t.target;
      t.frames = null;
      setText(t.out, count(t.target));
      setAttr(t.box, 'data-counting', null);
    }
  }
  function countUp() {
    const moving = tiles.filter((t) => t.target !== t.shown);
    if (!moving.length) return;
    if (reducedMotion() || typeof requestAnimationFrame !== 'function') {
      finishCount();
      return;
    }
    for (const t of moving) {
      t.frames = counterFrames(t.shown, t.target, COUNT_UP_FRAMES);
      setAttr(t.box, 'data-counting', true);
    }
    let start = null;
    const step = (now) => {
      raf = null;
      if (destroyed) return;
      if (start === null) start = now;
      const i = Math.max(0, Math.floor(((now - start) / COUNT_UP_MS) * COUNT_UP_FRAMES));
      let more = false;
      for (const t of moving) {
        if (!t.frames) continue;
        const k = Math.min(t.frames.length - 1, i);
        t.shown = t.frames[k];
        setText(t.out, count(t.shown));
        if (k < t.frames.length - 1) more = true;
        else {
          t.frames = null;
          setAttr(t.box, 'data-counting', null);
        }
      }
      if (more) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
  }

  function render(next) {
    if (destroyed) return;
    snap = next;
    for (const [key, text] of Object.entries(dashFields(snap))) setText(fields.get(key), text);
    setAttr(clockTime, 'datetime', snap.clock.datetime);

    finishCount();
    for (const t of tiles) t.target = t.value(snap.totals);
    countUp();

    const max = sparkMax(snap.gates);
    for (const g of snap.gates) {
      const s = sparks.get(g.id);
      if (!s) continue;
      const alert = g.slow ? snap.alerts.find((a) => a.text.startsWith(`${g.name} `)) : null;
      setAttr(s.li, 'data-slow', g.slow);
      setAttr(s.flag, 'hidden', !g.slow);
      setAttr(s.flag, 'title', alert ? alert.text : null);
      applyParts(s.parts, sparkParts(g.perMinute, max));
    }
    for (const x of snap.types) {
      const li = el.querySelector(`[data-type="${x.id}"]`);
      setAttr(li, 'data-state', x.state);
      setAttr(li?.querySelector('.db-meter > span'), 'style', `--fill:${meterFill(x)}`);
    }
    for (const x of snap.tenders) setAttr(el.querySelector(`.db-mix > [data-method="${x.id}"]`), 'style', `--part:${x.amount}`);
    for (const r of snap.registers) setAttr(fields.get(`reg-${r.id}-close`), 'data-close', r.close ? r.close.kind : null);
    for (const li of el.querySelectorAll('[data-fraud]')) setAttr(li, 'data-zero', snap.fraud[li.getAttribute('data-fraud')] === 0);

    for (const row of syncRows(feedList, snap.feed, feedItemHTML)) row?.classList.add('db-arrive');
    syncRows(tryList, snap.fraud.recent.slice(0, TRIES_SHOWN), tryItemHTML);

    // The alerts row keeps its place; an alert's text is changed where it stands.
    const rows = [...alertsRow.children];
    snap.alerts.forEach((a, i) => {
      if (rows[i]) setText(rows[i].querySelector('.db-alert__text'), a.text);
      else alertsRow.insertAdjacentHTML('beforeend', alertHTML(a));
    });
    rows.slice(snap.alerts.length).forEach((n) => n.remove());

    drawChart();
  }

  // ── Full screen, where the browser has the Fullscreen API (Safari on iPad: the webkit one). ──
  const fsButton = el.querySelector('[data-fullscreen]');
  const doc = document;
  const fsActive = () => (doc.fullscreenElement ?? doc.webkitFullscreenElement) === screen;
  const fsSupported = Boolean(doc.fullscreenEnabled || doc.webkitFullscreenEnabled) && Boolean(screen.requestFullscreen || screen.webkitRequestFullscreen);
  const onFullscreen = () => setText(fsButton, fsActive() ? 'Exit full screen' : 'Full screen');
  const toggleFullscreen = () => {
    const quiet = (p) => p?.catch?.(() => {});
    if (fsActive()) quiet(doc.exitFullscreen ? doc.exitFullscreen() : doc.webkitExitFullscreen?.());
    else quiet(screen.requestFullscreen ? screen.requestFullscreen() : screen.webkitRequestFullscreen?.());
  };
  if (fsButton && fsSupported) {
    fsButton.addEventListener('click', toggleFullscreen);
    doc.addEventListener('fullscreenchange', onFullscreen);
    doc.addEventListener('webkitfullscreenchange', onFullscreen);
    setAttr(fsButton, 'hidden', false);
  }

  measureChart();
  const resizes = typeof ResizeObserver === 'function' ? new ResizeObserver(() => measureChart()) : null;
  resizes?.observe(chartBox);

  function destroy() {
    if (destroyed) return;
    finishCount();
    destroyed = true;
    unbindPause();
    resizes?.disconnect();
    if (fsButton && fsSupported) {
      fsButton.removeEventListener('click', toggleFullscreen);
      doc.removeEventListener('fullscreenchange', onFullscreen);
      doc.removeEventListener('webkitfullscreenchange', onFullscreen);
      setAttr(fsButton, 'hidden', true);
    }
  }

  function settle() {
    if (!destroyed) finishCount();
  }

  return { render, settle, destroy };
}

/**
 * Takes over the dashboard the page was served with (`el` is its [data-dashboard] root). The served markup already
 * shows the opening board; each tick makes one sale and changes text and attributes in place, never the board or a
 * panel. Ticks only while the board is on screen and the tab is showing; the tiles count up with animation frames
 * only while they are counting. After destroy() nothing runs.
 */
export function mountDashboard(el, { intervalMs = 1700, rng = Math.random } = {}) {
  let state = createDashState();
  if (!el.querySelector('.db-screen')) {
    el.innerHTML = `<div class="db-screen">${renderDashboardInner(dashSnapshot(state))}</div><div class="db-stand" aria-hidden="true"></div>`;
  }
  const pause = createPause();
  const view = createDashboardView(el, { pause });
  try {
    view.render(dashSnapshot(state)); // what the board already shows: this only fits the chart to its box
  } catch (err) {
    view.destroy(); // nothing of the view's setup stays behind
    throw err;
  }
  let destroyed = false;

  function tick() {
    if (destroyed || pause.paused) return;
    state = advance(state, rng, { seconds: intervalMs / 1000 });
    view.render(dashSnapshot(state));
  }

  let timer = null;
  const cleanup = runWhileVisible(el, {
    start: () => { timer = setInterval(tick, intervalMs); },
    stop: () => {
      clearInterval(timer);
      timer = null;
      view.settle();
    },
    pause,
  });

  function destroy() {
    if (destroyed) return;
    cleanup();
    view.destroy();
    destroyed = true;
  }

  return { tick, destroy };
}
