// Runs the gate scanning demo on the markup the page was served with. Browser only.
import { initialScanState, scanReduce, scanResult, renderGateScanInner } from './gate-scan.js';

/**
 * Where and when the visitor's nth scan happens. The first is at Main Gate at 2:14 PM; every later one is at North
 * Gate, from 2:21 PM, a minute apart: a shared or copied ticket tried at another gate, and each press reads (and is
 * announced) as a new scan.
 */
const FIRST = { minute: 14 * 60 + 14, gate: 'Main Gate' };
const AGAIN = { minute: 14 * 60 + 21, gate: 'North Gate' };
function scanAt(n) {
  const { minute, gate } = n <= 1 ? FIRST : { minute: AGAIN.minute + (n - 2), gate: AGAIN.gate };
  const m = minute % (24 * 60);
  const h = Math.floor(m / 60);
  return { gate, at: `${h % 12 === 0 ? 12 : h % 12}:${String(m % 60).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}` };
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

/** A result: its icon and word, the gate's answer, then where and when this scan was (spaced, so it reads as words). */
function resultHTML(r, kind, scan) {
  return [
    `<p class="gs-result__title"><svg class="gs-result__icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">${ICONS[kind]}</svg>${esc(r.title)}</p>`,
    `<p class="gs-result__detail">${keepTogether(r.detail)}</p>`,
    `<p class="gs-result__where">${keepTogether(`${scan.gate} · ${scan.at}`)}</p>`,
  ].join(' ');
}

/**
 * Takes over the demo the page was served with (`el` is its [data-demo="gate-scanning"] root; an empty one is filled
 * first) and shows its buttons. "Scan ticket" scans the sample ticket, its label then becoming "Scan the same ticket
 * again"; focus stays on it. "Start over" appears after the first scan; when it is pressed it goes away, so focus moves
 * to the scan button. Each result replaces the last inside the one status element. After destroy() the buttons are
 * hidden again and the demo is as it was served.
 */
export function mountGateScan(el) {
  if (!el.querySelector('[data-gs-scan]')) el.innerHTML = renderGateScanInner();
  const scanButton = el.querySelector('[data-gs-scan]');
  const resetButton = el.querySelector('[data-gs-reset]');
  const status = el.querySelector('[data-gs-result]');
  const note = el.querySelector('[data-gs-note]');
  let state = initialScanState();
  let lastScan = null;
  let destroyed = false;

  function render() {
    const r = scanResult(state);
    const kind = r ? (r.ok ? 'admitted' : 'refused') : null;
    if (kind) status.setAttribute('data-result', kind);
    else status.removeAttribute('data-result');
    status.innerHTML = r ? resultHTML(r, kind, lastScan) : '';
    scanButton.textContent = state.step === 'ready' ? 'Scan ticket' : 'Scan the same ticket again';
    resetButton.hidden = state.step === 'ready';
    note.hidden = state.step !== 'refused';
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
  }

  return { destroy };
}
