// The board card as HTML. Pure (no browser globals): the generator uses it at build time,
// and the board view uses the same pieces to change the board in place.
import { FAIR } from './sample-fair.js';
import { count, money } from './board-engine.js';
import { pauseButtonHTML } from './pause.js';

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** The three big figures as shown, keyed by their data-k names. */
export function boardFigures(snap) {
  return { sold: count(snap.tickets), scanned: count(snap.scanned), money: money(snap.sales) };
}

/** One sale in the feed. Its data-id lets the board view keep the rows it already shows. */
export function feedRowHTML(s) {
  return `<li data-id="${esc(s.id)}"><b>${s.qty} × ${esc(s.typeName)}</b><span>${esc(s.place)}</span></li>`;
}

/** Everything inside the board's root element. */
export function renderBoardInner(snap) {
  const channels = snap.channels
    .map((c) => `<div class="ch"><span>${esc(c.name)}</span><i style="--w:${c.share}%"></i><em>${c.share}%</em></div>`)
    .join('');
  const feed = snap.feed.map(feedRowHTML).join('');
  const k = boardFigures(snap);
  return `
<div class="bd-top"><span class="pill-live">Live</span><span class="bd-name">${esc(FAIR.name)}, ${esc(FAIR.day)}</span><span class="pill-sample">Sample data</span>${pauseButtonHTML('bd-pause', 'the sample sales board')}</div>
<div class="kpis">
  <div class="kpi"><b data-k="sold">${k.sold}</b><span>Tickets sold today</span></div>
  <div class="kpi"><b data-k="scanned">${k.scanned}</b><span>Scanned in</span></div>
  <div class="kpi"><b data-k="money">${k.money}</b><span>Sales today</span></div>
</div>
<div class="chs">${channels}</div>
<ul class="feed">${feed}</ul>
`;
}

/** The whole board card. The root carries data-sample so every figure sits inside a marked sample. */
export function renderBoardHTML(snap) {
  return `<div class="board" data-board data-sample role="group" aria-label="Sample live sales board">${renderBoardInner(snap)}</div>`;
}
