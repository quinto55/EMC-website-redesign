// Brings a served board to life. Browser only.
import { createBoardState, nextSale, snapshot } from './board-engine.js';
import { renderBoardInner, boardFigures, feedRowHTML } from './board-markup.js';
import { runWhileVisible } from './lifecycle.js';
import { createPause, bindPauseButton } from './pause.js';

const setText = (node, text) => {
  if (node && node.textContent !== text) node.textContent = text;
};

/**
 * Shows a board state on the board element the page was served with, changing it in place: the three figures, the
 * two bars and the feed. The feed keeps the rows it already shows (each row names its sale in data-id), so a new
 * sale is one new row at the top (it slides in as the feed's first row) and the oldest leaves; a state with no new
 * sale changes nothing; a board that starts its day again shows its opening rows again. Nothing else is rebuilt, so
 * a screen reader keeps its place in the board and the figures can be selected.
 *
 * `shares`, when given, are the two channel percents to show (Online, then Box office) in place of the board's own
 * rounding; the bars follow them. The home page passes the dashboard's, so the two boards' percents never differ.
 *
 * `pause` (src/demo/pause.js) is the pause state the board's Pause button toggles; the view shows the button and
 * keeps its word in step. destroy() hides the button again and removes its listener.
 */
export function createBoardView(el, { feedSize = 3, pause = createPause() } = {}) {
  const unbindPause = bindPauseButton(el.querySelector('[data-pause]'), pause);
  function render(state, { shares } = {}) {
    const snap = snapshot(state, { feedSize });
    for (const [k, text] of Object.entries(boardFigures(snap))) setText(el.querySelector(`[data-k="${k}"]`), text);
    el.querySelectorAll('.ch').forEach((row, i) => {
      const share = shares ? shares[i] : snap.channels[i]?.share;
      if (share === undefined) return;
      row.querySelector('i')?.style.setProperty('--w', `${share}%`);
      setText(row.querySelector('em'), `${share}%`);
    });
    const feed = el.querySelector('.feed');
    if (!feed) return;
    const wanted = new Set(snap.feed.map((s) => s.id));
    for (const row of [...feed.children]) if (!wanted.has(row.getAttribute('data-id'))) row.remove();
    snap.feed.forEach((sale, i) => {
      if ([...feed.children].some((row) => row.getAttribute('data-id') === sale.id)) return;
      const ref = feed.children[i] ?? null;
      if (ref) ref.insertAdjacentHTML('beforebegin', feedRowHTML(sale));
      else feed.insertAdjacentHTML('beforeend', feedRowHTML(sale));
    });
  }
  return { render, destroy: unbindPause };
}

/**
 * Takes over the board element the page was served with. The served markup already shows
 * the opening figures, so nothing changes until the first sale. Ticks only while visible and not paused.
 */
export function mountBoard(el, { feedSize = 3, intervalMs = 1700, rng = Math.random } = {}) {
  let state = createBoardState();
  if (!el.querySelector('[data-k]')) el.innerHTML = renderBoardInner(snapshot(state, { feedSize }));
  const pause = createPause();
  const view = createBoardView(el, { feedSize, pause });

  function tick() {
    if (pause.paused) return;
    state = nextSale(state, rng).state;
    view.render(state);
  }

  let timer = null;
  const cleanup = runWhileVisible(el, {
    start: () => { timer = setInterval(tick, intervalMs); },
    stop: () => { clearInterval(timer); timer = null; },
    pause,
  });

  return {
    tick,
    destroy() {
      cleanup();
      view.destroy();
    },
  };
}
