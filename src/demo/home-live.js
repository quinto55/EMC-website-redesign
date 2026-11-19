// The home page's two live sample boards on one sample day. Browser only.
import { createDashState, advance, dashSnapshot } from './dashboard-engine.js';
import { createBoardView } from './board-view.js';
import { createDashboardView } from './dashboard-view.js';
import { runWhileVisible } from './lifecycle.js';
import { createPause } from './pause.js';

/**
 * The compact board's two channel percents, taken from the dashboard's Money panel rather than rounded again: Online
 * is the Online card share, Box office the Box-office card share plus the Cash share. They sum to 100.
 */
function channelShares(snap) {
  const share = (id) => snap.tenders.find((x) => x.id === id).share;
  return [share('card_online'), share('card_present') + share('cash')];
}

function attempt(step) {
  try {
    step();
  } catch (err) {
    console.error(err);
  }
}

/**
 * Brings the hero's compact board (`boardEl`, its [data-board] root) and the full dashboard (`dashEl`, its
 * [data-dashboard] root) to life on one sample day: one dashboard state, one timer. Each tick advances the day once
 * and shows it on both, the dashboard from its snapshot and the compact board from the board state the dashboard
 * wraps, with its two percents from the dashboard's Money panel, so their figures always agree (the dashboard's
 * count up to them). It ticks while the tab is showing and at least one of the two is on screen, and never catches up
 * on ticks it missed. Each board has a Pause button; the two share one day, so one press on either pauses both (the
 * timer stops, no sale lands and no count-up runs) and both read "Resume"; a paused day stays paused whatever the tab
 * or the scroll position does. An off-screen dashboard takes its new figures at once, so no animation frame runs for a board
 * nobody sees. Either element may be missing; the other still works. After destroy() nothing runs.
 */
export function mountHomeLive({ boardEl = null, dashEl = null, intervalMs = 1700, rng = Math.random } = {}) {
  let state = createDashState();
  const pause = createPause();
  const board = boardEl ? createBoardView(boardEl, { pause }) : null;
  let dash = null;
  try {
    dash = dashEl ? createDashboardView(dashEl, { pause }) : null;
    dash?.render(dashSnapshot(state)); // what the board already shows: this only fits its chart to its box
  } catch (err) {
    console.error(err);
    dash?.destroy(); // a dashboard that cannot be built or started is left as served; the compact board still runs
    dash = null;
  }
  let dashInView = true;
  let destroyed = false;

  function tick() {
    if (destroyed || pause.paused) return;
    state = advance(state, rng, { seconds: intervalMs / 1000 });
    const snap = dashSnapshot(state);
    // Each board is drawn on its own: one failing cannot skip the other.
    attempt(() => board?.render(state.board, { shares: channelShares(snap) }));
    if (dash) {
      attempt(() => {
        dash.render(snap);
        if (!dashInView) dash.settle();
      });
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
    pause,
  });
  const cleanups = [];
  if (boardEl) cleanups.push(watch(boardEl));
  if (dash) {
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
    board?.destroy();
    dash?.destroy();
  }

  return { tick, destroy };
}
