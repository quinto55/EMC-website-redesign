// The sample daily report: one closed day of the sample fair as plain HTML tables. Pure (no browser globals): the page
// generator renders it at build time, so it needs no script.
// Laid out from the real Sales and Scans reports (EMC-Ticketing-Platform at d4ad25e: app/routes/
// portal.t.$slug.events.$eventId_.reports.sales.tsx and .reports.scans.tsx), with their tile, column and caption labels.
// Counted the way the live board counts: tickets are the Admission tickets, the add-ons are named beside them in the
// board's own words, and the money counts every type. There are no fee, tax or net columns.
import { FAIR, TICKET_KIND_LABEL, CHANNELS, GATES, DAY_REPORT, totals, addOnsLine } from './sample-fair.js';
import { count, money } from './board-engine.js';

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** The `sold` table cut down to one channel, so `totals` counts that channel alone. */
const channelOnly = (sold, channelId) => Object.fromEntries(Object.entries(sold).map(([typeId, by]) => [typeId, { [channelId]: by[channelId] ?? 0 }]));

/**
 * The add-ons sold, on a line of their own under a tickets figure, as on the live board's Tickets tile. Where the
 * column is narrow the line breaks only before its "and", never inside "1,178 rides".
 */
function addOnsHTML(addOns) {
  const line = addOnsLine(addOns);
  if (!line) return '';
  const parts = line.split(' and ').map((p, i) => `<span class="dr-keep">${i ? 'and ' : ''}${esc(p)}</span>`);
  return `<span class="dr-sub">${parts.join(' ')}</span>`;
}
const ticketsHTML = (figure, addOns) => esc(figure) + addOnsHTML(addOns);

/**
 * One report table, laid out as the real reports' DataTable: a caption for screen readers, column headers, a row
 * header in each row and the total row in the foot. Figures are right-aligned (`num`). It scrolls sideways inside its
 * own box where the card is too narrow, and that box is a labelled stop for the keyboard so it can be scrolled.
 */
function tableHTML({ labelledBy, caption, columns, rows, foot }) {
  const line = (cells) => `<tr>${cells.map((html, i) => (i === 0
    ? `<th scope="row">${html}</th>`
    : `<td${columns[i].num ? ' class="num"' : ''}>${html}</td>`)).join('')}</tr>`;
  return `<div class="dr-scroll" tabindex="0" role="region" aria-labelledby="${labelledBy}"><table>` +
    `<caption class="visually-hidden">${esc(caption)}</caption>` +
    `<thead><tr>${columns.map((c) => `<th scope="col"${c.num ? ' class="num"' : ''}>${esc(c.label)}</th>`).join('')}</tr></thead>` +
    `<tbody>${rows.map(line).join('')}</tbody>` +
    `<tfoot>${line(foot)}</tfoot></table></div>`;
}

/** A section under its h4. The table's scroll box is the labelled region (the section is not one too). */
function section(key, title, body) {
  const id = `dr-${key}`;
  return `<section class="dr-section" data-section="${key}"><h4 id="${id}">${esc(title)}</h4>${body(id)}</section>`;
}

/**
 * The sample end-of-day report for `report` ({ day, sold, scannedByGate }, as DAY_REPORT): the day's totals, then By
 * ticket type, By channel and At the gates, each with a total row that its rows add up to.
 */
export function renderDayReportHTML(report = DAY_REPORT) {
  const t = totals(report.sold);
  const gates = GATES.map((g) => ({ name: g.name, admitted: report.scannedByGate[g.id] ?? 0 }));
  const admitted = gates.reduce((a, g) => a + g.admitted, 0);

  const tiles = '<ul class="dr-tiles">' +
    `<li class="dr-tile" data-total="tickets"><span class="dr-tile__label">Tickets sold</span><strong class="dr-tile__value">${count(t.tickets)}</strong>${addOnsHTML(t.addOns)}</li>` +
    `<li class="dr-tile" data-total="gross"><span class="dr-tile__label">Gross to event</span><strong class="dr-tile__value">${money(t.sales)}</strong></li>` +
    `<li class="dr-tile" data-total="admitted"><span class="dr-tile__label">Admitted</span><strong class="dr-tile__value">${count(admitted)}</strong></li>` +
    '</ul>';

  const types = section('types', 'By ticket type', (id) => tableHTML({
    labelledBy: id,
    caption: 'Money by ticket type',
    columns: [{ label: 'Ticket type' }, { label: 'Kind' }, { label: 'Sold', num: true }, { label: 'Gross to event', num: true }],
    rows: t.byType.map((x) => [esc(x.name), esc(TICKET_KIND_LABEL[x.kind]), count(x.tickets), money(x.sales)]),
    foot: ['Total', '', ticketsHTML(`${count(t.tickets)} tickets`, t.addOns), money(t.sales)],
  }));

  const channels = section('channels', 'By channel', (id) => tableHTML({
    labelledBy: id,
    caption: 'Sales by channel',
    columns: [{ label: 'Channel' }, { label: 'Tickets', num: true }, { label: 'Gross to event', num: true }],
    rows: CHANNELS.map((c) => {
      const ct = totals(channelOnly(report.sold, c.id));
      return [esc(c.name), ticketsHTML(count(ct.tickets), ct.addOns), money(ct.sales)];
    }),
    foot: ['Total', ticketsHTML(count(t.tickets), t.addOns), money(t.sales)],
  }));

  const atGates = section('gates', 'At the gates', (id) => tableHTML({
    labelledBy: id,
    caption: 'Admitted by entrance',
    columns: [{ label: 'Entrance' }, { label: 'Admitted', num: true }],
    rows: gates.map((g) => [esc(g.name), count(g.admitted)]),
    foot: ['Total', count(admitted)],
  }) + '<p class="dr-note">Admitted counts admission tickets only.</p>');

  return '<div class="dr" data-day-report data-sample role="group" aria-label="Sample daily report">' +
    `<div class="dr-head"><h3 class="dr-title">${esc(FAIR.name)}, ${esc(report.day)}</h3><span class="pill-sample">Sample data</span></div>` +
    tiles +
    `<div class="dr-body">${types}${channels}${atGates}</div>` +
    '</div>';
}
