import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { ROOT } from './helpers/pages.js';
import { renderDayReportHTML } from '../src/demo/day-report.js';
import { DAY_REPORT, LIVE_BASELINE, TICKET_TYPES, TICKET_KIND_LABEL, GATES, totals } from '../src/demo/sample-fair.js';

const text = (el) => el.textContent.replace(/\s+/g, ' ').trim();
const num = (s) => Number(String(s).replace(/[$,]/g, ''));
const fmt = (n) => n.toLocaleString('en-US');

let root;
function mount(report) {
  document.body.innerHTML = report === undefined ? renderDayReportHTML() : renderDayReportHTML(report);
  return document.querySelector('[data-day-report]');
}

/** A section's table as { head: [labels], rows: [[cells]], foot: [cells] }, each cell its element. */
function table(section) {
  const t = root.querySelector(`[data-section="${section}"] table`);
  return {
    el: t,
    head: [...t.querySelectorAll('thead th')].map(text),
    rows: [...t.querySelectorAll('tbody tr')].map((tr) => [...tr.children]),
    foot: [...t.querySelectorAll('tfoot tr')].map((tr) => [...tr.children]),
  };
}
const col = (t, label) => t.head.indexOf(label);
/** What a screen reader gets from a cell: its text without the parts hidden from it. */
function spoken(cell) {
  const copy = cell.cloneNode(true);
  copy.querySelectorAll('[aria-hidden="true"]').forEach((n) => n.remove());
  return text(copy);
}
/** A figure cell: one plain number, nothing under it. */
function plain(cell) {
  expect(cell.children, text(cell)).toHaveLength(0);
  expect(text(cell)).toMatch(/^\$?[\d,]+$/);
  return num(text(cell));
}

const T = totals(DAY_REPORT.sold);
const admitted = Object.values(DAY_REPORT.scannedByGate).reduce((a, n) => a + n, 0);
/** Everything sold, add-ons included: what the real Sales report counts as tickets sold. */
const allSold = T.byType.reduce((a, x) => a + x.tickets, 0);
const NOTE = 'Tickets sold counts add-ons too. Admitted counts admission tickets only.';

beforeAll(() => {
  root = mount();
});

describe('the sample day', () => {
  it('is one closed Thursday whose every sum is exact', () => {
    expect(DAY_REPORT.day).toBe('Thursday');
    expect(Object.keys(DAY_REPORT.sold).sort()).toEqual(TICKET_TYPES.map((t) => t.id).sort());
    for (const [id, by] of Object.entries(DAY_REPORT.sold)) {
      expect(Object.keys(by).sort(), id).toEqual(['box', 'online']);
      for (const n of Object.values(by)) expect(Number.isInteger(n) && n > 0, id).toBe(true);
    }
    expect(Object.keys(DAY_REPORT.scannedByGate)).toEqual(GATES.map((g) => g.id));
    // Admitted counts Admission tickets only, so it can never pass the Admission tickets sold.
    expect(admitted).toBeLessThanOrEqual(T.tickets);
  });

  it('is about one and a half times the boards\' opening figures', () => {
    const open = totals(LIVE_BASELINE.sold);
    const openAdmitted = Object.values(LIVE_BASELINE.scannedByGate).reduce((a, n) => a + n, 0);
    for (const [name, day, start] of [['tickets', T.tickets, open.tickets], ['sales', T.sales, open.sales], ['admitted', admitted, openAdmitted]]) {
      expect(day / start, name).toBeGreaterThan(1.4);
      expect(day / start, name).toBeLessThan(1.6);
    }
  });
});

describe('the sample daily report', () => {
  it('is one sample container that names the fair and the day and says "Sample data"', () => {
    expect(root.matches('[data-sample][data-day-report]')).toBe(true);
    expect(text(root.querySelector('.dr-title'))).toBe('Demo County Fair, Thursday');
    expect(text(root)).toContain('Sample data');
    expect(root.querySelectorAll('h1, h2')).toHaveLength(0);
  });

  it('opens with the day\'s totals, counted as the real Sales report counts them', () => {
    const tile = (k) => root.querySelector(`[data-total="${k}"]`);
    expect(text(tile('tickets').querySelector('.dr-tile__label'))).toBe('Tickets sold');
    // Everything sold, add-ons included (the real tile's count), and nothing under it.
    expect(allSold).toBe(5918);
    expect(text(tile('tickets').querySelector('.dr-tile__value'))).toBe(fmt(allSold));
    expect(text(tile('tickets'))).toBe(`Tickets sold ${fmt(allSold)}`);
    expect(text(tile('gross').querySelector('.dr-tile__label'))).toBe('Gross to event');
    expect(text(tile('gross').querySelector('.dr-tile__value'))).toBe(`$${fmt(T.sales)}`);
    expect(text(tile('admitted').querySelector('.dr-tile__label'))).toBe('Admitted');
    expect(text(tile('admitted').querySelector('.dr-tile__value'))).toBe(fmt(admitted));
  });

  it('says what the totals count, in the real portal\'s words, directly under the tiles and nowhere else', () => {
    const tiles = root.querySelector('.dr-tiles');
    const note = tiles.nextElementSibling;
    expect(note.tagName).toBe('P');
    expect(text(note)).toBe(NOTE);
    expect(text(root).split('Admitted counts admission tickets only.')).toHaveLength(2); // said once
    expect(text(root.querySelector('[data-section="gates"]'))).not.toContain('admission tickets only');
  });

  it('names no add-ons on a line of their own anywhere: no "plus" line', () => {
    expect(root.querySelectorAll('.dr-sub')).toHaveLength(0);
    expect(text(root)).not.toMatch(/\bplus\b/i);
  });

  it('"By ticket type" lists the five types with their kind, tickets sold and sales, and they sum to the totals row', () => {
    const sec = root.querySelector('[data-section="types"]');
    expect(text(sec.querySelector('h4'))).toBe('By ticket type');
    const t = table('types');
    expect(t.head).toEqual(['Ticket type', 'Kind', 'Sold', 'Gross to event']);
    expect(t.rows.map((r) => spoken(r[0]))).toEqual(TICKET_TYPES.map((x) => x.name));
    expect(t.rows.map((r) => text(r[col(t, 'Kind')]))).toEqual(TICKET_TYPES.map((x) => TICKET_KIND_LABEL[x.kind]));
    const sold = t.rows.map((r) => plain(r[col(t, 'Sold')]));
    const gross = t.rows.map((r) => plain(r[col(t, 'Gross to event')]));
    TICKET_TYPES.forEach((x, i) => {
      const by = DAY_REPORT.sold[x.id];
      expect(sold[i], x.name).toBe(by.online + by.box);
      expect(gross[i], x.name).toBe((by.online + by.box) * x.price); // the sample prices, nothing added
    });

    expect(t.foot).toHaveLength(1);
    const foot = t.foot[0];
    expect(text(foot[0])).toBe('Total');
    expect(text(foot[col(t, 'Kind')])).toBe('');
    // The real total row: every type's sold added up, add-ons included, as a plain number.
    expect(plain(foot[col(t, 'Sold')])).toBe(sold.reduce((a, n) => a + n, 0));
    expect(plain(foot[col(t, 'Sold')])).toBe(allSold);
    expect(plain(foot[col(t, 'Gross to event')])).toBe(gross.reduce((a, n) => a + n, 0));
    expect(num(text(foot[col(t, 'Gross to event')]))).toBe(T.sales);
  });

  it('on a narrow screen each type\'s kind can show under its name, and a screen reader still gets it once, in the Kind column', () => {
    const t = table('types');
    t.rows.forEach((r, i) => {
      const kind = TICKET_KIND_LABEL[TICKET_TYPES[i].kind];
      const under = r[0].querySelectorAll('.dr-kind-under');
      expect(under, TICKET_TYPES[i].name).toHaveLength(1);
      expect(text(under[0])).toBe(kind);
      expect(under[0].getAttribute('aria-hidden')).toBe('true'); // the copy for the eye only
      expect(spoken(r[0])).toBe(TICKET_TYPES[i].name);
      const cell = r[col(t, 'Kind')];
      expect(cell.tagName).toBe('TD');
      expect(spoken(cell)).toBe(kind);
      expect(cell.classList.contains('dr-kind')).toBe(true);
    });
    expect(t.el.querySelector('thead th.dr-kind')).not.toBeNull();
    expect(t.foot[0][col(t, 'Kind')].classList.contains('dr-kind')).toBe(true);
    // The rules: wide, the copy is not drawn; narrow, it is, and the Kind column folds away visually but stays readable.
    const css = readFileSync(resolve(ROOT, 'src/styles/demo.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/\s+/g, ' ');
    expect(css).toMatch(/\.dr \.dr-kind-under \{[^}]*display: none/);
    const narrow = css.slice(css.indexOf('@media (max-width: 600px)'));
    expect(narrow).toMatch(/\.dr \.dr-kind-under \{[^}]*display: block/);
    expect(narrow).toMatch(/\.dr-kind__text \{[^}]*clip-path: inset\(50%\)/);
    expect(narrow).not.toMatch(/\.dr-kind[^{]*\{[^}]*display: none/);
  });

  it('"By channel" has exactly Online and Box office, and they sum to the same totals', () => {
    const sec = root.querySelector('[data-section="channels"]');
    expect(text(sec.querySelector('h4'))).toBe('By channel');
    const t = table('channels');
    expect(t.head).toEqual(['Channel', 'Tickets', 'Gross to event']);
    expect(t.rows.map((r) => text(r[0]))).toEqual(['Online', 'Box office']);
    // Tickets counts everything sold on the channel, add-ons included, as the real channel table does.
    const tickets = t.rows.map((r) => plain(r[col(t, 'Tickets')]));
    const gross = t.rows.map((r) => plain(r[col(t, 'Gross to event')]));
    ['online', 'box'].forEach((ch, i) => {
      expect(tickets[i], ch).toBe(TICKET_TYPES.reduce((a, x) => a + DAY_REPORT.sold[x.id][ch], 0));
      expect(gross[i], ch).toBe(TICKET_TYPES.reduce((a, x) => a + DAY_REPORT.sold[x.id][ch] * x.price, 0));
    });
    expect(tickets).toEqual([3663, 2255]);
    const foot = t.foot[0];
    expect(text(foot[0])).toBe('Total');
    expect(plain(foot[col(t, 'Tickets')])).toBe(tickets[0] + tickets[1]);
    expect(plain(foot[col(t, 'Gross to event')])).toBe(gross[0] + gross[1]);
    // The same totals as "By ticket type" and the tiles.
    expect(plain(foot[col(t, 'Tickets')])).toBe(plain(table('types').foot[0][2]));
    expect(plain(foot[col(t, 'Tickets')])).toBe(allSold);
    expect(plain(foot[col(t, 'Gross to event')])).toBe(T.sales);
  });

  it('"At the gates" lists the three gates, and they sum to the admitted total', () => {
    const sec = root.querySelector('[data-section="gates"]');
    expect(text(sec.querySelector('h4'))).toBe('At the gates');
    const t = table('gates');
    expect(t.head).toEqual(['Entrance', 'Admitted']);
    expect(t.rows.map((r) => text(r[0]))).toEqual(GATES.map((g) => g.name));
    const each = t.rows.map((r) => num(text(r[1])));
    expect(each).toEqual(GATES.map((g) => DAY_REPORT.scannedByGate[g.id]));
    expect(text(t.foot[0][0])).toBe('Total');
    expect(num(text(t.foot[0][1]))).toBe(each.reduce((a, n) => a + n, 0));
    expect(num(text(t.foot[0][1]))).toBe(admitted);
  });

  it('has no fee, tax, net or refund column, and never says "fee"', () => {
    const heads = [...root.querySelectorAll('th[scope="col"]')].map(text);
    for (const h of heads) expect(h).not.toMatch(/fee|tax|net|refund/i);
    expect(text(root)).not.toMatch(/fee/i);
    expect(root.innerHTML).not.toMatch(/fee/i);
  });

  it('every number it shows comes from DAY_REPORT', () => {
    const allowed = new Set();
    const add = (n) => allowed.add(fmt(n));
    add(allSold); add(T.sales); add(admitted);
    for (const x of T.byType) { add(x.tickets); add(x.sales); }
    for (const ch of ['online', 'box']) {
      add(TICKET_TYPES.reduce((a, x) => a + DAY_REPORT.sold[x.id][ch], 0));
      add(TICKET_TYPES.reduce((a, x) => a + DAY_REPORT.sold[x.id][ch] * x.price, 0));
    }
    for (const n of Object.values(DAY_REPORT.scannedByGate)) add(n);
    allowed.add('4'); // "Family 4-pack"
    const shown = text(root).match(/\d[\d,]*/g);
    expect(shown.length).toBeGreaterThan(20);
    for (const s of shown) expect(allowed.has(s), s).toBe(true);
  });

  it('draws whatever day it is given', () => {
    const small = {
      day: 'Monday',
      sold: { adult: { online: 3, box: 2 }, child: { online: 1, box: 0 }, wristband: { online: 2, box: 1 }, family: { online: 1, box: 1 }, parking: { online: 2, box: 2 } },
      scannedByGate: { main: 4, north: 2, midway: 1 },
    };
    const el = mount(small);
    expect(text(el.querySelector('.dr-title'))).toBe('Demo County Fair, Monday');
    expect(text(el.querySelector('[data-total="tickets"] .dr-tile__value'))).toBe('15');
    expect(text(el.querySelector('[data-total="gross"] .dr-tile__value'))).toBe('$276');
    expect(text(el.querySelector('[data-total="admitted"] .dr-tile__value'))).toBe('7');
    root = mount();
  });

  it('every table can be read by a screen reader and scrolled by keyboard inside its card', () => {
    const tables = root.querySelectorAll('table');
    expect(tables).toHaveLength(3);
    for (const t of tables) {
      expect(text(t.querySelector('caption'))).not.toBe('');
      for (const th of t.querySelectorAll('thead th')) expect(th.getAttribute('scope')).toBe('col');
      for (const tr of t.querySelectorAll('tbody tr, tfoot tr')) {
        expect(tr.children[0].tagName).toBe('TH');
        expect(tr.children[0].getAttribute('scope')).toBe('row');
      }
      // Figures line up on the right.
      for (const td of t.querySelectorAll('td')) {
        if (/\d/.test(td.textContent)) expect(td.classList.contains('num'), td.textContent).toBe(true);
      }
      const scroller = t.parentElement;
      expect(scroller.classList.contains('dr-scroll')).toBe(true);
      expect(scroller.getAttribute('tabindex')).toBe('0');
      expect(scroller.getAttribute('role')).toBe('region');
      expect(scroller.getAttribute('aria-label') || scroller.getAttribute('aria-labelledby')).toBeTruthy();
    }
    // The column labels are the real reports' labels.
    expect(text(table('types').el.querySelector('caption'))).toBe('Money by ticket type');
    expect(text(table('channels').el.querySelector('caption'))).toBe('Sales by channel');
    expect(text(table('gates').el.querySelector('caption'))).toBe('Admitted by entrance');
  });

  it('needs no script: it has no buttons, forms or scripts', () => {
    expect(root.querySelectorAll('button, form, input, script')).toHaveLength(0);
    expect(root.innerHTML).not.toContain('\u2014'); // no em dash
  });
});
