// The gate scanning demo: one sample ticket, scanned once and then again. Pure (no browser globals): the page generator
// renders the starting state at build time, and the view (gate-scan-view.js) runs the scans.
//
// The words are the real product's (EMC-Ticketing-Platform at d4ad25e). A good ticket's answer is EMC's response text,
// the ticket type in capitals, the day and the order number (`desiredState` and `dayLabel` in the gate sync code,
// desired-state.ts). An admission is "Admitted" (the live board's and the Scans report's word); a second scan of a used
// ticket is "Duplicate" (the Scans report's label for it), and that is all the phone shows of it. When and where the
// ticket was first used is what EMC shows the fair's office, on the live board's Fraud watch ("…4F2A tried again at
// North Gate", then "first used 2:14 PM at Main Gate", app/components/live/fraud.tsx), so the demo shows it there, in a
// Fraud watch panel beside the phone. The gates' scanner app is another company's: the demo never shows its screens.
import { FAIR, TICKET_TYPES } from './sample-fair.js';

/** The sample ticket. Its day is a Friday, the sample fair's day (FAIR.day). */
export const SAMPLE_TICKET = {
  fair: FAIR.name,
  typeName: TICKET_TYPES.find((t) => t.id === 'adult').name,
  day: '2027-07-16',
  orderNumber: 'DCF-001234', // the sample fair's order prefix, in the real format (six digits)
  barcode: 'EMC-SAMPLE-TICKET', // what its QR code says
  qr: '/emc-site/img/sample-ticket-qr.svg', // encodes EMC-SAMPLE-TICKET (scripts/build-sample-qr.mjs)
  qrSize: 150, // 6 pixels a module: the code is 25 modules across with its margin
  note: 'Sample ticket. Not valid for entry.',
};

const utc = (iso, options) => new Intl.DateTimeFormat('en-US', { timeZone: 'UTC', ...options }).format(new Date(`${iso}T00:00:00Z`));

/** The day as the gate's answer writes it ("FRI JUL 16"): the real `dayLabel`. */
export function dayLabel(iso) {
  const part = (o) => utc(iso, o).toUpperCase();
  return `${part({ weekday: 'short' })} ${part({ month: 'short' })} ${new Date(`${iso}T00:00:00Z`).getUTCDate()}`;
}

/** The day as the buyer's ticket writes it ("Fri, Jul 16, 2027"): the real `formatDay`. */
export const ticketDayLabel = (iso) => utc(iso, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });

/** A barcode as the live board shows it: its last 6 characters after an ellipsis (the real `barcodeTail`). */
export const barcodeTail = (code) => (code.length > 6 ? `\u2026${code.slice(-6)}` : code);

/** What the gate is told for a good ticket: the real `desiredState` response for a ticket on its own day. */
export const responseLine = (t) => `${t.typeName.toUpperCase()} · ${dayLabel(t.day)} · #${t.orderNumber}`;

export function initialScanState() {
  return { step: 'ready', scans: 0, firstScan: null };
}

/**
 * ready --scan--> admitted (firstScan records the scan's time and gate) --scan--> refused --scan--> refused ...;
 * reset --> ready from any step. A scan must say when (`at`, "2:14 PM") and where (`gate`); anything else, or an
 * action it does not know, returns the same state.
 */
export function scanReduce(state, action) {
  if (action?.type === 'reset') return initialScanState();
  if (action?.type !== 'scan' || typeof action.at !== 'string' || typeof action.gate !== 'string') return state;
  if (state.step === 'ready') return { step: 'admitted', scans: 1, firstScan: { at: action.at, gate: action.gate } };
  return { step: 'refused', scans: state.scans + 1, firstScan: state.firstScan };
}

/** What the gate shows for the latest scan, or null before the first. */
export function scanResult(state) {
  if (state.step === 'admitted') return { ok: true, title: 'Admitted', detail: responseLine(SAMPLE_TICKET) };
  if (state.step === 'refused') return { ok: false, title: 'Duplicate', detail: `first used ${state.firstScan.at} at ${state.firstScan.gate}` };
  return null;
}

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** A viewfinder: four corners and the scan line. */
const SCAN_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">' +
  '<path d="M4 8V5.5A1.5 1.5 0 0 1 5.5 4H8M16 4h2.5A1.5 1.5 0 0 1 20 5.5V8M20 16v2.5a1.5 1.5 0 0 1-1.5 1.5H16M8 20H5.5A1.5 1.5 0 0 1 4 18.5V16M7 12h10"/></svg>';

/**
 * Inside the demo, as served: the phone with the sample ticket and an empty result, the status element (not drawn,
 * outside the phone, there from the start so each scan is announced), and the buttons and the live board's Fraud watch
 * panel. The buttons, the panel and the resting line that holds the result's place are hidden until the view takes
 * over, so with JavaScript off nothing looks pressable and no result shows.
 */
export function renderGateScanInner(t = SAMPLE_TICKET) {
  return '<div class="gs-phone"><div class="gs-screen">' +
    '<p class="gs-bar"><span class="pill-sample">Sample data</span></p>' +
    // A ticket stub, perforated above the QR code, as the real buyer's ticket page draws it (ticket-stub.tsx).
    '<div class="gs-ticket">' +
    `<p class="gs-ticket__fair">${esc(t.fair)}</p>` +
    `<p class="gs-ticket__label"><span class="gs-keep">${esc(t.typeName)} ·</span> <span class="gs-keep">${esc(ticketDayLabel(t.day))}</span></p>` +
    '<div class="gs-ticket__stub">' +
    `<img class="gs-ticket__qr" src="${t.qr}" width="${t.qrSize}" height="${t.qrSize}" alt="QR code for the sample ticket">` +
    `<p class="gs-ticket__order">Order ${esc(t.orderNumber)}</p>` +
    `<p class="gs-ticket__note">${esc(t.note)}</p>` +
    '</div></div>' +
    // The result's place: a resting line until the first scan, then what the gate shows.
    '<div class="gs-slot">' +
    `<p class="gs-rest" data-gs-rest hidden>${SCAN_ICON}Ready to scan</p>` +
    '<div class="gs-result" data-gs-result></div>' +
    '</div>' +
    '</div></div>' +
    '<div class="visually-hidden" role="status" data-gs-status></div>' +
    '<div class="gs-controls">' +
    '<button type="button" class="btn gs-scan" data-gs-scan hidden>Scan ticket</button>' +
    '<button type="button" class="btn ghost gs-reset" data-gs-reset hidden>Start over</button>' +
    // What the fair's office sees: the live board's Fraud watch panel, in the site's dashboard look (dashboard.css).
    '<div class="db gs-board" data-gs-board hidden><div class="db-panel db-fraud">' +
    '<div class="db-panel__head"><h3 class="db-panel__title">Fraud watch</h3><span class="gs-board__tag">Live board</span></div>' +
    '<ul class="db-fraud__counts"><li><strong data-gs-count>0</strong> <span>Presented again</span></li></ul>' +
    '<ol class="db-fraud__list" data-gs-tries></ol>' +
    '</div></div>' +
    '</div>';
}

/** The whole demo: one sample container. */
export function renderGateScanHTML() {
  return `<div class="gs" data-demo="gate-scanning" data-sample role="group" aria-label="Sample gate scan">${renderGateScanInner()}</div>`;
}
