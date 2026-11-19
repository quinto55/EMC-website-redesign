// Brings a served board to life. Browser only.
import { createBoardState, nextSale, snapshot } from './board-engine.js';
import { renderBoardInner, boardFigures, feedRowHTML } from './board-markup.js';
import { runWhileVisible } from './lifecycle.js';

const setText = (node, text) => {
  if (node && node.textContent !== text) node.textContent = text;
};

/**
 * Shows a board state on the board element the page was served with, changing it in place: the three figures, the
 * two bars and the feed. The feed keeps the rows it already shows (each row names its sale in data-id), so a new
 * sale is one new row at the top (it slides in as the feed's first row) and the oldest leaves; a state with no new
 * sale changes nothing; a board that starts its day again shows its opening rows again. Nothing else is rebuilt, so
 * a screen reader keeps its place in the board and the figures can be selected.
 */
export function createBoardView(el, { feedSize = 3 } = {}) {
  function render(state) {
    const snap = snapshot(state, { feedSize });
    for (const [k, text] of Object.entries(boardFigures(snap))) setText(el.querySelector(`[data-k="${k}"]`), text);
    el.querySelectorAll('.ch').forEach((row, i) => {
      const channel = snap.channels[i];
      if (!channel) return;
      row.querySelector('i')?.style.setProperty('--w', `${channel.share}%`);
      setText(row.querySelector('em'), `${channel.share}%`);
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
  return { render };
}

/**
 * Takes over the board element the page was served with. The served markup already shows
 * the opening figures, so nothing changes until the first sale. Ticks only while visible.
 */
export function mountBoard(el, { feedSize = 3, intervalMs = 1700, rng = Math.random } = {}) {
  let state = createBoardState();
  if (!el.querySelector('[data-k]')) el.innerHTML = renderBoardInner(snapshot(state, { feedSize }));
  const view = createBoardView(el, { feedSize });

  function tick() {
    state = nextSale(state, rng).state;
    view.render(state);
  }

  let timer = null;
  const cleanup = runWhileVisible(el, {
    start: () => { timer = setInterval(tick, intervalMs); },
    stop: () => { clearInterval(timer); timer = null; },
  });

  return { tick, destroy: cleanup };
}
