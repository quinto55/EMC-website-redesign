// Runs the gate scanning demo on the markup the page was served with. Browser only.
import { initialScanState, scanReduce, scanResult, renderGateScanInner, SAMPLE_TICKET, barcodeTail } from './gate-scan.js';
import { tryItemHTML } from './dashboard-markup.js';
import { count } from './board-engine.js';
import { DAY_END_MIN } from './pace.js';

/**
 * Where and when the visitor's nth scan happens. The first is at Main Gate at 2:14 PM; every later one is at North
 * Gate, from 2:21 PM, a minute apart: a shared or copied ticket tried at another gate, and each press reads (and is
 * announced) as a new scan. However often it is pressed, the clock stops at the sample day's last minute (10:59 PM;
 * the fair closes at 11 PM).
 */
const FIRST = { minute: 14 * 60 + 14, gate: 'Main Gate' };
const AGAIN = { minute: 14 * 60 + 21, gate: 'North Gate' };
function scanAt(n) {
  const { minute, gate } = n <= 1 ? FIRST : { minute: Math.min(AGAIN.minute + (n - 2), DAY_END_MIN - 1), gate: AGAIN.gate };
  const h = Math.floor(minute / 60);
  return { gate, at: `${h % 12 === 0 ? 12 : h % 12}:${String(minute % 60).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}` };
}

const ICONS = {
  admitted: '<path d="M6 12.5l4 4 8-9" />',
  refused: '<path d="M7.5 7.5l9 9M16.5 7.5l-9 9" />',
};
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/**
 * Text whose lines break only between its parts: between the parts of the gate's answer (at its " · "), and never
 * inside a time ("2:14 PM") or a gate's name ("Main Gate").
 */
const KEEP = /\d{1,2}:\d{2} [AP]M|\S+ Gate/g;
function keepTogether(text) {
  const parts = text.split(' · ');
  if (parts.length > 1) return parts.map((p, i) => `<span class="gs-keep">${esc(p)}${i < parts.length - 1 ? ' ·' : ''}</span>`).join(' ');
  return esc(text).replace(KEEP, (m) => `<span class="gs-keep">${m}</span>`);
}

/**
 * What the phone shows: the icon and word; for an admission the gate's answer; then where and when this scan was.
 * A refusal shows only "Duplicate" there: when and where the ticket was first used is the live board's to show.
 */
function resultHTML(r, kind, scan) {
  return [
    `<p class="gs-result__title"><svg class="gs-result__icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">${ICONS[kind]}</svg>${esc(r.title)}</p>`,
    r.ok ? `<p class="gs-result__detail">${keepTogether(r.detail)}</p>` : '',
    `<p class="gs-result__where">${keepTogether(`${scan.gate} · ${scan.at}`)}</p>`,
  ].filter(Boolean).join(' ');
}

/**
 * What the status element says for a scan, once: the result and where and when it was; for an admission the gate's
 * answer too; and on the first refusal, what the live board's Fraud watch panel beside the phone shows (later refusals
 * say only the result, where and when: the panel says the same as before).
 */
function spokenText(r, scan, state) {
  if (r.ok) return `${r.title}. ${r.detail}. ${scan.gate}, ${scan.at}.`;
  const board = state.scans === 2 ? ` The live board's Fraud watch shows it was ${r.detail}.` : '';
  return `${r.title}. ${scan.gate}, ${scan.at}.${board}`;
}

/**
 * Takes over the demo the page was served with (`el` is its [data-demo="gate-scanning"] root; an empty one is filled
 * first) and shows its buttons. "Scan ticket" scans the sample ticket, its label then becoming "Scan the same ticket
 * again"; focus stays on it. "Start over" appears after the first scan; when it is pressed it goes away, so focus moves
 * to the scan button. Each result replaces the last in the phone, and is announced by the one status element (not
 * drawn, outside the phone); before the first, a resting line holds its place. A refusal also shows the live board's
 * Fraud watch panel under the buttons: the count of times the ticket was presented again and its row, in the board's
 * two lines. After destroy() the buttons, the panel and the resting line are hidden again and the demo is as it was
 * served.
 */
export function mountGateScan(el) {
  if (!el.querySelector('[data-gs-scan]')) el.innerHTML = renderGateScanInner();
  const scanButton = el.querySelector('[data-gs-scan]');
  const resetButton = el.querySelector('[data-gs-reset]');
  const result = el.querySelector('[data-gs-result]');
  const status = el.querySelector('[data-gs-status]');
  const rest = el.querySelector('[data-gs-rest]');
  const board = el.querySelector('[data-gs-board]');
  const boardCount = board.querySelector('[data-gs-count]');
  const boardTries = board.querySelector('[data-gs-tries]');
  let state = initialScanState();
  let lastScan = null;
  let destroyed = false;

  function render() {
    const r = scanResult(state);
    const kind = r ? (r.ok ? 'admitted' : 'refused') : null;
    if (kind) result.setAttribute('data-result', kind);
    else result.removeAttribute('data-result');
    result.innerHTML = r ? resultHTML(r, kind, lastScan) : '';
    status.textContent = r ? spokenText(r, lastScan, state) : '';
    scanButton.textContent = state.step === 'ready' ? 'Scan ticket' : 'Scan the same ticket again';
    resetButton.hidden = state.step === 'ready';
    rest.hidden = state.step !== 'ready';

    const refused = state.step === 'refused';
    board.hidden = !refused;
    boardCount.textContent = refused ? count(state.scans - 1) : '0';
    // The latest try, as the board's row draws it (the dashboard's own row markup; the board would add its age).
    boardTries.innerHTML = refused ? tryItemHTML({
      id: 'try', tail: barcodeTail(SAMPLE_TICKET.barcode), gate: lastScan.gate,
      firstLabel: state.firstScan.at, firstGate: state.firstScan.gate, timeLabel: '',
    }) : '';
  }

  function onScan() {
    if (destroyed) return;
    lastScan = scanAt(state.scans + 1);
    state = scanReduce(state, { type: 'scan', ...lastScan });
    render();
  }

  function onReset() {
    if (destroyed) return;
    const hadFocus = document.activeElement === resetButton;
    state = scanReduce(state, { type: 'reset' });
    lastScan = null;
    render();
    if (hadFocus) scanButton.focus();
  }

  scanButton.addEventListener('click', onScan);
  resetButton.addEventListener('click', onReset);
  render();
  scanButton.hidden = false;

  function destroy() {
    if (destroyed) return;
    destroyed = true;
    scanButton.removeEventListener('click', onScan);
    resetButton.removeEventListener('click', onReset);
    state = initialScanState();
    lastScan = null;
    render();
    scanButton.hidden = true;
    rest.hidden = true;
  }

  return { destroy };
}
