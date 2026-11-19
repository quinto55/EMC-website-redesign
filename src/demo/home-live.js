// The home page's two live sample boards on one sample day. Browser only.
import { createDashState, advance, dashSnapshot } from './dashboard-engine.js';
import { createBoardView } from './board-view.js';
import { createDashboardView } from './dashboard-view.js';
import { runWhileVisible } from './lifecycle.js';

/**
 * Brings the hero's compact board (`boardEl`, its [data-board] root) and the full dashboard (`dashEl`, its
 * [data-dashboard] root) to life on one sample day: one dashboard state, one timer. Each tick advances the day once
 * and shows it on both, the dashboard from its snapshot and the compact board from the board state the dashboard
 * wraps, so their figures always agree (the dashboard's count up to them). It ticks while the tab is showing and at
 * least one of the two is on screen, and never catches up on ticks it missed. An off-screen dashboard takes its new
 * figures at once, so no animation frame runs for a board nobody sees. Either element may be missing; the other still
 * works. After destroy() nothing runs.
 */
export function mountHomeLive({ boardEl = null, dashEl = null, intervalMs = 1700, rng = Math.random } = {}) {
  let state = createDashState();
  const board = boardEl ? createBoardView(boardEl) : null;
  const dash = dashEl ? createDashboardView(dashEl) : null;
  dash?.render(dashSnapshot(state)); // what the board already shows: this only fits its chart to its box
  let dashInView = true;
  let destroyed = false;

  function tick() {
    if (destroyed) return;
    state = advance(state, rng, { seconds: intervalMs / 1000 });
    board?.render(state.board);
    if (dash) {
      dash.render(dashSnapshot(state));
      if (!dashInView) dash.settle();
    }
  }

  // One timer, running while at least one board is in view (on screen, with the tab showing).
  const inView = new Set();
  let timer = null;
  const update = () => {
    if (inView.size && timer === null && !destroyed) timer = setInterval(tick, intervalMs);
    else if (!inView.size && timer !== null) {
      clearInterval(timer);
      timer = null;
    }
  };
  const watch = (el, onChange = () => {}) => runWhileVisible(el, {
    start: () => {
      inView.add(el);
      onChange(true);
      update();
    },
    stop: () => {
      inView.delete(el);
      onChange(false);
      update();
    },
  });
  const cleanups = [];
  if (boardEl) cleanups.push(watch(boardEl));
  if (dashEl) {
    cleanups.push(watch(dashEl, (shown) => {
      dashInView = shown;
      if (!shown) dash.settle();
    }));
  }

  function destroy() {
    if (destroyed) return;
    destroyed = true;
    for (const cleanup of cleanups) cleanup();
    clearInterval(timer);
    timer = null;
    dash?.destroy();
  }

  return { tick, destroy };
}
