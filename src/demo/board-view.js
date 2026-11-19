// Brings a served board to life. Browser only.
import { createBoardState, nextSale, snapshot } from './board-engine.js';
import { renderBoardInner, boardFigures, feedRowHTML } from './board-markup.js';
import { runWhileVisible } from './lifecycle.js';

/**
 * Takes over the board element the page was served with. The served markup already shows
 * the opening figures, so nothing changes until the first sale. Ticks only while visible.
 */
export function mountBoard(el, { feedSize = 3, intervalMs = 1700, rng = Math.random } = {}) {
  let state = createBoardState();
  if (!el.querySelector('[data-k]')) el.innerHTML = renderBoardInner(snapshot(state, { feedSize }));

  // Each sale changes the board in place: the three figures, the two bars and one new row at the top of
  // the feed (it slides in as the feed's first row), the oldest row dropped. Nothing else is rebuilt, so a
  // screen reader keeps its place in the board and the figures can be selected.
  function tick() {
    state = nextSale(state, rng).state;
    const snap = snapshot(state, { feedSize });
    for (const [k, text] of Object.entries(boardFigures(snap))) {
      const figure = el.querySelector(`[data-k="${k}"]`);
      if (figure) figure.textContent = text;
    }
    el.querySelectorAll('.ch').forEach((row, i) => {
      const channel = snap.channels[i];
      if (!channel) return;
      row.querySelector('i')?.style.setProperty('--w', `${channel.share}%`);
      const share = row.querySelector('em');
      if (share) share.textContent = `${channel.share}%`;
    });
    const feed = el.querySelector('.feed');
    if (feed && snap.feed.length) {
      feed.insertAdjacentHTML('afterbegin', feedRowHTML(snap.feed[0]));
      while (feed.children.length > snap.feed.length) feed.lastElementChild.remove();
    }
  }

  let timer = null;
  const cleanup = runWhileVisible(el, {
    start: () => { timer = setInterval(tick, intervalMs); },
    stop: () => { clearInterval(timer); timer = null; },
  });

  return { tick, destroy: cleanup };
}
