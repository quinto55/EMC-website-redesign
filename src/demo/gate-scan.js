// The gate scanning demo: one sample ticket, scanned once and then again. Pure (no browser globals): the page generator
// renders the starting state at build time, and the view (gate-scan-view.js) runs the scans.
//
// The words are the real product's (EMC-Ticketing-Platform at d4ad25e). A good ticket's answer is EMC's response text,
// the ticket type in capitals, the day and the order number (`desiredState` and `dayLabel` in the gate sync code,
// desired-state.ts). An admission is "Admitted" (the live board's and the Scans report's word); a second scan of a used
// ticket is "Duplicate" (the Scans report's label for it), written with when and where the ticket was first used as
// the live board's Fraud watch writes it ("first used 2:14 PM at Main Gate", app/components/live/fraud.tsx). The gates'
// scanner app is another company's: the demo shows EMC's answer in this site's own phone, never that app's screens.
import { FAIR, TICKET_TYPES } from './sample-fair.js';

/** The sample ticket. Its day is a Friday, the sample fair's day (FAIR.day). */
export const SAMPLE_TICKET = {
  fair: FAIR.name,
  typeName: TICKET_TYPES.find((t) => t.id === 'adult').name,
  day: '2027-07-16',
  orderNumber: 'DCF-001234', // the sample fair's order prefix, in the real format (six digits)
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

/**
 * Inside the demo, as served: the phone with the sample ticket and an empty result, and the buttons, hidden until the
 * view takes over (so with JavaScript off nothing looks pressable). The result is the one status element, there from
 * the start, so each scan is announced.
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
    '<div class="gs-result" role="status" data-gs-result></div>' +
    '</div></div>' +
    '<div class="gs-controls">' +
    '<button type="button" class="btn gs-scan" data-gs-scan hidden>Scan ticket</button>' +
    '<button type="button" class="btn ghost gs-reset" data-gs-reset hidden>Start over</button>' +
    '<p class="gs-note" data-gs-note hidden>This also shows on the live board\'s Fraud watch as "Presented again".</p>' +
    '</div>';
}

/** The whole demo: one sample container. */
export function renderGateScanHTML() {
  return `<div class="gs" data-demo="gate-scanning" data-sample role="group" aria-label="Sample gate scan">${renderGateScanInner()}</div>`;
}
