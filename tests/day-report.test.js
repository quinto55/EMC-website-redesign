import { describe, it, expect, beforeAll } from 'vitest';
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
/** A tickets cell: the Admission tickets figure, and the add-ons named on the line under it. */
function ticketsCell(cell) {
  const sub = cell.querySelector('.dr-sub');
  const main = text(cell).replace(sub ? text(sub) : '', '').trim();
  const m = sub ? text(sub).match(/^plus ([\d,]+) parking and ([\d,]+) rides$/) : null;
  return { tickets: num(main.replace(/ tickets$/, '')), main, parking: m ? num(m[1]) : null, rides: m ? num(m[2]) : null };
}

const T = totals(DAY_REPORT.sold);
const admitted = Object.values(DAY_REPORT.scannedByGate).reduce((a, n) => a + n, 0);

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

  it('opens with the day\'s totals', () => {
    const tile = (k) => root.querySelector(`[data-total="${k}"]`);
    expect(text(tile('tickets').querySelector('.dr-tile__label'))).toBe('Tickets sold');
    expect(text(tile('tickets').querySelector('.dr-tile__value'))).toBe(fmt(T.tickets));
    expect(text(tile('tickets').querySelector('.dr-sub'))).toBe('plus 419 parking and 1,178 rides');
    expect(text(tile('gross').querySelector('.dr-tile__label'))).toBe('Gross to event');
    expect(text(tile('gross').querySelector('.dr-tile__value'))).toBe(`$${fmt(T.sales)}`);
    expect(text(tile('admitted').querySelector('.dr-tile__label'))).toBe('Admitted');
    expect(text(tile('admitted').querySelector('.dr-tile__value'))).toBe(fmt(admitted));
  });

  it('"By ticket type" lists the five types with their kind, tickets sold and sales, and they sum to the totals row', () => {
    const sec = root.querySelector('[data-section="types"]');
    expect(text(sec.querySelector('h4'))).toBe('By ticket type');
    const t = table('types');
    expect(t.head).toEqual(['Ticket type', 'Kind', 'Sold', 'Gross to event']);
    expect(t.rows.map((r) => text(r[0]))).toEqual(TICKET_TYPES.map((x) => x.name));
    expect(t.rows.map((r) => text(r[col(t, 'Kind')]))).toEqual(TICKET_TYPES.map((x) => TICKET_KIND_LABEL[x.kind]));
    const sold = t.rows.map((r) => num(text(r[col(t, 'Sold')])));
    const gross = t.rows.map((r) => num(text(r[col(t, 'Gross to event')])));
    TICKET_TYPES.forEach((x, i) => {
      const by = DAY_REPORT.sold[x.id];
      expect(sold[i], x.name).toBe(by.online + by.box);
      expect(gross[i], x.name).toBe((by.online + by.box) * x.price); // the sample prices, nothing added
    });

    expect(t.foot).toHaveLength(1);
    const foot = t.foot[0];
    expect(text(foot[0])).toBe('Total');
    expect(text(foot[col(t, 'Kind')])).toBe('');
    // Admission tickets are the tickets; the add-ons are named on their own, as on the live board.
    const c = ticketsCell(foot[col(t, 'Sold')]);
    const ofKind = (kind) => TICKET_TYPES.reduce((a, x, i) => a + (x.kind === kind ? sold[i] : 0), 0);
    expect(c.main).toBe(`${fmt(ofKind('admission'))} tickets`);
    expect(c.parking).toBe(ofKind('parking'));
    expect(c.rides).toBe(ofKind('rides'));
    expect(c.tickets + c.parking + c.rides).toBe(sold.reduce((a, n) => a + n, 0));
    expect(num(text(foot[col(t, 'Gross to event')]))).toBe(gross.reduce((a, n) => a + n, 0));
    expect(num(text(foot[col(t, 'Gross to event')]))).toBe(T.sales);
  });

  it('"By channel" has exactly Online and Box office, and they sum to the same totals', () => {
    const sec = root.querySelector('[data-section="channels"]');
    expect(text(sec.querySelector('h4'))).toBe('By channel');
    const t = table('channels');
    expect(t.head).toEqual(['Channel', 'Tickets', 'Gross to event']);
    expect(t.rows.map((r) => text(r[0]))).toEqual(['Online', 'Box office']);
    const cells = t.rows.map((r) => ticketsCell(r[col(t, 'Tickets')]));
    const gross = t.rows.map((r) => num(text(r[col(t, 'Gross to event')])));
    ['online', 'box'].forEach((ch, i) => {
      const of = (kind) => TICKET_TYPES.reduce((a, x) => a + (x.kind === kind ? DAY_REPORT.sold[x.id][ch] : 0), 0);
      expect(cells[i], ch).toMatchObject({ tickets: of('admission'), parking: of('parking'), rides: of('rides') });
      expect(gross[i], ch).toBe(TICKET_TYPES.reduce((a, x) => a + DAY_REPORT.sold[x.id][ch] * x.price, 0));
    });
    const foot = t.foot[0];
    expect(text(foot[0])).toBe('Total');
    const total = ticketsCell(foot[col(t, 'Tickets')]);
    const sum = (k) => cells.reduce((a, c) => a + c[k], 0);
    expect(total).toMatchObject({ tickets: sum('tickets'), parking: sum('parking'), rides: sum('rides') });
    expect(num(text(foot[col(t, 'Gross to event')]))).toBe(gross[0] + gross[1]);
    // The same totals as "By ticket type".
    const types = ticketsCell(table('types').foot[0][2]);
    expect(total).toMatchObject({ tickets: types.tickets, parking: types.parking, rides: types.rides });
    expect(num(text(foot[col(t, 'Gross to event')]))).toBe(T.sales);
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
    expect(admitted).toBeLessThanOrEqual(ticketsCell(table('types').foot[0][2]).tickets);
    expect(text(sec)).toContain('Admitted counts admission tickets only.');
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
    add(T.tickets); add(T.sales); add(admitted);
    for (const a of T.addOns) add(a.sold);
    for (const x of T.byType) { add(x.tickets); add(x.sales); }
    for (const ch of ['online', 'box']) {
      for (const kind of ['admission', 'parking', 'rides']) add(TICKET_TYPES.reduce((a, x) => a + (x.kind === kind ? DAY_REPORT.sold[x.id][ch] : 0), 0));
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
    expect(text(el.querySelector('[data-total="tickets"] .dr-tile__value'))).toBe('8');
    expect(text(el.querySelector('[data-total="tickets"] .dr-sub'))).toBe('plus 4 parking and 3 rides');
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
    expect(root.innerHTML).not.toContain('—');
  });
});
