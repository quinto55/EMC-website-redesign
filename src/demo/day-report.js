// The sample daily report: one closed day of the sample fair as plain HTML tables. Pure (no browser globals): the page
// generator renders it at build time, so it needs no script.
// Laid out and counted as the real Sales and Scans reports (EMC-Ticketing-Platform at d4ad25e: app/routes/
// portal.t.$slug.events.$eventId_.reports.sales.tsx and .reports.scans.tsx), with their tile, column and caption labels:
// "Tickets sold", the type table's total and the channels' "Tickets" count everything sold, add-ons included (the
// type table's total is every cell, app/lib/reports/sales-view.ts), while Admitted counts admission tickets only, and
// the note under the tiles says so in the portal's words. There are no fee, tax or net columns.
import { FAIR, TICKET_KIND_LABEL, GATES, DAY_REPORT, totals } from './sample-fair.js';
import { count, money } from './board-engine.js';

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** The portal's note for an event that sells add-ons (app/routes/portal.t.$slug._index.tsx, `COUNTS_ADD_ONS`). */
const COUNTS_ADD_ONS = 'Tickets sold counts add-ons too. Admitted counts admission tickets only.';

/**
 * One report table, laid out as the real reports' DataTable: a caption for screen readers, column headers, a row
 * header in each row and the total row in the foot. Figures are right-aligned (`num`). A `kind` column's cells keep
 * their words for screen readers but can fold away on a narrow screen, where each row header shows the kind under the
 * name instead (that copy is for the eye only). Where the table is still too wide it scrolls sideways inside its own
 * box, and that box is a labelled stop for the keyboard so it can be scrolled.
 */
function tableHTML({ labelledBy, caption, columns, rows, foot }) {
  const cls = (c) => (c.num ? ' class="num"' : c.kind ? ' class="dr-kind"' : '');
  const inner = (c, html) => (c.kind && html ? `<span class="dr-kind__text">${html}</span>` : html);
  const line = (cells) => `<tr>${cells.map((html, i) => (i === 0
    ? `<th scope="row">${html}</th>`
    : `<td${cls(columns[i])}>${inner(columns[i], html)}</td>`)).join('')}</tr>`;
  return `<div class="dr-scroll" tabindex="0" role="region" aria-labelledby="${labelledBy}"><table>` +
    `<caption class="visually-hidden">${esc(caption)}</caption>` +
    `<thead><tr>${columns.map((c) => `<th scope="col"${cls(c)}>${inner(c, esc(c.label))}</th>`).join('')}</tr></thead>` +
    `<tbody>${rows.map(line).join('')}</tbody>` +
    `<tfoot>${line(foot)}</tfoot></table></div>`;
}

/** A section under its h4. The table's scroll box is the labelled region (the section is not one too). */
function section(key, title, body) {
  const id = `dr-${key}`;
  return `<section class="dr-section" data-section="${key}"><h4 id="${id}">${esc(title)}</h4>${body(id)}</section>`;
}

/**
 * The sample end-of-day report for `report` ({ day, sold, scannedByGate }, as DAY_REPORT): the day's totals and what
 * they count, then By ticket type, By channel and At the gates, each with a total row that its rows add up to.
 */
export function renderDayReportHTML(report = DAY_REPORT) {
  const t = totals(report.sold);
  const sold = t.byType.reduce((a, x) => a + x.tickets, 0); // every type, add-ons included
  const gates = GATES.map((g) => ({ name: g.name, admitted: report.scannedByGate[g.id] ?? 0 }));
  const admitted = gates.reduce((a, g) => a + g.admitted, 0);

  const tiles = '<ul class="dr-tiles">' +
    `<li class="dr-tile" data-total="tickets"><span class="dr-tile__label">Tickets sold</span> <strong class="dr-tile__value">${count(sold)}</strong></li>` +
    `<li class="dr-tile" data-total="gross"><span class="dr-tile__label">Gross to event</span> <strong class="dr-tile__value">${money(t.sales)}</strong></li>` +
    `<li class="dr-tile" data-total="admitted"><span class="dr-tile__label">Admitted</span> <strong class="dr-tile__value">${count(admitted)}</strong></li>` +
    '</ul>' +
    `<p class="dr-note">${esc(COUNTS_ADD_ONS)}</p>`;

  const types = section('types', 'By ticket type', (id) => tableHTML({
    labelledBy: id,
    caption: 'Money by ticket type',
    columns: [{ label: 'Ticket type' }, { label: 'Kind', kind: true }, { label: 'Sold', num: true }, { label: 'Gross to event', num: true }],
    rows: t.byType.map((x) => {
      const kind = esc(TICKET_KIND_LABEL[x.kind]);
      return [`${esc(x.name)}<span class="dr-kind-under" aria-hidden="true">${kind}</span>`, kind, count(x.tickets), money(x.sales)];
    }),
    foot: ['Total', '', count(sold), money(t.sales)],
  }));

  const channels = section('channels', 'By channel', (id) => tableHTML({
    labelledBy: id,
    caption: 'Sales by channel',
    columns: [{ label: 'Channel' }, { label: 'Tickets', num: true }, { label: 'Gross to event', num: true }],
    rows: t.byChannel.map((c) => [esc(c.name), count(c.tickets), money(c.sales)]),
    foot: ['Total', count(sold), money(t.sales)],
  }));

  const atGates = section('gates', 'At the gates', (id) => tableHTML({
    labelledBy: id,
    caption: 'Admitted by entrance',
    columns: [{ label: 'Entrance' }, { label: 'Admitted', num: true }],
    rows: gates.map((g) => [esc(g.name), count(g.admitted)]),
    foot: ['Total', count(admitted)],
  }));

  return '<div class="dr" data-day-report data-sample role="group" aria-label="Sample daily report">' +
    `<div class="dr-head"><h3 class="dr-title">${esc(FAIR.name)}, ${esc(report.day)}</h3><span class="pill-sample">Sample data</span></div>` +
    tiles +
    `<div class="dr-body">${types}${channels}${atGates}</div>` +
    '</div>';
}
